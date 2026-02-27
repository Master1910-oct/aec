import type { EmergencyRequest, Hospital, Assignment, HospitalScore } from '@/types';
import { filterEligibleHospitals, filterFallbackHospitals } from './capabilityFilter';
import { scoreHospitals } from './scoringEngine';
import { slaMonitor } from './slaMonitor';
import { eventBus } from './eventBus';

const CONFIRMATION_TIMEOUT_MS = 15_000;
const activeTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

interface StoreActions {
  getHospitals: () => Hospital[];
  updateEmergencyRequest: (id: string, updates: Partial<EmergencyRequest>) => void;
  createAssignment: (assignment: Assignment) => void;
  updateAssignment: (id: string, updates: Partial<Assignment>) => void;
  updateHospitalReliability: (id: string, score: number) => void;
  updateAmbulanceStatus: (id: string, status: string) => void;
}

let storeActions: StoreActions | null = null;

export function registerStoreActions(actions: StoreActions) {
  storeActions = actions;
}

/**
 * Process an emergency request: filter, score, assign, start timer.
 */
export function processEmergencyRequest(request: EmergencyRequest): HospitalScore[] | null {
  if (!storeActions) {
    console.error('[AssignmentManager] Store actions not registered');
    return null;
  }

  const hospitals = storeActions.getHospitals();

  // Step 1: Capability-based filtering
  let eligible = filterEligibleHospitals(hospitals, request.emergencyType, request.excludedHospitalIds);

  // Fallback: relax capability filter
  if (eligible.length === 0) {
    eligible = filterFallbackHospitals(hospitals, request.excludedHospitalIds);
    eventBus.emit('emergency_created', {
      requestId: request.id,
      fallback: true,
      message: 'No capability match found. Using fallback hospitals.',
    });
  }

  if (eligible.length === 0) {
    storeActions.updateEmergencyRequest(request.id, { status: 'failed', updatedAt: new Date() });
    eventBus.emit('emergency_created', {
      requestId: request.id,
      error: true,
      message: 'No hospitals available for assignment.',
    });
    return null;
  }

  // Step 2: Score hospitals
  const scores = scoreHospitals(eligible, request.location, request.emergencyType);
  const topHospital = scores[0];

  // Step 3: Create assignment
  const assignment: Assignment = {
    id: `ASG-${Date.now()}-${Math.random().toString(36).slice(2, 4)}`,
    ambulanceId: request.ambulanceId,
    hospitalId: topHospital.hospitalId,
    emergencyRequestId: request.id,
    patientInfo: request.patientInfo,
    status: 'pending',
    eta: Math.round(topHospital.distance * 2.5), // rough ETA in minutes
    distance: Math.round(topHospital.distance * 10) / 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  storeActions.createAssignment(assignment);
  storeActions.updateEmergencyRequest(request.id, {
    status: 'assigned',
    assignedHospitalId: topHospital.hospitalId,
    assignedAt: new Date(),
    updatedAt: new Date(),
  });
  storeActions.updateAmbulanceStatus(request.ambulanceId, 'en-route');

  // SLA tracking
  slaMonitor.startTracking(request.id, topHospital.hospitalId);
  slaMonitor.markAssigned(request.id);

  // Broadcast assignment
  eventBus.emit('hospital_assignment', {
    requestId: request.id,
    assignmentId: assignment.id,
    hospitalId: topHospital.hospitalId,
    scores: scores.slice(0, 3), // top 3 for transparency
  });

  // Step 4: Start 15-second confirmation timer
  startConfirmationTimer(request, assignment.id, scores);

  return scores;
}

function startConfirmationTimer(request: EmergencyRequest, assignmentId: string, scores: HospitalScore[]) {
  // Clear any existing timer
  const existing = activeTimers.get(request.id);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    handleTimeout(request, assignmentId, scores);
  }, CONFIRMATION_TIMEOUT_MS);

  activeTimers.set(request.id, timer);
}

function handleTimeout(request: EmergencyRequest, assignmentId: string, scores: HospitalScore[]) {
  if (!storeActions) return;

  const topHospitalId = scores[0]?.hospitalId;
  activeTimers.delete(request.id);

  // Mark SLA violation
  slaMonitor.markViolated(request.id);

  // Update reliability
  if (topHospitalId) {
    const newScore = slaMonitor.computeReliabilityScore(topHospitalId);
    storeActions.updateHospitalReliability(topHospitalId, newScore);
  }

  // Reject assignment
  storeActions.updateAssignment(assignmentId, { status: 'rejected', updatedAt: new Date() });

  eventBus.emit('hospital_rejected', {
    requestId: request.id,
    hospitalId: topHospitalId,
    reason: 'timeout',
  });

  // Re-run with excluded hospital
  const updatedExclusions = [...request.excludedHospitalIds, topHospitalId].filter(Boolean) as string[];
  const retryRequest: EmergencyRequest = {
    ...request,
    excludedHospitalIds: updatedExclusions,
    updatedAt: new Date(),
  };

  storeActions.updateEmergencyRequest(request.id, {
    excludedHospitalIds: updatedExclusions,
    assignedHospitalId: undefined,
    status: 'pending',
    updatedAt: new Date(),
  });

  eventBus.emit('reassignment_triggered', {
    requestId: request.id,
    excludedHospitals: updatedExclusions,
  });

  // Re-process
  processEmergencyRequest(retryRequest);
}

/**
 * Hospital confirms assignment.
 */
export function confirmAssignment(requestId: string, assignmentId: string) {
  if (!storeActions) return;

  // Clear timer
  const timer = activeTimers.get(requestId);
  if (timer) {
    clearTimeout(timer);
    activeTimers.delete(requestId);
  }

  // SLA
  const slaRecord = slaMonitor.markConfirmed(requestId);

  storeActions.updateAssignment(assignmentId, {
    status: 'accepted',
    confirmedAt: new Date(),
    updatedAt: new Date(),
  });
  storeActions.updateEmergencyRequest(requestId, {
    status: 'confirmed',
    confirmedAt: new Date(),
    updatedAt: new Date(),
  });

  eventBus.emit('hospital_confirmed', {
    requestId,
    assignmentId,
    responseTimeMs: slaRecord?.responseTimeMs,
  });
}

/**
 * Hospital rejects assignment — triggers immediate reassignment.
 */
export function rejectAssignment(requestId: string, assignmentId: string, hospitalId: string) {
  if (!storeActions) return;

  const timer = activeTimers.get(requestId);
  if (timer) {
    clearTimeout(timer);
    activeTimers.delete(requestId);
  }

  storeActions.updateAssignment(assignmentId, { status: 'rejected', updatedAt: new Date() });

  // Update reliability
  const newScore = slaMonitor.computeReliabilityScore(hospitalId);
  storeActions.updateHospitalReliability(hospitalId, newScore);

  eventBus.emit('hospital_rejected', {
    requestId,
    hospitalId,
    reason: 'manual_reject',
  });

  // Fetch current request state from store to get exclusions
  const exclusions = [hospitalId];
  const retryRequest: EmergencyRequest = {
    id: requestId,
    ambulanceId: '', // will be filled from store
    emergencyType: 'general',
    severityScore: 0.5,
    location: { lat: 0, lng: 0 },
    patientInfo: { age: 0, gender: '', condition: '', emergencyLevel: 'medium' },
    status: 'pending',
    excludedHospitalIds: exclusions,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  eventBus.emit('reassignment_triggered', {
    requestId,
    excludedHospitals: exclusions,
  });

  // Note: In a real system, we'd fetch the full request from store.
  // For the mock, the store handles re-processing.
}

/**
 * Admin force-assigns a hospital, bypassing the scoring engine.
 */
export function adminOverride(requestId: string, hospitalId: string) {
  if (!storeActions) return;

  // Clear any active timer
  const timer = activeTimers.get(requestId);
  if (timer) {
    clearTimeout(timer);
    activeTimers.delete(requestId);
  }

  storeActions.updateEmergencyRequest(requestId, {
    status: 'confirmed',
    assignedHospitalId: hospitalId,
    confirmedAt: new Date(),
    updatedAt: new Date(),
  });

  eventBus.emit('admin_override', {
    requestId,
    hospitalId,
    message: 'Admin manually assigned hospital, bypassing scoring engine.',
  });
}

export function cancelEmergency(requestId: string) {
  if (!storeActions) return;

  const timer = activeTimers.get(requestId);
  if (timer) {
    clearTimeout(timer);
    activeTimers.delete(requestId);
  }

  storeActions.updateEmergencyRequest(requestId, {
    status: 'failed',
    updatedAt: new Date(),
  });

  eventBus.emit('admin_override', {
    requestId,
    message: 'Emergency cancelled by admin.',
  });
}

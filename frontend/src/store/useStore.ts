import { create } from 'zustand';
import type { Ambulance, Hospital, Assignment, SystemStats, EmergencyRequest, EngineEvent } from '@/types';
import { registerStoreActions, processEmergencyRequest, confirmAssignment, rejectAssignment, adminOverride, cancelEmergency } from '@/services/assignmentManager';
import { eventBus } from '@/services/eventBus';

interface AppState {
  ambulances: Ambulance[];
  hospitals: Hospital[];
  assignments: Assignment[];
  emergencyRequests: EmergencyRequest[];
  engineEvents: EngineEvent[];
  stats: SystemStats;
  activeRole: 'admin' | 'hospital' | 'ambulance';
  selectedHospitalId: string | null;
  selectedAmbulanceId: string | null;
  setActiveRole: (role: 'admin' | 'hospital' | 'ambulance') => void;
  setSelectedHospital: (id: string | null) => void;
  setSelectedAmbulance: (id: string | null) => void;
  updateHospitalBeds: (id: string, field: 'availableBeds' | 'icuAvailable', value: number) => void;
  toggleHospitalReadiness: (id: string) => void;
  updateAssignmentStatus: (id: string, status: Assignment['status']) => void;
  // Engine actions
  submitEmergency: (request: EmergencyRequest) => void;
  handleConfirm: (requestId: string, assignmentId: string) => void;
  handleReject: (requestId: string, assignmentId: string, hospitalId: string) => void;
  handleAdminOverride: (requestId: string, hospitalId: string) => void;
  handleCancelEmergency: (requestId: string) => void;
}

const mockAmbulances: Ambulance[] = [
  { id: 'AMB-001', callSign: 'MEDIC-01', status: 'en-route', location: { lat: 13.0827, lng: 80.2707 }, crew: ['Dr. Ramesh', 'EMT Murugan'], vehicleType: 'ALS', currentAssignment: 'ASG-001', eta: 8, lastUpdated: new Date() },
  { id: 'AMB-002', callSign: 'MEDIC-02', status: 'available', location: { lat: 13.0674, lng: 80.2376 }, crew: ['Dr. Lakshmi', 'EMT Karthik'], vehicleType: 'BLS', lastUpdated: new Date() },
  { id: 'AMB-003', callSign: 'MEDIC-03', status: 'transporting', location: { lat: 13.1067, lng: 80.2847 }, crew: ['Dr. Priya', 'EMT Senthil'], vehicleType: 'ALS', currentAssignment: 'ASG-002', eta: 12, lastUpdated: new Date() },
  { id: 'AMB-004', callSign: 'RESCUE-01', status: 'at-scene', location: { lat: 13.0475, lng: 80.2090 }, crew: ['Dr. Sundar', 'EMT Anand'], vehicleType: 'CCT', currentAssignment: 'ASG-003', eta: 5, lastUpdated: new Date() },
  { id: 'AMB-005', callSign: 'RESCUE-02', status: 'available', location: { lat: 13.1200, lng: 80.2300 }, crew: ['Dr. Kavitha', 'EMT Raja'], vehicleType: 'BLS', lastUpdated: new Date() },
  { id: 'AMB-006', callSign: 'MEDIC-04', status: 'offline', location: { lat: 13.0350, lng: 80.2500 }, crew: ['Dr. Ganesh', 'EMT Velu'], vehicleType: 'ALS', lastUpdated: new Date() },
];

const mockHospitals: Hospital[] = [
  { id: 'HSP-001', name: 'Rajiv Gandhi GH', code: 'RGGH', location: { lat: 13.0878, lng: 80.2785 }, status: 'available', totalBeds: 120, availableBeds: 34, icuBeds: 20, icuAvailable: 5, erCapacity: 30, erOccupied: 18, readiness: true, specialties: ['Trauma', 'Cardiology', 'Neurology'], capabilities: ['cardiac', 'trauma', 'stroke', 'general'], reliabilityScore: 0.92, contactNumber: '+91-44-25305000', lastUpdated: new Date() },
  { id: 'HSP-002', name: 'Stanley Medical College Hospital', code: 'SMC', location: { lat: 13.1130, lng: 80.2870 }, status: 'busy', totalBeds: 200, availableBeds: 12, icuBeds: 30, icuAvailable: 2, erCapacity: 40, erOccupied: 35, readiness: true, specialties: ['General Surgery', 'Orthopedics'], capabilities: ['trauma', 'burns', 'general'], reliabilityScore: 0.85, contactNumber: '+91-44-25281325', lastUpdated: new Date() },
  { id: 'HSP-003', name: 'Apollo Hospitals Greams Road', code: 'APL-GR', location: { lat: 13.0600, lng: 80.2500 }, status: 'available', totalBeds: 80, availableBeds: 22, icuBeds: 15, icuAvailable: 7, erCapacity: 20, erOccupied: 10, readiness: true, specialties: ['Cardiology', 'Oncology', 'Pediatrics'], capabilities: ['cardiac', 'respiratory', 'pediatric', 'general'], reliabilityScore: 0.95, contactNumber: '+91-44-28293333', lastUpdated: new Date() },
  { id: 'HSP-004', name: 'Kilpauk Medical College Hospital', code: 'KMC', location: { lat: 13.0785, lng: 80.2420 }, status: 'full', totalBeds: 150, availableBeds: 0, icuBeds: 25, icuAvailable: 0, erCapacity: 35, erOccupied: 35, readiness: false, specialties: ['Emergency', 'Burns'], capabilities: ['burns', 'trauma', 'general'], reliabilityScore: 0.78, contactNumber: '+91-44-26432263', lastUpdated: new Date() },
];

const mockAssignments: Assignment[] = [
  { id: 'ASG-001', ambulanceId: 'AMB-001', hospitalId: 'HSP-001', emergencyRequestId: 'ER-001', patientInfo: { age: 45, gender: 'Male', condition: 'Cardiac Arrest', emergencyLevel: 'critical' }, status: 'accepted', eta: 8, distance: 4.2, createdAt: new Date(Date.now() - 600000), updatedAt: new Date() },
  { id: 'ASG-002', ambulanceId: 'AMB-003', hospitalId: 'HSP-003', emergencyRequestId: 'ER-002', patientInfo: { age: 28, gender: 'Female', condition: 'Road Accident - Multiple Fractures', emergencyLevel: 'high' }, status: 'pending', eta: 12, distance: 6.8, createdAt: new Date(Date.now() - 300000), updatedAt: new Date() },
  { id: 'ASG-003', ambulanceId: 'AMB-004', hospitalId: 'HSP-002', emergencyRequestId: 'ER-003', patientInfo: { age: 67, gender: 'Male', condition: 'Stroke - Left Hemiparesis', emergencyLevel: 'critical' }, status: 'accepted', eta: 5, distance: 2.1, createdAt: new Date(Date.now() - 900000), updatedAt: new Date() },
];

export const useStore = create<AppState>((set, get) => {
  // Register store actions for the assignment manager
  registerStoreActions({
    getHospitals: () => get().hospitals,
    updateEmergencyRequest: (id, updates) =>
      set((s) => ({
        emergencyRequests: s.emergencyRequests.map((r) =>
          r.id === id ? { ...r, ...updates } : r
        ),
      })),
    createAssignment: (assignment) =>
      set((s) => ({ assignments: [...s.assignments, assignment] })),
    updateAssignment: (id, updates) =>
      set((s) => ({
        assignments: s.assignments.map((a) =>
          a.id === id ? { ...a, ...updates } : a
        ),
      })),
    updateHospitalReliability: (id, score) =>
      set((s) => ({
        hospitals: s.hospitals.map((h) =>
          h.id === id ? { ...h, reliabilityScore: score } : h
        ),
      })),
    updateAmbulanceStatus: (id, status) =>
      set((s) => ({
        ambulances: s.ambulances.map((a) =>
          a.id === id ? { ...a, status: status as Ambulance['status'], lastUpdated: new Date() } : a
        ),
      })),
  });

  // Listen to all engine events and store them
  eventBus.onAll((event) => {
    set((s) => ({
      engineEvents: [...s.engineEvents.slice(-99), event],
    }));
  });

  return {
    ambulances: mockAmbulances,
    hospitals: mockHospitals,
    assignments: mockAssignments,
    emergencyRequests: [],
    engineEvents: [],
    stats: {
      totalAmbulances: 6,
      activeAmbulances: 4,
      totalHospitals: 4,
      availableHospitals: 2,
      pendingAssignments: 1,
      completedToday: 23,
      avgResponseTime: 8.4,
      criticalAlerts: 2,
    },
    activeRole: 'admin',
    selectedHospitalId: 'HSP-001',
    selectedAmbulanceId: 'AMB-001',
    setActiveRole: (role) => set({ activeRole: role }),
    setSelectedHospital: (id) => set({ selectedHospitalId: id }),
    setSelectedAmbulance: (id) => set({ selectedAmbulanceId: id }),
    updateHospitalBeds: (id, field, value) =>
      set((state) => ({
        hospitals: state.hospitals.map((h) =>
          h.id === id ? { ...h, [field]: value, lastUpdated: new Date() } : h
        ),
      })),
    toggleHospitalReadiness: (id) =>
      set((state) => ({
        hospitals: state.hospitals.map((h) =>
          h.id === id ? { ...h, readiness: !h.readiness, lastUpdated: new Date() } : h
        ),
      })),
    updateAssignmentStatus: (id, status) =>
      set((state) => ({
        assignments: state.assignments.map((a) =>
          a.id === id ? { ...a, status, updatedAt: new Date() } : a
        ),
      })),

    // Engine-integrated actions
    submitEmergency: (request) => {
      set((s) => ({ emergencyRequests: [...s.emergencyRequests, request] }));
      eventBus.emit('emergency_created', { requestId: request.id, type: request.emergencyType, severity: request.severityScore });
      processEmergencyRequest(request);
    },
    handleConfirm: (requestId, assignmentId) => {
      confirmAssignment(requestId, assignmentId);
    },
    handleReject: (requestId, assignmentId, hospitalId) => {
      rejectAssignment(requestId, assignmentId, hospitalId);
    },
    handleAdminOverride: (requestId, hospitalId) => {
      adminOverride(requestId, hospitalId);
    },
    handleCancelEmergency: (requestId) => {
      cancelEmergency(requestId);
    },
  };
});

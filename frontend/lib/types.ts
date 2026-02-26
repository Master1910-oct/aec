/**
 * Type definitions for the Ambulance Emergency System (AES)
 */

export type EmergencyLevel = 'critical' | 'high' | 'medium' | 'low';
export type AmbulanceStatus = 'available' | 'en-route' | 'at-scene' | 'transporting' | 'offline';
export type HospitalStatus = 'available' | 'busy' | 'full' | 'offline';
export type AssignmentStatus = 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
export type EmergencyType = 'cardiac' | 'trauma' | 'stroke' | 'burns' | 'respiratory' | 'pediatric' | 'general';

export type EventType = 
  | 'emergency_created'
  | 'hospital_assignment'
  | 'hospital_confirmed'
  | 'hospital_rejected'
  | 'reassignment_triggered'
  | 'ambulance_status_update'
  | 'sla_warning'
  | 'admin_override';

/**
 * Ambulance entity
 */
export interface Ambulance {
  id: string;
  callSign: string;
  type: 'ALS' | 'BLS' | 'CCT'; // Advanced Life Support, Basic Life Support, Critical Care Transport
  status: AmbulanceStatus;
  location: {
    lat: number;
    lng: number;
  };
  crew: string[]; // Names of paramedics on duty
  currentAssignmentId?: string;
  eta?: number; // in minutes
}

/**
 * Hospital entity with capability and availability metadata
 */
export interface Hospital {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  status: HospitalStatus;
  capabilities: Set<EmergencyType>; // Emergency types this hospital can handle
  totalBeds: number;
  availableBeds: number;
  icuBeds: number;
  availableIcuBeds: number;
  rating: number; // 0-5 reliability score
  readiness: boolean; // Can hospital accept new assignments
  contactNumber: string;
}

/**
 * Emergency/Incident request
 */
export interface EmergencyRequest {
  id: string;
  type: EmergencyType;
  severity: EmergencyLevel;
  location: {
    lat: number;
    lng: number;
  };
  patientInfo: {
    age: number;
    gender: string;
    condition: string;
  };
  requestTime: number; // Timestamp
  status: 'pending' | 'assigned' | 'resolved' | 'failed';
  ambulanceAssigned?: string; // Ambulance ID
}

/**
 * Assignment tracking
 */
export interface Assignment {
  id: string;
  emergencyId: string;
  ambulanceId: string;
  hospitalId: string;
  status: AssignmentStatus;
  assignedTime: number;
  confirmationTime?: number;
  rejectionTime?: number;
  eta: number; // in minutes
  distance: number; // in km
}

/**
 * Hospital score result from scoring engine
 */
export interface HospitalScore {
  hospitalId: string;
  hospitalName: string;
  totalScore: number;
  components: {
    distanceScore: number;
    capabilityScore: number;
    availabilityScore: number;
    ratingScore: number;
    slaScore: number;
  };
}

/**
 * SLA tracking record
 */
export interface SLARecord {
  assignmentId: string;
  emergencyId: string;
  requestTime: number;
  assignmentTime: number;
  confirmationTime?: number;
  responseTimeMs?: number;
  slaThreshold: number; // 15000 ms = 15 sec
  violated: boolean;
}

/**
 * Event bus event
 */
export interface EngineEvent {
  type: EventType;
  timestamp: number;
  data: Record<string, any>;
  sourceService: string;
}

/**
 * Configurable scoring weights
 */
export interface ScoringWeights {
  distanceWeight: number; // 0.35
  capabilityWeight: number; // 0.25
  availabilityWeight: number; // 0.20
  ratingWeight: number; // 0.10
  slaWeight: number; // 0.10
}

/**
 * System statistics for dashboard
 */
export interface SystemStats {
  totalAmbulances: number;
  activeAmbulances: number;
  totalHospitals: number;
  availableHospitals: number;
  pendingAssignments: number;
  completedToday: number;
  avgResponseTime: number;
  criticalAlerts: number;
  slaComplianceRate: number;
}

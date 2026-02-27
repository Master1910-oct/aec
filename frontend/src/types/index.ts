export type EmergencyLevel = 'critical' | 'high' | 'medium' | 'low';
export type AmbulanceStatus = 'available' | 'en-route' | 'at-scene' | 'transporting' | 'offline';
export type HospitalStatus = 'available' | 'busy' | 'full' | 'offline';
export type AssignmentStatus = 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
export type EmergencyType = 'cardiac' | 'trauma' | 'stroke' | 'burns' | 'respiratory' | 'pediatric' | 'general';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Ambulance {
  id: string;
  callSign: string;
  status: AmbulanceStatus;
  location: Coordinates;
  crew: string[];
  vehicleType: 'ALS' | 'BLS' | 'CCT';
  currentAssignment?: string;
  eta?: number;
  lastUpdated: Date;
}

export interface Hospital {
  id: string;
  name: string;
  code: string;
  location: Coordinates;
  status: HospitalStatus;
  totalBeds: number;
  availableBeds: number;
  icuBeds: number;
  icuAvailable: number;
  erCapacity: number;
  erOccupied: number;
  readiness: boolean;
  specialties: string[];
  capabilities: EmergencyType[];
  contactNumber: string;
  reliabilityScore: number; // 0-1, updated by SLA engine
  lastUpdated: Date;
}

export interface Assignment {
  id: string;
  ambulanceId: string;
  hospitalId: string;
  emergencyRequestId: string;
  patientInfo: {
    age: number;
    gender: string;
    condition: string;
    emergencyLevel: EmergencyLevel;
  };
  status: AssignmentStatus;
  eta: number;
  distance: number;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
  route?: Coordinates[];
}

export interface EmergencyRequest {
  id: string;
  ambulanceId: string;
  emergencyType: EmergencyType;
  severityScore: number; // 0-1
  location: Coordinates;
  patientInfo: {
    age: number;
    gender: string;
    condition: string;
    emergencyLevel: EmergencyLevel;
  };
  status: 'pending' | 'assigned' | 'confirmed' | 'completed' | 'failed';
  assignedHospitalId?: string;
  excludedHospitalIds: string[];
  createdAt: Date;
  updatedAt: Date;
  assignedAt?: Date;
  confirmedAt?: Date;
}

export interface HospitalScore {
  hospitalId: string;
  distanceScore: number;
  capabilityScore: number;
  availabilityScore: number;
  ratingScore: number;
  slaScore: number;
  totalScore: number;
  distance: number; // km
}

export interface SLARecord {
  id: string;
  emergencyRequestId: string;
  hospitalId: string;
  requestTime: Date;
  assignmentTime?: Date;
  confirmationTime?: Date;
  responseTimeMs?: number;
  violated: boolean;
  threshold: number; // ms
}

export interface EngineEvent {
  id: string;
  type:
    | 'emergency_created'
    | 'hospital_assignment'
    | 'hospital_confirmed'
    | 'hospital_rejected'
    | 'reassignment_triggered'
    | 'ambulance_status_update'
    | 'sla_warning'
    | 'admin_override';
  payload: Record<string, unknown>;
  timestamp: Date;
}

export interface ScoringWeights {
  distance: number;
  capability: number;
  availability: number;
  rating: number;
  sla: number;
}

export interface SystemStats {
  totalAmbulances: number;
  activeAmbulances: number;
  totalHospitals: number;
  availableHospitals: number;
  pendingAssignments: number;
  completedToday: number;
  avgResponseTime: number;
  criticalAlerts: number;
}

import { create } from 'zustand';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CurrentUser {
  user_id: number;
  name: string;
  email: string;
  role: 'admin' | 'hospital' | 'ambulance' | 'dispatcher';
  entity_id: number | null;
}

export interface BackendEmergency {
  emergency_id: number;
  patient_name: string | null;
  accident_description: string | null;
  latitude: number;
  longitude: number;
  emergency_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  acknowledged: boolean;
  hospital_id: number | null;
  ambulance_id: number | null;
  hospital: {
    hospital_id: number;
    name: string;
    address: string;
    contact_number: string;
    latitude: number;
    longitude: number;
  } | null;
  ambulance: {
    ambulance_id: number;
    vehicle_number: string;
    driver_name: string;
  } | null;
  created_at: string | null;
  sla_deadline: string | null;
  is_overdue: boolean;
}

export interface BackendHospital {
  hospital_id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  contact_number: string;
  max_capacity: number;
  specialities: string[];
  available_beds: number;
  is_active: boolean;
  status: 'GREEN' | 'RED';
}

export interface BackendAmbulance {
  ambulance_id: number;
  vehicle_number: string;
  driver_name: string | null;
  latitude: number;
  longitude: number;
  status: 'AVAILABLE' | 'ON_CALL' | 'MAINTENANCE';
  last_updated: string | null;
}

export interface SystemStats {
  total_emergencies: number;
  pending: number;
  allocated: number;
  en_route: number;
  completed: number;
  escalated: number;
  sla_breached: number;
  total_ambulances: number;
  available_ambulances: number;
  on_call_ambulances: number;
  total_hospitals: number;
  available_hospitals: number;
}

export interface AdminUser {
  user_id: number;
  name: string;
  email: string;
  role: string;
  entity_id: number | null;
  created_at: string | null;
}

export interface SlaBreachEvent {
  emergency_id: number;
  severity: string;
  emergency_type: string;
  sla_deadline: string | null;
  message: string;
  received_at: string;
}

interface AppState {
  // Identity
  currentUser: CurrentUser | null;
  activeRole: 'admin' | 'hospital' | 'ambulance';

  // Data
  emergencies: BackendEmergency[];
  hospitals: BackendHospital[];
  ambulances: BackendAmbulance[];
  stats: SystemStats | null;
  adminUsers: AdminUser[];
  slaBreaches: SlaBreachEvent[];

  // Actions — identity
  setCurrentUser: (u: CurrentUser | null) => void;
  setActiveRole: (r: 'admin' | 'hospital' | 'ambulance') => void;
  fetchMe: () => Promise<CurrentUser | null>;

  // Actions — data fetching
  fetchEmergencies: () => Promise<void>;
  fetchHospitals: () => Promise<void>;
  fetchAmbulances: () => Promise<void>;
  fetchDashboardStats: () => Promise<void>;
  fetchHospitalEmergencies: (hospitalId: number) => Promise<{ active: BackendEmergency[]; resolved: BackendEmergency[] }>;
  fetchAdminUsers: () => Promise<void>;
  fetchMyHospital: () => Promise<BackendHospital | null>;
  fetchMyAmbulance: () => Promise<BackendAmbulance | null>;

  // Actions — ambulance
  submitEmergency: (payload: {
    accident_description: string;
    emergency_type: string;
    severity: string;
    latitude: number;
    longitude: number;
  }) => Promise<BackendEmergency>;
  updateEmergencyStatus: (emergencyId: number, status: string) => Promise<void>;
  updateAmbulanceLocation: (latitude: number, longitude: number) => Promise<void>;

  // Actions — hospital
  acknowledgeEmergency: (emergencyId: number) => Promise<void>;
  updateBeds: (hospitalId: number, beds: number) => Promise<void>;

  // Actions — admin
  createUser: (payload: { name: string; email: string; password: string; role: string; entity_id?: number }) => Promise<void>;
  deactivateUser: (userId: number) => Promise<void>;

  // Actions — auth
  logout: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<AppState>((set, get) => ({
  currentUser: null,
  activeRole: 'admin',
  emergencies: [],
  hospitals: [],
  ambulances: [],
  stats: null,
  adminUsers: [],
  slaBreaches: [],

  // ── Identity ────────────────────────────────────────────────────────────
  setCurrentUser: (u) => set({ currentUser: u }),
  setActiveRole: (r) => set({ activeRole: r }),

  fetchMe: async () => {
    try {
      const res = await api.get<{ data: CurrentUser }>('/api/v1/auth/me');
      const user = res.data;
      set({ currentUser: user, activeRole: user.role as any });
      return user;
    } catch {
      return null;
    }
  },

  // ── Data Fetching ────────────────────────────────────────────────────────
  fetchEmergencies: async () => {
    try {
      const res = await api.get<{ data: BackendEmergency[] }>('/api/v1/emergency/');
      set({ emergencies: res.data });
    } catch (err) {
      console.error('fetchEmergencies failed', err);
    }
  },

  fetchHospitals: async () => {
    try {
      const res = await api.get<{ data: BackendHospital[] }>('/api/v1/hospital/');
      set({ hospitals: res.data });
    } catch (err) {
      console.error('fetchHospitals failed', err);
    }
  },

  fetchAmbulances: async () => {
    try {
      const res = await api.get<{ data: BackendAmbulance[] }>('/api/v1/ambulance/locations');
      set({ ambulances: res.data });
    } catch (err) {
      console.error('fetchAmbulances failed', err);
    }
  },

  fetchDashboardStats: async () => {
    try {
      const res = await api.get<{ data: SystemStats }>('/api/v1/admin/stats');
      set({ stats: res.data });
    } catch (err) {
      console.error('fetchDashboardStats failed', err);
    }
  },

  fetchHospitalEmergencies: async (hospitalId: number) => {
    const res = await api.get<{ data: { active: BackendEmergency[]; resolved: BackendEmergency[] } }>(
      `/api/v1/hospital/${hospitalId}/emergencies`
    );
    return res.data;
  },

  fetchAdminUsers: async () => {
    try {
      const res = await api.get<{ data: AdminUser[] }>('/api/v1/admin/users');
      set({ adminUsers: res.data });
    } catch (err) {
      console.error('fetchAdminUsers failed', err);
    }
  },

  fetchMyHospital: async () => {
    try {
      const res = await api.get<{ data: BackendHospital }>('/api/v1/hospital/me');
      return res.data;
    } catch {
      return null;
    }
  },

  fetchMyAmbulance: async () => {
    try {
      const res = await api.get<{ data: BackendAmbulance }>('/api/v1/ambulance/me');
      return res.data;
    } catch {
      return null;
    }
  },

  // ── Ambulance Actions ────────────────────────────────────────────────────
  submitEmergency: async (payload) => {
    const res = await api.post<{ data: BackendEmergency }>('/api/v1/emergency/', payload);
    const newEmergency = res.data;
    set(s => ({ emergencies: [newEmergency, ...s.emergencies] }));
    return newEmergency;
  },

  updateEmergencyStatus: async (emergencyId, status) => {
    await api.post(`/api/v1/emergency/${emergencyId}/status`, { status });
    set(s => ({
      emergencies: s.emergencies.map(e =>
        e.emergency_id === emergencyId ? { ...e, status } : e
      )
    }));
  },

  updateAmbulanceLocation: async (lat, lon) => {
    try {
      await api.post('/api/v1/ambulance/location', { latitude: lat, longitude: lon });
    } catch (err) {
      console.error('updateAmbulanceLocation failed', err);
    }
  },

  // ── Hospital Actions ─────────────────────────────────────────────────────
  acknowledgeEmergency: async (emergencyId) => {
    await api.post(`/api/v1/emergency/${emergencyId}/acknowledge`, {});
    set(s => ({
      emergencies: s.emergencies.map(e =>
        e.emergency_id === emergencyId ? { ...e, acknowledged: true } : e
      )
    }));
  },

  updateBeds: async (hospitalId, beds) => {
    await api.put(`/api/v1/hospital/${hospitalId}/beds`, { available_beds: beds });
    set(s => ({
      hospitals: s.hospitals.map(h =>
        h.hospital_id === hospitalId
          ? { ...h, available_beds: beds, status: beds > 0 ? 'GREEN' : 'RED' }
          : h
      )
    }));
  },

  // ── Admin Actions ────────────────────────────────────────────────────────
  createUser: async (payload) => {
    await api.post('/api/v1/admin/users', payload);
    get().fetchAdminUsers();
  },

  deactivateUser: async (userId) => {
    await api.put(`/api/v1/admin/users/${userId}/deactivate`, {});
    get().fetchAdminUsers();
  },

  // —— Auth Actions —————————————————————————————————————
  logout: () => {
    localStorage.removeItem('aes_auth_token');
    set({ currentUser: null });
  },
}));

import { create } from "zustand";

interface Emergency {
  id: number;
  type: string;
  location: { lat: number; lng: number };
  status: string;
}

interface Assignment {
  hospitalId: number;
  hospitalName: string;
  hospitalLocation: [number, number];
}

interface AESState {
  emergencies: Emergency[];
  assignment: Assignment | null;
  logs: string[];
  connected: boolean;

  addEmergency: (e: Emergency) => void;
  setAssignment: (a: Assignment | null) => void;
  addLog: (log: string) => void;
  setConnection: (status: boolean) => void;
}

export const useAESStore = create<AESState>((set) => ({
  emergencies: [],
  assignment: null,
  logs: [],
  connected: false,

  addEmergency: (e) =>
    set((state) => ({ emergencies: [...state.emergencies, e] })),

  setAssignment: (a) => set({ assignment: a }),

  addLog: (log) =>
    set((state) => ({ logs: [...state.logs, log] })),

  setConnection: (status) => set({ connected: status }),
}));
// Backend exposes APIs under /api/v1
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export interface NewEmergencyRequest {
  type: string;
  latitude: number;
  longitude: number;
}

export const createEmergency = async (data: NewEmergencyRequest) => {
  const res = await fetch(`${API_BASE}/emergency`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return res.json();
};
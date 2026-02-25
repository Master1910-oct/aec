// Backend exposes APIs under /api/v1
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export const createEmergency = async (data: any) => {
  const res = await fetch(`${API_BASE}/emergency`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return res.json();
};
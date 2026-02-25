export const API_BASE = "http://127.0.0.1:5001";

export const createEmergency = async (data: any) => {
  const res = await fetch(`${API_BASE}/emergency`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return res.json();
};
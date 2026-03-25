// simple wrapper around fetch to centralize base URL, headers and error handling
// usage: import { api } from "@/lib/api" and then call api.get("/foo").

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('aes_auth_token');
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    headers: { ...headers, ...(options.headers as any) },
    credentials: "omit", // Using JWT, cookies not needed
    ...options,
  });

  if (!res.ok) {
    if (res.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('aes_auth_token');
      window.location.href = '/login';
    }
    const text = await res.text();
    // Try to extract a clean message from the JSON error body
    try {
      const json = JSON.parse(text);
      throw new Error(json.message || json.error || text || res.statusText);
    } catch (parseErr: any) {
      // If it's already the Error we just threw, re-throw it
      if (parseErr instanceof Error && parseErr.message !== text) throw parseErr;
    }
    throw new Error(text || res.statusText);
  }

  // some endpoints might return an empty body
  if (res.status === 204) {
    // @ts-ignore
    return undefined;
  }

  return (await res.json()) as T;
}

export const api = {
  get: <T = any>(path: string) => request<T>(path, { method: "GET" }),
  post: <T = any>(path: string, body?: any) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T = any>(path: string, body?: any) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T = any>(path: string, body?: any) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T = any>(path: string) => request<T>(path, { method: "DELETE" }),
};

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── GAP 2: Haversine distance (returns km) ────────────────────────────────────
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Speed map by severity (km/h)
const SEVERITY_SPEED: Record<string, number> = {
  critical: 60,
  high: 50,
  medium: 40,
  low: 40,
};

// ── GAP 2: ETA in minutes ─────────────────────────────────────────────────────
export function estimateEta(distanceKm: number, severity: string): number {
  const speed = SEVERITY_SPEED[severity] ?? 40;
  return Math.ceil((distanceKm / speed) * 60);
}

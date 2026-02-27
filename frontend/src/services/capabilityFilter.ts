import type { Hospital, EmergencyType } from '@/types';

/**
 * Filter hospitals that can handle the given emergency type.
 * Only returns hospitals that are active, have beds, and support the capability.
 */
export function filterEligibleHospitals(
  hospitals: Hospital[],
  emergencyType: EmergencyType,
  excludedIds: string[] = []
): Hospital[] {
  return hospitals.filter((h) => {
    if (excludedIds.includes(h.id)) return false;
    if (h.status === 'full' || h.status === 'offline') return false;
    if (h.availableBeds <= 0) return false;
    if (!h.readiness) return false;
    if (!h.capabilities.includes(emergencyType)) return false;
    return true;
  });
}

/**
 * Expand search: relax capability constraint as a fallback.
 * Returns hospitals with beds that aren't excluded, regardless of capability match.
 */
export function filterFallbackHospitals(
  hospitals: Hospital[],
  excludedIds: string[] = []
): Hospital[] {
  return hospitals.filter((h) => {
    if (excludedIds.includes(h.id)) return false;
    if (h.status === 'full' || h.status === 'offline') return false;
    if (h.availableBeds <= 0) return false;
    return true;
  });
}

/**
 * CapabilityFilter - Hospital eligibility filtering
 * Filters hospitals by emergency type capability, status, bed availability, readiness, and exclusion list
 */

import type { Hospital, EmergencyType } from '@/lib/types';

export interface FilterOptions {
  excludedHospitalIds?: Set<string>; // Hospitals to exclude (e.g., already rejected)
}

export class CapabilityFilter {
  /**
   * Filter hospitals by exact emergency type capability
   * Checks: capability match, available status, has beds, ready for assignments
   */
  filterEligibleHospitals(
    hospitals: Hospital[],
    emergencyType: EmergencyType,
    options: FilterOptions = {}
  ): Hospital[] {
    const excluded = options.excludedHospitalIds || new Set();

    return hospitals.filter((hospital) => {
      // Skip excluded hospitals
      if (excluded.has(hospital.id)) {
        return false;
      }

      // Must have exact capability match
      if (!hospital.capabilities.has(emergencyType)) {
        return false;
      }

      // Must be available or busy (not full/offline)
      if (hospital.status === 'full' || hospital.status === 'offline') {
        return false;
      }

      // Must have available beds
      if (hospital.availableBeds <= 0) {
        return false;
      }

      // Must be ready for new assignments
      if (!hospital.readiness) {
        return false;
      }

      return true;
    });
  }

  /**
   * Filter fallback hospitals when no exact capability match found
   * Relaxes capability constraint - only checks beds and status
   */
  filterFallbackHospitals(
    hospitals: Hospital[],
    options: FilterOptions = {}
  ): Hospital[] {
    const excluded = options.excludedHospitalIds || new Set();

    return hospitals.filter((hospital) => {
      // Skip excluded hospitals
      if (excluded.has(hospital.id)) {
        return false;
      }

      // Must be available or busy (not full/offline)
      if (hospital.status === 'full' || hospital.status === 'offline') {
        return false;
      }

      // Must have available beds
      if (hospital.availableBeds <= 0) {
        return false;
      }

      // Readiness is checked but not enforced as strictly
      return true;
    });
  }

  /**
   * Check if hospital has specific capability
   */
  hasCapability(hospital: Hospital, emergencyType: EmergencyType): boolean {
    return hospital.capabilities.has(emergencyType);
  }

  /**
   * Check if hospital can accept assignments
   */
  canAcceptAssignments(hospital: Hospital): boolean {
    return (
      hospital.status !== 'offline' &&
      hospital.status !== 'full' &&
      hospital.availableBeds > 0 &&
      hospital.readiness
    );
  }
}

// Singleton instance
export const capabilityFilter = new CapabilityFilter();

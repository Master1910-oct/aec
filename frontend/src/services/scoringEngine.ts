import type { Hospital, Coordinates, EmergencyType, HospitalScore, ScoringWeights } from '@/types';

const DEFAULT_WEIGHTS: ScoringWeights = {
  distance: 0.35,
  capability: 0.25,
  availability: 0.20,
  rating: 0.10,
  sla: 0.10,
};

/**
 * Haversine distance in km between two coordinates.
 */
function haversineDistance(a: Coordinates, b: Coordinates): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * Normalize a value to 0-1 range.
 * For distance: closer = higher score (inverted).
 */
function normalizeInverse(value: number, maxValue: number): number {
  return Math.max(0, 1 - value / maxValue);
}

function normalizeLinear(value: number, maxValue: number): number {
  return Math.min(1, Math.max(0, value / maxValue));
}

/**
 * Score a list of eligible hospitals against the emergency parameters.
 * Returns sorted array, highest score first.
 */
export function scoreHospitals(
  hospitals: Hospital[],
  emergencyLocation: Coordinates,
  emergencyType: EmergencyType,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): HospitalScore[] {
  const MAX_DISTANCE_KM = 30; // normalization ceiling

  const scores: HospitalScore[] = hospitals.map((h) => {
    const distance = haversineDistance(emergencyLocation, h.location);

    // Distance score: closer = better (inverted)
    const distanceScore = normalizeInverse(distance, MAX_DISTANCE_KM);

    // Capability score: exact match = 1, partial (has related) = 0.5, none = 0
    const capabilityScore = h.capabilities.includes(emergencyType) ? 1.0 : 0.3;

    // Availability score: ratio of available beds to total
    const availabilityScore = normalizeLinear(h.availableBeds, h.totalBeds);

    // Rating score: uses hospital reliability score directly (0-1)
    const ratingScore = h.reliabilityScore;

    // SLA score: same as reliability (fed by SLA monitor)
    const slaScore = h.reliabilityScore;

    const totalScore =
      weights.distance * distanceScore +
      weights.capability * capabilityScore +
      weights.availability * availabilityScore +
      weights.rating * ratingScore +
      weights.sla * slaScore;

    return {
      hospitalId: h.id,
      distanceScore,
      capabilityScore,
      availabilityScore,
      ratingScore,
      slaScore,
      totalScore,
      distance,
    };
  });

  return scores.sort((a, b) => b.totalScore - a.totalScore);
}

export { haversineDistance, DEFAULT_WEIGHTS };

import math
from database.db import db
from models.hospital import Hospital
from models.availability import Availability
from models.ambulance import Ambulance


# ===============================
# 📍 Haversine Distance Formula
# ===============================
def calculate_distance(lat1, lon1, lat2, lon2):
    """Return distance in kilometres between two lat/lon points."""
    R = 6371  # Earth radius in KM

    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


# ===============================
# 🏥 Allocate Nearest Hospital
# ===============================
def allocate_hospital(emergency):
    """
    Allocates nearest active hospital that:
    1. Has available beds (> 0)
    2. Supports the emergency type (speciality match)
    Falls back to any available hospital if no speciality match found.
    """

    # Primary query for active hospitals with available beds
    hospitals = (
        Hospital.query
        .join(Availability)
        .filter(Hospital.is_active == True, Availability.available_beds > 0)
        .with_for_update()
        .all()
    )

    emergency_type = (emergency.emergency_type or "").strip().lower()

    def _pick_nearest(candidates):
        nearest = None
        min_distance = float("inf")

        for hospital in candidates:
            distance = calculate_distance(
                emergency.latitude,
                emergency.longitude,
                hospital.latitude,
                hospital.longitude,
            )
            if distance < min_distance:
                min_distance = distance
                nearest = hospital

        return nearest

    # First pass: match by speciality
    speciality_matched = [
        h for h in hospitals
        if emergency_type in h.get_specialities_list()
    ]

    nearest_hospital = _pick_nearest(speciality_matched)

    # Fallback: any available hospital with beds (from our initial query)
    if not nearest_hospital:
        nearest_hospital = _pick_nearest(hospitals)

    if not nearest_hospital:
        return None

    # Reduce available beds (already joined Availability in query)
    if nearest_hospital.availability:
        nearest_hospital.availability.available_beds -= 1

    # Attach hospital to emergency
    emergency.hospital_id = nearest_hospital.hospital_id

    return nearest_hospital


# ===============================
# 🚑 Allocate Ambulance
# ===============================
def allocate_ambulance(emergency, ambulance_id=None):
    """
    If ambulance_id is provided (ambulance-role submission), use that ambulance.
    Otherwise fall back to nearest available ambulance by distance.
    """

    if ambulance_id:
        ambulance = (
            Ambulance.query
            .filter_by(ambulance_id=ambulance_id, status="AVAILABLE")
            .with_for_update()
            .first()
        )
    else:
        ambulances = (
            Ambulance.query
            .filter_by(status="AVAILABLE")
            .with_for_update()
            .all()
        )

        nearest_ambulance = None
        min_distance = float("inf")

        for amb in ambulances:
            distance = calculate_distance(
                emergency.latitude,
                emergency.longitude,
                amb.latitude,
                amb.longitude,
            )
            if distance < min_distance:
                min_distance = distance
                nearest_ambulance = amb

        ambulance = nearest_ambulance

    if not ambulance:
        return None

    ambulance.status = "ON_CALL"
    emergency.ambulance_id = ambulance.ambulance_id

    return ambulance
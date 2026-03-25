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
SPECIALIST_RADIUS_KM = 15

def allocate_hospital(emergency, from_lat, from_lng):
    """
    Returns dict:
      {
        "hospital": Hospital object,
        "needs_transfer": bool,
        "required_speciality": str or None,
        "phase": 1 or 2
      }
    Returns None if no hospital available at all.
    """
    if from_lat is None or from_lng is None:
        return None

    # Primary query for active hospitals with available beds
    all_hospitals = (
        Hospital.query
        .join(Availability)
        .filter(Hospital.is_active == True, Availability.available_beds > 0)
        .with_for_update()
        .all()
    )
    if not all_hospitals:
        return None

    emergency_type = (emergency.emergency_type or "").strip().lower()

    # ── PHASE 1: Specialist within radius ──────────────
    specialist_matches = [
        h for h in all_hospitals
        if emergency_type in h.get_specialities_list()
    ]

    nearby_specialists = []
    for h in specialist_matches:
        dist = calculate_distance(
            from_lat, from_lng,
            h.latitude, h.longitude
        )
        if dist <= SPECIALIST_RADIUS_KM:
            nearby_specialists.append((h, dist))

    if nearby_specialists:
        # Since score_hospital doesn't exist, pick the nearest specialist
        best = min(nearby_specialists, key=lambda x: x[1])
        nearest_hospital = best[0]
        if nearest_hospital.availability:
            nearest_hospital.availability.available_beds -= 1
        return {
            "hospital": nearest_hospital,
            "needs_transfer": False,
            "required_speciality": None,
            "phase": 1
        }

    # ── PHASE 2: Nearest any hospital fallback ─────────
    nearest_hospital = min(
        all_hospitals,
        key=lambda h: calculate_distance(from_lat, from_lng, h.latitude, h.longitude)
    )

    if nearest_hospital.availability:
        nearest_hospital.availability.available_beds -= 1

    return {
        "hospital": nearest_hospital,
        "needs_transfer": True,
        "required_speciality": emergency.emergency_type,
        "phase": 2
    }


def find_transfer_hospital(required_speciality, from_lat, from_lng):
    """
    Used for transfers — finds best specialist hospital
    with no radius limit and re-checks bed availability
    at the exact moment of transfer request.
    Returns Hospital object or None.
    """
    candidates = (
        Hospital.query
        .join(Availability)
        .filter(Hospital.is_active == True, Availability.available_beds > 0)
        .with_for_update()
        .all()
    )

    specialist_candidates = [
        h for h in candidates
        if (required_speciality or "").strip().lower() in h.get_specialities_list()
    ]

    if not specialist_candidates:
        return None

    scored = []
    for h in specialist_candidates:
        dist = calculate_distance(
            from_lat, from_lng,
            h.latitude, h.longitude
        )
        scored.append((h, dist))

    best_hospital = min(scored, key=lambda x: x[1])[0]
    
    if best_hospital.availability:
        best_hospital.availability.available_beds -= 1
        
    return best_hospital


# ===============================
# 🚑 Allocate Ambulance
# ===============================
def allocate_ambulance(emergency, ambulance_id=None):
    """
    If ambulance_id is provided (ambulance-role submission), use that ambulance.
    Otherwise fall back to nearest available ambulance by distance.
    """

    if ambulance_id:
        # 🚑 If id is provided, it's a self-report. 
        # Allow transition from AVAILABLE or ON_CALL (for 108 flow)
        ambulance = (
            Ambulance.query
            .filter(
                Ambulance.ambulance_id == ambulance_id,
                Ambulance.status.in_(["AVAILABLE", "ON_CALL"])
            )
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
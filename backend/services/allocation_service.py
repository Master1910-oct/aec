import math
from database.db import db
from models.hospital import Hospital
from models.availability import Availability
from models.ambulance import Ambulance


# ===============================
# 📍 Haversine Distance Formula
# ===============================
def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Calculate distance between two lat/lon points using Haversine formula
    Returns distance in kilometers
    """
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
    Allocates nearest active hospital with available beds
    """

    hospitals = Hospital.query.filter_by(is_active=True).all()

    nearest_hospital = None
    min_distance = float("inf")

    for hospital in hospitals:

        availability = Availability.query.filter_by(
            hospital_id=hospital.hospital_id
        ).first()

        if availability and availability.available_beds > 0:

            distance = calculate_distance(
                emergency.latitude,
                emergency.longitude,
                hospital.latitude,
                hospital.longitude,
            )

            if distance < min_distance:
                min_distance = distance
                nearest_hospital = hospital

    if not nearest_hospital:
        return None

    # Reduce available beds
    availability = Availability.query.filter_by(
        hospital_id=nearest_hospital.hospital_id
    ).first()

    availability.available_beds -= 1

    # Attach hospital to emergency
    emergency.hospital_id = nearest_hospital.hospital_id

    return nearest_hospital


# ===============================
# 🚑 Allocate Nearest Ambulance
# ===============================
def allocate_ambulance(emergency):
    """
    Allocates nearest ambulance with status AVAILABLE
    """

    # ✅ FIXED: Use status instead of is_available
    ambulances = Ambulance.query.filter_by(status="AVAILABLE").all()

    nearest_ambulance = None
    min_distance = float("inf")

    for ambulance in ambulances:

        distance = calculate_distance(
            emergency.latitude,
            emergency.longitude,
            ambulance.latitude,
            ambulance.longitude,
        )

        if distance < min_distance:
            min_distance = distance
            nearest_ambulance = ambulance

    if not nearest_ambulance:
        return None

    # ✅ FIXED: Update status instead of boolean
    nearest_ambulance.status = "ON_CALL"

    # Attach ambulance to emergency
    emergency.ambulance_id = nearest_ambulance.ambulance_id

    return nearest_ambulance
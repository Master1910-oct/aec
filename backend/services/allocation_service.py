from database.db import db
from models import Hospital, Availability, Ambulance
import math


# 📏 Haversine Distance Formula (KM)
def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in km

    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = (
        math.sin(dlat / 2) ** 2 +
        math.cos(math.radians(lat1)) *
        math.cos(math.radians(lat2)) *
        math.sin(dlon / 2) ** 2
    )

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


# 🏥 Allocate Nearest Hospital with Available Beds
def allocate_hospital(emergency):

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
                hospital.longitude
            )

            if distance < min_distance:
                min_distance = distance
                nearest_hospital = hospital

    if nearest_hospital:

        # Reduce bed count
        availability = Availability.query.filter_by(
            hospital_id=nearest_hospital.hospital_id
        ).first()

        availability.available_beds -= 1

        # Assign hospital to emergency
        emergency.hospital_id = nearest_hospital.hospital_id

        return nearest_hospital

    return None


# 🚑 Allocate First Available Ambulance
def allocate_ambulance(emergency):

    ambulance = Ambulance.query.filter_by(status="AVAILABLE").first()

    if ambulance:

        ambulance.status = "ON_CALL"

        emergency.ambulance_id = ambulance.ambulance_id

        return ambulance

    return None
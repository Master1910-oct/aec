from database.db import db
from models import Hospital, Availability, Ambulance


# 🚑 Allocate Hospital Based on Available Beds
def allocate_hospital(emergency):
    hospitals = Hospital.query.all()

    for hospital in hospitals:
        availability = Availability.query.filter_by(
            hospital_id=hospital.hospital_id
        ).first()

        if availability and availability.available_beds > 0:
            emergency.assigned_hospital_id = hospital.hospital_id
            emergency.status = "hospital_assigned"

            availability.available_beds -= 1
            db.session.commit()

            return hospital

    return None


# 🚑 Allocate First Available Ambulance
def allocate_ambulance(emergency):
    ambulance = Ambulance.query.filter_by(is_available=True).first()

    if ambulance:
        ambulance.is_available = False
        emergency.assigned_ambulance_id = ambulance.ambulance_id
        emergency.status = "ambulance_assigned"

        db.session.commit()

        return ambulance

    return None
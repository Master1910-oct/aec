from database.db import db
from models import EmergencyRequest
from services.allocation_service import (
    allocate_hospital,
    allocate_ambulance
)


# 🚨 Create Emergency + Allocate Resources
def create_emergency(data):
    try:
        emergency = EmergencyRequest(
            patient_name=data["patient_name"],
            phone_number=data.get("phone_number"),
            latitude=data["latitude"],
            longitude=data["longitude"],
            emergency_type=data.get("emergency_type"),
            status="pending"
        )

        db.session.add(emergency)
        db.session.flush()  # get ID without committing

        hospital = allocate_hospital(emergency)
        if not hospital:
            db.session.rollback()
            return None, "No hospital available"

        ambulance = allocate_ambulance(emergency)
        if not ambulance:
            db.session.rollback()
            return None, "No ambulance available"

        emergency.status = "allocated"

        db.session.commit()

        return {
            "emergency": emergency,
            "hospital": hospital,
            "ambulance": ambulance
        }, None

    except Exception as e:
        db.session.rollback()
        return None, str(e)


# 📄 Fetch All Emergencies
def get_all_emergencies():
    return EmergencyRequest.query.all()


# 🔄 Update Emergency Status
def update_emergency_status(emergency_id, new_status):
    emergency = EmergencyRequest.query.get(emergency_id)

    if not emergency:
        return None

    emergency.status = new_status
    db.session.commit()

    return emergency
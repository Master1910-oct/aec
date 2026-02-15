from flask import Blueprint, request
from database.db import db
from models import EmergencyRequest
from services.allocation_service import (
    allocate_hospital,
    allocate_ambulance
)
from utils.response import success_response, error_response


emergency_bp = Blueprint(
    "emergency_bp",
    __name__,
    url_prefix="/api/v1/emergency"
)


# 🚑 CREATE EMERGENCY
@emergency_bp.route("/", methods=["POST"])
def create_emergency():
    try:
        data = request.get_json()

        # 🔎 Basic Validation
        if not data or \
           "patient_name" not in data or \
           "latitude" not in data or \
           "longitude" not in data:

            return error_response(
                "patient_name, latitude and longitude are required",
                400
            )

        # 📝 Create Emergency (without commit)
        emergency = EmergencyRequest(
            patient_name=data["patient_name"],
            phone_number=data.get("phone_number"),
            latitude=data["latitude"],
            longitude=data["longitude"],
            emergency_type=data.get("emergency_type"),
            status="pending"
        )

        db.session.add(emergency)
        db.session.flush()  # Get emergency_id without committing

        # 🏥 Allocate Hospital
        hospital = allocate_hospital(emergency)
        if not hospital:
            db.session.rollback()
            return error_response("No hospital available", 400)

        # 🚑 Allocate Ambulance
        ambulance = allocate_ambulance(emergency)
        if not ambulance:
            db.session.rollback()
            return error_response("No ambulance available", 400)

        # ✅ Update Status
        emergency.status = "allocated"

        db.session.commit()

        return success_response(
            message="Emergency created successfully",
            data={
                "emergency_id": emergency.emergency_id,
                "status": emergency.status,
                "hospital_id": hospital.hospital_id,
                "ambulance_id": ambulance.ambulance_id
            },
            status=201
        )

    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 500)


# 📄 GET ALL EMERGENCIES
@emergency_bp.route("/", methods=["GET"])
def get_all_emergencies():
    try:
        emergencies = EmergencyRequest.query.all()

        response = []
        for e in emergencies:
            response.append({
                "emergency_id": e.emergency_id,
                "patient_name": e.patient_name,
                "latitude": e.latitude,
                "longitude": e.longitude,
                "status": e.status,
                "hospital_id": e.hospital_id,
                "ambulance_id": e.ambulance_id,
                "created_at": e.created_at
            })

        return success_response(
            message="Emergencies fetched successfully",
            data=response
        )

    except Exception as e:
        return error_response(str(e), 500)


# 🔄 UPDATE EMERGENCY STATUS (Lifecycle)
@emergency_bp.route("/<int:emergency_id>/status", methods=["PATCH"])
def update_emergency_status(emergency_id):
    try:
        data = request.get_json()
        new_status = data.get("status")

        if not new_status:
            return error_response("Status is required", 400)

        emergency = EmergencyRequest.query.get(emergency_id)

        if not emergency:
            return error_response("Emergency not found", 404)

        # 🏁 If case completed → release resources
        if new_status == "completed":

            # 🚑 Release ambulance
            if emergency.ambulance:
                emergency.ambulance.is_available = True

            # 🏥 Increase hospital bed count
            if emergency.hospital and emergency.hospital.availability:
                emergency.hospital.availability.available_beds += 1

        emergency.status = new_status
        db.session.commit()

        return success_response(
            message="Emergency status updated successfully",
            data={
                "emergency_id": emergency.emergency_id,
                "new_status": emergency.status
            }
        )

    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 500)
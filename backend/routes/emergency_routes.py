from flask import Blueprint, request
from datetime import datetime, timedelta
from database.db import db
from models import EmergencyRequest
from services.allocation_service import allocate_hospital, allocate_ambulance
from services.state_machine import EmergencyStateMachine
from utils.response import success_response, error_response
from utils.decorators import token_required, roles_required


emergency_bp = Blueprint(
    "emergency_bp",
    __name__,
    url_prefix="/api/v1/emergency"
)


# ==========================================
# 🚑 CREATE EMERGENCY
# ==========================================
@emergency_bp.route("/", methods=["POST"])
@token_required
@roles_required("admin", "dispatcher")
def create_emergency():
    try:
        data = request.get_json()

        # ✅ Basic Validation
        required_fields = ["patient_name", "latitude", "longitude", "emergency_type"]
        if not data or not all(field in data for field in required_fields):
            return error_response(
                "patient_name, latitude, longitude and emergency_type are required",
                400
            )

        severity = data.get("severity", "medium").lower()

        # ✅ Validate severity
        allowed_severities = ["critical", "high", "medium", "low"]
        if severity not in allowed_severities:
            return error_response(
                "Severity must be one of: critical, high, medium, low",
                400
            )

        # 📝 Create Emergency (no commit yet)
        emergency = EmergencyRequest(
            patient_name=data["patient_name"],
            latitude=data["latitude"],
            longitude=data["longitude"],
            emergency_type=data["emergency_type"],
            severity=severity,
            status="pending"
        )

        # 🔥 Assign SLA Based on Severity
        if severity == "critical":
            emergency.sla_deadline = datetime.utcnow() + timedelta(minutes=5)
        elif severity == "high":
            emergency.sla_deadline = datetime.utcnow() + timedelta(minutes=10)
        elif severity == "medium":
            emergency.sla_deadline = datetime.utcnow() + timedelta(minutes=20)
        else:
            emergency.sla_deadline = datetime.utcnow() + timedelta(minutes=30)

        db.session.add(emergency)
        db.session.flush()  # Get ID before allocation

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

        # ✅ Final Status
        emergency.status = "allocated"

        db.session.commit()

        return success_response(
            message="Emergency created and resources allocated successfully",
            data={
                "emergency_id": emergency.emergency_id,
                "severity": emergency.severity,
                "status": emergency.status,
                "sla_deadline": emergency.sla_deadline,
                "hospital_id": hospital.hospital_id,
                "ambulance_id": ambulance.ambulance_id
            },
            status=201
        )

    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 500)


# ==========================================
# 📄 GET ALL EMERGENCIES
# ==========================================
@emergency_bp.route("/", methods=["GET"])
def get_all_emergencies():
    try:
        emergencies = EmergencyRequest.query.order_by(
            EmergencyRequest.created_at.desc()
        ).all()

        response = []

        for e in emergencies:
            # 🔥 Auto SLA Overdue Detection
            is_overdue = False
            if e.sla_deadline and e.status not in ["completed", "cancelled"]:
                if datetime.utcnow() > e.sla_deadline:
                    is_overdue = True

            response.append({
                "emergency_id": e.emergency_id,
                "patient_name": e.patient_name,
                "latitude": e.latitude,
                "longitude": e.longitude,
                "emergency_type": e.emergency_type,
                "severity": e.severity,
                "status": e.status,
                "hospital_id": e.hospital_id,
                "ambulance_id": e.ambulance_id,
                "sla_deadline": e.sla_deadline,
                "is_overdue": is_overdue,
                "created_at": e.created_at
            })

        return success_response(
            message="Emergencies fetched successfully",
            data=response
        )

    except Exception as e:
        return error_response(str(e), 500)


# ==========================================
# 🔄 UPDATE EMERGENCY STATUS
# ==========================================
@emergency_bp.route("/<int:emergency_id>/status", methods=["PATCH"])
@token_required
@roles_required("admin", "dispatcher")
def update_emergency_status(emergency_id):
    try:
        data = request.get_json()

        if not data or "status" not in data:
            return error_response("Status is required", 400)

        new_status = data["status"].lower()

        emergency = EmergencyRequest.query.get(emergency_id)

        if not emergency:
            return error_response("Emergency not found", 404)

        previous_status = emergency.status

        # 🔥 STATE MACHINE VALIDATION
        if not EmergencyStateMachine.can_transition(
                previous_status, new_status):
            return error_response(
                f"Invalid status transition from '{previous_status}' to '{new_status}'",
                400
            )

        # ✅ If moving to completed → release resources
        if new_status == "completed":

            # 🚑 Release ambulance
            if emergency.ambulance:
                emergency.ambulance.status = "AVAILABLE"

            # 🏥 Increase hospital beds
            if emergency.hospital and emergency.hospital.availability:
                emergency.hospital.availability.available_beds += 1

        emergency.status = new_status

        db.session.commit()

        return success_response(
            message="Emergency status updated successfully",
            data={
                "emergency_id": emergency.emergency_id,
                "previous_status": previous_status,
                "new_status": new_status
            }
        )

    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 500)

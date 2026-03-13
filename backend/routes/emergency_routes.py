from flask import Blueprint, request, g
from datetime import datetime, timedelta
from database.db import db
from models import EmergencyRequest
from models.ambulance import Ambulance
from services.allocation_service import allocate_hospital, allocate_ambulance
from services.state_machine import EmergencyStateMachine
from extensions.socketio_ext import socketio
from utils.response import success_response, error_response
from utils.decorators import token_required, roles_required


emergency_bp = Blueprint(
    "emergency_bp",
    __name__,
    url_prefix="/api/v1/emergency"
)


# ==========================================
# 🚑 CREATE EMERGENCY (Ambulance role)
# ==========================================
@emergency_bp.route("/", methods=["POST"])
@token_required
@roles_required("admin", "dispatcher", "ambulance")
def create_emergency():
    try:
        data = request.get_json()
        user = g.current_user

        # Required fields
        required_fields = ["latitude", "longitude", "emergency_type"]
        if not data or not all(field in data for field in required_fields):
            return error_response(
                "latitude, longitude and emergency_type are required", 400
            )

        severity = data.get("severity", "medium").lower()
        allowed_severities = ["critical", "high", "medium", "low"]
        if severity not in allowed_severities:
            return error_response(
                "Severity must be one of: critical, high, medium, low", 400
            )

        allowed_types = ["trauma", "cardiac", "respiratory", "neurological", "other"]
        emergency_type = data.get("emergency_type", "other").lower()
        if emergency_type not in allowed_types:
            return error_response(
                "emergency_type must be one of: " + ", ".join(allowed_types), 400
            )

        # Create Emergency
        emergency = EmergencyRequest(
            patient_name=data.get("patient_name", "Unknown Patient"),
            accident_description=data.get("accident_description", ""),
            latitude=data["latitude"],
            longitude=data["longitude"],
            emergency_type=emergency_type,
            severity=severity,
            status="pending",
            acknowledged=False,
        )

        # SLA Deadlines
        sla_map = {"critical": 5, "high": 10, "medium": 20, "low": 30}
        emergency.sla_deadline = datetime.utcnow() + timedelta(minutes=sla_map[severity])

        db.session.add(emergency)
        db.session.flush()  # get ID before allocation

        # Allocate Hospital (with speciality match)
        hospital = allocate_hospital(emergency)
        if not hospital:
            db.session.rollback()
            return error_response("No hospital available", 400)

        # Allocate Ambulance — use the requesting ambulance if role is ambulance
        ambulance_id = None
        if user["role"] == "ambulance" and user.get("entity_id"):
            ambulance_id = user["entity_id"]

        ambulance = allocate_ambulance(emergency, ambulance_id=ambulance_id)
        if not ambulance:
            db.session.rollback()
            return error_response("No ambulance available", 400)

        emergency.status = "allocated"
        db.session.commit()

        response_data = emergency.to_dict()

        # 🔥 WebSocket: notify hospital and admin
        payload = {
            "emergency_id": emergency.emergency_id,
            "severity": emergency.severity,
            "emergency_type": emergency.emergency_type,
            "patient_name": emergency.patient_name,
            "accident_description": emergency.accident_description,
            "ambulance": emergency.ambulance.to_dict() if emergency.ambulance else None,
        }
        socketio.emit("emergency_allocated", payload, room=f"hospital_{hospital.hospital_id}")
        socketio.emit("emergency_allocated", payload, room="admin")

        return success_response(
            message="Emergency created and resources allocated successfully",
            data=response_data,
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

        return success_response(
            message="Emergencies fetched successfully",
            data=[e.to_dict() for e in emergencies]
        )

    except Exception as e:
        return error_response(str(e), 500)


# ==========================================
# 🔄 UPDATE EMERGENCY STATUS (Ambulance)
# ==========================================
@emergency_bp.route("/<int:emergency_id>/status", methods=["POST"])
@token_required
@roles_required("admin", "dispatcher", "ambulance")
def update_emergency_status(emergency_id):
    try:
        data = request.get_json()

        if not data or "status" not in data:
            return error_response("status is required", 400)

        new_status = data["status"].lower()

        emergency = EmergencyRequest.query.get(emergency_id)
        if not emergency:
            return error_response("Emergency not found", 404)

        # Ambulance can only update their own emergency
        user = g.current_user
        if user["role"] == "ambulance":
            if emergency.ambulance_id != user.get("entity_id"):
                return error_response("Access denied — not your emergency", 403)

        previous_status = emergency.status

        if not EmergencyStateMachine.can_transition(previous_status, new_status):
            return error_response(
                f"Invalid status transition from '{previous_status}' to '{new_status}'", 400
            )

        # On completion → free resources
        if new_status == "completed":
            if emergency.ambulance:
                emergency.ambulance.status = "AVAILABLE"
            if emergency.hospital and emergency.hospital.availability:
                emergency.hospital.availability.available_beds += 1

        emergency.status = new_status
        db.session.commit()

        # 🔥 WebSocket: notify admin (and ambulance room if status changes)
        event_payload = {
            "emergency_id": emergency_id,
            "previous_status": previous_status,
            "new_status": new_status,
        }
        socketio.emit("emergency_status_updated", event_payload, room="admin")
        if emergency.ambulance_id:
            socketio.emit("emergency_status_updated", event_payload,
                          room=f"ambulance_{emergency.ambulance_id}")

        return success_response(
            message="Emergency status updated successfully",
            data={
                "emergency_id": emergency_id,
                "previous_status": previous_status,
                "new_status": new_status,
            }
        )

    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 500)


# ==========================================
# ✅ ACKNOWLEDGE EMERGENCY (Hospital)
# ==========================================
@emergency_bp.route("/<int:emergency_id>/acknowledge", methods=["POST"])
@token_required
@roles_required("admin", "hospital")
def acknowledge_emergency(emergency_id):
    try:
        emergency = EmergencyRequest.query.get(emergency_id)
        if not emergency:
            return error_response("Emergency not found", 404)

        # Hospital can only acknowledge emergencies assigned to them
        user = g.current_user
        if user["role"] == "hospital":
            if emergency.hospital_id != user.get("entity_id"):
                return error_response("Access denied — not your emergency", 403)

        if emergency.acknowledged:
            return error_response("Emergency already acknowledged", 400)

        emergency.acknowledged = True
        db.session.commit()

        # 🔥 WebSocket: notify ambulance + admin
        payload = {
            "emergency_id": emergency_id,
            "hospital_id": emergency.hospital_id,
            "hospital_name": emergency.hospital.name if emergency.hospital else None,
        }
        if emergency.ambulance_id:
            socketio.emit("emergency_acknowledged", payload,
                          room=f"ambulance_{emergency.ambulance_id}")
        socketio.emit("emergency_acknowledged", payload, room="admin")

        return success_response(
            message="Emergency acknowledged",
            data={"emergency_id": emergency_id, "acknowledged": True}
        )

    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 500)


# ==========================================
# 🔧 LEGACY: PATCH STATUS (admin/dispatcher)
# ==========================================
@emergency_bp.route("/<int:emergency_id>/status", methods=["PATCH"])
@token_required
@roles_required("admin", "dispatcher")
def patch_emergency_status(emergency_id):
    """Legacy PATCH endpoint for admin/dispatcher status overrides."""
    return update_emergency_status(emergency_id)

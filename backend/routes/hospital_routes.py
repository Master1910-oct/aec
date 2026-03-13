from flask import Blueprint, request, g
from database.db import db
from models import Hospital, Availability, EmergencyRequest
from extensions.socketio_ext import socketio
from utils.response import success_response, error_response
from utils.decorators import token_required, roles_required

hospital_bp = Blueprint("hospital", __name__)


# ==========================================
# 🏥 GET ALL HOSPITALS
# ==========================================
@hospital_bp.route("/", methods=["GET"])
@token_required
@roles_required("admin", "dispatcher", "ambulance")
def get_hospitals():
    hospitals = Hospital.query.filter_by(is_active=True).all()
    return success_response(
        message="Hospitals fetched successfully",
        data=[h.to_dict() for h in hospitals]
    )


# ==========================================
# 🏥 GET CURRENT HOSPITAL (for hospital user)
# ==========================================
@hospital_bp.route("/me", methods=["GET"])
@token_required
@roles_required("hospital")
def get_my_hospital():
    entity_id = g.current_user.get("entity_id")
    if not entity_id:
        return error_response("No linked hospital found", 404)

    hospital = Hospital.query.get(entity_id)
    if not hospital:
        return error_response("Hospital not found", 404)

    return success_response(message="Hospital fetched", data=hospital.to_dict())


# ==========================================
# 🏥 GET HOSPITAL EMERGENCIES
# ==========================================
@hospital_bp.route("/<int:hospital_id>/emergencies", methods=["GET"])
@token_required
@roles_required("admin", "hospital")
def get_hospital_emergencies(hospital_id):
    # Hospital users can only see their own
    user = g.current_user
    if user["role"] == "hospital" and user.get("entity_id") != hospital_id:
        return error_response("Access denied", 403)

    active_statuses = ["pending", "allocated", "en_route", "arrived", "in_progress", "escalated"]
    resolved_statuses = ["completed", "cancelled"]

    active = EmergencyRequest.query.filter(
        EmergencyRequest.hospital_id == hospital_id,
        EmergencyRequest.status.in_(active_statuses)
    ).order_by(EmergencyRequest.created_at.desc()).all()

    resolved = EmergencyRequest.query.filter(
        EmergencyRequest.hospital_id == hospital_id,
        EmergencyRequest.status.in_(resolved_statuses)
    ).order_by(EmergencyRequest.created_at.desc()).limit(20).all()

    return success_response(
        message="Hospital emergencies fetched",
        data={
            "active": [e.to_dict() for e in active],
            "resolved": [e.to_dict() for e in resolved],
        }
    )


# ==========================================
# 🛏  UPDATE BED AVAILABILITY
# ==========================================
@hospital_bp.route("/<int:hospital_id>/beds", methods=["PUT"])
@token_required
@roles_required("admin", "hospital")
def update_beds(hospital_id):
    user = g.current_user
    if user["role"] == "hospital" and user.get("entity_id") != hospital_id:
        return error_response("Access denied", 403)

    data = request.get_json()
    if not data or "available_beds" not in data:
        return error_response("available_beds is required", 400)

    beds = data["available_beds"]
    if not isinstance(beds, int) or beds < 0:
        return error_response("available_beds must be a non-negative integer", 400)

    availability = Availability.query.filter_by(hospital_id=hospital_id).first()
    if not availability:
        return error_response("Availability record not found", 404)

    availability.available_beds = beds
    db.session.commit()

    status = "GREEN" if beds > 0 else "RED"
    payload = {"hospital_id": hospital_id, "available_beds": beds, "status": status}

    # 🔥 WebSocket broadcast
    socketio.emit("availability_updated", payload, room="admin")

    return success_response(message="Bed availability updated", data=payload)

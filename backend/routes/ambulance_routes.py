from flask import Blueprint, request, g
from datetime import datetime
from database.db import db
from models import Ambulance, EmergencyRequest, Hospital
from extensions.socketio_ext import socketio
from utils.response import success_response, error_response
from utils.decorators import token_required, roles_required

ambulance_bp = Blueprint("ambulance_bp", __name__, url_prefix="/api/v1/ambulance")


# ==========================================
# 📍 UPDATE AMBULANCE LOCATION
# ==========================================
@ambulance_bp.route("/location", methods=["POST"])
@token_required
@roles_required("ambulance")
def update_location():
    try:
        data = request.get_json()
        if not data or "latitude" not in data or "longitude" not in data:
            return error_response("latitude and longitude are required", 400)

        user = g.current_user
        ambulance_id = user.get("entity_id")
        if not ambulance_id:
            return error_response("No linked ambulance entity found", 404)

        ambulance = Ambulance.query.get(ambulance_id)
        if not ambulance:
            return error_response("Ambulance not found", 404)

        # Update tracking columns
        ambulance.latitude = data["latitude"]
        ambulance.longitude = data["longitude"]
        ambulance.last_latitude = data["latitude"]
        ambulance.last_longitude = data["longitude"]
        ambulance.last_location_updated_at = datetime.utcnow()
        
        db.session.commit()

        # Emit payload
        payload = {
            "ambulance_id": ambulance_id,
            "latitude": ambulance.latitude,
            "longitude": ambulance.longitude,
            "timestamp": ambulance.last_location_updated_at.isoformat(),
        }

        # 1. Emit to admin
        socketio.emit("ambulance_location_update", payload, room="admin")

        # 2. Emit to self
        socketio.emit("ambulance_location_update", payload, room=f"ambulance_{ambulance_id}")

        # 3. Emit to hospital if assigned to an active emergency
        active_emergency = EmergencyRequest.query.filter(
            EmergencyRequest.ambulance_id == ambulance_id,
            EmergencyRequest.status.notin_(["completed", "cancelled", "escalated"])
        ).first()

        if active_emergency and active_emergency.hospital_id:
            socketio.emit(
                "ambulance_location_update", 
                payload, 
                room=f"hospital_{active_emergency.hospital_id}"
            )

        return success_response(message="Location updated", data={"status": "ok"})

    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 500)


# ==========================================
# 📍 GET AMBULANCE LOCATIONS
# ==========================================
@ambulance_bp.route("/locations", methods=["GET"])
@token_required
@roles_required("admin", "hospital")
def get_ambulance_locations():
    user = g.current_user
    
    if user["role"] == "admin":
        # Admin sees all ambulances
        ambulances = Ambulance.query.all()
    else:
        # Hospital only sees ambulance assigned to their active emergencies
        hospital_id = user.get("entity_id")
        active_emergencies = EmergencyRequest.query.filter(
            EmergencyRequest.hospital_id == hospital_id,
            EmergencyRequest.status.notin_(["completed", "cancelled", "escalated"])
        ).all()
        
        ambulance_ids = [e.ambulance_id for e in active_emergencies if e.ambulance_id]
        if not ambulance_ids:
            return success_response(message="No assigned ambulances", data=[])
            
        ambulances = Ambulance.query.filter(Ambulance.ambulance_id.in_(ambulance_ids)).all()

    return success_response(
        message="Ambulance locations fetched",
        data=[a.to_dict() for a in ambulances]
    )


# ==========================================
# 📍 GET CURRENT AMBULANCE (for ambulance user)
# ==========================================
@ambulance_bp.route("/me", methods=["GET"])
@token_required
@roles_required("ambulance")
def get_my_ambulance():
    entity_id = g.current_user.get("entity_id")
    if not entity_id:
        return error_response("No linked ambulance found", 404)

    ambulance = Ambulance.query.get(entity_id)
    if not ambulance:
        return error_response("Ambulance not found", 404)

    return success_response(message="Ambulance fetched", data=ambulance.to_dict())

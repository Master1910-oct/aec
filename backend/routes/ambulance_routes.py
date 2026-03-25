from flask import Blueprint, request, g
from datetime import datetime
from database.db import db
from models import Ambulance, EmergencyRequest, Hospital, LocationHistory, SceneDispatch
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
# 📦 BATCH SYNC OFFLINE GPS LOCATIONS
# ==========================================
@ambulance_bp.route("/location/batch", methods=["POST"])
@token_required
@roles_required("ambulance")
def update_location_batch():
    """
    Accepts a batch of GPS records collected while the device was offline.
    Security: each record's ambulance_id is validated against the JWT entity_id.
    Timestamp guard: only the newest record updates ambulance.latitude/longitude.
    Full trail: every record is saved to location_history.
    """
    data = request.get_json()
    records = data.get("records", [])

    if not records:
        return error_response("No records provided", 400)

    # Security: verify entity_id exists in token
    if not g.current_user.get("entity_id"):
        return error_response("Invalid token: missing entity_id", 403)

    ambulance = Ambulance.query.filter_by(
        user_id=g.current_user["user_id"]
    ).first_or_404()

    processed = 0
    skipped = 0

    for record in records:
        # Security: reject if ambulance_id doesn’t match JWT entity_id
        if record.get("ambulance_id") != g.current_user["entity_id"]:
            return error_response("Unauthorized record in batch", 403)

        # Validate coordinates are within valid ranges
        lat = record.get("latitude")
        lon = record.get("longitude")
        if lat is None or lon is None or not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
            skipped += 1
            continue

        try:
            recorded_at = datetime.fromisoformat(record["timestamp"])
        except (ValueError, KeyError):
            skipped += 1
            continue

        # Only update ambulance’s current position if this record is newer
        if (ambulance.last_location_updated_at is None or
                recorded_at > ambulance.last_location_updated_at):
            ambulance.latitude = lat
            ambulance.longitude = lon
            ambulance.last_location_updated_at = recorded_at

        # Always append to location_history (full trail for all ambulances)
        history = LocationHistory(
            ambulance_id=ambulance.ambulance_id,
            latitude=lat,
            longitude=lon,
            recorded_at=recorded_at,
            synced_at=datetime.utcnow(),
            is_offline_record=True
        )
        db.session.add(history)
        processed += 1

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return error_response("Database error during batch insert", 500)

    # Emit latest position to admin room after sync
    socketio.emit("ambulance_location_update", {
        "ambulance_id": ambulance.ambulance_id,
        "latitude": ambulance.latitude,
        "longitude": ambulance.longitude,
        "synced_from_offline": True
    }, room="admin")

    return success_response(
        message="Batch processed",
        data={"processed": processed, "skipped": skipped}
    )


# ==========================================
# 📍 GET AMBULANCE LOCATIONS
# ==========================================
@ambulance_bp.route("/locations", methods=["GET"])
@token_required
@roles_required("admin", "hospital", "ambulance")
def get_ambulance_locations():
    user = g.current_user
    
    if user["role"] == "admin":
        # Admin sees all ambulances
        ambulances = Ambulance.query.all()
    elif user["role"] == "hospital":
        # Hospital only sees ambulance assigned to their active emergencies
        hospital_id = user.get("entity_id")
        if not hospital_id:
            return success_response(message="No linked hospital found", data=[])
            
        active_emergencies = EmergencyRequest.query.filter(
            EmergencyRequest.hospital_id == hospital_id,
            EmergencyRequest.status.notin_(["completed", "cancelled", "escalated"])
        ).all()
        
        ambulance_ids = [e.ambulance_id for e in active_emergencies if e.ambulance_id]
        if not ambulance_ids:
            return success_response(message="No assigned ambulances", data=[])
            
        ambulances = Ambulance.query.filter(Ambulance.ambulance_id.in_(ambulance_ids)).all()
    else:
        # Ambulance role — return only their own
        ambulance_id = user.get("entity_id")
        if not ambulance_id:
            return success_response(message="No linked ambulance found", data=[])
        ambulances = Ambulance.query.filter_by(ambulance_id=ambulance_id).all()

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


# ==========================================
# 📍 GET ACTIVE SCENE DISPATCH
# ==========================================
@ambulance_bp.route("/dispatch", methods=["GET"])
@token_required
@roles_required("ambulance")
def get_active_dispatch():
    try:
        ambulance_id = g.current_user.get("entity_id")
        if not ambulance_id:
            return error_response("No linked ambulance found", 404)

        # Find latest active dispatch ('en_route_to_scene') for this ambulance
        dispatch = SceneDispatch.query.filter_by(
            assigned_ambulance_id=ambulance_id,
            status='en_route_to_scene'
        ).order_by(SceneDispatch.dispatched_at.desc()).first()

        if not dispatch:
            return success_response(message="No active dispatch", data=None)

        return success_response(message="Active dispatch fetched", data=dispatch.to_dict())

    except Exception as e:
        return error_response(str(e), 500)

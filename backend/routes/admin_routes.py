from flask import Blueprint, request, g
from datetime import datetime, timedelta
from database.db import db
from models import User, Hospital, Ambulance, Availability, EmergencyRequest, SceneDispatch
from extensions.socketio_ext import socketio
from utils.response import success_response, error_response
from utils.decorators import token_required, roles_required
from services.allocation_service import allocate_hospital, allocate_ambulance
from services.state_machine import EmergencyStateMachine
import random
import string
from services.allocation_service import calculate_distance

admin_bp = Blueprint("admin_bp", __name__, url_prefix="/api/v1/admin")

VALID_SPECIALITIES = [
    "trauma", "cardiac", "respiratory", "neurological",
    "orthopaedic", "maternity", "ophthalmology", "ent",
    "paediatric", "oncology", "dermatology", "urology",
    "psychiatry", "other"
]

ALLOWED_EMERGENCY_TYPES = VALID_SPECIALITIES
SLA_MAP = {"critical": 5, "high": 10, "medium": 20, "low": 30}


# ─────────────────────────────────────────
# Helper: generate secure random password
# ─────────────────────────────────────────
def generate_password(length=12) -> str:
    chars = string.ascii_letters + string.digits + "!@#$"
    password = [
        random.choice(string.ascii_uppercase),
        random.choice(string.ascii_lowercase),
        random.choice(string.digits),
        random.choice("!@#$"),
    ]
    password += random.choices(chars, k=length - 4)
    random.shuffle(password)
    return "".join(password)


# ==========================================
# 🔑 RESET USER PASSWORD (Admin only)
# ==========================================
@admin_bp.route("/users/<int:user_id>/reset-password", methods=["POST"])
@token_required
@roles_required("admin")
def reset_user_password(user_id):
    """
    Generates a new random password for any user.
    Returns the new password ONCE — admin must share it with the user.
    """
    try:
        user = User.query.get(user_id)
        if not user:
            return error_response("User not found", 404)

        if user.email.startswith("DEACTIVATED_"):
            return error_response("Cannot reset password for a deactivated user", 400)

        new_password = generate_password()
        user.set_password(new_password)
        db.session.commit()

        # Build context info for the response
        entity_info = None
        if user.hospital:
            entity_info = {
                "type":   "hospital",
                "id":     user.hospital.hospital_id,
                "name":   user.hospital.name,
            }
        elif user.ambulance:
            entity_info = {
                "type":   "ambulance",
                "id":     user.ambulance.ambulance_id,
                "name":   user.ambulance.vehicle_number,
                "driver": user.ambulance.driver_name,
            }

        return success_response(
            message="Password reset successfully. Share this password with the user — it will not be shown again.",
            data={
                "user_id":      user_id,
                "name":         user.name,
                "email":        user.email,
                "role":         user.role,
                "new_password": new_password,   # shown ONCE
                "entity":       entity_info,
                "reset_at":     datetime.utcnow().isoformat(),
            }
        )

    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 500)


# ==========================================
# 📞 108 CALL CENTER DISPATCH
# ==========================================
@admin_bp.route("/dispatch", methods=["POST"])
@token_required
@roles_required("admin", "dispatcher")
def dispatch_108():
    try:
        data = request.get_json()

        required = ["latitude", "longitude", "emergency_type", "severity"]
        if not data or not all(f in data for f in required):
            return error_response("latitude, longitude, emergency_type and severity are required", 400)

        emergency_type = data["emergency_type"].lower()
        severity       = data["severity"].lower()

        if emergency_type not in ALLOWED_EMERGENCY_TYPES:
            return error_response(f"Invalid emergency_type. Must be one of: {', '.join(ALLOWED_EMERGENCY_TYPES)}", 400)

        if severity not in ["critical", "high", "medium", "low"]:
            return error_response("Severity must be: critical, high, medium, or low", 400)

        emergency = EmergencyRequest(
            patient_name         = data.get("patient_name", "Unknown Caller"),
            accident_description = data.get("description", ""),
            latitude             = data["latitude"],
            longitude            = data["longitude"],
            emergency_type       = emergency_type,
            severity             = severity,
            acknowledged         = False,
        )

        EmergencyStateMachine(emergency).initialize()
        emergency.sla_deadline = datetime.utcnow() + timedelta(minutes=SLA_MAP[severity])

        db.session.add(emergency)
        db.session.flush()

        hospital = allocate_hospital(emergency)
        if not hospital:
            db.session.rollback()
            return error_response("No hospital available in the area", 400)

        ambulance = allocate_ambulance(emergency, ambulance_id=None)
        if not ambulance:
            db.session.rollback()
            return error_response("No ambulance available in the area", 400)

        emergency.status = "allocated"
        db.session.commit()

        payload = {
            "emergency_id":         emergency.emergency_id,
            "severity":             emergency.severity,
            "emergency_type":       emergency.emergency_type,
            "patient_name":         emergency.patient_name,
            "accident_description": emergency.accident_description,
            "source":               "108_dispatch",
            "ambulance":            emergency.ambulance.to_dict() if emergency.ambulance else None,
        }
        socketio.emit("emergency_allocated", payload, room=f"hospital_{hospital.hospital_id}")
        socketio.emit("emergency_allocated", payload, room="admin")
        if ambulance:
            socketio.emit("emergency_allocated", payload, room=f"ambulance_{ambulance.ambulance_id}")

        return success_response(
            message="108 Emergency dispatched successfully",
            data={
                **emergency.to_dict(),
                "allocated_ambulance": ambulance.vehicle_number if ambulance else None,
                "allocated_hospital":  hospital.name,
            },
            status=201
        )
    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 500)


# ==========================================
# 📞 108 DISPATCH TO SCENE (New Flow)
# ==========================================
@admin_bp.route("/dispatch-to-scene", methods=["POST"])
@token_required
@roles_required("admin")
def dispatch_to_scene():
    """
    Step 3-6: Admin dispatches nearest AVAILABLE ambulance to scene.
    Coordinates: Chennai center (13.0827, 80.2707)
    """
    try:
        data = request.get_json()
        required = ["caller_name", "callback_number", "description", "caller_location"]
        if not data or not all(f in data for f in required):
            return error_response(f"{', '.join(required)} are required", 400)

        with db.session.begin_nested():
            # Find nearest available ambulance
            available_ambulances = Ambulance.query.filter_by(status="AVAILABLE").all()
            if not available_ambulances:
                return error_response("No available ambulances at this time", 400)

            origin_lat, origin_lng = 13.0827, 80.2707
            nearest_amb = None
            min_dist = float('inf')

            for amb in available_ambulances:
                if amb.latitude is None or amb.longitude is None: continue
                dist = calculate_distance(origin_lat, origin_lng, amb.latitude, amb.longitude)
                if dist < min_dist:
                    min_dist = dist
                    nearest_amb = amb

            if not nearest_amb:
                # Fallback if no ambulance has GPS
                nearest_amb = available_ambulances[0]

            # Update ambulance status
            nearest_amb.status = "ON_CALL"

            # Mocked destination (until geocoding is integrated)
            dest_lat = 13.0827 + random.uniform(-0.02, 0.02)
            dest_lng = 80.2707 + random.uniform(-0.02, 0.02)

            # Create dispatch record
            dispatch = SceneDispatch(
                caller_name=data["caller_name"],
                callback_number=data["callback_number"],
                description=data["description"],
                caller_location=data["caller_location"],
                latitude=dest_lat,
                longitude=dest_lng,
                assigned_ambulance_id=nearest_amb.ambulance_id,
                status='en_route_to_scene',
                dispatched_at=datetime.utcnow()
            )
            db.session.add(dispatch)
            db.session.flush() # Get ID

            # Step 6: Emit to Ambulance
            try:
                payload = {
                    "dispatch_id": dispatch.id,
                    "caller_name": dispatch.caller_name,
                    "callback_number": dispatch.callback_number,
                    "description": dispatch.description,
                    "caller_location": dispatch.caller_location,
                    "latitude": dispatch.latitude,
                    "longitude": dispatch.longitude,
                    "unit_name": nearest_amb.vehicle_number,
                    "dispatched_at": dispatch.dispatched_at.isoformat()
                }
                socketio.emit("dispatch_to_scene", payload, room=f"ambulance_{nearest_amb.ambulance_id}")
            except Exception as e:
                # Step 7: Rollback on socket failure is implicit via begin_nested() if I raise here
                raise Exception(f"Socket emit failed: {str(e)}")

        db.session.commit()

        # Step 8: Emit to Admin
        admin_payload = {
            "dispatch_id": dispatch.id,
            "ambulance_id": nearest_amb.ambulance_id,
            "unit_name": nearest_amb.vehicle_number,
            "caller_location": dispatch.caller_location
        }
        socketio.emit("dispatch_confirmed", admin_payload, room="admin")

        return success_response(
            message="Ambulance dispatched to scene",
            data={
                "dispatch_id": dispatch.id,
                "unit_name": nearest_amb.vehicle_number
            },
            status=201
        )

    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 500)


# ==========================================
# ✅ MARK ARRIVAL AT SCENE (Ambulance Side)
# ==========================================
@admin_bp.route("/dispatch-to-scene/<int:dispatch_id>", methods=["PATCH"])
@token_required
@roles_required("ambulance")
def mark_dispatch_arrival(dispatch_id):
    try:
        dispatch = SceneDispatch.query.get(dispatch_id)
        if not dispatch:
            return error_response("Dispatch record not found", 404)

        dispatch.status = 'arrived'
        dispatch.arrived_at = datetime.utcnow()
        db.session.commit()

        return success_response(message="Arrival confirmed")
    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 500)


# ==========================================
# 🛏 UPDATE AVAILABILITY
# ==========================================
@admin_bp.route("/availability/<int:hospital_id>", methods=["PUT"])
@token_required
@roles_required("admin")
def update_availability(hospital_id):
    data = request.get_json()
    beds = data.get("available_beds")
    if beds is None or not isinstance(beds, int) or beds < 0:
        return error_response("available_beds must be a non-negative integer", 400)
    availability = Availability.query.filter_by(hospital_id=hospital_id).first()
    if not availability:
        return error_response("Availability not found", 404)
    availability.available_beds = beds
    db.session.commit()
    status  = "GREEN" if beds > 0 else "RED"
    payload = {"hospital_id": hospital_id, "available_beds": beds, "status": status}
    socketio.emit("availability_updated", payload, room="admin")
    return success_response(message="Availability updated", data=payload)


# ==========================================
# 🏥 UPDATE HOSPITAL SPECIALITIES
# ==========================================
@admin_bp.route("/hospitals/<int:hospital_id>/specialities", methods=["PUT"])
@token_required
@roles_required("admin")
def update_hospital_specialities(hospital_id):
    try:
        data = request.get_json()
        if not data or "specialities" not in data:
            return error_response("specialities array is required", 400)
        specialities = data["specialities"]
        if not isinstance(specialities, list):
            return error_response("specialities must be an array", 400)
        invalid = [s for s in specialities if s not in VALID_SPECIALITIES]
        if invalid:
            return error_response(f"Invalid specialities: {invalid}. Must be from: {VALID_SPECIALITIES}", 400)
        hospital = Hospital.query.get(hospital_id)
        if not hospital:
            return error_response("Hospital not found", 404)
        hospital.specialities = ",".join(specialities)
        db.session.commit()
        return success_response(
            message="Hospital specialities updated",
            data={"hospital_id": hospital_id, "name": hospital.name, "specialities": hospital.get_specialities_list()}
        )
    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 500)


# ==========================================
# 🏥 GET ALL HOSPITALS (admin)
# ==========================================
@admin_bp.route("/hospitals", methods=["GET"])
@token_required
@roles_required("admin")
def list_hospitals():
    try:
        hospitals = Hospital.query.filter_by(is_active=True).all()
        return success_response(message="Hospitals fetched", data=[h.to_dict() for h in hospitals])
    except Exception as e:
        return error_response(str(e), 500)


# ==========================================
# 👥 LIST ALL USERS
# ==========================================
@admin_bp.route("/users", methods=["GET"])
@token_required
@roles_required("admin")
def list_users():
    users = User.query.order_by(User.created_at.desc()).all()
    data  = []
    for u in users:
        entity_id = None
        if u.hospital:    entity_id = u.hospital.hospital_id
        elif u.ambulance: entity_id = u.ambulance.ambulance_id
        data.append({
            "user_id":    u.user_id,
            "name":       u.name,
            "email":      u.email,
            "role":       u.role,
            "entity_id":  entity_id,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })
    return success_response(message="Users fetched", data=data)


# ==========================================
# ➕ CREATE USER
# ==========================================
@admin_bp.route("/users", methods=["POST"])
@token_required
@roles_required("admin")
def create_user():
    data = request.get_json()
    required = ["name", "email", "password", "role"]
    if not data or not all(f in data for f in required):
        return error_response("name, email, password, role are required", 400)
    valid_roles = ["admin", "hospital", "ambulance", "dispatcher"]
    if data["role"] not in valid_roles:
        return error_response(f"Role must be one of: {', '.join(valid_roles)}", 400)
    if User.query.filter_by(email=data["email"]).first():
        return error_response("Email already exists", 400)
    user = User(name=data["name"], email=data["email"], role=data["role"])
    user.set_password(data["password"])
    db.session.add(user)
    db.session.flush()
    entity_id = data.get("entity_id")
    if entity_id and data["role"] == "hospital":
        hospital = Hospital.query.get(entity_id)
        if hospital: hospital.user_id = user.user_id
    if entity_id and data["role"] == "ambulance":
        ambulance = Ambulance.query.get(entity_id)
        if ambulance: ambulance.user_id = user.user_id
    db.session.commit()
    return success_response("User created successfully", data={"user_id": user.user_id, "role": user.role}, status=201)


# ==========================================
# 🚫 DEACTIVATE USER
# ==========================================
@admin_bp.route("/users/<int:user_id>/deactivate", methods=["PATCH"])
@token_required
@roles_required("admin")
def deactivate_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return error_response("User not found", 404)
    if user.email.startswith("DEACTIVATED_"):
        return error_response("User is already deactivated", 400)
    user.email = f"DEACTIVATED_{user.email}"
    db.session.commit()
    return success_response(message=f"User {user_id} deactivated")


# ==========================================
# 🚑 LIST ALL AMBULANCES
# ==========================================
@admin_bp.route("/ambulances", methods=["GET"])
@token_required
@roles_required("admin")
def list_ambulances():
    ambulances = Ambulance.query.all()
    return success_response(message="Ambulances fetched", data=[a.to_dict() for a in ambulances])


# ==========================================
# 📊 STATS
# ==========================================
@admin_bp.route("/stats", methods=["GET"])
@token_required
@roles_required("admin")
def get_stats():
    active_units        = Ambulance.query.filter_by(status="ON_CALL").count()
    available_hospitals = (
        Hospital.query
        .join(Availability, Hospital.hospital_id == Availability.hospital_id)
        .filter(Hospital.is_active == True, Availability.available_beds > 0)
        .count()
    )
    critical_alerts = EmergencyRequest.query.filter(
        EmergencyRequest.severity == "critical",
        EmergencyRequest.status.notin_(["completed", "cancelled"])
    ).count()
    return success_response(
        message="Admin stats fetched successfully",
        data={
            "active_units":        active_units,
            "available_hospitals": available_hospitals,
            "avg_response_time":   None,
            "critical_alerts":     critical_alerts,
        }
    )
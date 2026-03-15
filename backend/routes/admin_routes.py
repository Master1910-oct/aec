from flask import Blueprint, request, g
from database.db import db
from models import User, Hospital, Ambulance, Availability
from extensions.socketio_ext import socketio
from utils.response import success_response, error_response
from utils.decorators import token_required, roles_required

admin_bp = Blueprint("admin_bp", __name__, url_prefix="/api/v1/admin")


# ==========================================
# 🛏 UPDATE AVAILABILITY (legacy + v1)
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

    status = "GREEN" if beds > 0 else "RED"
    payload = {"hospital_id": hospital_id, "available_beds": beds, "status": status}

    socketio.emit("availability_updated", payload, room="admin")

    return success_response(message="Availability updated", data=payload)


# ==========================================
# 👥 LIST ALL USERS
# ==========================================
@admin_bp.route("/users", methods=["GET"])
@token_required
@roles_required("admin")
def list_users():
    users = User.query.order_by(User.created_at.desc()).all()
    data = []
    for u in users:
        entity_id = None
        if u.hospital:
            entity_id = u.hospital.hospital_id
        elif u.ambulance:
            entity_id = u.ambulance.ambulance_id

        data.append({
            "user_id": u.user_id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "entity_id": entity_id,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })

    return success_response(message="Users fetched", data=data)


# ==========================================
# ➕ CREATE USER (admin only)
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

    # Link to existing hospital or ambulance if entity_id provided
    entity_id = data.get("entity_id")
    if entity_id and data["role"] == "hospital":
        hospital = Hospital.query.get(entity_id)
        if hospital:
            hospital.user_id = user.user_id

    if entity_id and data["role"] == "ambulance":
        ambulance = Ambulance.query.get(entity_id)
        if ambulance:
            ambulance.user_id = user.user_id

    db.session.commit()

    return success_response(
        "User created successfully",
        data={"user_id": user.user_id, "role": user.role},
        status=201
    )


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

    # Soft-deactivate by clearing password (they cannot log in)
    # A proper implementation would add an is_active column; for now we prefix email
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
    return success_response(
        message="Ambulances fetched",
        data=[a.to_dict() for a in ambulances]
    )
@admin_bp.route("/stats", methods=["GET"])
@token_required
@roles_required("admin")
def get_stats():
    from models import EmergencyRequest, Ambulance, Hospital, Availability
    from database.db import db
    from sqlalchemy import func

    # active_units: count of ambulances with status ON_CALL
    active_units = Ambulance.query.filter_by(status="ON_CALL").count()

    # available_hospitals: count of active hospitals with > 0 beds
    available_hospitals = (
        Hospital.query
        .join(Availability, Hospital.hospital_id == Availability.hospital_id)
        .filter(Hospital.is_active == True, Availability.available_beds > 0)
        .count()
    )

    # critical_alerts: emergencies with severity critical and status not completed/cancelled
    critical_alerts = EmergencyRequest.query.filter(
        EmergencyRequest.severity == "critical",
        EmergencyRequest.status.notin_(["completed", "cancelled"])
    ).count()

    # avg_response_time: Optional, we can set to None or calculate if we have a field
    # We don't have response time tracking in models right now, so we return None
    avg_response_time = None

    return success_response(
        message="Admin stats fetched successfully",
        data={
            "active_units": active_units,
            "available_hospitals": available_hospitals,
            "avg_response_time": avg_response_time,
            "critical_alerts": critical_alerts
        }
    )

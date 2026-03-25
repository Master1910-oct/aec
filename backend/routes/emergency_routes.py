from flask import Blueprint, request, g
from datetime import datetime, timedelta
import json
from database.db import db
from models import EmergencyRequest, Hospital
from models.ambulance import Ambulance
from services.allocation_service import allocate_hospital, allocate_ambulance, find_transfer_hospital, calculate_distance
from services.state_machine import EmergencyStateMachine
from extensions.socketio_ext import socketio
from utils.response import success_response, error_response
from utils.decorators import token_required, roles_required


emergency_bp = Blueprint(
    "emergency_bp",
    __name__,
    url_prefix="/api/v1/emergency"
)

# ✅ Expanded emergency types
ALLOWED_TYPES = [
    "trauma", "cardiac", "respiratory", "neurological",
    "orthopaedic", "maternity", "ophthalmology", "ent",
    "paediatric", "oncology", "dermatology", "urology",
    "psychiatry", "other"
]


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

        required_fields = ["latitude", "longitude", "emergency_type"]
        if not data or not all(field in data for field in required_fields):
            return error_response("latitude, longitude and emergency_type are required", 400)

        severity = data.get("severity", "medium").lower()
        if severity not in ["critical", "high", "medium", "low"]:
            return error_response("Severity must be one of: critical, high, medium, low", 400)

        emergency_type = data.get("emergency_type", "other").lower()
        if emergency_type not in ALLOWED_TYPES:
            return error_response("emergency_type must be one of: " + ", ".join(ALLOWED_TYPES), 400)

        emergency = EmergencyRequest(
            patient_name=data.get("patient_name", "Unknown Patient"),
            accident_description=data.get("accident_description", ""),
            latitude=data["latitude"],
            longitude=data["longitude"],
            emergency_type=emergency_type,
            severity=severity,
            acknowledged=False,
        )

        EmergencyStateMachine(emergency).initialize()

        emergency.dispatch_sla_deadline = datetime.utcnow() + timedelta(minutes=8)

        db.session.add(emergency)
        db.session.flush()

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

        payload = {
            "emergency_id":          emergency.emergency_id,
            "severity":              emergency.severity,
            "emergency_type":        emergency.emergency_type,
            "patient_name":          emergency.patient_name,
            "accident_description":  emergency.accident_description,
            "ambulance":             emergency.ambulance.to_dict() if emergency.ambulance else None,
        }
        
        # Emit only to ambulance and admin
        if emergency.ambulance_id:
            socketio.emit("emergency_created", payload, room=f"ambulance_{emergency.ambulance_id}")
        socketio.emit("emergency_created", payload, room="admin")

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

        user = g.current_user
        if user["role"] == "ambulance":
            if emergency.ambulance_id != user.get("entity_id"):
                return error_response("Access denied — not your emergency", 403)

        previous_status = emergency.status

        if not EmergencyStateMachine.can_transition(previous_status, new_status):
            return error_response(
                f"Invalid status transition from '{previous_status}' to '{new_status}'", 400
            )

        if new_status == "arrived" and previous_status != "arrived":
            # STEP A — Capture GPS
            if "accident_latitude" in data and "accident_longitude" in data:
                emergency.accident_latitude = data["accident_latitude"]
                emergency.accident_longitude = data["accident_longitude"]
                emergency.scene_arrived_at = datetime.utcnow()
                elapsed = (datetime.utcnow() - emergency.created_at)
                emergency.dispatch_response_time = int(elapsed.total_seconds())
                emergency.transport_sla_deadline = datetime.utcnow() + timedelta(minutes=7)
            else:
                emergency.scene_arrived_at = datetime.utcnow()

            # STEP B — Run two-phase allocation ONCE
            result = allocate_hospital(
                emergency,
                emergency.accident_latitude or emergency.latitude,
                emergency.accident_longitude or emergency.longitude
            )
            if result:
                hospital = result["hospital"]
                emergency.hospital_id = hospital.hospital_id
                emergency.needs_transfer = result["needs_transfer"]
                emergency.required_speciality = result.get("required_speciality")

                emergency.transfer_legs = json.dumps([{
                    "leg": 1,
                    "from_location": "accident_site",
                    "hospital_id": hospital.hospital_id,
                    "hospital_name": hospital.name,
                    "type": "first_aid" if result["needs_transfer"] else "direct",
                    "arrived_at": None,
                    "departed_at": None
                }])
                emergency.acknowledged = True

                db.session.commit()

                socketio.emit("emergency_allocated", {
                    "emergency_id": emergency.emergency_id,
                    "hospital_id": hospital.hospital_id,
                    "hospital_name": hospital.name,
                    "hospital_latitude": hospital.latitude,
                    "hospital_longitude": hospital.longitude,
                    "needs_transfer": emergency.needs_transfer,
                    "required_speciality": emergency.required_speciality
                }, room=f"ambulance_{emergency.ambulance_id}")

                socketio.emit("emergency_assigned", {
                    "emergency_id": emergency.emergency_id,
                    "patient_name": emergency.patient_name,
                    "emergency_type": emergency.emergency_type,
                    "severity": emergency.severity,
                    "needs_transfer": emergency.needs_transfer
                }, room=f"hospital_{hospital.hospital_id}")

                socketio.emit("emergency_status_updated", {
                    "emergency_id": emergency.emergency_id,
                    "status": "arrived",
                    "hospital_assigned": hospital.name
                }, room="admin")

        if new_status == "completed":
            if emergency.scene_arrived_at:
                elapsed = (datetime.utcnow() - emergency.scene_arrived_at)
                emergency.transport_response_time = int(elapsed.total_seconds())
                legs = json.loads(emergency.transfer_legs or "[]")
                if legs:
                    legs[-1]["arrived_at"] = datetime.utcnow().isoformat()
                    emergency.transfer_legs = json.dumps(legs)
            if emergency.ambulance:
                emergency.ambulance.status = "AVAILABLE"
            if emergency.hospital and emergency.hospital.availability:
                emergency.hospital.availability.available_beds += 1

        emergency.status = new_status
        db.session.commit()

        event_payload = {
            "emergency_id":    emergency_id,
            "previous_status": previous_status,
            "new_status":      new_status,
            "ambulance_id":    emergency.ambulance_id,
            "updated_by":      "ambulance"
        }

        socketio.emit("emergency_status_updated", event_payload, room="admin")
        if emergency.hospital_id:
            socketio.emit("emergency_status_updated", event_payload, room=f"hospital_{emergency.hospital_id}")
        if emergency.ambulance_id:
            socketio.emit("emergency_status_updated", event_payload, room=f"ambulance_{emergency.ambulance_id}")

        if new_status == "completed" and emergency.hospital:
            hospital     = emergency.hospital
            availability = hospital.availability
            if availability:
                bed_payload = {
                    "hospital_id":    hospital.hospital_id,
                    "hospital_name":  hospital.name,
                    "available_beds": availability.available_beds,
                    "status":         "GREEN" if availability.available_beds > 0 else "RED"
                }
                socketio.emit("availability_updated", bed_payload, room="admin")
                socketio.emit("availability_updated", bed_payload, room=f"hospital_{hospital.hospital_id}")

        return success_response(
            message="Emergency status updated successfully",
            data=emergency.to_dict()
        )

    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 500)


# ==========================================
# 🔄 TRANSFER EMERGENCY (Ambulance)
# ==========================================
@emergency_bp.route("/<int:emergency_id>/transfer", methods=["POST"])
@token_required
@roles_required("ambulance")
def initiate_transfer(emergency_id):
    try:
        emergency = EmergencyRequest.query.get_or_404(emergency_id)

        if emergency.status != "first_aid":
            return error_response("Emergency must be in first_aid status", 400)

        current_hospital = Hospital.query.get(emergency.hospital_id)
        if not current_hospital:
            return error_response("Current hospital not found", 404)

        specialist = find_transfer_hospital(
            emergency.required_speciality or emergency.emergency_type,
            current_hospital.latitude,
            current_hospital.longitude
        )

        if not specialist:
            return error_response("No specialist hospital with available beds found for transfer", 404)

        legs = json.loads(emergency.transfer_legs or "[]")

        if legs:
            legs[-1]["departed_at"] = datetime.utcnow().isoformat()
            legs[-1]["status"] = "first_aid_complete"

        legs.append({
            "leg": len(legs) + 1,
            "from_location": current_hospital.name,
            "hospital_id": specialist.hospital_id,
            "hospital_name": specialist.name,
            "type": "specialist_transfer",
            "arrived_at": None,
            "departed_at": None,
            "status": "en_route"
        })

        emergency.hospital_id = specialist.hospital_id
        emergency.transfer_legs = json.dumps(legs)
        emergency.needs_transfer = False
        emergency.status = "transfer_en_route"
        emergency.transport_sla_deadline = datetime.utcnow() + timedelta(minutes=7)

        db.session.commit()

        dist = calculate_distance(
            current_hospital.latitude,
            current_hospital.longitude,
            specialist.latitude,
            specialist.longitude
        )

        socketio.emit("transfer_allocated", {
            "emergency_id": emergency.emergency_id,
            "hospital_name": specialist.name,
            "hospital_latitude": specialist.latitude,
            "hospital_longitude": specialist.longitude,
            "distance_km": round(dist, 2)
        }, room=f"ambulance_{emergency.ambulance_id}")

        socketio.emit("incoming_transfer", {
            "emergency_id": emergency.emergency_id,
            "from_hospital": current_hospital.name,
            "patient_name": emergency.patient_name,
            "emergency_type": emergency.emergency_type,
            "severity": emergency.severity,
            "transfer_legs": legs
        }, room=f"hospital_{specialist.hospital_id}")

        socketio.emit("emergency_status_updated", {
            "emergency_id": emergency.emergency_id,
            "status": "transfer_en_route",
            "new_hospital": specialist.name
        }, room="admin")

        return success_response(
            message="Transfer initiated",
            data=emergency.to_dict()
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
    return update_emergency_status(emergency_id)
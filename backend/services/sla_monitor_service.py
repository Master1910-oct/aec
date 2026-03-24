from datetime import datetime
from database.db import db
from models import EmergencyRequest
from extensions.socketio_ext import socketio


DISPATCH_SLA_MINUTES = 8
TRANSPORT_SLA_MINUTES = 7

DISPATCH_BREACH_STATUSES = [
    "pending",
    "allocated",
    "en_route"
]

TRANSPORT_BREACH_STATUSES = [
    "arrived",
    "first_aid"
]

SAFE_STATUSES = [
    "transfer_en_route",
    "completed",
    "cancelled",
    "escalated"
]

def check_sla_breaches():
    active_emergencies = EmergencyRequest.query.filter(
        EmergencyRequest.status.in_(DISPATCH_BREACH_STATUSES + TRANSPORT_BREACH_STATUSES)
    ).all()

    now = datetime.utcnow()

    for emergency in active_emergencies:
        # CHECK 1 — Dispatch SLA
        if emergency.status in DISPATCH_BREACH_STATUSES:
            if (emergency.dispatch_sla_deadline and now > emergency.dispatch_sla_deadline):
                elapsed = (now - emergency.created_at).total_seconds() / 60
                socketio.emit("sla_breach", {
                    "emergency_id": emergency.emergency_id,
                    "type": "dispatch",
                    "patient_name": emergency.patient_name,
                    "severity": emergency.severity,
                    "message": "Ambulance has not reached the scene",
                    "minutes_elapsed": round(elapsed, 1),
                    "target_minutes": DISPATCH_SLA_MINUTES,
                    "current_status": emergency.status
                }, room="admin")

        # CHECK 2 — Transport SLA
        elif emergency.status in TRANSPORT_BREACH_STATUSES:
            if (emergency.transport_sla_deadline and now > emergency.transport_sla_deadline):
                start_time = emergency.scene_arrived_at or emergency.created_at
                elapsed = (now - start_time).total_seconds() / 60
                socketio.emit("sla_breach", {
                    "emergency_id": emergency.emergency_id,
                    "type": "transport",
                    "patient_name": emergency.patient_name,
                    "severity": emergency.severity,
                    "message": "Patient has not reached hospital",
                    "minutes_elapsed": round(elapsed, 1),
                    "target_minutes": TRANSPORT_SLA_MINUTES,
                    "current_status": emergency.status
                }, room="admin")

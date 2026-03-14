from datetime import datetime
from database.db import db
from models import EmergencyRequest
from extensions.socketio_ext import socketio


def check_sla_breaches():
    now = datetime.utcnow()

    # Only check truly active emergencies — exclude any terminal states
    active_statuses = ["pending", "allocated", "en_route", "arrived", "in_progress"]

    breached = EmergencyRequest.query.filter(
        EmergencyRequest.status.in_(active_statuses),
        EmergencyRequest.sla_deadline < now
    ).all()

    for emergency in breached:
        emergency.status = "escalated"

        # 🔥 Emit only to admin room
        socketio.emit(
            "sla_breach",
            {
                "emergency_id": emergency.emergency_id,
                "patient_name": emergency.patient_name,
                "severity": emergency.severity,
                "deadline": emergency.sla_deadline.isoformat() if emergency.sla_deadline else None,
                "breached_at": now.isoformat(),
                "message": f"SLA Breached: Emergency #{emergency.emergency_id} ({emergency.severity}) has exceeded its deadline.",
            },
            room="admin"
        )

    if breached:
        db.session.commit()

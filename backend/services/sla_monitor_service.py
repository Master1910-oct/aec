from datetime import datetime
from database.db import db
from models import EmergencyRequest
from extensions.socketio_ext import socketio


def check_sla_breaches():
    now = datetime.utcnow()

    breached = EmergencyRequest.query.filter(
        EmergencyRequest.status.in_(["pending", "allocated", "in_progress"]),
        EmergencyRequest.sla_deadline < now
    ).all()

    for emergency in breached:
        emergency.status = "escalated"

        socketio.emit(
            "sla_breach",
            {
                "emergency_id": emergency.emergency_id,
                "severity": emergency.severity,
                "message": "SLA Breached"
            }
        )

    if breached:
        db.session.commit()

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
                "severity": emergency.severity,
                "emergency_type": emergency.emergency_type,
                "sla_deadline": emergency.sla_deadline.isoformat() if emergency.sla_deadline else None,
                "message": "SLA Breach — Emergency escalated",
            },
            room="admin"
        )

    if breached:
        db.session.commit()

import sys
from app import create_app
from database.db import db
from models.emergency import EmergencyRequest
from datetime import datetime, timedelta

app = create_app()

with app.app_context():
    latest = EmergencyRequest.query.filter(EmergencyRequest.status != 'completed').order_by(EmergencyRequest.created_at.desc()).first()
    if latest:
        latest.sla_deadline = datetime.utcnow() - timedelta(minutes=1)
        db.session.commit()
        print(f"Success: Updated SLA for emergency {latest.emergency_id}")
    else:
        print("Failed: No active emergencies found.")

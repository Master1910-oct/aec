import traceback
from flask import Flask
from database.db import db
from config import Config

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

with app.app_context():
    try:
        from datetime import datetime
        from models import EmergencyRequest
        from models.ambulance import Ambulance
        from models.hospital import Hospital
        from models.availability import Availability
        print("Models loaded successfully")
        
        now = datetime.utcnow()

        total = EmergencyRequest.query.count()
        print("total", total)
        pending = EmergencyRequest.query.filter_by(status="pending").count()
        print("pending", pending)
        allocated = EmergencyRequest.query.filter_by(status="allocated").count()
        print("allocated", allocated)
        en_route = EmergencyRequest.query.filter_by(status="en_route").count()
        print("en_route", en_route)
        completed = EmergencyRequest.query.filter_by(status="completed").count()
        print("completed", completed)
        escalated = EmergencyRequest.query.filter_by(status="escalated").count()
        print("escalated", escalated)

        # SLA breaches: active emergencies past their deadline
        active_statuses = ["pending", "allocated", "en_route", "arrived", "in_progress"]
        sla_breached = EmergencyRequest.query.filter(
            EmergencyRequest.status.in_(active_statuses),
            EmergencyRequest.sla_deadline < now
        ).count()
        print("sla_breached", sla_breached)

        total_ambulances = Ambulance.query.count()
        print("total_ambulances", total_ambulances)
        available_ambulances = Ambulance.query.filter_by(status="AVAILABLE").count()
        print("available_ambulances", available_ambulances)
        on_call_ambulances = Ambulance.query.filter_by(status="ON_CALL").count()
        print("on_call_ambulances", on_call_ambulances)

        total_hospitals = Hospital.query.filter_by(is_active=True).count()
        print("total_hospitals", total_hospitals)
        available_hospitals = (
            Hospital.query
            .join(Availability)
            .filter(Hospital.is_active == True, Availability.available_beds > 0)
            .count()
        )
        print("available_hospitals", available_hospitals)
        print("Success")
    except Exception as e:
        traceback.print_exc()

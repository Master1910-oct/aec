import traceback
from app import create_app
from database.db import db

app = create_app()

with app.app_context():
    try:
        from models.ambulance import Ambulance
        from models.hospital import Hospital
        from models.availability import Availability
        from models.emergency_request import EmergencyRequest

        print('Models OK')
        print('Ambulances:', Ambulance.query.count())
        print('Hospitals:', Hospital.query.count())
        print('Emergencies:', EmergencyRequest.query.count())

        from routes.admin_routes import admin_bp
        print('admin_bp imported OK')

        active = EmergencyRequest.query.filter(
            EmergencyRequest.status.notin_(
                ['completed', 'cancelled']
            )
        ).count()
        print('Active emergencies:', active)

        available_hospitals = db.session.query(Hospital).join(
            Availability
        ).filter(Availability.available_beds > 0).count()
        print('Available hospitals:', available_hospitals)

    except Exception as e:
        traceback.print_exc()

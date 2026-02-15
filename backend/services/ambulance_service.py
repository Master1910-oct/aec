from database.db import db
from models import Ambulance


# 🚑 Update Ambulance Location
def update_ambulance_location(ambulance_id, latitude, longitude):
    ambulance = Ambulance.query.get(ambulance_id)

    if not ambulance:
        return None

    ambulance.latitude = latitude
    ambulance.longitude = longitude

    db.session.commit()
    return ambulance


# 🚑 Mark Ambulance Available Again
def release_ambulance(ambulance_id):
    ambulance = Ambulance.query.get(ambulance_id)

    if not ambulance:
        return None

    ambulance.is_available = True
    db.session.commit()

    return ambulance
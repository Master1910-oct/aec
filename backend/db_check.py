import os
from app import create_app
from database.db import db
from models import Ambulance

app = create_app()
with app.app_context():
    count = Ambulance.query.count()
    print(f"Ambulance Count: {count}")
    ambulances = Ambulance.query.all()
    for a in ambulances:
        print(f"ID: {a.ambulance_id}, Plate: {a.vehicle_number}, Lat: {a.latitude}, Lon: {a.longitude}, Status: {a.status}")

os._exit(0)

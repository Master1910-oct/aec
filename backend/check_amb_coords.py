from app import create_app
from database.db import db
from models import Ambulance

app = create_app()
with app.app_context():
    ambulances = Ambulance.query.all()
    for a in ambulances:
        print(f"Ambulance {a.ambulance_id}: {a.vehicle_number} | Pos: {a.latitude}, {a.longitude}")
        
    a1 = Ambulance.query.get(1)
    if a1 and (not a1.latitude or not a1.longitude):
        a1.latitude = 13.0900
        a1.longitude = 80.2750
        print("Updated a1")
        
    a2 = Ambulance.query.get(2)
    if a2 and (not a2.latitude or not a2.longitude):
        a2.latitude = 12.9800
        a2.longitude = 77.6000
        print("Updated a2")
        
    db.session.commit()
    print("Coordinates check complete.")

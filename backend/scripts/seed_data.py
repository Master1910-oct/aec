import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from database.db import db
from models import Hospital, Availability

app = create_app()

with app.app_context():

    # Clear old data
    Availability.query.delete()
    Hospital.query.delete()
    db.session.commit()

    # Create hospitals
    h1 = Hospital(
        name="City General Hospital",
        address="Chennai",
        latitude=13.0827,
        longitude=80.2707,
        contact_number="9876543210"
    )

    h2 = Hospital(
        name="Apollo Emergency Care",
        address="Bangalore",
        latitude=12.9716,
        longitude=77.5946,
        contact_number="9123456780"
    )

    db.session.add_all([h1, h2])
    db.session.commit()

    # Create availability
    a1 = Availability(
        hospital_id=h1.hospital_id,
        available_beds=12
    )

    a2 = Availability(
        hospital_id=h2.hospital_id,
        available_beds=0
    )

    db.session.add_all([a1, a2])
    db.session.commit()

    print("✅ Seed data inserted successfully")

"""
seed_data.py — Initialises the database with test hospitals, ambulances, and users.
Safe to re‑run: all lookups are idempotent (check before insert).
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from database.db import db
from models import User, Hospital, Ambulance, Availability

app = create_app()

with app.app_context():

    # ===========================================================
    # 🏥  HOSPITALS
    # ===========================================================
    h1 = Hospital.query.filter_by(name="City General Hospital").first()
    if not h1:
        h1 = Hospital(
            name="City General Hospital",
            address="Chennai",
            latitude=13.0827,
            longitude=80.2707,
            contact_number="9876543210",
            specialities="trauma,cardiac,neurological",
        )
        db.session.add(h1)
        db.session.flush()
        db.session.add(Availability(hospital_id=h1.hospital_id, available_beds=12))

    h2 = Hospital.query.filter_by(name="Apollo Emergency Care").first()
    if not h2:
        h2 = Hospital(
            name="Apollo Emergency Care",
            address="Bangalore",
            latitude=12.9716,
            longitude=77.5946,
            contact_number="9123456780",
            specialities="respiratory,cardiac,other",
        )
        db.session.add(h2)
        db.session.flush()
        db.session.add(Availability(hospital_id=h2.hospital_id, available_beds=8))

    db.session.commit()

    # ===========================================================
    # 🚑  AMBULANCES
    # ===========================================================
    a1 = Ambulance.query.filter_by(vehicle_number="TN01-AMB-001").first()
    if not a1:
        a1 = Ambulance(
            vehicle_number="TN01-AMB-001",
            driver_name="Ravi Kumar",
            latitude=13.0900,
            longitude=80.2750,
            status="AVAILABLE",
        )
        db.session.add(a1)

    a2 = Ambulance.query.filter_by(vehicle_number="KA01-AMB-001").first()
    if not a2:
        a2 = Ambulance(
            vehicle_number="KA01-AMB-001",
            driver_name="Suresh Nair",
            latitude=12.9800,
            longitude=77.6000,
            status="AVAILABLE",
        )
        db.session.add(a2)

    db.session.commit()

    # Re‑query to get IDs after possible inserts
    h1 = Hospital.query.filter_by(name="City General Hospital").first()
    h2 = Hospital.query.filter_by(name="Apollo Emergency Care").first()
    a1 = Ambulance.query.filter_by(vehicle_number="TN01-AMB-001").first()
    a2 = Ambulance.query.filter_by(vehicle_number="KA01-AMB-001").first()

    # ===========================================================
    # 👤  USERS
    # ===========================================================

    # Admin
    admin_user = User.query.filter_by(email="admin@aes.com").first()
    if not admin_user:
        admin_user = User(name="System Admin", email="admin@aes.com", role="admin")
        admin_user.set_password("admin123")
        db.session.add(admin_user)

    # Hospital 1 user
    hosp1_user = User.query.filter_by(email="hospital1@aes.com").first()
    if not hosp1_user:
        hosp1_user = User(name="City General Staff", email="hospital1@aes.com", role="hospital")
        hosp1_user.set_password("hospital123")
        db.session.add(hosp1_user)
        db.session.flush()
        h1.user_id = hosp1_user.user_id

    # Hospital 2 user
    hosp2_user = User.query.filter_by(email="hospital2@aes.com").first()
    if not hosp2_user:
        hosp2_user = User(name="Apollo Staff", email="hospital2@aes.com", role="hospital")
        hosp2_user.set_password("hospital123")
        db.session.add(hosp2_user)
        db.session.flush()
        h2.user_id = hosp2_user.user_id

    # Ambulance 1 user
    amb1_user = User.query.filter_by(email="ambulance1@aes.com").first()
    if not amb1_user:
        amb1_user = User(name="Ravi Kumar", email="ambulance1@aes.com", role="ambulance")
        amb1_user.set_password("amb123")
        db.session.add(amb1_user)
        db.session.flush()
        a1.user_id = amb1_user.user_id

    # Ambulance 2 user
    amb2_user = User.query.filter_by(email="ambulance2@aes.com").first()
    if not amb2_user:
        amb2_user = User(name="Suresh Nair", email="ambulance2@aes.com", role="ambulance")
        amb2_user.set_password("amb123")
        db.session.add(amb2_user)
        db.session.flush()
        a2.user_id = amb2_user.user_id

    db.session.commit()

    print("\n✅ Seed data inserted successfully")
    print("─" * 45)
    print("  Admin:        admin@aes.com        / admin123")
    print("  Hospital 1:   hospital1@aes.com    / hospital123")
    print("  Hospital 2:   hospital2@aes.com    / hospital123")
    print("  Ambulance 1:  ambulance1@aes.com   / amb123")
    print("  Ambulance 2:  ambulance2@aes.com   / amb123")
    print("─" * 45)

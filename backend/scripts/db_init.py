"""
db_init.py  ─  Drop all tables, recreate schema, insert seed data.
Run from the backend directory:
    venv\\Scripts\\python.exe scripts\\db_init.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask
from werkzeug.security import generate_password_hash
from config import Config
from database.db import db
from sqlalchemy import text

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

# ── Import real models ──────────────────────────────────────
from models.user import User
from models.hospital import Hospital
from models.ambulance import Ambulance
from models.availability import Availability
from models.emergency import EmergencyRequest

with app.app_context():
    print("⬇  Dropping all tables ...")
    with db.engine.connect() as conn:
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
        for table in ["emergency_requests", "availability", "ambulances", "hospital", "users", "alembic_version"]:
            conn.execute(text(f"DROP TABLE IF EXISTS `{table}`"))
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 1"))
        conn.commit()

    print("⬆  Creating tables from models ...")
    db.create_all()
    print("✅ Schema created.\n")

    # ── seed hospitals ──────────────────────────────────────
    h1 = Hospital(
        name="City General Hospital", address="Chennai",
        latitude=13.0827, longitude=80.2707,
        contact_number="9876543210",
        specialities="trauma,cardiac,neurological",
    )
    h2 = Hospital(
        name="Apollo Emergency Care", address="Bangalore",
        latitude=12.9716, longitude=77.5946,
        contact_number="9123456780",
        specialities="respiratory,cardiac,other",
    )
    db.session.add_all([h1, h2])
    db.session.flush()

    db.session.add(Availability(hospital_id=h1.hospital_id, available_beds=12))
    db.session.add(Availability(hospital_id=h2.hospital_id, available_beds=8))

    # ── seed ambulances ─────────────────────────────────────
    a1 = Ambulance(vehicle_number="TN01-AMB-001", driver_name="Ravi Kumar", latitude=13.09, longitude=80.275)
    a2 = Ambulance(vehicle_number="KA01-AMB-001", driver_name="Suresh Nair", latitude=12.98, longitude=77.60)
    db.session.add_all([a1, a2])
    db.session.flush()

    # ── seed users ──────────────────────────────────────────
    def mkuser(name, email, pw, role):
        u = User(name=name, email=email, role=role)
        u.password_hash = generate_password_hash(pw)
        db.session.add(u)
        db.session.flush()
        return u

    admin  = mkuser("System Admin",       "admin@aes.com",      "admin123",    "admin")
    hosp1u = mkuser("City General Staff", "hospital1@aes.com",  "hospital123", "hospital")
    hosp2u = mkuser("Apollo Staff",       "hospital2@aes.com",  "hospital123", "hospital")
    amb1u  = mkuser("Ravi Kumar",         "ambulance1@aes.com", "amb123",      "ambulance")
    amb2u  = mkuser("Suresh Nair",        "ambulance2@aes.com", "amb123",      "ambulance")

    h1.user_id = hosp1u.user_id
    h2.user_id = hosp2u.user_id
    a1.user_id = amb1u.user_id
    a2.user_id = amb2u.user_id

    db.session.commit()
    print("✅ Seed data inserted.\n")
    print("─" * 45)
    print("  Admin:        admin@aes.com        / admin123")
    print("  Hospital 1:   hospital1@aes.com    / hospital123")
    print("  Ambulance 1:  ambulance1@aes.com   / amb123")
    print("─" * 45)

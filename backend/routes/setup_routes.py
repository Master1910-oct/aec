"""
setup_routes.py — TEMPORARY one-time bootstrapping endpoint.
Hit GET http://localhost:5001/api/v1/setup to recreate schema + seed users.
DELETE this file after first use!
"""
from flask import Blueprint
from werkzeug.security import generate_password_hash
from database.db import db

setup_bp = Blueprint("setup_bp", __name__)


@setup_bp.route("/setup", methods=["GET"])
def setup():
    try:
        from sqlalchemy import text

        # ── Step 1: drop all old tables via raw SQL so we don't hit column errors
        with db.engine.connect() as conn:
            conn.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
            for table in ["emergency_requests", "availability", "ambulances", "hospital", "users", "alembic_version"]:
                conn.execute(text(f"DROP TABLE IF EXISTS `{table}`"))
            conn.execute(text("SET FOREIGN_KEY_CHECKS = 1"))
            conn.commit()

        # ── Step 2: recreate from current models ──────────────────
        db.create_all()

        # ── Step 3: seed data ─────────────────────────────────────
        from models.user import User
        from models.hospital import Hospital
        from models.ambulance import Ambulance
        from models.availability import Availability

        def mkuser(name, email, pw, role):
            u = User(name=name, email=email, role=role)
            u.password_hash = generate_password_hash(pw)
            db.session.add(u)
            db.session.flush()
            return u

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

        a1 = Ambulance(vehicle_number="TN01-AMB-001", driver_name="Ravi Kumar",
                       latitude=13.09, longitude=80.275)
        a2 = Ambulance(vehicle_number="KA01-AMB-001", driver_name="Suresh Nair",
                       latitude=12.98, longitude=77.60)
        db.session.add_all([a1, a2])
        db.session.flush()

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

        return {
            "success": True,
            "message": "Schema recreated and seed data inserted!",
            "logins": {
                "admin":      {"email": "admin@aes.com",      "password": "admin123"},
                "hospital1":  {"email": "hospital1@aes.com",  "password": "hospital123"},
                "hospital2":  {"email": "hospital2@aes.com",  "password": "hospital123"},
                "ambulance1": {"email": "ambulance1@aes.com", "password": "amb123"},
                "ambulance2": {"email": "ambulance2@aes.com", "password": "amb123"},
            }
        }, 200

    except Exception as e:
        db.session.rollback()
        return {"success": False, "error": str(e)}, 500

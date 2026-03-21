"""
seed_ambulance_users.py
────────────────────────
Creates login accounts for all ambulances that don't have one yet.
Passwords are random and shown ONCE — save the output CSV!

Usage:
  cd backend
  python scripts/seed_ambulance_users.py

Output:
  - Prints credentials to console
  - Saves to backend/scripts/ambulance_credentials.csv
"""

import os
import sys
import csv
import random
import string

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from database.db import db
from models import User
from models.ambulance import Ambulance


def generate_password(length=12) -> str:
    chars = string.ascii_letters + string.digits + "!@#$"
    password = [
        random.choice(string.ascii_uppercase),
        random.choice(string.ascii_lowercase),
        random.choice(string.digits),
        random.choice("!@#$"),
    ]
    password += random.choices(chars, k=length - 4)
    random.shuffle(password)
    return "".join(password)


def make_email(vehicle_number: str, ambulance_id: int) -> str:
    clean = vehicle_number.lower().replace("-", "").replace(" ", "")
    return f"amb.{clean}@aes.com"


def main():
    app = create_app()

    with app.app_context():
        # Only ambulances without a user account
        ambulances_without_user = Ambulance.query.filter(
            Ambulance.user_id == None
        ).order_by(Ambulance.ambulance_id).all()

        if not ambulances_without_user:
            print("✅ All ambulances already have user accounts.")
            return

        print(f"Found {len(ambulances_without_user)} ambulances without login accounts.\n")
        print(f"{'ID':<5} {'Vehicle':<15} {'Driver':<20} {'Email':<35} {'Password':<15}")
        print("-" * 95)

        credentials = []

        for amb in ambulances_without_user:
            email    = make_email(amb.vehicle_number, amb.ambulance_id)
            password = generate_password()

            # Handle duplicate email edge case
            if User.query.filter_by(email=email).first():
                email = f"amb{amb.ambulance_id}@aes.com"

            user = User(
                name  = amb.driver_name or f"Driver {amb.ambulance_id}",
                email = email,
                role  = "ambulance",
            )
            user.set_password(password)
            db.session.add(user)
            db.session.flush()

            amb.user_id = user.user_id
            db.session.flush()

            print(f"{amb.ambulance_id:<5} {amb.vehicle_number:<15} {(amb.driver_name or '—'):<20} {email:<35} {password:<15}")

            credentials.append({
                "ambulance_id":    amb.ambulance_id,
                "vehicle_number":  amb.vehicle_number,
                "driver_name":     amb.driver_name or "—",
                "email":           email,
                "password":        password,
                "role":            "ambulance",
            })

        db.session.commit()

        csv_path = os.path.join(os.path.dirname(__file__), "ambulance_credentials.csv")
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=[
                "ambulance_id", "vehicle_number", "driver_name", "email", "password", "role"
            ])
            writer.writeheader()
            writer.writerows(credentials)

        print(f"\n{'='*95}")
        print(f"✅ Created {len(credentials)} ambulance accounts successfully.")
        print(f"📄 Credentials saved to: {csv_path}")
        print(f"\n⚠️  IMPORTANT: Save the CSV — passwords are hashed and cannot be recovered!")
        print(f"{'='*95}\n")


if __name__ == "__main__":
    main()

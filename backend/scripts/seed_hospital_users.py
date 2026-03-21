"""
seed_hospital_users.py
──────────────────────
Creates login accounts for all hospitals that don't have one yet.
Passwords are random and shown ONCE — save the output CSV!

Usage:
  cd backend
  python scripts/seed_hospital_users.py

Output:
  - Prints credentials to console
  - Saves to backend/scripts/hospital_credentials.csv
"""

import os
import sys
import csv
import random
import string

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from database.db import db
from models import User, Hospital


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


def slugify_email(name: str, hospital_id: int) -> str:
    clean = name.lower()
    for ch in [" ", "'", ".", ",", "(", ")", "/", "&", "-", "+", "–"]:
        clean = clean.replace(ch, "")
    clean = "".join(c for c in clean if c.isalnum())
    clean = clean[:20]
    return f"hospital{hospital_id}.{clean}@aes.com"


def main():
    app = create_app()

    with app.app_context():
        # Only hospitals without a user account
        hospitals_without_user = Hospital.query.filter(
            Hospital.is_active == True,
            Hospital.user_id == None
        ).order_by(Hospital.hospital_id).all()

        if not hospitals_without_user:
            print("✅ All hospitals already have user accounts.")
            return

        print(f"Found {len(hospitals_without_user)} hospitals without login accounts.\n")
        print(f"{'ID':<5} {'Hospital Name':<45} {'Email':<45} {'Password':<15}")
        print("-" * 115)

        credentials = []
        created     = 0
        skipped     = 0

        for hospital in hospitals_without_user:
            email    = slugify_email(hospital.name, hospital.hospital_id)
            password = generate_password()

            # Handle duplicate email edge case
            if User.query.filter_by(email=email).first():
                email = f"hospital{hospital.hospital_id}@aes.com"

            # ✅ Truncate name to 100 chars (User model limit)
            safe_name = hospital.name[:100]

            try:
                user = User(
                    name  = safe_name,
                    email = email,
                    role  = "hospital",
                )
                user.set_password(password)
                db.session.add(user)
                db.session.flush()

                hospital.user_id = user.user_id
                db.session.flush()

                print(f"{hospital.hospital_id:<5} {hospital.name[:44]:<45} {email:<45} {password:<15}")

                credentials.append({
                    "hospital_id":   hospital.hospital_id,
                    "hospital_name": hospital.name,
                    "email":         email,
                    "password":      password,
                    "role":          "hospital",
                })
                created += 1

            except Exception as e:
                db.session.rollback()
                print(f"  ⚠️  SKIPPED hospital {hospital.hospital_id} ({hospital.name[:40]}): {e}")
                skipped += 1
                continue

        db.session.commit()

        # Save to CSV
        csv_path = os.path.join(os.path.dirname(__file__), "hospital_credentials.csv")
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=[
                "hospital_id", "hospital_name", "email", "password", "role"
            ])
            writer.writeheader()
            writer.writerows(credentials)

        print(f"\n{'='*115}")
        print(f"✅ Created:  {created} hospital accounts")
        print(f"⚠️  Skipped: {skipped} hospitals (errors)")
        print(f"📄 Credentials saved to: {csv_path}")
        print(f"\n⚠️  IMPORTANT: Save the CSV — passwords are hashed and cannot be recovered!")
        print(f"{'='*115}\n")


if __name__ == "__main__":
    main()
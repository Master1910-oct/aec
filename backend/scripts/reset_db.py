import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from database.db import db
from models import User, Hospital, Ambulance, EmergencyRequest, Availability

app = create_app()

with app.app_context():
    print("Dropping all tables...")
    try:
        db.drop_all()
    except Exception as e:
        print(f"Error dropping tables: {e}")

    print("Creating all tables from current models...")
    db.create_all()
    print("Schema updated successfully!")

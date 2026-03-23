import os
import sys

# Load environment using same context
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app import create_app
from database import db
from models.emergency import Emergency

app = create_app()
with app.app_context():
    ems = db.session.query(Emergency).order_by(Emergency.created_at.desc()).limit(3).all()
    print("=== RECENT EMERGENCIES IN DATABASE ===")
    if not ems:
        print("No emergencies found.")
    for e in ems:
        print(f"ID {e.emergency_id}: {e.accident_description} - {e.created_at}")
    print("======================================")

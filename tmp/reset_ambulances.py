import sys
import os
# Ensure we can import from backend
sys.path.append(os.path.abspath(os.path.join(os.getcwd(), 'backend')))
from app import create_app
from database.db import db
from models.ambulance import Ambulance
from datetime import datetime

app = create_app()
with app.app_context():
    # Use text() for raw SQL if preferred, but SQLAlchemy model update is safer
    from sqlalchemy import text
    try:
        count = Ambulance.query.filter_by(status='ON_CALL').update({
            'status': 'AVAILABLE',
            'last_updated': datetime.utcnow()
        })
        db.session.commit()
        print(f"Successfully updated {count} ambulances to AVAILABLE.")
    except Exception as e:
        db.session.rollback()
        print(f"Error: {e}")

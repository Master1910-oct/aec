import sys
import os
from datetime import datetime

# Add the project root to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from database.db import db
from models.ambulance import Ambulance

def reset_sql():
    app = create_app()
    with app.app_context():
        try:
            num_updated = Ambulance.query.filter_by(status='ON_CALL').update({
                'status': 'AVAILABLE', 
                'last_updated': datetime.utcnow()
            })
            db.session.commit()
            print(f"SQL Reset Complete: {num_updated} ambulances updated.")
        except Exception as e:
            db.session.rollback()
            print(f"Error during SQL reset: {e}")
            sys.exit(1)

if __name__ == "__main__":
    reset_sql()

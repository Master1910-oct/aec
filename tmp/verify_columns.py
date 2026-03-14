import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.getcwd(), 'backend')))
from app import create_app
from database.db import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    try:
        with db.engine.connect() as conn:
            # Check ambulance columns
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'ambulance' AND column_name IN ('last_latitude', 'last_longitude', 'last_location_updated_at')"))
            amb_cols = [row[0] for row in result]
            print(f"Ambulance new columns found: {amb_cols}")
            
            # Check hospital columns
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'hospital' AND column_name = 'max_capacity'"))
            hosp_cols = [row[0] for row in result]
            print(f"Hospital new columns found: {hosp_cols}")
    except Exception as e:
        print(f"Error checking columns: {e}")

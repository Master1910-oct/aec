import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.getcwd(), 'backend')))
from app import create_app
from database.db import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    schema_name = 'emergency_ambulance_system'
    try:
        with db.engine.connect() as conn:
            # 1. Check ambulance columns
            print(f"--- Checking {schema_name}.ambulances ---")
            result = conn.execute(text(f"""
                SELECT COLUMN_NAME
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = '{schema_name}'
                AND TABLE_NAME = 'ambulances'
                AND COLUMN_NAME IN ('last_latitude','last_longitude','last_location_updated_at')
            """))
            found_amb = [row[0] for row in result]
            print(f"Found columns: {found_amb}")
            
            if len(found_amb) < 3:
                print("Missing columns in ambulances table. Applying ALTER...")
                conn.execute(text(f"USE {schema_name}"))
                conn.execute(text("""
                    ALTER TABLE ambulances
                    ADD COLUMN IF NOT EXISTS last_latitude FLOAT NULL,
                    ADD COLUMN IF NOT EXISTS last_longitude FLOAT NULL,
                    ADD COLUMN IF NOT EXISTS last_location_updated_at DATETIME NULL
                """))
                print("ALTER TABLE ambulances completed.")
            
            # 2. Check hospital columns
            print(f"\n--- Checking {schema_name}.hospital ---")
            result = conn.execute(text(f"""
                SELECT COLUMN_NAME
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = '{schema_name}'
                AND TABLE_NAME = 'hospital'
                AND COLUMN_NAME = 'max_capacity'
            """))
            found_hosp = [row[0] for row in result]
            print(f"Found columns: {found_hosp}")
            
            if len(found_hosp) < 1:
                print("Missing column max_capacity in hospital table. Applying ALTER...")
                conn.execute(text(f"USE {schema_name}"))
                conn.execute(text("""
                    ALTER TABLE hospital
                    ADD COLUMN IF NOT EXISTS max_capacity INT NOT NULL DEFAULT 100
                """))
                print("ALTER TABLE hospital completed.")
                
            # 3. Verify final state
            print("\n--- Final Verification ---")
            res_amb = conn.execute(text("DESCRIBE ambulances"))
            print("Ambulances table structure:")
            for row in res_amb:
                print(row)
                
            res_hosp = conn.execute(text("DESCRIBE hospital"))
            print("\nHospital table structure:")
            for row in res_hosp:
                print(row)

    except Exception as e:
        print(f"Error during database fix: {e}")

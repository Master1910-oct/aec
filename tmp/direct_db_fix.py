import sys
import os
sys.path.append('f:/aes/aec/backend')
from app import create_app
from database.db import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    try:
        with db.engine.connect() as conn:
            queries = [
                "ALTER TABLE emergency_requests ADD COLUMN accident_latitude FLOAT NULL",
                "ALTER TABLE emergency_requests ADD COLUMN accident_longitude FLOAT NULL",
                "ALTER TABLE emergency_requests ADD COLUMN needs_transfer BOOLEAN NOT NULL DEFAULT 0",
                "ALTER TABLE emergency_requests ADD COLUMN required_speciality VARCHAR(100) NULL",
                "ALTER TABLE emergency_requests ADD COLUMN transfer_legs TEXT NULL",
                "ALTER TABLE emergency_requests ADD COLUMN dispatch_sla_deadline DATETIME NULL",
                "ALTER TABLE emergency_requests ADD COLUMN transport_sla_deadline DATETIME NULL",
                "ALTER TABLE emergency_requests ADD COLUMN scene_arrived_at DATETIME NULL",
                "ALTER TABLE emergency_requests ADD COLUMN dispatch_response_time INTEGER NULL",
                "ALTER TABLE emergency_requests ADD COLUMN transport_response_time INTEGER NULL"
            ]
            for q in queries:
                print(f"Running: {q}")
                conn.execute(text(q))
            conn.commit()
            print("Done!")
    except Exception as e:
        print(f"FAILED: {e}")

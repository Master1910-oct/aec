import sys
import os
sys.path.append('f:/aes/aec/backend')
from app import create_app
from database.db import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    columns = [
        ("accident_latitude", "FLOAT NULL"),
        ("accident_longitude", "FLOAT NULL"),
        ("needs_transfer", "BOOLEAN NOT NULL DEFAULT 0"),
        ("required_speciality", "VARCHAR(100) NULL"),
        ("transfer_legs", "TEXT NULL"),
        ("dispatch_sla_deadline", "DATETIME NULL"),
        ("transport_sla_deadline", "DATETIME NULL"),
        ("scene_arrived_at", "DATETIME NULL"),
        ("dispatch_response_time", "INTEGER NULL"),
        ("transport_response_time", "INTEGER NULL")
    ]
    
    with db.engine.connect() as conn:
        for name, dtype in columns:
            try:
                print(f"Adding {name}...")
                conn.execute(text(f"ALTER TABLE emergency_requests ADD COLUMN {name} {dtype}"))
                conn.commit()
                print(f"  Successfully added {name}")
            except Exception as e:
                print(f"  Failed or already exists: {name} ({e})")
        
        # Also ensure alembic_version is correct
        try:
            conn.execute(text("UPDATE alembic_version SET version_num = '58c6d95acac9'"))
            conn.commit()
            print("Updated alembic_version to 58c6d95acac9")
        except Exception as e:
            print(f"Failed to update alembic_version: {e}")

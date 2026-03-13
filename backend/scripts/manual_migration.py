import sys
import os
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from database.db import db

app = create_app()

with app.app_context():
    print("Executing schema migrations...")
    queries = [
        "ALTER TABLE hospital ADD COLUMN specialities TEXT DEFAULT '';",
        "ALTER TABLE hospital ADD COLUMN user_id INTEGER UNIQUE;",
        "ALTER TABLE ambulances ADD COLUMN driver_name VARCHAR(100);",
        "ALTER TABLE ambulances ADD COLUMN user_id INTEGER UNIQUE;",
        "ALTER TABLE emergency_requests ADD COLUMN accident_description TEXT;",
        "ALTER TABLE emergency_requests ADD COLUMN acknowledged BOOLEAN DEFAULT FALSE NOT NULL;",
        "ALTER TABLE emergency_requests MODIFY COLUMN status VARCHAR(20);"
    ]

    for q in queries:
        try:
            db.session.execute(text(q))
            db.session.commit()
            print(f"✅ Executed: {q}")
        except Exception as e:
            db.session.rollback()
            print(f"⚠️ Failed/Skipped (might already exist): {e}")

    print("Schema update script finished.")

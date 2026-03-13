"""
run_migrations.py

Runs Flask-Migrate without starting background threads.
Usage: python scripts/run_migrations.py [migrate|upgrade|both]
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ── Patch background thread out before importing the app ──────────────────────
import threads.background_tasks as bg
bg.start_sla_monitor = lambda app: None   # no-op so migrate doesn't hang

from flask_migrate import upgrade, migrate as flask_migrate
from app import create_app
from database.db import db

app = create_app()

action = sys.argv[1] if len(sys.argv) > 1 else "both"

with app.app_context():
    if action in ("migrate", "both"):
        print("🔄 Running flask db migrate ...")
        flask_migrate(message="add_specialities_user_id_accident_description_acknowledged")
        print("✅ Migration file generated.")

    if action in ("upgrade", "both"):
        print("⬆️  Running flask db upgrade ...")
        upgrade()
        print("✅ Database schema upgraded.")

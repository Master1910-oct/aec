from flask import Flask, jsonify
from flask_cors import CORS
from flask_migrate import Migrate
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import threading
import os

from config import Config
from database.db import db
from extensions.socketio_ext import socketio
from routes.auth_routes import auth_bp
from routes.hospital_routes import hospital_bp
from routes.admin_routes import admin_bp
from routes.emergency_routes import emergency_bp
from routes.dashboard_routes import dashboard_bp
from routes.ambulance_routes import ambulance_bp
from models import Hospital, Ambulance, Availability, EmergencyRequest, User
from utils.error_handlers import register_error_handlers
from threads.background_tasks import start_sla_monitor


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # ─────────────────────────────────────────
    # CORS — supports multiple origins via comma-separated env var
    # ─────────────────────────────────────────
    allowed_origins_raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
    allowed_origins = [o.strip() for o in allowed_origins_raw.split(",")]
    
    # 🌟 NEW: Add specific Vercel preview origin from logs
    vercel_preview = "https://aec-8y106srcv-master1910-octs-projects.vercel.app"
    if vercel_preview not in allowed_origins:
        allowed_origins.append(vercel_preview)

    CORS(app, resources={r"/api/*": {"origins": allowed_origins}})

    # ─────────────────────────────────────────
    # Extensions
    # ─────────────────────────────────────────
    db.init_app(app)
    # 💥 Fix: Add pool_pre_ping to auto-reconnect on dropped MySQL connections
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {"pool_pre_ping": True}
    
    socketio.init_app(app, cors_allowed_origins=allowed_origins)
    Migrate(app, db)
    
    # ── Safe Table Provisioning ──────────────────
    with app.app_context():
        db.create_all()

    # ─────────────────────────────────────────
    # Rate Limiter
    # ─────────────────────────────────────────
    limiter = Limiter(
        get_remote_address,
        app=app,
        default_limits=["100 per minute"],
        storage_uri="memory://"
    )

    @app.errorhandler(429)
    def rate_limit_exceeded(e):
        return jsonify({
            "success": False,
            "message": "Too many attempts. Please wait a minute and try again.",
            "data": None
        }), 429

    limiter.limit("5 per minute")(auth_bp)
    limiter.exempt(ambulance_bp)
    limiter.exempt(emergency_bp)

    # ─────────────────────────────────────────
    # Error Handlers
    # ─────────────────────────────────────────
    register_error_handlers(app)

    # ─────────────────────────────────────────
    # Health Check
    # ─────────────────────────────────────────
    @app.route("/")
    def home():
        return {"status": "Backend running successfully"}

    # ─────────────────────────────────────────
    # Blueprints
    # ─────────────────────────────────────────
    app.register_blueprint(auth_bp,      url_prefix="/api/v1/auth")
    app.register_blueprint(hospital_bp,  url_prefix="/api/v1/hospital")
    app.register_blueprint(admin_bp)
    app.register_blueprint(emergency_bp)
    app.register_blueprint(dashboard_bp, url_prefix="/api/v1/dashboard")
    app.register_blueprint(ambulance_bp)

    from routes.setup_routes import setup_bp
    app.register_blueprint(setup_bp, url_prefix="/api/v1")

    # ─────────────────────────────────────────
    # Background Tasks (must run in production too)
    # ─────────────────────────────────────────
    thread = threading.Thread(target=start_sla_monitor, args=(app,))
    thread.daemon = True
    thread.start()

    return app


if __name__ == "__main__":
    app = create_app()
    socketio.run(
        app,
        host="0.0.0.0",
        port=5001,
        debug=True,
        use_reloader=False
    )
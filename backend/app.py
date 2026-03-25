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
    # 🌟 Dynamic CORS for Vercel Previews
    # Allows all Vercel subdomains + localhost + specific backend URL
    allowed_origins = [
        "http://localhost:5173",
        "https://aec-three.vercel.app", 
        "https://aec-production-2877.up.railway.app"
    ]
    
    # Socket.IO is picky, using '*' is safest for dynamic preview URLs in this dev phase
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # ─────────────────────────────────────────
    # Extensions
    # ─────────────────────────────────────────
    db.init_app(app)
    socketio.init_app(app, cors_allowed_origins="*")
    # 💥 Fix: Add pool_pre_ping to auto-reconnect on dropped MySQL connections
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {"pool_pre_ping": True}
    
    socketio.init_app(app, cors_allowed_origins=allowed_origins)
    Migrate(app, db)
    
    # ── Safe Table Provisioning ──────────────────
    with app.app_context():
        # First create missing tables
        db.create_all()
        
        # Then ensure missing columns in existing tables (manual migrations)
        try:
            from sqlalchemy import text
            with db.engine.connect() as conn:
                # Add columns if they don't exist
                # MySQL logic: ADD COLUMN ...
                try:
                    conn.execute(text("ALTER TABLE scene_dispatches ADD COLUMN latitude FLOAT"))
                    conn.commit()
                except: pass # Column already exists or table doesn't
                
                try:
                    conn.execute(text("ALTER TABLE scene_dispatches ADD COLUMN longitude FLOAT"))
                    conn.commit()
                except: pass
        except Exception as e:
            app.logger.error(f"Migration error: {e}")

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
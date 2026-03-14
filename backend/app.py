from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
import threading

from config import Config
from database.db import db
from extensions.socketio_ext import socketio

# Blueprints
from routes.hospital_routes import hospital_bp
from routes.admin_routes import admin_bp
from routes.emergency_routes import emergency_bp
from routes.dashboard_routes import dashboard_bp
from routes.auth_routes import auth_bp
from routes.ambulance_routes import ambulance_bp


# Models (required for migrations)
from models import Hospital, Ambulance, Availability, EmergencyRequest, User

# Error handlers
from utils.error_handlers import register_error_handlers

# Background SLA monitor
from threads.background_tasks import start_sla_monitor


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS globally (frontend runs on different port during development)
    CORS(app, resources={r"/*": {"origins": "*"}})

    # Initialize Extensions
    db.init_app(app)
    socketio.init_app(app, cors_allowed_origins="*")
    Migrate(app, db)

    # Register Global Error Handlers
    register_error_handlers(app)

    # Health Check Route
    @app.route("/")
    def home():
        return {"status": "Backend running successfully"}

    # Register Blueprints
    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(hospital_bp, url_prefix="/api/v1/hospital")
    app.register_blueprint(admin_bp)            # admin_bp already has /api/v1/admin prefix
    app.register_blueprint(emergency_bp)        # emergency_bp already has /api/v1/emergency prefix
    app.register_blueprint(dashboard_bp, url_prefix="/api/v1/dashboard")
    app.register_blueprint(ambulance_bp)


    # Temporary setup route — remove after first use
    from routes.setup_routes import setup_bp
    app.register_blueprint(setup_bp, url_prefix="/api/v1")

    return app


# Application Entry Point
if __name__ == "__main__":
    app = create_app()

    # Start SLA Monitor Thread (ONLY ONCE)
    thread = threading.Thread(target=start_sla_monitor, args=(app,))
    thread.daemon = True
    thread.start()

    socketio.run(
        app,
        host="0.0.0.0",
        port=5001,
        debug=True,
        use_reloader=False  # Prevent duplicate background threads
    )

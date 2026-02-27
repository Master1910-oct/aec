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

# Models (required for migrations)
from models import Hospital, Ambulance, Availability, EmergencyRequest, User

# Error handlers
from utils.error_handlers import register_error_handlers

# Background SLA monitor
from threads.background_tasks import start_sla_monitor


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS for everything (frontend runs on different port during development).
    # previously we limited it to "/api/*"; the health-check at "/" also needs to be reachable,
    # so just allow all origins globally.
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
    app.register_blueprint(admin_bp, url_prefix="/api/v1/admin")
    app.register_blueprint(emergency_bp, url_prefix="/api/v1/emergency")
    app.register_blueprint(dashboard_bp, url_prefix="/api/v1/dashboard")

    # 🔥 Start SLA Monitor Thread (ONLY ONCE)
    thread = threading.Thread(target=start_sla_monitor, args=(app,))
    thread.daemon = True
    thread.start()

    return app


# Application Entry Point
if __name__ == "__main__":
    app = create_app()

    socketio.run(
        app,
        host="0.0.0.0",
        port=5001,
        debug=True,
        use_reloader=False  # Prevent duplicate background threads
    )

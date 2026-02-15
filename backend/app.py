from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate

from config import Config
from database.db import db
from extensions.socketio_ext import socketio

# Import Blueprints
from routes.hospital_routes import hospital_bp
from routes.admin_routes import admin_bp
from routes.emergency_routes import emergency_bp
from routes.dashboard_routes import dashboard_bp

# Import models (required for migrations)
from models import Hospital, Ambulance, Availability, EmergencyRequest


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS for frontend integration
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Initialize extensions
    db.init_app(app)
    socketio.init_app(app)
    Migrate(app, db)

    # Health check route
    @app.route("/")
    def home():
        return {"status": "Backend running successfully"}

    # Register Blueprints (ONLY define prefix here)
    app.register_blueprint(hospital_bp, url_prefix="/api/v1/hospital")
    app.register_blueprint(admin_bp, url_prefix="/api/v1/admin")
    app.register_blueprint(emergency_bp, url_prefix="/api/v1/emergency")
    app.register_blueprint(dashboard_bp, url_prefix="/api/v1/dashboard")

    return app


app = create_app()

if __name__ == "__main__":
    socketio.run(app, host="127.0.0.1", port=5001, debug=True)
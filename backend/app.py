from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate

from config import Config
from database.db import db
from extensions.socketio_ext import socketio

from routes.hospital_routes import hospital_bp
from routes.admin_routes import admin_bp

# Import models so migrations detect them
from models import Hospital, Ambulance, Availability


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app)

    db.init_app(app)
    socketio.init_app(app)
    Migrate(app, db)

    @app.route("/")
    def home():
        return {"status": "Backend running successfully"}

    app.register_blueprint(hospital_bp)
    app.register_blueprint(admin_bp)

    return app


app = create_app()

if __name__ == "__main__":
    socketio.run(app, host="127.0.0.1", port=5001, debug=True)

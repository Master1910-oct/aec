from database.db import db
from datetime import datetime


class Ambulance(db.Model):
    __tablename__ = "ambulances"

    ambulance_id = db.Column(db.Integer, primary_key=True)
    vehicle_number = db.Column(db.String(50), unique=True, nullable=False)

    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)

    status = db.Column(
        db.Enum(
            "AVAILABLE",
            "ON_CALL",
            "MAINTENANCE",
            name="ambulance_status"
        ),
        default="AVAILABLE"
    )

    last_updated = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    # 🔥 Replace old backref with back_populates
    emergencies = db.relationship(
        "EmergencyRequest",
        back_populates="ambulance"
    )
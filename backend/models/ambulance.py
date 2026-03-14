from database.db import db
from datetime import datetime


class Ambulance(db.Model):
    __tablename__ = "ambulances"

    ambulance_id = db.Column(db.Integer, primary_key=True)
    vehicle_number = db.Column(db.String(50), unique=True, nullable=False)
    driver_name = db.Column(db.String(100), nullable=True)

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

    last_latitude = db.Column(db.Float, nullable=True)
    last_longitude = db.Column(db.Float, nullable=True)
    last_location_updated_at = db.Column(db.DateTime, nullable=True)

    last_updated = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    # Link to the ambulance operator's user account
    user_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=True, unique=True)

    # Relationships
    emergencies = db.relationship(
        "EmergencyRequest",
        back_populates="ambulance"
    )

    user = db.relationship("User", backref=db.backref("ambulance", uselist=False))

    def to_dict(self):
        return {
            "ambulance_id": self.ambulance_id,
            "vehicle_number": self.vehicle_number,
            "driver_name": self.driver_name,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "status": self.status,
            "last_latitude": self.last_latitude,
            "last_longitude": self.last_longitude,
            "last_location_updated_at": self.last_location_updated_at.isoformat() if self.last_location_updated_at else None,
            "last_updated": self.last_updated.isoformat() if self.last_updated else None,
        }
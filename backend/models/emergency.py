from database.db import db
from datetime import datetime


class EmergencyRequest(db.Model):
    __tablename__ = "emergency_requests"

    emergency_id = db.Column(db.Integer, primary_key=True)

    patient_name = db.Column(db.String(100), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    emergency_type = db.Column(db.String(100), nullable=False)

    status = db.Column(
        db.Enum(
            "pending",
            "allocated",
            "in_progress",
            "completed",
            "cancelled",
            name="emergency_status"
        ),
        default="pending"
    )

    hospital_id = db.Column(
        db.Integer,
        db.ForeignKey("hospital.hospital_id")
    )

    ambulance_id = db.Column(
        db.Integer,
        db.ForeignKey("ambulances.ambulance_id")
    )

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Proper bidirectional relationships
    hospital = db.relationship(
        "Hospital",
        back_populates="emergencies"
    )

    ambulance = db.relationship(
        "Ambulance",
        back_populates="emergencies"
    )
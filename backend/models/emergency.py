from database.db import db
from datetime import datetime


class EmergencyRequest(db.Model):
    __tablename__ = "emergency_requests"

    emergency_id = db.Column(db.Integer, primary_key=True)

    patient_name = db.Column(db.String(100), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    emergency_type = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(50), default="pending")

    # 🔥 MUST MATCH YOUR REAL TABLE NAME: hospital
    hospital_id = db.Column(
        db.Integer,
        db.ForeignKey("hospital.hospital_id")
    )

    # Your real table name: ambulances
    ambulance_id = db.Column(
        db.Integer,
        db.ForeignKey("ambulances.ambulance_id")
    )

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    hospital = db.relationship("Hospital", backref="emergency_requests")
    ambulance = db.relationship("Ambulance", backref="emergency_requests")
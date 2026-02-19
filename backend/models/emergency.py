from database.db import db
from datetime import datetime


class EmergencyRequest(db.Model):
    __tablename__ = "emergency_requests"

    emergency_id = db.Column(db.Integer, primary_key=True)

    patient_name = db.Column(db.String(100), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    emergency_type = db.Column(db.String(100), nullable=False)

    # 🔥 Emergency Severity
    severity = db.Column(
        db.Enum(
            "critical",
            "high",
            "medium",
            "low",
            name="emergency_severity"
        ),
        nullable=False,
        default="medium",
        index=True
    )

    # 🔥 Emergency Status (UPDATED — added escalated)
    status = db.Column(
        db.Enum(
            "pending",
            "allocated",
            "in_progress",
            "completed",
            "cancelled",
            "escalated",  # ✅ NEW STATUS
            name="emergency_status"
        ),
        default="pending",
        index=True
    )

    hospital_id = db.Column(
        db.Integer,
        db.ForeignKey("hospital.hospital_id"),
        index=True
    )

    ambulance_id = db.Column(
        db.Integer,
        db.ForeignKey("ambulances.ambulance_id"),
        index=True
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        index=True
    )

    # 🔥 SLA Deadline
    sla_deadline = db.Column(
        db.DateTime,
        nullable=True,
        index=True
    )

    # Relationships
    hospital = db.relationship(
        "Hospital",
        back_populates="emergencies"
    )

    ambulance = db.relationship(
        "Ambulance",
        back_populates="emergencies"
    )

    # Helper for JSON responses
    def to_dict(self):
        return {
            "emergency_id": self.emergency_id,
            "patient_name": self.patient_name,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "emergency_type": self.emergency_type,
            "severity": self.severity,
            "status": self.status,
            "hospital_id": self.hospital_id,
            "ambulance_id": self.ambulance_id,
            "created_at": self.created_at,
            "sla_deadline": self.sla_deadline
        }

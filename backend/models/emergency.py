from database.db import db
from datetime import datetime


class EmergencyRequest(db.Model):
    __tablename__ = "emergency_requests"

    emergency_id = db.Column(db.Integer, primary_key=True)

    # Patient / accident info
    patient_name        = db.Column(db.String(100), nullable=True)
    accident_description = db.Column(db.Text, nullable=True)
    latitude            = db.Column(db.Float, nullable=False)
    longitude           = db.Column(db.Float, nullable=False)
    emergency_type      = db.Column(db.String(100), nullable=False)

    # Severity
    severity = db.Column(
        db.Enum("critical", "high", "medium", "low", name="emergency_severity"),
        nullable=False,
        default="medium",
        index=True
    )

    # Status — full lifecycle
    status = db.Column(
        db.Enum(
            "pending", "allocated", "en_route", "arrived",
            "in_progress", "completed", "cancelled", "escalated",
            name="emergency_status"
        ),
        default="pending",
        index=True
    )

    # Whether the receiving hospital has acknowledged the incoming emergency
    acknowledged = db.Column(db.Boolean, default=False, nullable=False)

    hospital_id  = db.Column(db.Integer, db.ForeignKey("hospital.hospital_id"),  index=True)
    ambulance_id = db.Column(db.Integer, db.ForeignKey("ambulances.ambulance_id"), index=True)

    created_at   = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    sla_deadline = db.Column(db.DateTime, nullable=True, index=True)

    # Relationships
    hospital  = db.relationship("Hospital",  back_populates="emergencies")
    ambulance = db.relationship("Ambulance", back_populates="emergencies")

    def is_overdue(self):
        if self.sla_deadline and self.status not in ["completed", "cancelled", "escalated"]:
            return datetime.utcnow() > self.sla_deadline
        return False

    def to_dict(self):
        hospital_info = None
        if self.hospital:
            hospital_info = {
                "hospital_id":    self.hospital.hospital_id,
                "name":           self.hospital.name,
                "address":        self.hospital.address,
                "contact_number": self.hospital.contact_number,
                "latitude":       self.hospital.latitude,
                "longitude":      self.hospital.longitude,
            }

        ambulance_info = None
        if self.ambulance:
            ambulance_info = {
                "ambulance_id":   self.ambulance.ambulance_id,
                "vehicle_number": self.ambulance.vehicle_number,
                "driver_name":    self.ambulance.driver_name,
                # ✅ Fix: include live coordinates so LiveMap can draw road route
                "latitude":       self.ambulance.latitude,
                "longitude":      self.ambulance.longitude,
            }

        return {
            "emergency_id":        self.emergency_id,
            "patient_name":        self.patient_name,
            "accident_description": self.accident_description,
            "latitude":            self.latitude,
            "longitude":           self.longitude,
            "emergency_type":      self.emergency_type,
            "severity":            self.severity,
            "status":              self.status,
            "acknowledged":        self.acknowledged,
            "hospital_id":         self.hospital_id,
            "ambulance_id":        self.ambulance_id,
            "hospital":            hospital_info,
            "ambulance":           ambulance_info,
            "created_at":          self.created_at.isoformat() if self.created_at else None,
            "sla_deadline":        self.sla_deadline.isoformat() if self.sla_deadline else None,
            "is_overdue":          self.is_overdue(),
        }
from database.db import db
from datetime import datetime


class EmergencyRequest(db.Model):
    __tablename__ = "emergency_requests"

    emergency_id         = db.Column(db.Integer, primary_key=True)
    patient_name         = db.Column(db.String(100), nullable=True)
    accident_description = db.Column(db.Text, nullable=True)
    latitude             = db.Column(db.Float, nullable=False)
    longitude            = db.Column(db.Float, nullable=False)

    # ✅ Expanded emergency types
    emergency_type = db.Column(
        db.Enum(
            "trauma", "cardiac", "respiratory", "neurological",
            "orthopaedic", "maternity", "ophthalmology", "ent",
            "paediatric", "oncology", "dermatology", "urology",
            "psychiatry", "other",
            name="emergency_type_enum"
        ),
        nullable=False
    )

    severity = db.Column(
        db.Enum("critical", "high", "medium", "low", name="emergency_severity"),
        nullable=False, default="medium", index=True
    )

    status = db.Column(
        db.Enum(
            "pending", "allocated", "en_route", "arrived",
            "first_aid", "transfer_en_route", "in_progress",
            "completed", "cancelled", "escalated",
            name="emergency_status"
        ),
        default="pending", index=True
    )

    acknowledged = db.Column(db.Boolean, default=False, nullable=False)
    hospital_id  = db.Column(db.Integer, db.ForeignKey("hospital.hospital_id"),    index=True)
    ambulance_id = db.Column(db.Integer, db.ForeignKey("ambulances.ambulance_id"), index=True)

    # GPS fields
    accident_latitude = db.Column(db.Float, nullable=True)
    accident_longitude = db.Column(db.Float, nullable=True)

    # Transfer fields
    needs_transfer = db.Column(db.Boolean, nullable=False, default=False, server_default="0")
    required_speciality = db.Column(db.String(100), nullable=True)
    transfer_legs = db.Column(db.Text, nullable=True)

    # Dual SLA timers
    dispatch_sla_deadline = db.Column(db.DateTime, nullable=True)
    transport_sla_deadline = db.Column(db.DateTime, nullable=True)
    scene_arrived_at = db.Column(db.DateTime, nullable=True)
    dispatch_response_time = db.Column(db.Integer, nullable=True)
    transport_response_time = db.Column(db.Integer, nullable=True)

    created_at   = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    sla_deadline = db.Column(db.DateTime, nullable=True, index=True)

    hospital  = db.relationship("Hospital",  back_populates="emergencies")
    ambulance = db.relationship("Ambulance", back_populates="emergencies")

    def is_overdue(self):
        now = datetime.utcnow()
        if self.status in ["pending", "allocated", "en_route"]:
            return bool(self.dispatch_sla_deadline and now > self.dispatch_sla_deadline)
        elif self.status in ["arrived", "first_aid", "transfer_en_route"]:
            return bool(self.transport_sla_deadline and now > self.transport_sla_deadline)
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
                "latitude":       self.ambulance.latitude,
                "longitude":      self.ambulance.longitude,
            }

        now = datetime.utcnow()
        is_overdue = False
        if self.status in ["pending", "allocated", "en_route"]:
            if self.dispatch_sla_deadline and now > self.dispatch_sla_deadline:
                is_overdue = True
        elif self.status in ["arrived", "first_aid", "transfer_en_route"]:
            if self.transport_sla_deadline and now > self.transport_sla_deadline:
                is_overdue = True

        return {
            "id":                   self.emergency_id,  # For legacy frontend compatibility
            "emergency_id":         self.emergency_id,
            "patient_name":         self.patient_name,
            "accident_description": self.accident_description,
            "latitude":             self.latitude,
            "longitude":            self.longitude,
            "accident_latitude":    self.accident_latitude,
            "accident_longitude":   self.accident_longitude,
            "emergency_type":       self.emergency_type,
            "severity":             self.severity,
            "status":               self.status,
            "acknowledged":         self.acknowledged,
            "hospital_id":          self.hospital_id,
            "ambulance_id":         self.ambulance_id,
            "hospital":             hospital_info,
            "ambulance":            ambulance_info,
            "created_at":           self.created_at.isoformat() if self.created_at else None,
            "dispatch_sla_deadline": self.dispatch_sla_deadline.isoformat() if self.dispatch_sla_deadline else None,
            "transport_sla_deadline": self.transport_sla_deadline.isoformat() if self.transport_sla_deadline else None,
            "scene_arrived_at":     self.scene_arrived_at.isoformat() if self.scene_arrived_at else None,
            "needs_transfer":       self.needs_transfer,
            "required_speciality":  self.required_speciality,
            "transfer_legs":        self.transfer_legs,
            "is_overdue":           is_overdue,
        }
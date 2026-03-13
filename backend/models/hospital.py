from database.db import db
from datetime import datetime


class Hospital(db.Model):
    __tablename__ = "hospital"

    hospital_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    address = db.Column(db.String(255), nullable=False)

    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)

    capabilities = db.Column(db.String(255))

    # Comma-separated list: trauma,cardiac,respiratory,neurological,other
    specialities = db.Column(db.Text, nullable=True, default="")

    contact_number = db.Column(db.String(20), nullable=False)

    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Link to the hospital's user account
    user_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=True, unique=True)

    # Relationships
    emergencies = db.relationship(
        "EmergencyRequest",
        back_populates="hospital",
        cascade="all"
    )

    availability = db.relationship(
        "Availability",
        back_populates="hospital",
        uselist=False,
        cascade="all, delete-orphan"
    )

    user = db.relationship("User", backref=db.backref("hospital", uselist=False))

    def get_specialities_list(self):
        """Return specialities as a list."""
        if not self.specialities:
            return []
        return [s.strip().lower() for s in self.specialities.split(",") if s.strip()]

    def to_dict(self):
        availability = self.availability
        available_beds = availability.available_beds if availability else 0
        return {
            "hospital_id": self.hospital_id,
            "name": self.name,
            "address": self.address,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "contact_number": self.contact_number,
            "specialities": self.get_specialities_list(),
            "available_beds": available_beds,
            "is_active": self.is_active,
            "status": "GREEN" if available_beds > 0 else "RED",
        }
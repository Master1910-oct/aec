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

    contact_number = db.Column(db.String(20), nullable=False)
    is_active = db.Column(db.Boolean, default=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    availability = db.relationship(
        "Availability",
        backref="hospital",
        uselist=False,
        cascade="all, delete-orphan"
    )

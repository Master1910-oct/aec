from database.db import db
from datetime import datetime

class Availability(db.Model):
    __tablename__ = "availability"

    availability_id = db.Column(db.Integer, primary_key=True)

    hospital_id = db.Column(
        db.Integer,
        db.ForeignKey("hospital.hospital_id"),  # 👈 THIS WAS MISSING
        nullable=False,
        unique=True
    )

    available_beds = db.Column(db.Integer, nullable=False, default=0)

    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

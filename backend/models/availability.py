from database.db import db


class Availability(db.Model):
    __tablename__ = "availability"

    availability_id = db.Column(db.Integer, primary_key=True)

    hospital_id = db.Column(
        db.Integer,
        db.ForeignKey("hospital.hospital_id"),
        unique=True
    )

    available_beds = db.Column(db.Integer, nullable=False)

    hospital = db.relationship(
        "Hospital",
        back_populates="availability"
    )
from database.db import db
from datetime import datetime

class LocationHistory(db.Model):
    __tablename__ = "location_history"
    
    id = db.Column(db.Integer, primary_key=True)
    ambulance_id = db.Column(
        db.Integer, 
        db.ForeignKey("ambulances.ambulance_id"), 
        nullable=False,
        index=True
    )
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    recorded_at = db.Column(db.DateTime, nullable=False)
    synced_at = db.Column(
        db.DateTime, 
        nullable=False, 
        default=datetime.utcnow
    )
    is_offline_record = db.Column(
        db.Boolean, 
        nullable=False, 
        default=False
    )
    
    ambulance = db.relationship(
        "Ambulance", 
        backref=db.backref("location_history", lazy="dynamic")
    )
    
    def to_dict(self):
        return {
            "id": self.id,
            "ambulance_id": self.ambulance_id,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "recorded_at": self.recorded_at.isoformat(),
            "synced_at": self.synced_at.isoformat(),
            "is_offline_record": self.is_offline_record
        }

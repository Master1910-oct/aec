from database.db import db
from datetime import datetime

class SceneDispatch(db.Model):
    __tablename__ = "scene_dispatches"

    id                    = db.Column(db.Integer, primary_key=True)
    caller_name           = db.Column(db.String(255), nullable=False)
    callback_number       = db.Column(db.String(20), nullable=False)
    description           = db.Column(db.Text, nullable=False)
    caller_location       = db.Column(db.String(500), nullable=False)
    assigned_ambulance_id = db.Column(db.Integer, db.ForeignKey("ambulances.ambulance_id"), nullable=False, index=True)
    
    status                = db.Column(
        db.Enum('en_route_to_scene', 'arrived', 'completed', name='scene_dispatch_status'),
        default='en_route_to_scene',
        nullable=False
    )
    
    dispatched_at         = db.Column(db.DateTime, default=datetime.utcnow)
    arrived_at            = db.Column(db.DateTime, nullable=True)

    # Relationship back to ambulance
    ambulance = db.relationship("Ambulance", backref="scene_dispatches")

    def to_dict(self):
        return {
            "dispatch_id":           self.id,
            "caller_name":           self.caller_name,
            "callback_number":       self.callback_number,
            "description":           self.description,
            "caller_location":       self.caller_location,
            "assigned_ambulance_id": self.assigned_ambulance_id,
            "status":                self.status,
            "dispatched_at":         self.dispatched_at.isoformat() if self.dispatched_at else None,
            "arrived_at":            self.arrived_at.isoformat() if self.arrived_at else None
        }

from flask import Blueprint
from extensions.socketio_ext import socketio
from models import Hospital, Availability
from utils.distance import haversine

ambulance_bp = Blueprint("ambulance_bp", __name__)

@socketio.on("ambulance_location")
def handle_ambulance_location(data):
    amb_lat = data["latitude"]
    amb_lon = data["longitude"]
    ambulance_id = data["ambulance_id"]

    hospitals = (
        Hospital.query
        .join(Availability)
        .filter(Availability.available_beds > 0)
        .all()
    )

    nearest = None
    min_distance = float("inf")

    for hospital in hospitals:
        distance = haversine(
            amb_lat,
            amb_lon,
            hospital.latitude,
            hospital.longitude
        )

        if distance < min_distance:
            min_distance = distance
            nearest = hospital

    if not nearest:
        socketio.emit("hospital_assignment", {
            "ambulance_id": ambulance_id,
            "status": "NO_HOSPITAL_AVAILABLE"
        })
        return

    assignment = {
        "ambulance_id": ambulance_id,
        "hospital_id": nearest.hospital_id,
        "hospital_name": nearest.name,
        "distance_km": round(min_distance, 2),
        "latitude": nearest.latitude,
        "longitude": nearest.longitude
    }

    # 🔥 BROADCAST ASSIGNMENT
    socketio.emit("hospital_assignment", assignment)

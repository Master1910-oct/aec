from flask import Blueprint, jsonify
from models import Hospital, Availability
from extensions.socket import socketio



hospital_bp = Blueprint(
    "hospital_bp",
    __name__,
    url_prefix="/api"
)

@hospital_bp.route("/hospitals", methods=["GET"])
def get_hospitals():
    hospitals = Hospital.query.all()
    response = []

    for hospital in hospitals:
        availability = hospital.availability

        status = "RED"
        beds = 0

        if availability and availability.available_beds > 0:
            status = "GREEN"
            beds = availability.available_beds

        response.append({
            "id": hospital.hospital_id,
            "name": hospital.name,
            "latitude": hospital.latitude,
            "longitude": hospital.longitude,
            "available_beds": beds,
            "status": status
        })

    return jsonify(response)

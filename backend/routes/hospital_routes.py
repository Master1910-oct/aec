from flask import Blueprint
from models import Hospital
from utils.response import success_response


hospital_bp = Blueprint("hospital", __name__)


@hospital_bp.route("/", methods=["GET"])
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

    return success_response(
        message="Hospitals fetched successfully",
        data=response
    )
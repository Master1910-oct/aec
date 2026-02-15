from flask import Blueprint, request, jsonify
from database.db import db
from models import Availability
from extensions.socketio_ext import socketio

admin_bp = Blueprint(
    "admin_bp",
    __name__,
    url_prefix="/api/admin"
)

@admin_bp.route("/availability/<int:hospital_id>", methods=["PUT"])
def update_availability(hospital_id):
    data = request.get_json()
    beds = data.get("available_beds")

    availability = Availability.query.filter_by(
        hospital_id=hospital_id
    ).first()

    if not availability:
        return jsonify({"error": "Availability not found"}), 404

    availability.available_beds = beds
    db.session.commit()

    status = "GREEN" if beds > 0 else "RED"

    payload = {
        "id": hospital_id,
        "available_beds": beds,
        "status": status
    }

    # 🔥 LIVE SOCKET EVENT
    socketio.emit("availability_updated", payload)

    return jsonify({
        "message": "Availability updated",
        "data": payload
    })

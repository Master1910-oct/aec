from flask import Blueprint
from datetime import datetime
from models import EmergencyRequest
from models.ambulance import Ambulance
from models.hospital import Hospital
from utils.response import success_response
from utils.decorators import token_required, roles_required

dashboard_bp = Blueprint("dashboard_bp", __name__)


@dashboard_bp.route("/stats", methods=["GET"])
@token_required
@roles_required("admin")
def get_dashboard_stats():
    now = datetime.utcnow()

    total = EmergencyRequest.query.count()
    pending = EmergencyRequest.query.filter_by(status="pending").count()
    allocated = EmergencyRequest.query.filter_by(status="allocated").count()
    en_route = EmergencyRequest.query.filter_by(status="en_route").count()
    completed = EmergencyRequest.query.filter_by(status="completed").count()
    escalated = EmergencyRequest.query.filter_by(status="escalated").count()

    # SLA breaches: active emergencies past their deadline
    active_statuses = ["pending", "allocated", "en_route", "arrived", "in_progress"]
    sla_breached = EmergencyRequest.query.filter(
        EmergencyRequest.status.in_(active_statuses),
        EmergencyRequest.sla_deadline < now
    ).count()

    total_ambulances = Ambulance.query.count()
    available_ambulances = Ambulance.query.filter_by(status="AVAILABLE").count()
    on_call_ambulances = Ambulance.query.filter_by(status="ON_CALL").count()

    total_hospitals = Hospital.query.filter_by(is_active=True).count()
    from models.availability import Availability
    available_hospitals = (
        Hospital.query
        .join(Availability)
        .filter(Hospital.is_active == True, Availability.available_beds > 0)
        .count()
    )

    return success_response(
        message="Dashboard stats fetched successfully",
        data={
            "total_emergencies": total,
            "pending": pending,
            "allocated": allocated,
            "en_route": en_route,
            "completed": completed,
            "escalated": escalated,
            "sla_breached": sla_breached,
            "total_ambulances": total_ambulances,
            "available_ambulances": available_ambulances,
            "on_call_ambulances": on_call_ambulances,
            "total_hospitals": total_hospitals,
            "available_hospitals": available_hospitals,
        }
    )
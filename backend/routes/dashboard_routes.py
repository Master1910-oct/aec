from flask import Blueprint
from models import EmergencyRequest
from utils.response import success_response

dashboard_bp = Blueprint(
    "dashboard_bp",
    __name__
)


@dashboard_bp.route("/stats", methods=["GET"])
def get_dashboard_stats():
    total = EmergencyRequest.query.count()
    allocated = EmergencyRequest.query.filter_by(status="allocated").count()
    pending = EmergencyRequest.query.filter_by(status="pending").count()

    return success_response(
        message="Dashboard stats fetched successfully",
        data={
            "total_emergencies": total,
            "allocated": allocated,
            "pending": pending
        }
    )
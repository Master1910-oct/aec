import time
from services.sla_monitor_service import check_sla_breaches


def start_sla_monitor(app):
    print("✅ SLA Monitoring Service Started")

    with app.app_context():
        while True:
            check_sla_breaches()
            time.sleep(30)

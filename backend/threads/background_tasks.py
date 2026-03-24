import time
from services.sla_monitor_service import check_sla_breaches


def start_sla_monitor(app):
    print("[OK] SLA Monitoring Service Started")

    while True:
        with app.app_context():
            check_sla_breaches()
        time.sleep(30)


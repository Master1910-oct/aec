import time
from services.sla_monitor_service import check_sla_breaches


def start_sla_monitor(app):
    print("[OK] SLA Monitoring Service Started")

    while True:
        try:
            with app.app_context():
                check_sla_breaches()
        except Exception as e:
            print(f"[ERR] SLA Monitor Internal Error: {e}")
        finally:
            from database.db import db
            with app.app_context():
                db.session.remove()
        
        time.sleep(30)


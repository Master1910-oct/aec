from app import create_app
from models.user import User

app = create_app()

with app.app_context():
    admin = User.query.filter_by(role='admin').first()
    if admin:
        token = admin.get_token()
        print(f"ADMIN_TOKEN={token}")
    else:
        print("No admin user found")

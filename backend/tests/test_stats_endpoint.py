import traceback
from app import create_app
from models.user import User

app = create_app()
app.testing = True
client = app.test_client()

with app.app_context():
    admin = User.query.filter_by(role='admin').first()
    if admin:
        token = admin.get_token()
        print("Got admin token")
        
        try:
            response = client.get('/api/v1/admin/stats', headers={'Authorization': f'Bearer {token}'})
            print(f"Status: {response.status_code}")
            print(response.get_json())
            
        except Exception as e:
            traceback.print_exc()
    else:
        print("No admin user found")

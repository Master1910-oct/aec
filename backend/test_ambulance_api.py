import urllib.request
import json
import traceback

try:
    from app import create_app
    from models.user import User

    app = create_app()

    with app.app_context():
        admin = User.query.filter_by(role='admin').first()
        if admin:
            token = admin.get_token()
            
            req = urllib.request.Request('http://localhost:5004/api/v1/ambulance/locations')
            req.add_header('Authorization', f'Bearer {token}')
            
            try:
                with urllib.request.urlopen(req) as response:
                    res_body = response.read().decode('utf-8')
                    print(f"Status: {response.status}")
                    print(f"Response: {res_body}")
            except urllib.error.HTTPError as e:
                print(f"HTTPError: {e.code}")
                print(e.read().decode('utf-8'))
            except Exception as e:
                print(f"Request Error: {e}")
        else:
            print("No admin user")
except Exception as e:
    traceback.print_exc()

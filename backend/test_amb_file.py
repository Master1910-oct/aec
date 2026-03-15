import sys
import os
import traceback

out_path = r'e:\Laptop\Main Project\aes\tmp\test_amb_out.txt'
sys.stdout = open(out_path, 'w')
sys.stderr = sys.stdout

try:
    from app import create_app
    from models.user import User

    print("Creating app...")
    app = create_app()
    app.testing = True
    client = app.test_client()

    with app.app_context():
        print("Getting admin user...")
        admin = User.query.filter_by(role='admin').first()
        if not admin:
            print("No admin user found")
        else:
            token = admin.get_token()
            print("Got token, making request...")
            
            response = client.get('/api/v1/ambulance/locations', headers={'Authorization': f'Bearer {token}'})
            print(f"Status: {response.status_code}")
            print(response.get_json())
            
except Exception as e:
    traceback.print_exc()

print("Done")
sys.stdout.flush()
sys.stdout.close()
os._exit(0)

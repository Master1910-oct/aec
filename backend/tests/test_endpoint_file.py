import sys
import os

out_path = r'e:\Laptop\Main Project\aes\tmp\test_out.txt'
sys.stdout = open(out_path, 'w')
sys.stderr = sys.stdout

try:
    from app import create_app
    from database.db import db
    from models.user import User
    
    app = create_app()
    with app.app_context():
        # Get admin user
        admin = User.query.filter_by(role='admin').first()
        if not admin:
            print("No admin user")
        else:
            token = admin.get_token()
            client = app.test_client()
            resp = client.get('/api/v1/admin/stats', headers={'Authorization': f'Bearer {token}'})
            print(resp.status_code)
            print(resp.get_data(as_text=True))
            
except Exception as e:
    import traceback
    traceback.print_exc()

sys.stdout.flush()
sys.stdout.close()
os._exit(0)

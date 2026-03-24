import os
import json
from app import create_app
from database.db import db
from models import User, Ambulance

app = create_app()
app.testing = True
client = app.test_client()

with app.app_context():
    # 1. Create a fake admin user if not exists or just find one
    admin = User.query.filter_by(role='admin').first()
    if not admin:
        print("No admin user found. Creating one...")
        admin = User(name="Test Admin", email="testadmin@aes.com", role="admin")
        admin.set_password("admin123")
        db.session.add(admin)
        db.session.commit()
    
    token = admin.get_token() # Wait, does User have get_token? Let's check models/user.py
    
    # Actually, let's just mock the decorator's g.current_user if possible, 
    # but it's easier to just call the function.
    
    # Wait, get_token is not in User model usually, it's in utils/auth.py
    # Actually, let's just manually generate a token.
    from utils.auth import generate_token
    token = generate_token(admin)
    
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    print("Calling /api/v1/ambulance/locations ...")
    response = client.get('/api/v1/ambulance/locations', headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Body: {response.get_data(as_text=True)}")

os._exit(0)

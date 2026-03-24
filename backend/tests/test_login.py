import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from models import User

app = create_app()

with app.app_context():
    email = 'admin@example.com'
    user = User.query.filter_by(email=email).first()
    print(f'User found: {user}')

    if user:
        print(f'Email: {user.email}')
        print(f'Role: {user.role}')
        print(f'Hash prefix: {user.password_hash[:30]}')
        try:
            # The password used in seed_data.py for admin@aes.com is 'admin123'
            password_to_check = 'admin123'
            result = user.check_password(password_to_check)
            print(f"Password check for '{password_to_check}': {result}")
        except Exception as e:
            print('ERROR in check_password:', e)
            import traceback
            traceback.print_exc()
    else:
        print(f'No user found with email {email}')
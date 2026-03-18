from app import create_app
from models import User

app = create_app()

with app.app_context():
    user = User.query.filter_by(email='ambulance2@aes.com').first()
    print('User found:', user)
    if user:
        print('Hash prefix:', user.password_hash[:30])
        try:
            result = user.check_password('123456')
            print('Password check result:', result)
        except Exception as e:
            print('ERROR in check_password:', e)
    else:
        print('No user found with that email - try another email!')
        # List all users
        all_users = User.query.all()
        print('All users in DB:')
        for u in all_users:
            print(f'  - {u.email} | role: {u.role} | hash prefix: {u.password_hash[:20]}')
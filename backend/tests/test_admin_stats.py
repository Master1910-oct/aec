from app import create_app
from routes.admin_routes import get_stats
from utils.decorators import token_required
from flask import g

app = create_app()

with app.app_context():
    # Mock current user for the decorator
    class MockUser:
        user_id = 1
        role = "admin"
        entity_id = None
        
    g.user = MockUser()
    try:
        # Actually in admin_routes.py we modified it to accept `current_user`
        # Let's call it
        response = get_stats(MockUser())
        print(response)
    except Exception as e:
        import traceback
        traceback.print_exc()

from app import create_app
from database.db import db
from models.scene_dispatch import SceneDispatch

app = create_app()
with app.app_context():
    db.create_all()
    print("Tables created")

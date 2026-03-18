from database.db import db
from datetime import datetime, timezone
import bcrypt
from werkzeug.security import check_password_hash as werkzeug_check

class User(db.Model):
    __tablename__ = "users"
    user_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(
        db.Enum(
            "admin",
            "dispatcher",
            "hospital",
            "ambulance",
            name="user_roles"
        ),
        nullable=False
    )
    created_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

    # 🔐 Password Methods
    def set_password(self, password):
        salt = bcrypt.gensalt(rounds=12)
        self.password_hash = bcrypt.hashpw(
            password.encode("utf-8"), salt
        ).decode("utf-8")

    def check_password(self, password):
        # Support legacy werkzeug hashes (existing users)
        if self.password_hash.startswith("scrypt:") or \
           self.password_hash.startswith("pbkdf2:"):
            return werkzeug_check(self.password_hash, password)
        # New bcrypt hashes (new users)
        return bcrypt.checkpw(
            password.encode("utf-8"),
            self.password_hash.encode("utf-8")
        )
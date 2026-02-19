import jwt
from datetime import datetime, timedelta
from flask import current_app
from werkzeug.security import generate_password_hash, check_password_hash


# =========================
# 🔐 PASSWORD FUNCTIONS
# =========================

def hash_password(password):
    return generate_password_hash(password)


def verify_password(password, hashed_password):
    return check_password_hash(hashed_password, password)


# =========================
# 🔑 JWT FUNCTIONS
# =========================

def generate_token(user):
    payload = {
        "user_id": user.user_id,
        "role": user.role,
        "exp": datetime.utcnow() + timedelta(hours=8)
    }

    token = jwt.encode(
        payload,
        current_app.config["SECRET_KEY"],
        algorithm="HS256"
    )

    return token


def decode_token(token):
    try:
        payload = jwt.decode(
            token,
            current_app.config["SECRET_KEY"],
            algorithms=["HS256"]
        )
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

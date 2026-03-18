import jwt
from datetime import datetime, timedelta, timezone
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
    entity_id = None
    if user.role == "hospital" and user.hospital:
        entity_id = user.hospital.hospital_id
    elif user.role == "ambulance" and user.ambulance:
        entity_id = user.ambulance.ambulance_id

    payload = {
        "user_id": user.user_id,
        "role": user.role,
        "entity_id": entity_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=2),  # Reduced to 2 hours
        "iat": datetime.now(timezone.utc)                         # Issued at time
    }
    token = jwt.encode(
        payload,
        current_app.config["SECRET_KEY"],
        algorithm="HS256"
    )
    return token

def generate_refresh_token(user):
    payload = {
        "user_id": user.user_id,
        "role": user.role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),  # 7 day refresh
        "iat": datetime.now(timezone.utc),
        "type": "refresh"
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
        return {"success": True, "payload": payload}
    except jwt.ExpiredSignatureError:
        return {"success": False, "error": "Token has expired"}
    except jwt.InvalidTokenError:
        return {"success": False, "error": "Invalid token"}
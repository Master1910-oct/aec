from flask import Blueprint, request, g
from database.db import db
from models import User
from models.hospital import Hospital
from models.ambulance import Ambulance
from utils.auth import generate_token
from utils.response import success_response, error_response
from utils.decorators import token_required


auth_bp = Blueprint("auth_bp", __name__)


# 🔐 REGISTER
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    required_fields = ["name", "email", "password", "role"]

    if not data or not all(field in data for field in required_fields):
        return error_response("All fields are required", 400)

    valid_roles = ["admin", "hospital", "ambulance", "dispatcher"]
    if data["role"] not in valid_roles:
        return error_response(f"Role must be one of: {', '.join(valid_roles)}", 400)

    if User.query.filter_by(email=data["email"]).first():
        return error_response("Email already exists", 400)

    user = User(
        name=data["name"],
        email=data["email"],
        role=data["role"]
    )

    user.set_password(data["password"])

    db.session.add(user)
    db.session.commit()

    return success_response("User registered successfully", status=201)


# 🔐 LOGIN
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    if not data or "email" not in data or "password" not in data:
        return error_response("Email and password required", 400)

    user = User.query.filter_by(email=data["email"]).first()

    if not user or not user.check_password(data["password"]):
        return error_response("Invalid credentials", 401)

    token = generate_token(user)

    # Resolve entity_id for response
    entity_id = None
    if user.role == "hospital" and user.hospital:
        entity_id = user.hospital.hospital_id
    elif user.role == "ambulance" and user.ambulance:
        entity_id = user.ambulance.ambulance_id

    return success_response(
        "Login successful",
        data={
            "token": token,
            "role": user.role,
            "user_id": user.user_id,
            "entity_id": entity_id,
        }
    )


# 🔐 ME — returns current user's identity from the JWT
@auth_bp.route("/me", methods=["GET"])
@token_required
def me():
    user_payload = g.current_user  # set by token_required decorator
    user_id = user_payload.get("user_id")
    
    # Refresh identity data from DB
    user = User.query.get(user_id)
    entity_id = None
    if user:
        if user.role == "hospital" and user.hospital:
            entity_id = user.hospital.hospital_id
        elif user.role == "ambulance" and user.ambulance:
            entity_id = user.ambulance.ambulance_id

    return success_response(
        "User identity retrieved",
        data={
            "user_id": user_id,
            "role": user.role if user else user_payload.get("role"),
            "entity_id": entity_id,
        }
    )

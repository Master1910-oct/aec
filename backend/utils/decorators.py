from functools import wraps
from flask import request, jsonify, g
from utils.auth import decode_token


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):

        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return jsonify({
                "success": False,
                "message": "Token missing",
                "data": None
            }), 401

        try:
            token = auth_header.split(" ")[1]
        except IndexError:
            return jsonify({
                "success": False,
                "message": "Invalid Authorization header format",
                "data": None
            }), 401

        payload = decode_token(token)

        if not payload:
            return jsonify({
                "success": False,
                "message": "Invalid or expired token",
                "data": None
            }), 401

        if "error" in payload:
            return jsonify({
                "success": False,
                "message": payload["error"],
                "data": None
            }), 401

        # Attach user info to request context
        g.current_user = payload

        return f(*args, **kwargs)

    return decorated


def roles_required(*allowed_roles):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):

            user = getattr(g, "current_user", None)

            if not user:
                return jsonify({
                    "success": False,
                    "message": "Authentication required",
                    "data": None
                }), 401

            if user["role"] not in allowed_roles:
                return jsonify({
                    "success": False,
                    "message": "Access denied",
                    "data": None
                }), 403

            return f(*args, **kwargs)

        return wrapper
    return decorator

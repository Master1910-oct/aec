from flask import jsonify
from sqlalchemy.exc import SQLAlchemyError


def register_error_handlers(app):

    @app.errorhandler(SQLAlchemyError)
    def handle_db_error(e):
        return jsonify({
            "error": "Database error occurred",
            "details": str(e)
        }), 500


    @app.errorhandler(404)
    def not_found(e):
        return jsonify({
            "error": "Resource not found"
        }), 404


    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({
            "error": "Bad request"
        }), 400


    @app.errorhandler(Exception)
    def handle_exception(e):
        return jsonify({
            "error": "Internal server error",
            "details": str(e)
        }), 500

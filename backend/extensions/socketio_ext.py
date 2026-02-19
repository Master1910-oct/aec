from flask_socketio import SocketIO

socketio = SocketIO(
    cors_allowed_origins="*",
    async_mode="eventlet",        # Required for production async handling
    logger=True,                  # Useful for debugging
    engineio_logger=True          # Engine-level logs
)

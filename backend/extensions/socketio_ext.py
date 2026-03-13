from flask_socketio import SocketIO, join_room, emit

socketio = SocketIO(
    cors_allowed_origins="*",
    async_mode="threading",   # threading mode avoids eventlet dependency issues
    logger=False,
    engineio_logger=False
)


# ===========================================
# 🔌 ROOM JOIN HANDLERS
# ===========================================

@socketio.on("join_admin")
def handle_join_admin():
    """Admin clients join the 'admin' room for all broadcast events."""
    join_room("admin")
    emit("joined", {"room": "admin"})


@socketio.on("join_hospital")
def handle_join_hospital(data):
    """Hospital clients join their own room: hospital_<id>."""
    hospital_id = data.get("hospital_id")
    if hospital_id:
        room = f"hospital_{hospital_id}"
        join_room(room)
        emit("joined", {"room": room})


@socketio.on("join_ambulance")
def handle_join_ambulance(data):
    """Ambulance clients join their own room: ambulance_<id>."""
    ambulance_id = data.get("ambulance_id")
    if ambulance_id:
        room = f"ambulance_{ambulance_id}"
        join_room(room)
        emit("joined", {"room": room})

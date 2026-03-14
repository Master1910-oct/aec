from flask_socketio import SocketIO, join_room, emit

socketio = SocketIO(
    cors_allowed_origins="http://localhost:5173",  # Hardened per Correction 4
    async_mode="threading",
    logger=False,
    engineio_logger=False
)

# ===========================================
# 🔌 ROOM HANDLERS
# ===========================================

@socketio.on("join_admin")
def handle_join_admin():
    join_room("admin")
    emit("joined", {"room": "admin"})

@socketio.on("join_hospital")
def handle_join_hospital(data):
    hospital_id = data.get("hospital_id")
    if hospital_id:
        room = f"hospital_{hospital_id}"
        join_room(room)
        emit("joined", {"room": room})

@socketio.on("join_ambulance")
def handle_join_ambulance(data):
    ambulance_id = data.get("ambulance_id")
    if ambulance_id:
        room = f"ambulance_{ambulance_id}"
        join_room(room)
        emit("joined", {"room": room})

@socketio.on("leave")
def handle_leave(data):
    """Correction 2: Leave the room explicitly."""
    room = data.get("room")
    if room:
        from flask_socketio import leave_room
        leave_room(room)
        emit("left", {"room": room})

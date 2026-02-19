class EmergencyStateMachine:

    allowed_transitions = {
        "pending": ["allocated", "cancelled"],
        "allocated": ["in_progress", "cancelled"],
        "in_progress": ["completed"],
        "completed": [],
        "cancelled": []
    }

    @classmethod
    def can_transition(cls, current_status, new_status):
        return new_status in cls.allowed_transitions.get(current_status, [])

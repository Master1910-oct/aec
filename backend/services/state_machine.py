class EmergencyStateMachine:

    allowed_transitions = {
        "pending":     ["allocated", "cancelled"],
        "allocated":   ["en_route", "cancelled"],
        "en_route":    ["arrived"],
        "arrived":     ["completed"],
        "in_progress": ["completed"],        # legacy compatibility
        "completed":   [],
        "cancelled":   [],
        "escalated":   ["completed", "cancelled"],  # allow admin resolution
    }

    @classmethod
    def can_transition(cls, current_status, new_status):
        return new_status in cls.allowed_transitions.get(current_status, [])

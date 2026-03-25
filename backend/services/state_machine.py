class EmergencyStateMachine:
    def __init__(self, emergency):
        self.emergency = emergency

    def initialize(self):
        """Sets the initial state of the emergency."""
        self.emergency.status = "pending"

    allowed_transitions = {
        "pending":     ["allocated", "cancelled"],
        "allocated":   ["en_route", "cancelled"],
        "en_route":    ["arrived"],
        "arrived":     ["first_aid", "completed"],
        "first_aid":   ["completed", "transfer_en_route"],
        "transfer_en_route": ["completed"],
        "in_progress": ["completed"],        # legacy compatibility
        "completed":   [],
        "cancelled":   [],
        "escalated":   ["completed", "cancelled"],  # allow admin resolution
    }

    @classmethod
    def can_transition(cls, current_status, new_status):
        if current_status == new_status:
            return True
        return new_status in cls.allowed_transitions.get(current_status, [])

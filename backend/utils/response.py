def success_response(message=None, data=None, status=200):
    """
    Standard success response format
    """
    return {
        "success": True,
        "message": message,
        "data": data
    }, status


def error_response(message="Something went wrong", status=400):
    """
    Standard error response format
    """
    return {
        "error": message
    }, status
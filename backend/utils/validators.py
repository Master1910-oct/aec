def validate_required_fields(data, required_fields):
    """
    Check if required fields are present in request data
    """
    missing_fields = []

    for field in required_fields:
        if field not in data or data[field] in [None, ""]:
            missing_fields.append(field)

    if missing_fields:
        return False, f"Missing required fields: {', '.join(missing_fields)}"

    return True, None


def validate_coordinates(latitude, longitude):
    """
    Validate latitude and longitude ranges
    """
    try:
        lat = float(latitude)
        lon = float(longitude)

        if not (-90 <= lat <= 90):
            return False, "Latitude must be between -90 and 90"

        if not (-180 <= lon <= 180):
            return False, "Longitude must be between -180 and 180"

        return True, None

    except (ValueError, TypeError):
        return False, "Invalid latitude or longitude format"
import math
from flask import Blueprint, request, jsonify
import mysql.connector
from typing import List, Dict, Any

hospital_bp = Blueprint('hospital_bp', __name__)

# Database configuration - centralize for easy swapping
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'password',
    'database': 'aes_db',
    'port': 3306
}

# Emergency type mapping exact to requirements
EMERGENCY_TYPE_MAPPING = {
    "accident": ["TRAUMA CARE"],
    "heart_attack": ["ICU", "VENTILATOR"],
    "stroke": ["STROKE UNIT"],
    "general": ["EMERGENCY CARE"]
}

DISTANCE_WEIGHT = 0.6
CAPABILITY_WEIGHT = 0.4
MAX_DISTANCE_KM = 100.0

def parse_capabilities(capabilities_str: str) -> List[str]:
    """
    Splits a comma-separated string into a cleaned list of capabilities.
    
    :param capabilities_str: Comma-separated capabilities string
    :return: Cleaned list of uppercase capability strings
    """
    if not capabilities_str:
        return []
    return [cap.strip().upper() for cap in capabilities_str.split(',') if cap.strip()]

def filter_hospitals(hospitals: List[Dict[str, Any]], required_caps: List[str]) -> List[Dict[str, Any]]:
    """
    Returns hospitals containing ALL required capabilities.
    
    :param hospitals: List of hospital dictionaries
    :param required_caps: List of required capabilities
    :return: Filtered list of hospitals meeting all capability requirements
    """
    filtered = []
    req_set = set([c.upper() for c in required_caps])
    for h in hospitals:
        caps_list = parse_capabilities(h.get('capabilities', ''))
        h_caps_set = set(caps_list)
        if req_set.issubset(h_caps_set):
            filtered.append(h)
    return filtered

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates distance using the Haversine formula.
    
    :param lat1: Latitude of point 1
    :param lon1: Longitude of point 1
    :param lat2: Latitude of point 2
    :param lon2: Longitude of point 2
    :return: Distance in kilometers as float
    """
    R = 6371.0  # Earth radius in kilometers

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2.0) ** 2
    
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c

def rank_hospitals(hospitals: List[Dict[str, Any]], amb_lat: float, amb_lon: float) -> List[Dict[str, Any]]:
    """
    Sorts hospitals by distance ascending, attaches a calculated score.
    
    :param hospitals: List of hospital dictionaries
    :param amb_lat: Ambulance latitude
    :param amb_lon: Ambulance longitude
    :return: Sorted list of hospitals by distance ascending
    """
    for h in hospitals:
        h_lat = h.get('latitude')
        h_lon = h.get('longitude')
        if h_lat is None or h_lon is None:
            # Assign max distance if coordinates are missing
            h['distance_km'] = float('inf')
            h['score'] = 0.0
            continue
            
        distance = calculate_distance(amb_lat, amb_lon, h_lat, h_lon)
        h['distance_km'] = round(distance, 2)
        
        # Calculate score (assume higher is better)
        # Normalized distance: 1.0 (at 0 km) smoothly scaling down to 0.0 (at >= MAX_DISTANCE_KM)
        norm_dist = max(0.0, 1.0 - (distance / MAX_DISTANCE_KM))
        
        # Capability match ratio (pre-calculated or default to 1.0 if not set)
        ratio = h.get('capability_match_ratio', 1.0)
        
        score = (DISTANCE_WEIGHT * norm_dist) + (CAPABILITY_WEIGHT * ratio)
        h['score'] = round(score, 4)
        
    # Sort primarily by distance ascending
    return sorted(hospitals, key=lambda x: x['distance_km'])

@hospital_bp.route('/get-best-hospital', methods=['POST'])
def get_best_hospital():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON body"}), 400
        
    amb_lat = data.get('latitude')
    amb_lon = data.get('longitude')
    emergency_type = data.get('emergency_type')
    
    # Check for missing/null lat/lon
    if amb_lat is None or amb_lon is None:
        return jsonify({"error": "Missing or null latitude / longitude"}), 400
        
    try:
        amb_lat = float(amb_lat)
        amb_lon = float(amb_lon)
    except ValueError:
        return jsonify({"error": "Invalid latitude / longitude"}), 400

    # Ensure emergency type is valid
    if not emergency_type or emergency_type not in EMERGENCY_TYPE_MAPPING:
        return jsonify({
            "error": "Invalid or unrecognized emergency_type",
            "valid_types": list(EMERGENCY_TYPE_MAPPING.keys())
        }), 400
        
    required_caps = EMERGENCY_TYPE_MAPPING[emergency_type]
    
    conn = None
    cursor = None
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor(dictionary=True)
        
        # Fetch only active hospitals with non-null capabilities
        query = "SELECT * FROM hospital WHERE is_active = 1 AND capabilities IS NOT NULL"
        cursor.execute(query)
        all_hospitals = cursor.fetchall()
        
    except mysql.connector.Error as err:
        return jsonify({"error": f"Database error: {str(err)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()
            
    if not all_hospitals:
        return jsonify({"error": "Empty hospital table or no active hospitals"}), 503
        
    # Process all fetched hospitals
    valid_hospitals = []
    for h in all_hospitals:
        caps_str = h.get('capabilities')
        if not caps_str or not caps_str.strip():
            # Skip gracefully if empty capabilities string
            continue
        valid_hospitals.append(h)
        
    if not valid_hospitals:
        return jsonify({"error": "Empty hospital table or no active hospitals"}), 503
        
    # Pre-calculate capability match ratio for scoring formula
    req_set = set([c.upper() for c in required_caps])
    for h in valid_hospitals:
        h_caps_set = set(parse_capabilities(h.get('capabilities', '')))
        if not req_set:
            h['capability_match_ratio'] = 1.0
        else:
            intersection = req_set.intersection(h_caps_set)
            h['capability_match_ratio'] = len(intersection) / len(req_set)

    # Attempt to filter hospitals that match ALL required capabilities
    matched_hospitals = filter_hospitals(valid_hospitals, required_caps)
    
    fallback = False
    
    if matched_hospitals:
        candidates = matched_hospitals
    else:
        # Fallback Logic: if no hospital matches the required capabilities,
        # return the nearest active hospital instead with fallback flag.
        candidates = valid_hospitals
        fallback = True
        
    # Rank chosen candidates, calculating distance and score
    ranked = rank_hospitals(candidates, amb_lat, amb_lon)
    
    if not ranked:
        return jsonify({"error": "No valid hospitals to score and rank"}), 503
        
    selected_hospital = ranked[0]
    selected_hospital['fallback'] = fallback
    
    alternatives = ranked[1:4] if len(ranked) > 1 else []
    
    response = {
        "selected_hospital": selected_hospital,
        "alternatives": alternatives
    }
    
    # We must format date times returning from MySQL before sending
    for hosp in [selected_hospital] + alternatives:
        if 'created_at' in hosp and hosp['created_at']:
            hosp['created_at'] = str(hosp['created_at'])
        if 'updated_at' in hosp and hosp['updated_at']:
            hosp['updated_at'] = str(hosp['updated_at'])
    
    return jsonify(response), 200

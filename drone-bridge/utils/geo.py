import math

def haversine_m(lat1, lon1, lat2, lon2):
    # meters
    R = 6371000.0
    to_rad = math.radians
    dlat = to_rad(lat2 - lat1)
    dlon = to_rad(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(to_rad(lat1)) * math.cos(to_rad(lat2)) * math.sin(dlon/2)**2
    return 2 * R * math.asin(math.sqrt(a))

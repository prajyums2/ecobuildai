#!/usr/bin/env python3
"""
Add real coordinates to all suppliers in database
"""

import sys
import math
sys.path.insert(0, '.')

from database import database, get_suppliers_collection

# Real coordinates for Kerala locations
LOCATION_COORDS = {
    # Thrissur District
    'Thrissur': (10.5167, 76.2167),
    'Thrissur-Kolazhy': (10.5367, 76.2067),
    'Thrissur-Ollur': (10.4767, 76.2167),
    'Thrissur-Punkunnam': (10.5217, 76.2117),
    'Thrissur-Aloor': (10.4467, 76.1967),
    'Thrissur-Kuttanellur': (10.5067, 76.2267),
    'Thrissur-Pothencode': (10.5267, 76.2367),
    'Thrissur-Mullassery': (10.4867, 76.1867),
    'Thrissur-Puthur': (10.5467, 76.2267),
    'Thrissur-Pottore': (10.5117, 76.2017),
    'Thrissur-Chembukav': (10.5217, 76.2217),
    'Thrissur-Paravattani': (10.5317, 76.2117),
    'Thrissur-Kodannur': (10.5417, 76.2017),
    'Thrissur-Irinjalakuda': (10.3467, 76.2067),
    'Amalanagar-Thrissur': (10.5267, 76.2367),
    'Paluvai': (10.5567, 76.1867),
    'Chettupuzha': (10.5267, 76.2467),
    'Kodakara-Thrissur': (10.3767, 76.3167),
    
    # Near Thrissur
    'Kunnamkulam': (10.6467, 76.0767),
    'Chelakkara': (10.6967, 76.3467),
    'Guruvayur': (10.5967, 76.0367),
    'Kodungallur': (10.2167, 76.1967),
    'Triprayar': (10.4867, 76.0767),
    
    # Ernakulam District
    'Ernakulam': (9.9312, 76.2673),
    'Edapally': (9.9912, 76.3073),
    'Kakkanad': (10.0112, 76.3373),
    'Aluva': (10.1062, 76.3523),
    
    # Other Districts
    'Palakkad': (10.7867, 76.6548),
    'Malappuram': (11.0730, 76.0740),
    'Kozhikode': (11.2588, 75.7804),
    'Thiruvananthapuram': (8.5241, 76.9366),
    'Kollam': (8.8932, 76.6141),
    'Kottayam': (9.5916, 76.5222),
    'Kannur': (11.8745, 75.3704),
    'Coimbatore': (11.0168, 76.9558),
    'Idukki': (9.8500, 76.9700),
    'Nilambur': (11.2833, 76.2333),
}

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two points using Haversine formula"""
    R = 6371  # Earth's radius in km
    
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    return R * c

def find_coordinates(location):
    """Find coordinates for a location string"""
    if not location:
        return None, None
    
    location_lower = location.lower()
    
    # Try exact match first
    for key, (lat, lon) in LOCATION_COORDS.items():
        if key.lower() == location_lower:
            return lat, lon
    
    # Try partial match
    for key, (lat, lon) in LOCATION_COORDS.items():
        if key.lower() in location_lower or location_lower in key.lower():
            return lat, lon
    
    # Try individual words
    for key, (lat, lon) in LOCATION_COORDS.items():
        for word in location_lower.split('-'):
            if word.strip() and word.strip() in key.lower():
                return lat, lon
    
    return None, None

def main():
    print("=== Adding Coordinates to Suppliers ===\n")
    
    database.connect()
    collection = get_suppliers_collection()
    
    # Get all suppliers
    suppliers = list(collection.find({}))
    print(f"Found {len(suppliers)} suppliers\n")
    
    updated = 0
    for supplier in suppliers:
        location = supplier.get('City / Area') or ''
        lat, lon = find_coordinates(location)
        
        if lat and lon:
            # Calculate distance from Thrissur (10.5167, 76.2167)
            distance = haversine_distance(10.5167, 76.2167, lat, lon)
            
            # Update supplier
            result = collection.update_one(
                {'_id': supplier['_id']},
                {'$set': {
                    'latitude': lat,
                    'longitude': lon,
                    'calculated_distance_km': round(distance, 1)
                }}
            )
            
            if result.modified_count > 0:
                updated += 1
                print(f"  [OK] {supplier['Supplier Name'][:30]:30} | {str(location)[:20]:20} | {lat:8.4f}, {lon:8.4f} | {distance:5.1f} km")
        else:
            print(f"  [--] {supplier['Supplier Name'][:30]:30} | {str(location)[:20]:20} | No coordinates")
    
    print(f"\nUpdated: {updated} suppliers")
    
    # Show summary
    with_coords = collection.count_documents({'latitude': {'$exists': True}})
    print(f"With coordinates: {with_coords}/{len(suppliers)}")
    
    print("\nDone!")

if __name__ == "__main__":
    main()

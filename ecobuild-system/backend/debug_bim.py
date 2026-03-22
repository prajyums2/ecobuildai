"""
Debug script to test IFC parsing and response
"""
import json
from bim_parser import BIMParser

# Create test BIM JSON (similar to what IFC parser should produce)
test_ifc_data = {
    "project": "Test House",
    "elements": [
        {
            "id": "wall_001",
            "type": "wall",
            "name": "External Wall",
            "volume": 12.5,
            "surface_area": 50.0,
            "dimensions": {"length": 5.0, "width": 0.2, "height": 3.0},
            "materials": ["brick"],
            "location": {"x": 0, "y": 0, "z": 0}
        },
        {
            "id": "slab_001",
            "type": "slab", 
            "name": "Floor Slab",
            "volume": 8.0,
            "surface_area": 40.0,
            "dimensions": {"length": 5.0, "width": 4.0, "thickness": 0.15},
            "materials": ["concrete"],
            "location": {"x": 2.5, "y": 2.0, "z": 3.0}
        },
        {
            "id": "roof_001",
            "type": "roof",
            "name": "Roof",
            "volume": 5.0,
            "surface_area": 45.0,
            "dimensions": {"length": 5.5, "width": 4.5, "thickness": 0.1},
            "materials": ["concrete"],
            "location": {"x": 2.5, "y": 2.0, "z": 6.0}
        }
    ]
}

parser = BIMParser()
parser.parse_json_bim(json.dumps(test_ifc_data))

print(f"[OK] Parsed {len(parser.elements)} elements")
print("\nElements:")
for el in parser.elements:
    print(f"  - {el.element_id}: {el.element_type.value} at ({el.location['x']}, {el.location['y']}, {el.location['z']})")

# Generate BOQ
boq = parser.generate_complete_boq()

# Add parsed_elements like the API does
boq['parsed_elements'] = [
    {
        'element_id': e.element_id,
        'element_type': e.element_type.value if hasattr(e.element_type, 'value') else str(e.element_type),
        'name': e.name,
        'volume': e.volume_m3,
        'surface_area': e.surface_area_m2,
        'dimensions': e.dimensions,
        'location': e.location,
        'materials': e.material_references
    }
    for e in parser.elements
]

print(f"\n[OK] Response includes {len(boq['parsed_elements'])} parsed_elements")
print(f"[OK] Total embodied carbon: {boq['embodied_carbon_summary']['total_embodied_carbon_tons']} tons")

# Print first element detail
if boq['parsed_elements']:
    print("\n[OK] Sample element:")
    print(json.dumps(boq['parsed_elements'][0], indent=2))
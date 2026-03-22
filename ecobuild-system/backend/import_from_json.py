#!/usr/bin/env python3
"""
Import materials from JSON files to MongoDB
Uses the CivilEngineeringDB JSON files
"""

import json
import sys
import os
from pathlib import Path

sys.path.insert(0, '.')

from database import get_materials_collection, database

# Path to materials folder
MATERIALS_PATH = Path(__file__).parent.parent.parent / "materials"

def import_categories():
    """Import categories from JSON"""
    with open(MATERIALS_PATH / "CivilEngineeringDB.categories.json") as f:
        categories = json.load(f)
    
    print(f"Found {len(categories)} categories:")
    for cat in categories:
        print(f"  - {cat['Category']}: {cat['Description']}")
    
    return categories

def import_materials_master():
    """Import materials master data from JSON"""
    with open(MATERIALS_PATH / "CivilEngineeringDB.materials_master.json") as f:
        materials = json.load(f)
    
    print(f"\nFound {len(materials)} materials in master file")
    return materials

def import_material_properties():
    """Import material properties from JSON"""
    with open(MATERIALS_PATH / "CivilEngineeringDB.material_properties.json") as f:
        properties = json.load(f)
    
    print(f"\nFound {len(properties)} property entries")
    return properties

def import_suppliers():
    """Import suppliers from JSON"""
    with open(MATERIALS_PATH / "CivilEngineeringDB.suppliers.json") as f:
        suppliers = json.load(f)
    
    print(f"\nFound {len(suppliers)} suppliers")
    return suppliers

def import_location_cost_indices():
    """Import location cost indices from JSON"""
    with open(MATERIALS_PATH / "CivilEngineeringDB.location_cost_indices.json") as f:
        indices = json.load(f)
    
    print(f"\nFound {len(indices)} location cost indices")
    return indices

def convert_to_db_format(materials, properties):
    """Convert JSON materials to database format"""
    # Group properties by MaterialCode
    props_by_code = {}
    for prop in properties:
        code = prop.get("MaterialCode")
        if code not in props_by_code:
            props_by_code[code] = {}
        
        group = prop.get("PropertyGroup", "General")
        name = prop.get("PropertyName")
        value = prop.get("Value")
        unit = prop.get("Unit", "")
        
        if group not in props_by_code[code]:
            props_by_code[code][group] = {}
        
        props_by_code[code][group][name] = {"value": value, "unit": unit}

    db_materials = []
    
    # Default rates by category (2026 Kerala rates)
    default_rates = {
        "Concrete": {"M20": 5800, "M25": 6500, "M30": 7200, "PCC": 4200, "RMC": 5500},
        "Cement": {"OPC43": 390, "OPC53": 420, "PPC": 370, "PSC": 365},
        "Steel": {"Fe415": 68, "Fe500": 72, "Fe500D": 75, "Fe550": 76},
        "Aggregates": {"Msand": 58, "RiverSand": 85, "10mm": 45, "20mm": 42, "40mm": 38},
        "Blocks/Bricks": {"AAC100": 52, "AAC150": 65, "AAC200": 78, "Solid": 38, "Clay": 12},
        "Flooring": {"Vitrified": 95, "Ceramic": 55, "Granite": 220, "Marble": 280},
        "Masonry": {"CM14": 350, "CM16": 280, "ThinBed": 12},
        "Timber": {"Teak": 5500, "Rosewood": 8500, "Sal": 2200, "Mango": 1800}
    }
    
    # Default units by category
    default_units = {
        "Concrete": "cum",
        "Cement": "bag",
        "Steel": "kg",
        "Aggregates": "cft",
        "Blocks/Bricks": "nos",
        "Flooring": "sqft",
        "Masonry": "cum",
        "Timber": "cft"
    }
    
    # GST rates by category
    gst_rates = {
        "Concrete": 18,
        "Cement": 28,
        "Steel": 18,
        "Aggregates": 5,
        "Blocks/Bricks": 5,
        "Flooring": 18,
        "Masonry": 18,
        "Timber": 18
    }
    
    # Carbon coefficients by category
    carbon_by_category = {
        "Concrete": {"default": 380},
        "Cement": {"OPC": 0.93, "PPC": 0.58, "PSC": 0.42, "default": 0.70},
        "Steel": {"default": 2.50},
        "Aggregates": {"default": 0.08},
        "Blocks/Bricks": {"default": 0.35},
        "Flooring": {"default": 0.90},
        "Masonry": {"default": 0.12},
        "Timber": {"default": 0.50}
    }
    
    for mat in materials:
        material_code = mat.get("MaterialCode")
        category = mat.get("Category", "Other")
        name = mat.get("MaterialName", "Unknown")
        description = mat.get("Description", "")
        unit = mat.get("Unit", default_units.get(category, "nos"))
        bis_code = mat.get("BIS Code", "")
        applications = mat.get("Applications", "")
        
        # Get properties for this material
        mat_props = props_by_code.get(material_code, {})
        
        # Get default rate based on name
        rates_for_cat = default_rates.get(category, {})
        rate = 100  # Default
        
        for key, val in rates_for_cat.items():
            if key.lower() in name.lower():
                rate = val
                break
        
        # Get unit (default if not specified)
        if not unit:
            unit = default_units.get(category, "nos")
        
        # Get GST rate
        gst = gst_rates.get(category, 18)
        
        # Get carbon
        carbon_dict = carbon_by_category.get(category, {"default": 0})
        carbon = carbon_dict.get("default", 0)
        for key, val in carbon_dict.items():
            if key.lower() in name.lower():
                carbon = val
                break
        
        db_mat = {
            "name": name,
            "category": category.lower().replace("/", "_"),
            "subcategory": bis_code,
            "description": description or f"{name} - {applications}",
            "financial_properties": {
                "cost_per_unit": rate,
                "unit_type": unit.lower(),
                "currency": "INR",
                "retail_price": rate * 1.1,
                "wholesale_price": rate * 0.95,
                "bulk_price": rate * 0.90,
                "gst_rate": gst,
                "minimum_order_quantity": 10,
                "price_volatility": "Medium",
                "price_trend": "Stable"
            },
            "environmental_properties": {
                "embodied_carbon": carbon,
                "embodied_energy": carbon * 5,
                "recycled_content": 0,
                "recyclable": True,
                "epd_available": False
            },
            "physical_properties": mat_props.get("Physical", {}),
            "civil_properties": mat_props.get("Civil", {}),
            "supplier": {
                "supplier_name": "General Supplier",
                "supplier_location": "Kerala",
                "lead_time_days": 3,
                "reliability_rating": 8.0
            },
            "is_active": True,
            "tags": [category.lower(), name.lower().replace(" ", "-")],
            "material_code": material_code,
            "bis_code": bis_code,
            "applications": applications
        }
        
        db_materials.append(db_mat)
    
    return db_materials

def seed_database():
    """Seed the MongoDB database with materials"""
    print("\n=== Starting Material Import ===\n")
    
    # Import all data
    categories = import_categories()
    materials = import_materials_master()
    properties = import_material_properties()
    suppliers = import_suppliers()
    indices = import_location_cost_indices()
    
    # Convert to database format
    db_materials = convert_to_db_format(materials, properties)
    
    # Get collection
    collection = get_materials_collection()
    
    if collection is None:
        print("ERROR: Cannot connect to MongoDB")
        return False
    
    # Clear existing materials
    print(f"\nClearing existing materials...")
    result = collection.delete_many({})
    print(f"  Deleted {result.deleted_count} existing materials")
    
    # Insert new materials
    print(f"\nInserting {len(db_materials)} materials...")
    result = collection.insert_many(db_materials)
    print(f"  Inserted {len(result.inserted_ids)} materials")
    
    # Verify
    total = collection.count_documents({})
    print(f"\nTotal materials in database: {total}")
    
    # Show by category
    categories_in_db = collection.distinct("category")
    print(f"\nMaterials by category:")
    for cat in sorted(categories_in_db):
        count = collection.count_documents({"category": cat})
        print(f"  {cat}: {count}")
    
    print("\n=== Import Complete ===")
    return True

if __name__ == "__main__":
    success = seed_database()
    sys.exit(0 if success else 1)

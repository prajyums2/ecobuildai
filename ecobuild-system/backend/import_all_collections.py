#!/usr/bin/env python3
"""
Import ALL collections from JSON files to MongoDB
Imports: categories, materials, material_properties, suppliers, location_cost_indices
"""

import json
import sys
import os
from pathlib import Path

sys.path.insert(0, '.')

from database import database, get_materials_collection
from pymongo import MongoClient

MATERIALS_PATH = Path(__file__).parent.parent.parent / "materials"

def get_collection(name):
    """Get a specific collection"""
    db = database.get_db()
    if db is None:
        return None
    return db[name]

def convert_mongo_ids(data):
    """Convert MongoDB export format _id.$oid to plain _id"""
    if isinstance(data, list):
        for item in data:
            if isinstance(item, dict) and "_id" in item:
                if isinstance(item["_id"], dict) and "$oid" in item["_id"]:
                    item["_id"] = item["_id"]["$oid"]
    return data

def import_categories():
    """Import categories collection"""
    print("\n=== Importing Categories ===")
    with open(MATERIALS_PATH / "CivilEngineeringDB.categories.json") as f:
        data = json.load(f)
    
    collection = get_collection("categories")
    if collection is None:
        print("ERROR: Cannot connect to database")
        return False
    
    collection.delete_many({})
    data = convert_mongo_ids(data)
    result = collection.insert_many(data)
    print(f"  Inserted {len(result.inserted_ids)} categories")
    return True

def import_materials():
    """Import materials collection"""
    print("\n=== Importing Materials ===")
    with open(MATERIALS_PATH / "CivilEngineeringDB.materials_master.json") as f:
        data = json.load(f)
    
    collection = get_collection("materials")
    if collection is None:
        print("ERROR: Cannot connect to database")
        return False
    
    collection.delete_many({})
    data = convert_mongo_ids(data)
    result = collection.insert_many(data)
    print(f"  Inserted {len(result.inserted_ids)} materials")
    
    # Show by category
    categories = collection.distinct("Category")
    for cat in sorted(categories, key=str):
        count = collection.count_documents({"Category": cat})
        print(f"    {cat}: {count}")
    return True

def import_material_properties():
    """Import material_properties collection"""
    print("\n=== Importing Material Properties ===")
    with open(MATERIALS_PATH / "CivilEngineeringDB.material_properties.json") as f:
        data = json.load(f)
    
    collection = get_collection("material_properties")
    if collection is None:
        print("ERROR: Cannot connect to database")
        return False
    
    collection.delete_many({})
    data = convert_mongo_ids(data)
    result = collection.insert_many(data)
    print(f"  Inserted {len(result.inserted_ids)} properties")
    
    # Show by material code
    codes = collection.distinct("MaterialCode")
    print(f"  Materials with properties: {len(codes)}")
    return True

def import_suppliers():
    """Import suppliers collection"""
    print("\n=== Importing Suppliers ===")
    with open(MATERIALS_PATH / "CivilEngineeringDB.suppliers.json") as f:
        data = json.load(f)
    
    collection = get_collection("suppliers")
    if collection is None:
        print("ERROR: Cannot connect to database")
        return False
    
    collection.delete_many({})
    data = convert_mongo_ids(data)
    result = collection.insert_many(data)
    print(f"  Inserted {len(result.inserted_ids)} suppliers")
    
    # Show unique supplier names
    names = collection.distinct("Supplier Name")
    print(f"  Unique suppliers: {len(names)}")
    return True

def import_location_cost_indices():
    """Import location_cost_indices collection"""
    print("\n=== Importing Location Cost Indices ===")
    with open(MATERIALS_PATH / "CivilEngineeringDB.location_cost_indices.json") as f:
        data = json.load(f)
    
    collection = get_collection("location_cost_indices")
    if collection is None:
        print("ERROR: Cannot connect to database")
        return False
    
    collection.delete_many({})
    data = convert_mongo_ids(data)
    result = collection.insert_many(data)
    print(f"  Inserted {len(result.inserted_ids)} districts")
    return True

def seed_database():
    """Import ALL collections"""
    print("\n" + "="*50)
    print("  ECOBUILD DATABASE IMPORT")
    print("="*50)
    
    # Connect to database
    success = database.connect()
    if not success:
        print("\nERROR: Cannot connect to MongoDB")
        return False
    
    # Import all collections
    results = {
        "categories": import_categories(),
        "materials": import_materials(),
        "material_properties": import_material_properties(),
        "suppliers": import_suppliers(),
        "location_cost_indices": import_location_cost_indices(),
    }
    
    # Summary
    print("\n" + "="*50)
    print("  IMPORT SUMMARY")
    print("="*50)
    for name, success in results.items():
        status = "OK" if success else "FAILED"
        print(f"  {name}: {status}")
    
    all_success = all(results.values())
    print("\n" + ("SUCCESS: All collections imported!" if all_success else "PARTIAL: Some collections failed"))
    
    return all_success

if __name__ == "__main__":
    success = seed_database()
    sys.exit(0 if success else 1)

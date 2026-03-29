#!/usr/bin/env python3
"""
Add missing Masonry and Flooring materials to database
"""

import sys
sys.path.insert(0, '.')

from database import database, get_materials_collection

def seed_missing():
    print("=== Adding Missing Categories ===\n")
    
    database.connect()
    collection = get_materials_collection()
    
    # Masonry materials
    masonry_materials = [
        {
            "_id": "masonry_cm14_001",
            "MaterialCode": "MAS-CM14",
            "MaterialName": "CM 1:4 Mortar",
            "Category": "Masonry",
            "GradeOrModel": "1:4",
            "BIS Code": "IS 2250:1981",
            "Description": "Cement mortar 1:4 for masonry work",
            "Unit": "cum",
            "Applications": "Masonry joints, plastering",
            "financial_properties": {
                "cost_per_unit": 350,
                "unit_type": "cum",
                "gst_rate": 18
            },
            "environmental_properties": {
                "embodied_carbon": 0.12
            }
        },
        {
            "_id": "masonry_cm16_001",
            "MaterialCode": "MAS-CM16",
            "MaterialName": "CM 1:6 Mortar",
            "Category": "Masonry",
            "GradeOrModel": "1:6",
            "BIS Code": "IS 2250:1981",
            "Description": "Cement mortar 1:6 for masonry work",
            "Unit": "cum",
            "Applications": "Masonry joints",
            "financial_properties": {
                "cost_per_unit": 280,
                "unit_type": "cum",
                "gst_rate": 18
            },
            "environmental_properties": {
                "embodied_carbon": 0.09
            }
        },
        {
            "_id": "masonry_thinbed_001",
            "MaterialCode": "MAS-TB",
            "MaterialName": "Thin Bed Mortar",
            "Category": "Masonry",
            "GradeOrModel": None,
            "BIS Code": None,
            "Description": "Thin bed mortar for AAC blocks",
            "Unit": "kg",
            "Applications": "AAC block laying",
            "financial_properties": {
                "cost_per_unit": 12,
                "unit_type": "kg",
                "gst_rate": 18
            },
            "environmental_properties": {
                "embodied_carbon": 0.005
            }
        },
        {
            "_id": "masonry_wiremesh_001",
            "MaterialCode": "MAS-WM",
            "MaterialName": "Wire Mesh",
            "Category": "Masonry",
            "GradeOrModel": None,
            "BIS Code": None,
            "Description": "Wire mesh for wall reinforcement",
            "Unit": "kg",
            "Applications": "Masonry reinforcement",
            "financial_properties": {
                "cost_per_unit": 85,
                "unit_type": "kg",
                "gst_rate": 18
            },
            "environmental_properties": {
                "embodied_carbon": 2.5
            }
        },
    ]
    
    # Flooring materials
    flooring_materials = [
        {
            "_id": "flooring_terrazzo_001",
            "MaterialCode": "FLR-TRZ",
            "MaterialName": "Terrazzo Flooring",
            "Category": "Flooring",
            "GradeOrModel": None,
            "BIS Code": None,
            "Description": "Terrazzo flooring",
            "Unit": "sqft",
            "Applications": "Living rooms, commercial",
            "financial_properties": {
                "cost_per_unit": 120,
                "unit_type": "sqft",
                "gst_rate": 18
            },
            "environmental_properties": {
                "embodied_carbon": 0.8
            }
        },
        {
            "_id": "flooring_ceramic_001",
            "MaterialCode": "FLR-CER",
            "MaterialName": "Ceramic Tiles",
            "Category": "Flooring",
            "GradeOrModel": "300x300mm",
            "BIS Code": "IS 15622",
            "Description": "Ceramic floor tiles",
            "Unit": "sqft",
            "Applications": "Bathrooms, kitchens",
            "financial_properties": {
                "cost_per_unit": 55,
                "unit_type": "sqft",
                "gst_rate": 18
            },
            "environmental_properties": {
                "embodied_carbon": 0.8
            }
        },
        {
            "_id": "flooring_vitrified_001",
            "MaterialCode": "FLR-VIT",
            "MaterialName": "Vitrified Tiles",
            "Category": "Flooring",
            "GradeOrModel": "600x600mm",
            "BIS Code": "IS 15622",
            "Description": "Vitrified floor tiles",
            "Unit": "sqft",
            "Applications": "Living rooms, bedrooms",
            "financial_properties": {
                "cost_per_unit": 95,
                "unit_type": "sqft",
                "gst_rate": 18
            },
            "environmental_properties": {
                "embodied_carbon": 0.9
            }
        },
        {
            "_id": "flooring_marble_001",
            "MaterialCode": "FLR-MRB",
            "MaterialName": "Marble",
            "Category": "Flooring",
            "GradeOrModel": None,
            "BIS Code": None,
            "Description": "Natural marble flooring",
            "Unit": "sqft",
            "Applications": "Luxury interiors",
            "financial_properties": {
                "cost_per_unit": 280,
                "unit_type": "sqft",
                "gst_rate": 18
            },
            "environmental_properties": {
                "embodied_carbon": 1.2
            }
        },
        {
            "_id": "flooring_granite_001",
            "MaterialCode": "FLR-GRN",
            "MaterialName": "Granite",
            "Category": "Flooring",
            "GradeOrModel": None,
            "BIS Code": None,
            "Description": "Granite flooring",
            "Unit": "sqft",
            "Applications": "Kitchens, stairs",
            "financial_properties": {
                "cost_per_unit": 220,
                "unit_type": "sqft",
                "gst_rate": 18
            },
            "environmental_properties": {
                "embodied_carbon": 1.0
            }
        },
    ]
    
    all_materials = masonry_materials + flooring_materials
    
    print(f"Adding {len(all_materials)} materials...")
    for mat in all_materials:
        # Upsert - insert or update
        result = collection.update_one(
            {"_id": mat["_id"]},
            {"$set": mat},
            upsert=True
        )
        print(f"  {mat['Category']}: {mat['MaterialName']} - {'Added' if result.upserted_id else 'Updated'}")
    
    # Verify
    print("\nVerification:")
    masonry_count = collection.count_documents({"Category": "Masonry"})
    flooring_count = collection.count_documents({"Category": "Flooring"})
    print(f"  Masonry: {masonry_count} materials")
    print(f"  Flooring: {flooring_count} materials")
    
    print("\nDone!")

if __name__ == "__main__":
    seed_missing()

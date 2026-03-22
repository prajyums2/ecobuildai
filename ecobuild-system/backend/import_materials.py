"""
Import Material Data from Excel to MongoDB
EcoBuild System
"""

import pandas as pd
import re
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from materials import (
    MaterialCategory, UnitType, MaterialStatus,
    PhysicalProperties, CivilEngineeringProperties, 
    EnvironmentalProperties, FinancialProperties, SupplierInfo
)
from database import get_materials_collection
from datetime import datetime
from bson.objectid import ObjectId

# Category mapping from Excel to MaterialCategory enum
CATEGORY_MAP = {
    'Concrete': MaterialCategory.CEMENT,
    'Cement': MaterialCategory.CEMENT,
    'Steel': MaterialCategory.STEEL,
    'Aggregates': MaterialCategory.AGGREGATES,
    'Blocks/Bricks': MaterialCategory.MASONRY,
    'Masonry': MaterialCategory.MASONRY,
    'Flooring': MaterialCategory.FINISH,
    'Timber': MaterialCategory.WOOD,
}

# Unit mapping
UNIT_MAP = {
    'm³': UnitType.CUBIC_METER,
    'm2': UnitType.SQUARE_METER,
    'm': UnitType.LINEAR_METER,
    'kg': UnitType.KG,
    'ton': UnitType.TON,
    'piece': UnitType.PIECE,
    'bag': UnitType.BAG,
    'liter': UnitType.LITER,
}

def parse_price_range(price_str):
    """Parse price range string to get average cost"""
    if pd.isna(price_str) or not price_str:
        return None
    
    # Handle formats like "₹5000-6000" or "5000-6000" or "5000"
    price_str = str(price_str).replace('₹', '').replace(',', '')
    
    # Find all numbers
    numbers = re.findall(r'[\d.]+', price_str)
    if not numbers:
        return None
    
    try:
        nums = [float(n) for n in numbers]
        if len(nums) == 1:
            return nums[0]
        elif len(nums) == 2:
            return (nums[0] + nums[1]) / 2
    except:
        pass
    
    return None

def parse_density(value_str):
    """Parse density value like '2200-2500' to get average"""
    if pd.isna(value_str):
        return None
    
    value_str = str(value_str).replace('kg/m³', '').replace('kg/m', '').strip()
    numbers = re.findall(r'[\d.]+', value_str)
    
    if not numbers:
        return None
    
    try:
        nums = [float(n) for n in numbers]
        if len(nums) == 1:
            return nums[0]
        elif len(nums) == 2:
            return (nums[0] + nums[1]) / 2
    except:
        pass
    
    return None

def parse_strength(value_str):
    """Parse strength value to get numeric MPa"""
    if pd.isna(value_str):
        return None
    
    value_str = str(value_str).replace('MPa', '').strip()
    numbers = re.findall(r'[\d.]+', value_str)
    
    if not numbers:
        return None
    
    try:
        nums = [float(n) for n in numbers]
        return nums[0]  # Take first/lower bound
    except:
        pass
    
    return None

def import_materials_from_excel(excel_path):
    """Main function to import materials from Excel"""
    
    print("=" * 60)
    print("EcoBuild - Material Database Import")
    print("=" * 60)
    
    # Read Excel file
    xlsx = pd.ExcelFile(excel_path)
    
    # Get collections
    materials_collection = get_materials_collection()
    
    if materials_collection is None:
        print("ERROR: Could not connect to database")
        return
    
    # Read sheets
    materials_df = pd.read_excel(xlsx, sheet_name='Materials_Master')
    properties_df = pd.read_excel(xlsx, sheet_name='Properties')
    contacts_df = pd.read_excel(xlsx, sheet_name='Availability_Contacts')
    categories_df = pd.read_excel(xlsx, sheet_name='Categories')
    
    print(f"\nFound {len(materials_df)} materials")
    print(f"Found {len(properties_df)} property records")
    print(f"Found {len(contacts_df)} supplier contacts")
    
    # Create materials dictionary keyed by material code
    materials_dict = {}
    
    # Process Materials_Master sheet
    print("\n--- Processing Materials ---")
    for idx, row in materials_df.iterrows():
        code = row.get('MaterialCode', '')
        name = row.get('MaterialName', '')
        category_str = row.get('Category', 'other')
        
        if pd.isna(name):
            continue
        
        # Map category
        category = CATEGORY_MAP.get(category_str, MaterialCategory.OTHER)
        
        # Parse price
        price = parse_price_range(row.get('PriceRangeIndicative'))
        
        # Determine unit type
        unit_str = str(row.get('Unit', 'piece')).lower()
        unit = UnitType.PIECE
        for unit_key, unit_enum in UNIT_MAP.items():
            if unit_key in unit_str:
                unit = unit_enum
                break
        
        # Create material object
        material = {
            '_id': ObjectId(),
            'material_code': code,
            'name': name.title() if name else name,
            'description': row.get('Description') if pd.notna(row.get('Description')) else None,
            'category': category.value,
            'subcategory': None,
            'brand': None,
            'manufacturer': None,
            'country_of_origin': 'India',
            
            'physical_properties': {
                'density': None,
                'specific_gravity': None,
                'water_absorption': None,
            },
            
            'civil_properties': {
                'structural_grade': row.get('GradeOrModel') if pd.notna(row.get('GradeOrModel')) else None,
                'is_code': row.get('BIS Code') if pd.notna(row.get('BIS Code')) else None,
                'design_strength': None,
                'wastage_percentage': 5.0,
            },
            
            'environmental_properties': {
                'embodied_carbon': None,
                'embodied_energy': None,
                'recycled_content': 0,
                'recyclable': True,
            },
            
            'financial_properties': {
                'cost_per_unit': price if price else 0,
                'unit_type': unit.value,
                'currency': 'INR',
                'gst_rate': 18,
                'transportation_cost': 0,
            },
            
            'supplier': {
                'supplier_name': None,
                'supplier_location': None,
                'lead_time_days': 1,
                'reliability_rating': 8,
            },
            
            'status': 'active',
            'is_active': True,
            'tags': [category_str.lower()] if category_str else [],
            'typical_uses': row.get('TypicalUses') if pd.notna(row.get('TypicalUses')) else None,
            'sustainability_notes': row.get('SustainabilityNotes') if pd.notna(row.get('SustainabilityNotes')) else None,
            
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        }
        
        materials_dict[code] = material
    
    print(f"Created {len(materials_dict)} material base entries")
    
    # Process Properties sheet
    print("\n--- Processing Properties ---")
    for idx, row in properties_df.iterrows():
        code = row.get('MaterialCode', '')
        
        if code not in materials_dict:
            continue
        
        prop_name = row.get('PropertyName', '')
        prop_group = row.get('PropertyGroup', '')
        value = row.get('Value', '')
        
        mat = materials_dict[code]
        
        # Map properties to correct group
        if prop_group == 'Physical':
            if 'density' in prop_name.lower():
                mat['physical_properties']['density'] = parse_density(value)
            elif 'specific gravity' in prop_name.lower():
                mat['physical_properties']['specific_gravity'] = parse_density(value)
            elif 'water absorption' in prop_name.lower():
                mat['physical_properties']['water_absorption'] = parse_strength(value)
                
        elif prop_group == 'Mechanical':
            if 'compressive' in prop_name.lower():
                mat['civil_properties']['design_strength'] = parse_strength(value)
            elif 'tensile' in prop_name.lower():
                mat['civil_properties']['yield_strength'] = parse_strength(value)
    
    print(f"Updated properties for materials")
    
    # Process Availability_Contacts sheet
    print("\n--- Processing Suppliers ---")
    suppliers_processed = 0
    
    for idx, row in contacts_df.iterrows():
        supplier_name = row.get('Supplier Name')
        materials_supplied = row.get('Materials Supplied', '')
        distance = row.get('Distance from Thrissur (km)', 0)
        rate_range = row.get('Indicative Rate Range (Academic)', '')
        location = row.get('City / Area', '')
        
        if pd.isna(supplier_name):
            continue
        
        # Parse rate
        rate = parse_price_range(rate_range)
        
        # Calculate approximate transportation cost (rough estimate: ₹10/km for full truck)
        try:
            distance_km = float(distance) if pd.notna(distance) else 0
            transport_cost = distance_km * 10  # ₹10 per km
        except:
            transport_cost = 0
        
        # Find matching materials
        for code, mat in materials_dict.items():
            mat_name = mat['name'].lower()
            supplied = str(materials_supplied).lower()
            
            # Check if this supplier supplies this material
            if (pd.notna(materials_supplied) and 
                (mat_name in supplied or any(word in supplied for word in mat_name.split()))):
                
                # Update supplier info
                mat['supplier'] = {
                    'supplier_name': supplier_name,
                    'supplier_location': location if pd.notna(location) else 'Thrissur',
                    'lead_time_days': 1 if distance_km < 50 else 3,
                    'reliability_rating': 8,
                }
                
                # Update transportation cost
                if transport_cost > 0:
                    mat['financial_properties']['transportation_cost'] = transport_cost
                
                # Update price if available
                if rate and mat['financial_properties']['cost_per_unit'] == 0:
                    mat['financial_properties']['cost_per_unit'] = rate
                
                suppliers_processed += 1
    
    print(f"Updated supplier info for {suppliers_processed} material-supplier pairs")
    
    # Calculate embodied carbon estimates based on material type
    print("\n--- Adding Environmental Estimates ---")
    
    carbon_estimates = {
        'cement': 900,      # kg CO2 per ton
        'steel': 2500,     # kg CO2 per ton
        'concrete': 150,   # kg CO2 per m3
        'brick': 50,       # kg CO2 per 1000 bricks
        'aggregate': 20,   # kg CO2 per ton
    }
    
    for code, mat in materials_dict.items():
        cat = mat['category']
        
        # Add estimated embodied carbon based on category
        if 'cement' in cat:
            mat['environmental_properties']['embodied_carbon'] = carbon_estimates['cement']
        elif 'steel' in cat:
            mat['environmental_properties']['embodied_carbon'] = carbon_estimates['steel']
        elif 'concrete' in cat:
            mat['environmental_properties']['embodied_carbon'] = carbon_estimates['concrete']
        elif 'brick' in cat or 'masonry' in cat:
            mat['environmental_properties']['embodied_carbon'] = carbon_estimates['brick']
        elif 'aggregate' in cat:
            mat['environmental_properties']['embodied_carbon'] = carbon_estimates['aggregate']
    
    # Insert into database
    print("\n--- Inserting into Database ---")
    
    # Clear existing materials (optional - comment out to keep existing)
    # materials_collection.delete_many({})
    
    # Insert new materials
    materials_list = list(materials_dict.values())
    
    if materials_list:
        result = materials_collection.insert_many(materials_list)
        print(f"Successfully inserted {len(result.inserted_ids)} materials")
    else:
        print("No materials to insert")
    
    print("\n" + "=" * 60)
    print("Import Complete!")
    print("=" * 60)
    
    # Print summary
    print("\n--- Summary by Category ---")
    category_count = {}
    for mat in materials_dict.values():
        cat = mat['category']
        category_count[cat] = category_count.get(cat, 0) + 1
    
    for cat, count in sorted(category_count.items()):
        print(f"  {cat}: {count}")
    
    return len(materials_dict)


if __name__ == '__main__':
    excel_path = 'D:/prajyu/web/opencode/ecobuild/Material Database.xlsx'
    
    if not os.path.exists(excel_path):
        # Try relative path
        excel_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'Material Database.xlsx')
    
    if not os.path.exists(excel_path):
        # Try current directory
        excel_path = 'Material Database.xlsx'
    
    if os.path.exists(excel_path):
        import_materials_from_excel(excel_path)
    else:
        print(f"ERROR: Could not find Excel file: {excel_path}")

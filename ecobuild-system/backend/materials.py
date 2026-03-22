"""
Comprehensive Material Model for EcoBuild System
Includes all fields for Civil Engineering and Financial Management
"""

from pydantic import BaseModel, Field, validator
from typing import List, Dict, Optional, Any
from datetime import datetime
from enum import Enum
from bson.objectid import ObjectId

class MaterialCategory(str, Enum):
    CEMENT = "cement"
    STEEL = "steel"
    MASONRY = "masonry"
    AGGREGATES = "aggregates"
    FINISH = "finish"
    INSULATION = "insulation"
    COMPOSITE = "composite"
    ROOF = "roof"
    GLASS = "glass"
    ADHESIVE = "adhesive"
    COATING = "coating"
    DOOR = "door"
    WINDOW = "window"
    PLUMBING = "plumbing"
    ELECTRICAL = "electrical"
    WOOD = "wood"
    OTHER = "other"

class UnitType(str, Enum):
    KG = "kg"
    TON = "ton"
    CUBIC_METER = "m³"
    SQUARE_METER = "m²"
    LINEAR_METER = "m"
    PIECE = "piece"
    BAG = "bag"
    LITER = "liter"
    CUBIC_FEET = "cu.ft"
    SQUARE_FEET = "sq.ft"

class MaterialStatus(str, Enum):
    ACTIVE = "active"
    DISCONTINUED = "discontinued"
    PENDING_APPROVAL = "pending_approval"

# ==================== PHYSICAL PROPERTIES ====================

class PhysicalProperties(BaseModel):
    """Physical characteristics of the material"""
    density: Optional[float] = Field(None, description="Density in kg/m³")
    bulk_density: Optional[float] = Field(None, description="Bulk density in kg/m³")
    specific_gravity: Optional[float] = Field(None, description="Specific gravity")
    porosity: Optional[float] = Field(None, description="Porosity percentage")
    water_absorption: Optional[float] = Field(None, description="Water absorption percentage")
    moisture_content: Optional[float] = Field(None, description="Moisture content percentage")
    
    # Mechanical properties
    compressive_strength: Optional[float] = Field(None, description="Compressive strength in MPa")
    tensile_strength: Optional[float] = Field(None, description="Tensile strength in MPa")
    flexural_strength: Optional[float] = Field(None, description="Flexural strength in MPa")
    shear_strength: Optional[float] = Field(None, description="Shear strength in MPa")
    modulus_of_elasticity: Optional[float] = Field(None, description="Modulus of elasticity in GPa")
    poisson_ratio: Optional[float] = Field(None, description="Poisson's ratio")
    hardness: Optional[float] = Field(None, description="Hardness value")
    
    # Thermal properties
    thermal_conductivity: Optional[float] = Field(None, description="Thermal conductivity in W/m·K")
    specific_heat: Optional[float] = Field(None, description="Specific heat capacity in J/kg·K")
    thermal_expansion: Optional[float] = Field(None, description="Coefficient of thermal expansion in 10⁻⁶/K")
    fire_rating: Optional[str] = Field(None, description="Fire resistance rating")
    melting_point: Optional[float] = Field(None, description="Melting point in °C")
    
    # Electrical properties
    electrical_conductivity: Optional[float] = Field(None, description="Electrical conductivity in S/m")
    dielectric_strength: Optional[float] = Field(None, description="Dielectric strength in kV/mm")
    
    # Acoustic properties
    sound_absorption: Optional[float] = Field(None, description="Sound absorption coefficient")
    acoustic_rating: Optional[float] = Field(None, description="Acoustic rating (STC/NRC)")

# ==================== CIVIL ENGINEERING PROPERTIES ====================

class CivilEngineeringProperties(BaseModel):
    """Civil engineering specific properties"""
    
    # Structural properties
    structural_grade: Optional[str] = Field(None, description="Structural grade/classification")
    design_strength: Optional[float] = Field(None, description="Design strength in MPa")
    characteristic_strength: Optional[float] = Field(None, description="Characteristic strength in MPa")
    yield_strength: Optional[float] = Field(None, description="Yield strength in MPa")
    ultimate_strength: Optional[float] = Field(None, description="Ultimate tensile strength in MPa")
    fatigue_limit: Optional[float] = Field(None, description="Fatigue limit in MPa")
    
    # Durability
    durability_years: Optional[int] = Field(None, description="Expected service life in years")
    weather_resistance: Optional[str] = Field(None, description="Weather resistance rating")
    chemical_resistance: Optional[List[str]] = Field(default_factory=list, description="Chemicals it resists")
    corrosion_resistance: Optional[str] = Field(None, description="Corrosion resistance rating")
    uv_resistance: Optional[str] = Field(None, description="UV resistance rating")
    
    # Workability
    workability: Optional[str] = Field(None, description="Workability description")
    slump: Optional[float] = Field(None, description="Slump in mm (for concrete)")
    setting_time: Optional[float] = Field(None, description="Initial setting time in minutes")
    curing_time: Optional[float] = Field(None, description="Curing time in days")
    
    # Dimensions
    standard_sizes: Optional[List[str]] = Field(default_factory=list, description="Standard available sizes")
    thickness_options: Optional[List[float]] = Field(default_factory=list, description="Available thicknesses in mm")
    length: Optional[float] = Field(None, description="Standard length in mm")
    width: Optional[float] = Field(None, description="Standard width in mm")
    height: Optional[float] = Field(None, description="Standard height in mm")
    
    # Coverage/Usage
    coverage_per_unit: Optional[float] = Field(None, description="Coverage area per unit in m²")
    wastage_percentage: Optional[float] = Field(5.0, description="Typical wastage percentage")
    
    # Compliance
    is_code: Optional[str] = Field(None, description="IS Code reference")
    bis_certification: Optional[str] = Field(None, description="BIS certification number")
    iso_certification: Optional[str] = Field(None, description="ISO certification")
    eco_mark: Optional[bool] = Field(False, description="ECO Mark certification")
    green_building_cert: Optional[List[str]] = Field(default_factory=list, description="Green building certifications (GRIHA, LEED, etc.)")
    
    # Quality grades
    quality_grade: Optional[str] = Field(None, description="Quality grade (Premium/Standard/Economy)")
    surface_finish: Optional[str] = Field(None, description="Surface finish type")
    color_options: Optional[List[str]] = Field(default_factory=list, description="Available colors")

# ==================== ENVIRONMENTAL PROPERTIES ====================

class EnvironmentalProperties(BaseModel):
    """Environmental and sustainability properties"""
    
    embodied_carbon: Optional[float] = Field(None, description="Embodied carbon in kg CO2e per unit")
    embodied_energy: Optional[float] = Field(None, description="Embodied energy in MJ per unit")
    recycled_content: Optional[float] = Field(0, description="Recycled content percentage")
    recyclable: Optional[bool] = Field(True, description="Is material recyclable")
    biodegradable: Optional[bool] = Field(False, description="Is material biodegradable")
    renewable: Optional[bool] = Field(False, description="Is material from renewable sources")
    
    # VOC and emissions
    voc_emissions: Optional[float] = Field(None, description="VOC emissions in g/L")
    formaldehyde_emission: Optional[str] = Field(None, description="Formaldehyde emission class (E0/E1/E2)")
    
    # Certifications
    epd_available: Optional[bool] = Field(False, description="Environmental Product Declaration available")
    carbon_footprint_certified: Optional[bool] = Field(False, description="Carbon footprint certified")
    fsc_certified: Optional[bool] = Field(False, description="FSC certified (for wood)")
    
    # End of life
    disposal_method: Optional[str] = Field(None, description="Recommended disposal method")
    landfill_diversion: Optional[float] = Field(None, description="Percentage divertable from landfill")

# ==================== FINANCIAL PROPERTIES ====================

class FinancialProperties(BaseModel):
    """Financial and pricing properties"""
    
    # Base pricing
    cost_per_unit: float = Field(..., description="Base cost per unit in INR")
    unit_type: UnitType = Field(..., description="Unit of measurement")
    currency: str = Field("INR", description="Currency code")
    
    # Pricing tiers
    retail_price: Optional[float] = Field(None, description="Retail price per unit")
    wholesale_price: Optional[float] = Field(None, description="Wholesale price per unit")
    bulk_price: Optional[float] = Field(None, description="Bulk price per unit")
    minimum_order_quantity: Optional[float] = Field(1, description="Minimum order quantity")
    
    # Cost components
    material_cost: Optional[float] = Field(None, description="Base material cost")
    labor_cost: Optional[float] = Field(None, description="Labor cost per unit")
    installation_cost: Optional[float] = Field(None, description="Installation cost per unit")
    transportation_cost: Optional[float] = Field(None, description="Transportation cost per unit")
    
    # Financial metrics
    price_volatility: Optional[str] = Field(None, description="Price volatility (Low/Medium/High)")
    price_trend: Optional[str] = Field(None, description="Price trend (Increasing/Stable/Decreasing)")
    gst_rate: Optional[float] = Field(None, description="GST rate percentage")
    
    # Lifecycle costs
    maintenance_cost_annual: Optional[float] = Field(None, description="Annual maintenance cost percentage")
    replacement_cycle_years: Optional[int] = Field(None, description="Replacement cycle in years")
    lifecycle_cost_10yr: Optional[float] = Field(None, description="10-year lifecycle cost")
    lifecycle_cost_20yr: Optional[float] = Field(None, description="20-year lifecycle cost")
    
    # Warranties
    warranty_period: Optional[int] = Field(None, description="Warranty period in years")
    warranty_terms: Optional[str] = Field(None, description="Warranty terms and conditions")
    
    # Insurance
    insurance_requirement: Optional[str] = Field(None, description="Insurance requirements")
    
    # Payment terms
    credit_period: Optional[int] = Field(None, description="Credit period in days")
    advance_payment_required: Optional[float] = Field(None, description="Advance payment percentage required")

# ==================== SUPPLIER INFORMATION ====================

class SupplierInfo(BaseModel):
    """Supplier information"""
    supplier_id: Optional[str] = Field(None, description="Supplier ID")
    supplier_name: Optional[str] = Field(None, description="Supplier name")
    supplier_location: Optional[str] = Field(None, description="Supplier location/city")
    lat: Optional[float] = Field(None, description="Latitude")
    lon: Optional[float] = Field(None, description="Longitude")
    lead_time_days: Optional[int] = Field(None, description="Lead time in days")
    reliability_rating: Optional[float] = Field(None, description="Supplier reliability rating 1-10")
    payment_terms: Optional[str] = Field(None, description="Payment terms")
    moq: Optional[float] = Field(None, description="Minimum order quantity")

# ==================== MAIN MATERIAL MODEL ====================

class MaterialBase(BaseModel):
    """Base material model"""
    name: str = Field(..., description="Material name")
    description: Optional[str] = Field(None, description="Material description")
    category: MaterialCategory = Field(..., description="Material category")
    subcategory: Optional[str] = Field(None, description="Material subcategory")
    brand: Optional[str] = Field(None, description="Brand/manufacturer name")
    manufacturer: Optional[str] = Field(None, description="Manufacturer name")
    country_of_origin: Optional[str] = Field(None, description="Country of origin")
    
    # Properties
    physical_properties: Optional[PhysicalProperties] = None
    civil_properties: Optional[CivilEngineeringProperties] = None
    environmental_properties: Optional[EnvironmentalProperties] = None
    financial_properties: Optional[FinancialProperties] = None
    
    # Supplier info
    supplier: Optional[SupplierInfo] = None
    
    # Status
    status: MaterialStatus = Field(MaterialStatus.ACTIVE, description="Material status")
    is_active: bool = Field(True, description="Is material active")
    
    # Metadata
    tags: Optional[List[str]] = Field(default_factory=list, description="Tags for categorization")
    images: Optional[List[str]] = Field(default_factory=list, description="Image URLs")
    documents: Optional[List[Dict[str, str]]] = Field(default_factory=list, description="Related documents")
    
    # Audit fields
    created_by: Optional[str] = Field(None, description="User who created the material")
    updated_by: Optional[str] = Field(None, description="User who last updated")
    notes: Optional[str] = Field(None, description="Additional notes")

class MaterialCreate(MaterialBase):
    """Model for creating a new material"""
    pass

class MaterialUpdate(BaseModel):
    """Model for updating an existing material"""
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[MaterialCategory] = None
    subcategory: Optional[str] = None
    brand: Optional[str] = None
    manufacturer: Optional[str] = None
    country_of_origin: Optional[str] = None
    physical_properties: Optional[PhysicalProperties] = None
    civil_properties: Optional[CivilEngineeringProperties] = None
    environmental_properties: Optional[EnvironmentalProperties] = None
    financial_properties: Optional[FinancialProperties] = None
    supplier: Optional[SupplierInfo] = None
    status: Optional[MaterialStatus] = None
    is_active: Optional[bool] = None
    tags: Optional[List[str]] = None
    images: Optional[List[str]] = None
    documents: Optional[List[Dict[str, str]]] = None
    updated_by: Optional[str] = None
    notes: Optional[str] = None

class MaterialDB(MaterialBase):
    """Material model as stored in MongoDB"""
    id: str = Field(..., alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }

class MaterialResponse(MaterialDB):
    """Material response model for API"""
    pass

# ==================== MATERIAL DATABASE OPERATIONS ====================

from database import database

def get_materials_collection():
    """Get materials collection from database"""
    db = database.get_db()
    if db is None:
        return None
    return db.materials

def get_suppliers_collection():
    """Get suppliers collection from database"""
    db = database.get_db()
    if db is None:
        return None
    return db.suppliers

class MaterialManager:
    """Manager class for material CRUD operations"""
    
    @staticmethod
    def create_material(material_data: MaterialCreate, user_id: Optional[str] = None) -> Optional[MaterialDB]:
        """Create a new material in the database"""
        collection = get_materials_collection()
        if collection is None:
            return None
        
        # Prepare document
        doc = material_data.model_dump(exclude_unset=True)
        doc['_id'] = str(ObjectId())
        doc['created_at'] = datetime.utcnow()
        doc['updated_at'] = datetime.utcnow()
        if user_id:
            doc['created_by'] = user_id
            doc['updated_by'] = user_id
        
        # Insert into database
        collection.insert_one(doc)
        
        return MaterialDB(**doc)
    
    @staticmethod
    def get_material(material_id: str) -> Optional[MaterialDB]:
        """Get a material by ID"""
        collection = get_materials_collection()
        if collection is None:
            return None
        
        material = collection.find_one({"_id": material_id})
        if material:
            return MaterialDB(**material)
        return None
    
    @staticmethod
    def get_all_materials(
        category: Optional[MaterialCategory] = None,
        status: Optional[MaterialStatus] = None,
        search: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[MaterialDB]:
        """Get all materials with optional filters"""
        collection = get_materials_collection()
        if collection is None:
            return []
        
        # Build query - allow materials where is_active is not False
        query = {"$or": [{"is_active": True}, {"is_active": {"$exists": False}}]}
        
        if category:
            query["category"] = category.value
        
        if status:
            query["status"] = status.value
        
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
                {"brand": {"$regex": search, "$options": "i"}},
                {"tags": {"$in": [search]}}
            ]
        
        if min_price is not None or max_price is not None:
            price_query = {}
            if min_price is not None:
                price_query["$gte"] = min_price
            if max_price is not None:
                price_query["$lte"] = max_price
            query["financial_properties.cost_per_unit"] = price_query
        
        # Execute query
        materials = collection.find(query).skip(skip).limit(limit)
        
        # Convert MongoDB documents to MaterialDB, handling ObjectId conversion
        result = []
        for mat in materials:
            mat_copy = dict(mat)
            if '_id' in mat_copy:
                mat_copy['_id'] = str(mat_copy['_id'])
            result.append(MaterialDB(**mat_copy))
        return result
    
    @staticmethod
    def update_material(
        material_id: str,
        update_data: MaterialUpdate,
        user_id: Optional[str] = None
    ) -> Optional[MaterialDB]:
        """Update an existing material"""
        collection = get_materials_collection()
        if collection is None:
            return None
        
        # Prepare update
        update_dict = update_data.model_dump(exclude_unset=True, exclude_none=True)
        update_dict['updated_at'] = datetime.utcnow()
        if user_id:
            update_dict['updated_by'] = user_id
        
        # Update in database
        result = collection.find_one_and_update(
            {"_id": material_id},
            {"$set": update_dict},
            return_document=True
        )
        
        if result:
            return MaterialDB(**result)
        return None
    
    @staticmethod
    def delete_material(material_id: str) -> bool:
        """Soft delete a material (set is_active to False)"""
        collection = get_materials_collection()
        if collection is None:
            return False
        
        result = collection.update_one(
            {"_id": material_id},
            {"$set": {"is_active": False, "status": MaterialStatus.DISCONTINUED.value, "updated_at": datetime.utcnow()}}
        )
        
        return result.modified_count > 0
    
    @staticmethod
    def get_material_categories() -> List[Dict[str, Any]]:
        """Get list of material categories with counts"""
        collection = get_materials_collection()
        if collection is None:
            return []
        
        pipeline = [
            {"$match": {"is_active": True}},
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        
        results = list(collection.aggregate(pipeline))
        return [{"category": r["_id"], "count": r["count"]} for r in results]
    
    @staticmethod
    def search_materials_by_properties(
        min_compressive_strength: Optional[float] = None,
        max_embodied_carbon: Optional[float] = None,
        min_recycled_content: Optional[float] = None,
        max_cost: Optional[float] = None,
        durability_min_years: Optional[int] = None
    ) -> List[MaterialDB]:
        """Search materials by engineering and environmental properties"""
        collection = get_materials_collection()
        if collection is None:
            return []
        
        query = {"is_active": True}
        
        if min_compressive_strength is not None:
            query["civil_properties.compressive_strength"] = {"$gte": min_compressive_strength}
        
        if max_embodied_carbon is not None:
            query["environmental_properties.embodied_carbon"] = {"$lte": max_embodied_carbon}
        
        if min_recycled_content is not None:
            query["environmental_properties.recycled_content"] = {"$gte": min_recycled_content}
        
        if max_cost is not None:
            query["financial_properties.cost_per_unit"] = {"$lte": max_cost}
        
        if durability_min_years is not None:
            query["civil_properties.durability_years"] = {"$gte": durability_min_years}
        
        materials = collection.find(query)
        return [MaterialDB(**mat) for mat in materials]
    
    @staticmethod
    def get_materials_by_category(category: MaterialCategory) -> List[MaterialDB]:
        """Get all materials in a specific category"""
        collection = get_materials_collection()
        if collection is None:
            return []
        
        materials = collection.find({
            "category": category.value,
            "is_active": True
        })
        return [MaterialDB(**mat) for mat in materials]

# Export
__all__ = [
    'MaterialCategory',
    'UnitType',
    'MaterialStatus',
    'PhysicalProperties',
    'CivilEngineeringProperties',
    'EnvironmentalProperties',
    'FinancialProperties',
    'SupplierInfo',
    'MaterialBase',
    'MaterialCreate',
    'MaterialUpdate',
    'MaterialDB',
    'MaterialResponse',
    'MaterialManager',
    'get_materials_collection',
    'get_suppliers_collection'
]
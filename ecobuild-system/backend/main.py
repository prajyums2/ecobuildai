"""
Main API Server for EcoBuild Backend
FastAPI-based REST API with MongoDB and Authentication
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, Header, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field, validator
from typing import List, Dict, Optional, Any
from datetime import datetime
import json
import uvicorn
from bson.objectid import ObjectId

# Import database and auth
from database import database, get_users_collection, get_projects_collection, get_cost_tracking_collection, get_qc_checklists_collection, get_materials_collection

# Import materials module
from materials import (
    MaterialManager, MaterialCreate, MaterialUpdate, MaterialDB, MaterialResponse,
    MaterialCategory, MaterialStatus, UnitType,
    PhysicalProperties, CivilEngineeringProperties, EnvironmentalProperties,
    FinancialProperties, SupplierInfo
)
from auth import (
    UserCreate, UserLogin, User, Token,
    verify_password, get_password_hash, create_access_token, verify_token
)

# Import our modules
from ahp_engine import AHPEngine, OptimizationMode, Material as AHPMaterial
from kerala_environmental_engine import KeralaEnvironmentalEngine
from bim_parser_enhanced import EnhancedBIMParser, BIMParser, BIMProjectData
from green_building_standards import (
    GreenBuildingStandards, RatingSystem, GreenBuildingAssessment,
    GRIHARating, IGBCRating, LEEDRating
)

# Import Structural Engineering Modules
from is_codes import ISCodeReferences
from load_calculator import LoadCalculator, calculate_building_loads
from seismic_analysis import SeismicAnalyzer, calculate_seismic
from wind_load import WindLoadCalculator, calculate_wind_load
from structural_design import SlabDesigner, BeamDesigner, ColumnDesigner, FoundationDesigner, design_structural_member
from citations import get_all_citations, get_citations_by_code, get_bibliography, get_categories, get_citations_by_category

# Import Cost Tracking and QC Modules
from cost_tracker import CostTracker, PaymentStatus, MilestoneType
from qc_checklists import QCChecklistManager, QCStage, QCStatus, Severity

app = FastAPI(
    title="EcoBuild API",
    description="Lifecycle Decision Support System for Sustainable Construction with MongoDB",
    version="2.0.0"
)

# CORS middleware - allowing all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Security
security = HTTPBearer()

# Health check endpoint (no auth required)
@app.get("/")
async def root():
    return {"message": "EcoBuild API is running", "version": "2.0.0"}

@app.get("/health")
async def health_check():
    db = database.get_db()
    return {"status": "healthy", "database": "connected" if db is not None else "disconnected"}

@app.get("/debug/env")
async def debug_env():
    """Debug endpoint to check environment variables"""
    import os
    mongodb_uri = os.getenv('MONGODB_URI', 'NOT SET')
    # Mask password for security
    masked_uri = mongodb_uri[:50] + '...' if len(mongodb_uri) > 50 else mongodb_uri
    return {
        "mongodb_uri_set": "YES" if mongodb_uri != 'NOT SET' else "NO",
        "mongodb_uri_masked": masked_uri,
        "db_name": os.getenv('DB_NAME', 'NOT SET'),
        "port": os.getenv('PORT', 'NOT SET'),
    }

# Initialize database connection
@app.on_event("startup")
async def startup_event():
    """Connect to MongoDB on startup"""
    database.connect()

@app.on_event("shutdown")
async def shutdown_event():
    """Close MongoDB connection on shutdown"""
    database.close()

# Authentication dependency
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token and return current user"""
    token = credentials.credentials
    email = verify_token(token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    users_collection = get_users_collection()
    if users_collection is None:
        raise HTTPException(status_code=503, detail="Database not available")
    
    user = users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Convert _id to id for Pydantic model
    user["id"] = str(user.pop("_id"))
    return User(**user)

# ==================== AUTHENTICATION ROUTES ====================

@app.post("/api/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    """Register a new user"""
    users_collection = get_users_collection()
    if users_collection is None:
        raise HTTPException(status_code=503, detail="Database not available")
    
    # Check if user already exists
    if users_collection.find_one({"email": user_data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_dict = {
        "_id": str(ObjectId()),
        "email": user_data.email,
        "full_name": user_data.full_name,
        "company": user_data.company,
        "phone": user_data.phone,
        "hashed_password": get_password_hash(user_data.password),
        "is_active": True,
        "created_at": datetime.utcnow(),
        "last_login": None
    }
    
    users_collection.insert_one(user_dict)
    
    # Create access token
    access_token = create_access_token(data={"sub": user_data.email})
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=User(
            id=str(user_dict["_id"]),
            email=user_data.email,
            full_name=user_data.full_name,
            company=user_data.company,
            phone=user_data.phone,
            is_active=True,
            created_at=user_dict["created_at"]
        )
    )

@app.post("/api/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    """Login user and return access token"""
    users_collection = get_users_collection()
    if users_collection is None:
        raise HTTPException(status_code=503, detail="Database not available")
    
    # Find user
    user = users_collection.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last login
    users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    # Create access token
    access_token = create_access_token(data={"sub": credentials.email})
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=User(
            id=str(user["_id"]),
            email=user["email"],
            full_name=user["full_name"],
            company=user.get("company"),
            phone=user.get("phone"),
            is_active=user["is_active"],
            created_at=user["created_at"],
            last_login=datetime.utcnow()
        )
    )

@app.get("/api/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user

# ==================== PROJECT ROUTES ====================

@app.get("/api/projects")
async def get_projects(current_user: User = Depends(get_current_user)):
    """Get all projects for current user"""
    projects_collection = get_projects_collection()
    if projects_collection is None:
        raise HTTPException(status_code=503, detail="Database not available")
    
    projects = list(projects_collection.find({"user_id": current_user.id}))
    return [{**p, "id": str(p["_id"])} for p in projects]

@app.post("/api/projects")
async def create_project(
    project_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Create a new project"""
    projects_collection = get_projects_collection()
    if projects_collection is None:
        raise HTTPException(status_code=503, detail="Database not available")
    
    project = {
        "_id": ObjectId(),
        "user_id": current_user.id,
        "created_at": datetime.utcnow(),
        "last_modified": datetime.utcnow(),
        **project_data
    }
    
    projects_collection.insert_one(project)
    return {"id": str(project["_id"]), "message": "Project created successfully"}

@app.get("/api/projects/{project_id}")
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a specific project"""
    projects_collection = get_projects_collection()
    if projects_collection is None:
        raise HTTPException(status_code=503, detail="Database not available")
    
    project = projects_collection.find_one({
        "_id": ObjectId(project_id),
        "user_id": current_user.id
    })
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {**project, "id": str(project["_id"])}

@app.put("/api/projects/{project_id}")
async def update_project(
    project_id: str,
    project_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Update a project"""
    projects_collection = get_projects_collection()
    if projects_collection is None:
        raise HTTPException(status_code=503, detail="Database not available")
    
    result = projects_collection.update_one(
        {"_id": ObjectId(project_id), "user_id": current_user.id},
        {"$set": {**project_data, "last_modified": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {"message": "Project updated successfully"}

@app.delete("/api/projects/{project_id}")
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a project"""
    projects_collection = get_projects_collection()
    if projects_collection is None:
        raise HTTPException(status_code=503, detail="Database not available")
    
    result = projects_collection.delete_one({
        "_id": ObjectId(project_id),
        "user_id": current_user.id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {"message": "Project deleted successfully"}

# ==================== MATERIAL OPTIMIZATION ROUTES ====================

@app.post("/api/optimize")
async def optimize_materials(
    data: dict,
):
    """Optimize material selection based on sustainability/luxury/balanced mode using MongoDB materials (public)"""
    try:
        mode_str = data.get('mode', 'balanced')
        mode = OptimizationMode(mode_str)
        categories = data.get('required_materials', [])
        
        print(f"[OPTIMIZE] Request received - mode: {mode_str}, categories: {categories}")
        
        # Use direct MongoDB query to get materials
        collection = get_materials_collection()
        if collection is None:
            return {
                "mode": mode_str,
                "optimized_materials": {},
                "message": "No materials collection"
            }
        
        # Get all materials
        cursor = collection.find({"$or": [{"is_active": True}, {"is_active": {"$exists": False}}]}).limit(100)
        all_db_materials = list(cursor)
        
        print(f"[OPTIMIZE] Total materials from DB: {len(all_db_materials)}")
        
        if not all_db_materials:
            return {
                "mode": mode_str,
                "optimized_materials": {},
                "message": "No materials found in database"
            }
        
        # Debug: print first material's category
        if all_db_materials:
            print(f"[OPTIMIZE] First material category: {all_db_materials[0].get('category')}")
        
        # Filter materials by requested categories - simple string comparison
        all_materials = []
        for category in categories:
            for mat in all_db_materials:
                mat_cat = mat.get('category', '')
                
                if str(mat_cat).lower() == category.lower():
                    # Filter out work items (carbon >= 30 indicates work items, not materials)
                    # Actual materials have carbon < 30 kg CO2/unit
                    env_props = mat.get('environmental_properties') or {}
                    carbon = env_props.get('embodied_carbon', 0) or 0
                    if carbon and float(carbon) < 30:  # Only actual materials, not work items
                        all_materials.append(mat)
        
        print(f"[OPTIMIZE] Matched materials (after filtering work items): {len(all_materials)}")
        
        if not all_materials:
            return {
                "mode": mode_str,
                "optimized_materials": {},
                "message": f"No materials found for categories: {categories}"
            }
        
        # Convert to AHP Material objects using dictionary access
        ahp_materials = []
        for mat in all_materials:
            # Extract properties from dictionary
            env_props = mat.get('environmental_properties') or {}
            civil_props = mat.get('civil_properties') or {}
            financial_props = mat.get('financial_properties') or {}
            physical_props = mat.get('physical_properties') or {}
            supplier_info = mat.get('supplier') or {}
            
            # Get category as string
            mat_cat = mat.get('category', '')
            
            ahp_mat = AHPMaterial(
                id=str(mat.get('_id', '')),
                name=mat.get('name', 'Unknown'),
                category=str(mat_cat).lower(),
                embodied_carbon=env_props.get('embodied_carbon', 0) or 0,
                recycled_content=env_props.get('recycled_content', 0) or 0,
                cost_per_unit=financial_props.get('cost_per_unit', 0) or 0,
                thermal_conductivity=physical_props.get('thermal_conductivity', 0) or 0,
                durability_years=civil_props.get('durability_years', 50) or 50,
                aesthetic_rating=5,
                compressive_strength=physical_props.get('compressive_strength', 0) or 0,
                supplier_id=supplier_info.get('supplier_name', 'unknown') or 'unknown'
            )
            ahp_materials.append(ahp_mat)
        
        # Group materials by category
        materials_by_category = {}
        for mat in ahp_materials:
            cat = mat.category
            if cat not in materials_by_category:
                materials_by_category[cat] = []
            materials_by_category[cat].append(mat)
        
        # Set weights based on mode
        if mode == OptimizationMode.SUSTAINABILITY:
            weights = {
                'embodied_carbon': 0.35,
                'recycled_content': 0.20,
                'cost': 0.10,
                'durability': 0.15,
                'thermal_performance': 0.15,
                'aesthetics': 0.05
            }
        elif mode == OptimizationMode.LUXURY:
            weights = {
                'embodied_carbon': 0.10,
                'recycled_content': 0.05,
                'cost': 0.10,
                'durability': 0.30,
                'thermal_performance': 0.20,
                'aesthetics': 0.25
            }
        else:  # BALANCED
            weights = {
                'embodied_carbon': 0.20,
                'recycled_content': 0.15,
                'cost': 0.20,
                'durability': 0.20,
                'thermal_performance': 0.15,
                'aesthetics': 0.10
            }
        
        # Score and rank materials for each category
        import numpy as np
        results = {}
        
        for category, materials_list in materials_by_category.items():
            if not materials_list:
                continue
                
            # Calculate scores
            scored_materials = []
            for mat in materials_list:
                # Normalize values (lower is better for carbon and cost, higher for others)
                carbon_score = 1 / (mat.embodied_carbon + 0.01)  # Lower carbon = higher score
                recycled_score = mat.recycled_content / 100  # Already 0-1
                cost_score = 1 / (mat.cost_per_unit + 0.01)  # Lower cost = higher score
                durability_score = mat.durability_years / 100  # Normalize to 0-1
                thermal_score = 1 / (mat.thermal_conductivity + 0.01)  # Lower conductivity = better insulation
                aesthetic_score = mat.aesthetic_rating / 10  # Normalize to 0-1
                
                # Calculate weighted score
                total_score = (
                    weights['embodied_carbon'] * carbon_score +
                    weights['recycled_content'] * recycled_score +
                    weights['cost'] * cost_score +
                    weights['durability'] * durability_score +
                    weights['thermal_performance'] * thermal_score +
                    weights['aesthetics'] * aesthetic_score
                )
                
                scored_materials.append({
                    'material_id': mat.id,
                    'name': mat.name,
                    'category': mat.category,
                    'score': total_score,
                    'embodied_carbon': mat.embodied_carbon,
                    'recycled_content': mat.recycled_content,
                    'cost_per_unit': mat.cost_per_unit,
                    'thermal_conductivity': mat.thermal_conductivity,
                    'durability_years': mat.durability_years,
                    'compressive_strength': mat.compressive_strength,
                    'supplier_id': mat.supplier_id,
                    'details': {
                        'carbon_score': round(carbon_score, 3),
                        'recycled_score': round(recycled_score, 3),
                        'cost_score': round(cost_score, 3),
                        'durability_score': round(durability_score, 3),
                        'thermal_score': round(thermal_score, 3),
                        'aesthetic_score': round(aesthetic_score, 3)
                    }
                })
            
            # Sort by score (descending)
            scored_materials.sort(key=lambda x: x['score'], reverse=True)
            
            # Add rankings
            for i, item in enumerate(scored_materials):
                item['rank'] = i + 1
            
            results[category] = scored_materials
        
        return {
            "results": results,
            "mode": mode_str,
            "total_categories": len(materials_by_category),
            "total_materials": len(ahp_materials)
        }
    except Exception as e:
        import traceback
        print(f"[ERROR] Optimization failed: {e}")
        print(f"[DEBUG] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/materials/categories")
async def get_material_categories():
    """Get available material categories (public)"""
    categories = [
        {"id": "concrete", "name": "Concrete & RCC"},
        {"id": "cement", "name": "Cement & Binders"},
        {"id": "steel", "name": "Steel & Reinforcement"},
        {"id": "blocks", "name": "Blocks & Bricks"},
        {"id": "aggregates", "name": "Aggregates & Sand"},
        {"id": "masonry", "name": "Masonry Systems"},
        {"id": "flooring", "name": "Flooring & Tiles"},
        {"id": "timber", "name": "Timber & Wood"},
        {"id": "finish", "name": "Paint & Finishes"},
        {"id": "door", "name": "Doors & Windows"},
        {"id": "electrical", "name": "Electrical"},
        {"id": "plumbing", "name": "Plumbing"}
    ]
    return categories

@app.get("/api/suppliers")
async def get_suppliers(
    lat: float = Query(..., description="Site latitude"),
    lon: float = Query(..., description="Site longitude"),
    radius_km: float = Query(50, description="Search radius in km"),
    current_user: User = Depends(get_current_user)
):
    """Get suppliers within specified radius"""
    try:
        # Return sample suppliers for now
        suppliers = [
            {"id": "sup1", "name": "KTJ Steel", "distance": 12.5},
            {"id": "sup2", "name": "Trichur Builders", "distance": 8.2}
        ]
        return {"suppliers": suppliers}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== COMPREHENSIVE MATERIAL MANAGEMENT ROUTES ====================

@app.get("/api/materials")
async def list_materials(
    category: Optional[str] = Query(None, description="Filter by category"),
    status: Optional[str] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search term"),
    min_price: Optional[float] = Query(None, description="Minimum price"),
    max_price: Optional[float] = Query(None, description="Maximum price"),
    skip: int = Query(0, description="Skip N records"),
    limit: int = Query(100, description="Limit results"),
):
    """Get all materials with optional filters (public - no auth required)"""
    try:
        collection = get_materials_collection()
        if collection is None:
            return {"materials": [], "total": 0}
        
        # Build query
        query = {"$or": [{"is_active": True}, {"is_active": {"$exists": False}}]}
        
        if category:
            query["category"] = category.lower()
        
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}}
            ]
        
        # Get total count
        total = collection.count_documents(query)
        
        # Execute query and convert ObjectId to string
        materials = []
        for mat in collection.find(query).skip(skip).limit(limit):
            mat["_id"] = str(mat["_id"])
            materials.append(mat)
        
        return {
            "materials": materials,
            "total": total
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/materials/categories-detailed")
async def get_material_categories_detailed(
    current_user: User = Depends(get_current_user)
):
    """Get material categories with counts from database"""
    try:
        categories = MaterialManager.get_material_categories()
        return {"categories": categories}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/materials/{material_id}")
async def get_material(
    material_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a specific material by ID"""
    try:
        material = MaterialManager.get_material(material_id)
        if not material:
            raise HTTPException(status_code=404, detail="Material not found")
        return material.model_dump(by_alias=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/materials")
async def create_material(
    material_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Create a new material with all civil engineering and financial properties"""
    try:
        # Convert nested dictionaries to model instances
        if "physical_properties" in material_data:
            material_data["physical_properties"] = PhysicalProperties(**material_data["physical_properties"])
        if "civil_properties" in material_data:
            material_data["civil_properties"] = CivilEngineeringProperties(**material_data["civil_properties"])
        if "environmental_properties" in material_data:
            material_data["environmental_properties"] = EnvironmentalProperties(**material_data["environmental_properties"])
        if "financial_properties" in material_data:
            # Handle unit_type enum conversion
            if "unit_type" in material_data["financial_properties"]:
                unit_type_str = material_data["financial_properties"]["unit_type"]
                material_data["financial_properties"]["unit_type"] = UnitType(unit_type_str)
            material_data["financial_properties"] = FinancialProperties(**material_data["financial_properties"])
        if "supplier" in material_data:
            material_data["supplier"] = SupplierInfo(**material_data["supplier"])
        
        # Convert category and status enums
        if "category" in material_data:
            material_data["category"] = MaterialCategory(material_data["category"])
        if "status" in material_data:
            material_data["status"] = MaterialStatus(material_data["status"])
        
        # Create material
        material_create = MaterialCreate(**material_data)
        material = MaterialManager.create_material(material_create, current_user.id)
        
        if not material:
            raise HTTPException(status_code=503, detail="Database not available")
        
        return {
            "message": "Material created successfully",
            "material": material.model_dump(by_alias=True)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/materials/{material_id}")
async def update_material(
    material_id: str,
    update_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Update an existing material"""
    try:
        # Convert nested dictionaries to model instances if present
        if "physical_properties" in update_data:
            update_data["physical_properties"] = PhysicalProperties(**update_data["physical_properties"])
        if "civil_properties" in update_data:
            update_data["civil_properties"] = CivilEngineeringProperties(**update_data["civil_properties"])
        if "environmental_properties" in update_data:
            update_data["environmental_properties"] = EnvironmentalProperties(**update_data["environmental_properties"])
        if "financial_properties" in update_data:
            if "unit_type" in update_data["financial_properties"]:
                unit_type_str = update_data["financial_properties"]["unit_type"]
                update_data["financial_properties"]["unit_type"] = UnitType(unit_type_str)
            update_data["financial_properties"] = FinancialProperties(**update_data["financial_properties"])
        if "supplier" in update_data:
            update_data["supplier"] = SupplierInfo(**update_data["supplier"])
        
        # Convert enums if present
        if "category" in update_data:
            update_data["category"] = MaterialCategory(update_data["category"])
        if "status" in update_data:
            update_data["status"] = MaterialStatus(update_data["status"])
        
        # Create update model
        material_update = MaterialUpdate(**update_data)
        material = MaterialManager.update_material(material_id, material_update, current_user.id)
        
        if not material:
            raise HTTPException(status_code=404, detail="Material not found")
        
        return {
            "message": "Material updated successfully",
            "material": material.model_dump(by_alias=True)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/materials/{material_id}")
async def delete_material(
    material_id: str,
    current_user: User = Depends(get_current_user)
):
    """Soft delete a material"""
    try:
        success = MaterialManager.delete_material(material_id)
        if not success:
            raise HTTPException(status_code=404, detail="Material not found")
        return {"message": "Material deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/materials/search-advanced")
async def search_materials_advanced(
    search_params: dict,
    current_user: User = Depends(get_current_user)
):
    """Advanced search for materials by engineering and environmental properties"""
    try:
        materials = MaterialManager.search_materials_by_properties(
            min_compressive_strength=search_params.get('min_compressive_strength'),
            max_embodied_carbon=search_params.get('max_embodied_carbon'),
            min_recycled_content=search_params.get('min_recycled_content'),
            max_cost=search_params.get('max_cost'),
            durability_min_years=search_params.get('durability_min_years')
        )
        return {
            "materials": [mat.model_dump(by_alias=True) for mat in materials],
            "total": len(materials)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/materials/category/{category}")
async def get_materials_by_category(
    category: str,
    current_user: User = Depends(get_current_user)
):
    """Get all materials in a specific category"""
    try:
        cat_enum = MaterialCategory(category)
        materials = MaterialManager.get_materials_by_category(cat_enum)
        return {
            "category": category,
            "materials": [mat.model_dump(by_alias=True) for mat in materials],
            "total": len(materials)
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid category")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== ENVIRONMENTAL DATA ROUTES ====================

@app.post("/api/environmental-data")
async def get_environmental_data(
    data: dict,
    current_user: User = Depends(get_current_user)
):
    """Get environmental data for a location"""
    try:
        lat = data.get('lat', 10.5276)
        lon = data.get('lon', 76.2144)
        
        print(f"[DEBUG] Environmental data request for lat={lat}, lon={lon}")
        
        engine = KeralaEnvironmentalEngine()
        
        return {
            "climate": {"temperature": 32, "humidity": 75},
            "rainfall": {"annual": 3000},
            "seismic": {"zone": "III"},
            "wind": {"speed": 39}
        }
    except Exception as e:
        import traceback
        print(f"[ERROR] Environmental data endpoint failed: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/operational-carbon")
async def calculate_operational_carbon(
    data: dict,
    current_user: User = Depends(get_current_user)
):
    """Calculate operational carbon footprint"""
    try:
        building_area = data.get('building_area', 1000)
        wall_u_value = data.get('wall_u_value', 0.5)
        roof_u_value = data.get('roof_u_value', 0.4)
        lat = data.get('lat', 10.5276)
        lon = data.get('lon', 76.2144)
        
        return {
            "annual_carbon_kg": 2500,
            "lifetime_carbon_kg": 75000
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== GREEN BUILDING STANDARDS ROUTES ====================

@app.get("/api/green-building/criteria")
async def get_green_building_criteria(
    rating_system: Optional[str] = Query(None, description="Filter by rating system (GRIHA, IGBC, LEED)"),
    current_user: User = Depends(get_current_user)
):
    """Get green building criteria for assessment"""
    try:
        criteria = GreenBuildingStandards.get_all_criteria()
        if rating_system:
            system = RatingSystem(rating_system.upper())
            criteria = {k: v for k, v in criteria.items() if system in v.applicable_standards}
        
        return {
            "criteria": [
                {
                    "id": c.id,
                    "name": c.name,
                    "description": c.description,
                    "category": c.category,
                    "max_points": c.max_points,
                    "applicable_standards": [s.value for s in c.applicable_standards],
                    "reference_codes": c.reference_codes,
                    "documentation_required": c.documentation_required
                }
                for c in criteria.values()
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/green-building/assess-materials")
async def assess_materials_green_points(
    materials: List[dict],
    current_user: User = Depends(get_current_user)
):
    """Calculate green building points for selected materials"""
    try:
        total_griha = 0
        total_igbc = 0
        total_leed = 0
        material_assessments = []
        
        for material in materials:
            props = material.get('environmental_properties', {})
            points = GreenBuildingStandards.get_material_green_points(props)
            
            total_griha += points.griha_points
            total_igbc += points.igbc_points
            total_leed += points.leed_points
            
            material_assessments.append({
                "material_id": material.get('id'),
                "material_name": material.get('name'),
                "griha_points": points.griha_points,
                "igbc_points": points.igbc_points,
                "leed_points": points.leed_points,
                "criteria_met": points.criteria_met
            })
        
        return {
            "total_griha_points": round(total_griha, 2),
            "total_igbc_points": round(total_igbc, 2),
            "total_leed_points": round(total_leed, 2),
            "material_assessments": material_assessments,
            "potential_rating": {
                "griha": GreenBuildingStandards.calculate_griha_rating(total_griha * 5).value if total_griha * 5 >= 50 else None,
                "igbc": GreenBuildingStandards.calculate_igbc_rating(total_igbc * 6).value if total_igbc * 6 >= 50 else None,
                "leed": GreenBuildingStandards.calculate_leed_rating(total_leed * 7).value if total_leed * 7 >= 40 else None
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/green-building/calculate-rating")
async def calculate_green_rating(
    data: dict,
    current_user: User = Depends(get_current_user)
):
    """Calculate green building rating based on total scores"""
    try:
        griha_score = data.get('griha_score', 0)
        igbc_score = data.get('igbc_score', 0)
        leed_score = data.get('leed_score', 0)
        
        griha_rating = GreenBuildingStandards.calculate_griha_rating(griha_score)
        igbc_rating = GreenBuildingStandards.calculate_igbc_rating(igbc_score)
        leed_rating = GreenBuildingStandards.calculate_leed_rating(leed_score)
        
        return {
            "griha": {
                "score": griha_score,
                "rating": griha_rating.value if griha_rating else "Not Rated",
                "max_score": 100
            },
            "igbc": {
                "score": igbc_score,
                "rating": igbc_rating.value if igbc_rating else "Not Rated",
                "max_score": 100
            },
            "leed": {
                "score": leed_score,
                "rating": leed_rating.value if leed_rating else "Not Rated",
                "max_score": 110
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/green-building/full-assessment")
async def green_building_full_assessment(
    data: dict,
    current_user: User = Depends(get_current_user)
):
    """Generate comprehensive green building assessment with GRIHA, IGBC, and LEED ratings"""
    try:
        building_params = data.get('building_params', {})
        materials = data.get('materials', [])
        boq = data.get('boq', {})
        
        # Calculate scores for each rating system
        griha_score = 0
        igbc_score = 0
        leed_score = 0
        
        criteria_results = []
        
        # 1. Site & Planning (GRIHA S01-S04, IGBC SS, LEED LT/SS)
        site_score = 10
        if building_params.get('roadWidth', 0) >= 6:
            site_score += 5
        griha_score += min(site_score, 15)
        igbc_score += min(site_score, 15)
        leed_score += min(site_score, 12)
        criteria_results.append({
            "criterion": "Site Selection & Accessibility",
            "griha": min(site_score, 15),
            "igbc": min(site_score, 15),
            "leed": min(site_score, 12),
            "met": building_params.get('roadWidth', 0) >= 3
        })
        
        # 2. Water Efficiency (GRIHA W01-W03, IGBC WE, LEED WE)
        water_score = 0
        if building_params.get('hasRainwaterHarvesting', False):
            water_score += 5
            griha_score += 5
            igbc_score += 5
            leed_score += 4
        if building_params.get('hasSewageTreatment', False):
            water_score += 4
            griha_score += 4
            igbc_score += 4
            leed_score += 3
        criteria_results.append({
            "criterion": "Water Efficiency & Rainwater Harvesting",
            "griha": water_score,
            "igbc": water_score,
            "leed": min(water_score, 7),
            "met": building_params.get('hasRainwaterHarvesting', False)
        })
        
        # 3. Energy Performance (GRIHA E01-E03, IGBC EA, LEED EA)
        energy_score = 0
        if building_params.get('hasSolarWaterHeater', False):
            energy_score += 5
            griha_score += 5
            igbc_score += 5
            leed_score += 4
        criteria_results.append({
            "criterion": "Renewable Energy & Energy Efficiency",
            "griha": energy_score,
            "igbc": energy_score,
            "leed": energy_score,
            "met": building_params.get('hasSolarWaterHeater', False)
        })
        
        # 4. Materials & Resources - Calculate from materials data
        materials_score = 0
        total_carbon = 0
        recycled_content = 0
        
        materials_collection = get_materials_collection()
        if materials_collection:
            # Get materials from database for environmental properties
            for mat in materials:
                mat_data = materials_collection.find_one({"name": mat.get('name')})
                if mat_data:
                    env_props = mat_data.get('environmental_properties', {})
                    total_carbon += env_props.get('embodied_carbon', 0) * mat.get('quantity', 1)
                    recycled_content += env_props.get('recycled_content', 0)
        
        # Award points for low embodied carbon materials
        if total_carbon < 500:
            materials_score += 6
            griha_score += 6
            igbc_score += 5
            leed_score += 4
        elif total_carbon < 1000:
            materials_score += 4
            griha_score += 4
            igbc_score += 3
            leed_score += 2
        
        # Award points for recycled content
        if recycled_content > 20:
            materials_score += 3
            griha_score += 3
            igbc_score += 3
            leed_score += 2
        
        criteria_results.append({
            "criterion": "Materials & Resources (Embodied Carbon)",
            "griha": materials_score,
            "igbc": materials_score,
            "leed": min(materials_score, 6),
            "met": materials_score > 0
        })
        
        # 5. Indoor Environment Quality
        iq_score = 2  # Basic points for ventilation
        griha_score += iq_score
        igbc_score += iq_score
        leed_score += iq_score
        criteria_results.append({
            "criterion": "Indoor Environmental Quality",
            "griha": iq_score,
            "igbc": iq_score,
            "leed": iq_score,
            "met": True
        })
        
        # Calculate ratings
        griha_rating = GreenBuildingStandards.calculate_griha_rating(griha_score)
        igbc_rating = GreenBuildingStandards.calculate_igbc_rating(igbc_score)
        leed_rating = GreenBuildingStandards.calculate_leed_rating(leed_score)
        
        return {
            "assessment": {
                "griha": {
                    "score": round(griha_score, 1),
                    "rating": griha_rating.value if griha_rating else "Not Rated",
                    "max_score": 100,
                    "stars": griha_rating.value.split('-')[-1].strip() if griha_rating else None
                },
                "igbc": {
                    "score": round(igbc_score, 1),
                    "rating": igbc_rating.value if igbc_rating else "Not Rated",
                    "max_score": 100
                },
                "leed": {
                    "score": round(leed_score, 1),
                    "rating": leed_rating.value if leed_rating else "Not Rated",
                    "max_score": 110
                }
            },
            "criteria_results": criteria_results,
            "summary": {
                "total_embodied_carbon_kg": round(total_carbon, 2),
                "recycled_content_percent": recycled_content,
                "sustainable_features": {
                    "rainwater_harvesting": building_params.get('hasRainwaterHarvesting', False),
                    "solar_water_heater": building_params.get('hasSolarWaterHeater', False),
                    "sewage_treatment": building_params.get('hasSewageTreatment', False)
                }
            },
            "recommendations": generate_green_recommendations(griha_score, igbc_score, leed_score)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def generate_green_recommendations(griha_score, igbc_score, leed_score):
    """Generate recommendations based on scores"""
    recommendations = []
    
    if griha_score < 50:
        recommendations.append({
            "priority": "high",
            "text": "Consider adding rainwater harvesting system to improve water efficiency score"
        })
        recommendations.append({
            "priority": "high", 
            "text": "Install solar water heater to earn energy points"
        })
    
    if igbc_score < 60:
        recommendations.append({
            "priority": "medium",
            "text": "Use materials with higher recycled content to improve materials score"
        })
    
    if leed_score < 40:
        recommendations.append({
            "priority": "medium",
            "text": "Consider native landscaping and vegetation for site development points"
        })
    
    if not recommendations:
        recommendations.append({
            "priority": "info",
            "text": "Great job! Your project is on track for green building certification"
        })
    
    return recommendations


# ==================== COMPLIANCE CHECK ROUTES ====================

@app.post("/api/compliance-check")
async def check_compliance(
    data: dict,
    current_user: User = Depends(get_current_user)
):
    """Validate building parameters with input validation"""
    try:
        # Input validation warnings
        validation_warnings = []
        validation_errors = []
        
        num_floors = data.get('num_floors', 2)
        building_height_m = data.get('building_height_m', 7)
        
        # Validate floor height
        if num_floors and building_height_m:
            avg_floor_height = building_height_m / num_floors
            if avg_floor_height > 6:
                validation_errors.append({
                    "field": "building_height",
                    "message": f"Average floor height ({avg_floor_height:.1f}m) exceeds typical maximum (6m). Please verify inputs.",
                    "severity": "error"
                })
            elif avg_floor_height > 4.5:
                validation_warnings.append({
                    "field": "building_height",
                    "message": f"Average floor height ({avg_floor_height:.1f}m) is unusually high. Typical range: 2.8-3.5m.",
                    "severity": "warning"
                })
        
        # Validate setbacks
        setbacks = {
            'front': data.get('front_setback_m', 3),
            'rear': data.get('rear_setback_m', 2),
            'side1': data.get('side1_setback_m', 1.5),
            'side2': data.get('side2_setback_m', 1.5)
        }
        
        for side, value in setbacks.items():
            if value < 0:
                validation_errors.append({
                    "field": f"setback_{side}",
                    "message": f"{side.capitalize()} setback cannot be negative ({value}m).",
                    "severity": "error"
                })
            elif value == 0:
                validation_warnings.append({
                    "field": f"setback_{side}",
                    "message": f"{side.capitalize()} setback is 0m. Ensure adequate setback for safety and ventilation.",
                    "severity": "warning"
                })
        
        # Basic validation result
        result = {
            "is_valid": len(validation_errors) == 0,
            "warnings": validation_warnings,
            "errors": validation_errors,
            "setbacks": setbacks,
            "building_params": {
                "plot_area_sqm": data.get('plot_area_sqm', 200),
                "building_footprint_sqm": data.get('building_footprint_sqm', 120),
                "total_built_up_area_sqm": data.get('total_built_up_area_sqm', 300),
                "num_floors": num_floors,
                "building_height_m": building_height_m,
                "road_width_m": data.get('road_width_m', 6)
            },
            "sustainable_features": {
                "rainwater_harvesting": data.get('has_rainwater_harvesting', True),
                "solar_water_heater": data.get('has_solar_water_heater', True),
                "sewage_treatment": data.get('has_sewage_treatment', False)
            }
        }
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/validate-project")
async def validate_project(
    data: dict,
    current_user: User = Depends(get_current_user)
):
    """Validate project parameters and return warnings/errors"""
    try:
        warnings = []
        errors = []
        
        building_params = data.get('buildingParams', {})
        
        # Dimensional validation
        num_floors = building_params.get('numFloors')
        building_height = building_params.get('buildingHeight')
        
        if num_floors and building_height:
            avg_floor_height = building_height / num_floors
            if avg_floor_height > 6:
                errors.append({
                    "field": "buildingHeight",
                    "message": f"Average floor height ({avg_floor_height:.1f}m) exceeds typical maximum (6m).",
                    "severity": "error"
                })
            elif avg_floor_height > 4.5:
                warnings.append({
                    "field": "buildingHeight",
                    "message": f"Average floor height ({avg_floor_height:.1f}m) is unusually high.",
                    "severity": "warning"
                })
        
        # Steel ratio validation
        steel_qty = data.get('steelQuantityKg', 0)
        built_up_area = building_params.get('builtUpArea', 0)
        
        if steel_qty and built_up_area:
            steel_ratio = steel_qty / built_up_area
            if steel_ratio > 150:
                errors.append({
                    "field": "steelQuantity",
                    "message": f"Steel ratio ({steel_ratio:.1f} kg/sq.m) exceeds maximum (150 kg/sq.m). Over-designed.",
                    "severity": "error"
                })
            elif steel_ratio > 100:
                warnings.append({
                    "field": "steelQuantity",
                    "message": f"Steel ratio ({steel_ratio:.1f} kg/sq.m) is high. Consider optimization.",
                    "severity": "warning"
                })
        
        return {
            "valid": len(errors) == 0,
            "warnings": warnings,
            "errors": errors
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== BIM PARSING ROUTES ====================

@app.post("/api/bim/parse")
async def parse_bim(
    file: UploadFile = File(...),
):
    """Parse BIM/IFC file and extract material quantities with database integration
    (public - no auth required)
    
    Returns:
        Complete project data with elements, quantities, costs, and carbon estimates
    """
    try:
        import tempfile
        import os
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.ifc') as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name
        
        try:
            # Parse IFC file with enhanced parser
            print(f"[BIM API] Parsing file: {file.filename}")
            parser = EnhancedBIMParser(materials_db=get_materials_collection())
            project_data = parser.parse_ifc_file(tmp_path)
            
            print(f"[BIM API] Parsed {len(project_data.elements)} elements")
            print(f"[BIM API] Found {len(project_data.stories)} stories")
            print(f"[BIM API] Total volume: {project_data.total_volume:.2f} m³")
            
            # Convert to response format
            parsed_elements = []
            for el in project_data.elements:
                parsed_elements.append({
                    'element_id': el.element_id,
                    'element_type': el.element_type.value,
                    'name': el.name,
                    'volume': el.volume_m3,
                    'surface_area': el.surface_area_m2,
                    'dimensions': el.dimensions,
                    'location': el.location,
                    'materials': el.material_references,
                    'story': el.story,
                    'properties': el.properties,
                    'cost_estimate': el.cost_estimate,
                    'carbon_estimate': el.carbon_estimate,
                    'ifc_type': el.ifc_type
                })
            
            # Format materials with cost/carbon data
            enhanced_materials = []
            for q in project_data.material_quantities:
                enhanced_materials.append({
                    'material_type': q.material_type,
                    'category': q.category,
                    'quantity': q.quantity,
                    'unit': q.unit,
                    'wastage_factor': q.wastage_factor,
                    'total_quantity': q.total_quantity_with_wastage,
                    'unit_cost': q.unit_cost,
                    'total_cost': q.total_cost,
                    'embodied_carbon_per_unit': q.unit_carbon,
                    'total_carbon': q.total_carbon,
                    'matched_material_id': q.matched_material_id,
                    'matched_material_name': q.matched_material_name
                })
            
            # Generate BoQ data for integration
            boq_data = parser.export_to_boq(project_data)
            
            # Generate project context data
            project_context_data = parser.export_to_project_context(project_data)
            
            response = {
                "success": True,
                "filename": file.filename,
                "parsed_elements": parsed_elements,
                "element_count": len(project_data.elements),
                "stories": project_data.stories,
                "materials": enhanced_materials,
                "quantities": {
                    q.material_type: {
                        'quantity': q.quantity,
                        'unit': q.unit,
                        'total_with_wastage': q.total_quantity_with_wastage,
                        'total_cost': q.total_cost,
                        'total_carbon': q.total_carbon
                    }
                    for q in project_data.material_quantities
                },
                "totals": {
                    "volume_m3": round(project_data.total_volume, 2),
                    "cost_inr": round(project_data.total_cost, 2),
                    "carbon_kg": round(project_data.total_carbon, 2)
                },
                "element_breakdown": project_data.element_breakdown,
                "boq_export": boq_data,
                "project_context": project_context_data,
                "export_timestamp": project_data.export_timestamp
            }
            
            print(f"[BIM API] Successfully processed BIM file")
            return response
            
        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
                
    except ImportError as ie:
        raise HTTPException(
            status_code=503, 
            detail=f"IFC parsing library not available: {str(ie)}. Please install ifcopenshell."
        )
    except Exception as e:
        import traceback
        print(f"[ERROR] BIM parsing failed: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

# ==================== MATERIAL RATES API ====================

@app.get("/api/material-rates")
async def get_material_rates(
    category: Optional[str] = Query(None, description="Filter by material category"),
):
    """Fetch current material rates from database for BoQ calculations (public)"""
    try:
        materials_collection = get_materials_collection()
        if materials_collection is None:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Build query
        query: Dict[str, Any] = {"category": category.lower()} if category else {}
        
        # Add is_active filter - materials without is_active field are also valid
        query["is_active"] = {"$ne": False}
        
        # Fetch materials with their rates
        materials = list(materials_collection.find(query).limit(100))
        
        # Format rates for BoQ calculator
        rates = {}
        for mat in materials:
            cat = mat.get('category', 'other')
            financial = mat.get('financial_properties', {})
            civil = mat.get('civil_properties', {})
            
            if cat not in rates:
                rates[cat] = {}
            
            # Create rate entry
            rate_key = mat.get('name', '').lower().replace(' ', '_').replace('-', '_')
            supplier_info = mat.get('supplier', {})
            rates[cat][rate_key] = {
                'id': str(mat.get('_id')),
                'name': mat.get('name'),
                'rate': financial.get('cost_per_unit', 0),
                'unit': financial.get('unit_type', 'piece'),
                'wastage': (civil.get('wastage_percentage', 5) / 100),
                'embodied_carbon': mat.get('environmental_properties', {}).get('embodied_carbon', 0),
                'supplier': supplier_info.get('supplier_name', 'Unknown'),
                'supplier_location': supplier_info.get('supplier_location', 'Local'),
                'lead_time_days': supplier_info.get('lead_time_days', 1),
                'transportation_cost': financial.get('transportation_cost', 0),
                'gst_rate': financial.get('gst_rate', 18),
                'reliability_rating': supplier_info.get('reliability_rating', 8)
            }
        
        return {
            "rates": rates,
            "total_materials": len(materials),
            "last_updated": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== COST TRACKING ROUTES ====================

@app.post("/api/cost-tracking/init")
async def init_cost_tracking(
    data: dict,
    current_user: User = Depends(get_current_user)
):
    """Initialize cost tracking for a project"""
    try:
        project_id = data.get('project_id')
        total_budget = data.get('total_budget', 0)
        
        if not project_id:
            raise HTTPException(status_code=400, detail="project_id is required")
        
        collection = get_cost_tracking_collection()
        if collection is None:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Check if already exists
        existing = collection.find_one({"project_id": project_id, "user_id": current_user.id})
        if existing:
            return {"message": "Cost tracking already initialized", "id": str(existing["_id"])}
        
        # Initialize tracker
        tracker = CostTracker(project_id, total_budget)
        
        # Convert to dict for MongoDB
        tracker_dict = {
            "_id": ObjectId(),
            "project_id": project_id,
            "user_id": current_user.id,
            "total_budget": tracker.total_budget,
            "milestones": tracker.get_milestone_summary(),
            "actual_costs": [],
            "contingency_percentage": tracker.contingency_percentage,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        collection.insert_one(tracker_dict)
        
        return {
            "id": str(tracker_dict["_id"]),
            "project_id": project_id,
            "total_budget": total_budget,
            "milestones": tracker.get_milestone_summary(),
            "message": "Cost tracking initialized successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/cost-tracking/{project_id}")
async def get_cost_tracking(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get cost tracking data for a project"""
    try:
        collection = get_cost_tracking_collection()
        if collection is None:
            raise HTTPException(status_code=503, detail="Database not available")
        
        data = collection.find_one({
            "project_id": project_id,
            "user_id": current_user.id
        })
        
        if not data:
            raise HTTPException(status_code=404, detail="Cost tracking not found")
        
        return {
            "id": str(data["_id"]),
            "project_id": data["project_id"],
            "total_budget": data["total_budget"],
            "milestones": data.get("milestones", []),
            "actual_costs": data.get("actual_costs", []),
            "budget_health": data.get("budget_health", {}),
            "contingency_percentage": data.get("contingency_percentage", 5.0),
            "updated_at": data.get("updated_at")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/cost-tracking/payment")
async def record_payment(
    data: dict,
    current_user: User = Depends(get_current_user)
):
    """Record a payment for a milestone"""
    try:
        project_id = data.get('project_id')
        milestone_id = data.get('milestone_id')
        amount = data.get('amount', 0)
        payment_date = data.get('payment_date')
        payment_method = data.get('payment_method', 'Bank Transfer')
        reference = data.get('reference', '')
        notes = data.get('notes', '')
        
        collection = get_cost_tracking_collection()
        if collection is None:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Find project
        project = collection.find_one({
            "project_id": project_id,
            "user_id": current_user.id
        })
        
        if not project:
            raise HTTPException(status_code=404, detail="Cost tracking not found")
        
        # Add payment to milestone
        payment = {
            "id": f"PAY-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            "amount": amount,
            "date": payment_date,
            "method": payment_method,
            "reference": reference,
            "notes": notes
        }
        
        # Update milestone
        milestones = project.get('milestones', [])
        for ms in milestones:
            if ms.get('id') == milestone_id:
                if 'payments_received' not in ms:
                    ms['payments_received'] = []
                ms['payments_received'].append(payment)
                
                # Update status
                total_paid = sum(p['amount'] for p in ms['payments_received'])
                if total_paid >= ms.get('actual', 0):
                    ms['status'] = 'paid'
                elif total_paid > 0:
                    ms['status'] = 'partial'
                break
        
        collection.update_one(
            {"_id": project["_id"]},
            {"$set": {
                "milestones": milestones,
                "updated_at": datetime.utcnow()
            }}
        )
        
        return {"message": "Payment recorded successfully", "payment": payment}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/cost-tracking/actual-cost")
async def add_actual_cost(
    data: dict,
    current_user: User = Depends(get_current_user)
):
    """Add an actual cost entry"""
    try:
        project_id = data.get('project_id')
        
        collection = get_cost_tracking_collection()
        if collection is None:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Find project
        project = collection.find_one({
            "project_id": project_id,
            "user_id": current_user.id
        })
        
        if not project:
            raise HTTPException(status_code=404, detail="Cost tracking not found")
        
        # Create cost entry
        cost_entry = {
            "id": f"COST-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            "date": data.get('date'),
            "category": data.get('category'),
            "description": data.get('description'),
            "vendor": data.get('vendor'),
            "invoice_number": data.get('invoice_number'),
            "estimated_cost": data.get('estimated_cost', 0),
            "actual_cost": data.get('actual_cost', 0),
            "quantity": data.get('quantity', 0),
            "unit": data.get('unit'),
            "notes": data.get('notes', ''),
            "created_at": datetime.utcnow()
        }
        
        collection.update_one(
            {"_id": project["_id"]},
            {
                "$push": {"actual_costs": cost_entry},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        return {"message": "Cost added successfully", "cost": cost_entry}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== QC CHECKLISTS ROUTES ====================

@app.post("/api/qc-checklists/init")
async def init_qc_checklists(
    data: dict,
    current_user: User = Depends(get_current_user)
):
    """Initialize QC checklists for a project"""
    try:
        project_id = data.get('project_id')
        
        if not project_id:
            raise HTTPException(status_code=400, detail="project_id is required")
        
        collection = get_qc_checklists_collection()
        if collection is None:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Check if already exists
        existing = collection.find_one({"project_id": project_id, "user_id": current_user.id})
        if existing:
            return {"message": "QC checklists already initialized", "id": str(existing["_id"])}
        
        # Initialize QC manager
        qc_manager = QCChecklistManager(project_id)
        
        # Convert to dict for MongoDB
        checklists_data = []
        for cl in qc_manager.checklists:
            items_data = []
            for item in cl.items:
                items_data.append({
                    "id": item.id,
                    "description": item.description,
                    "is_code_reference": item.is_code_reference,
                    "acceptance_criteria": item.acceptance_criteria,
                    "status": item.status.value,
                    "notes": item.notes,
                    "photos": [],
                    "checked_by": item.checked_by,
                    "checked_date": item.checked_date,
                    "severity": item.severity.value
                })
            
            checklists_data.append({
                "id": cl.id,
                "stage": cl.stage.value,
                "title": cl.title,
                "is_code": cl.is_code,
                "items": items_data,
                "non_conformances": [],
                "inspector_name": cl.inspector_name,
                "inspection_date": cl.inspection_date,
                "weather_conditions": cl.weather_conditions,
                "approved_by": cl.approved_by,
                "approval_date": cl.approval_date,
                "overall_status": cl.overall_status.value
            })
        
        qc_dict = {
            "_id": ObjectId(),
            "project_id": project_id,
            "user_id": current_user.id,
            "checklists": checklists_data,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        collection.insert_one(qc_dict)
        
        return {
            "id": str(qc_dict["_id"]),
            "project_id": project_id,
            "checklists": checklists_data,
            "message": "QC checklists initialized successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/qc-checklists/{project_id}")
async def get_qc_checklists(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get QC checklists for a project"""
    try:
        collection = get_qc_checklists_collection()
        if collection is None:
            raise HTTPException(status_code=503, detail="Database not available")
        
        data = collection.find_one({
            "project_id": project_id,
            "user_id": current_user.id
        })
        
        if not data:
            raise HTTPException(status_code=404, detail="QC checklists not found")
        
        return {
            "id": str(data["_id"]),
            "project_id": data["project_id"],
            "checklists": data.get("checklists", []),
            "summary": data.get("summary", {}),
            "updated_at": data.get("updated_at")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/qc-checklists/update-item")
async def update_qc_item(
    data: dict,
    current_user: User = Depends(get_current_user)
):
    """Update QC checklist item status"""
    try:
        project_id = data.get('project_id')
        checklist_id = data.get('checklist_id')
        item_id = data.get('item_id')
        status_val = data.get('status')
        notes = data.get('notes', '')
        checked_by = data.get('checked_by', current_user.full_name)
        
        collection = get_qc_checklists_collection()
        if collection is None:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Find project
        project = collection.find_one({
            "project_id": project_id,
            "user_id": current_user.id
        })
        
        if not project:
            raise HTTPException(status_code=404, detail="QC checklists not found")
        
        # Update item
        checklists = project.get('checklists', [])
        for cl in checklists:
            if cl.get('id') == checklist_id:
                for item in cl.get('items', []):
                    if item.get('id') == item_id:
                        item['status'] = status_val
                        item['notes'] = notes
                        item['checked_by'] = checked_by
                        item['checked_date'] = datetime.utcnow().isoformat()
                        break
                
                # Update overall checklist status
                statuses = [i['status'] for i in cl.get('items', [])]
                if all(s == 'passed' for s in statuses):
                    cl['overall_status'] = 'passed'
                elif any(s == 'failed' for s in statuses):
                    cl['overall_status'] = 'failed'
                elif any(s == 'in_progress' for s in statuses):
                    cl['overall_status'] = 'in_progress'
                elif any(s == 'rework_required' for s in statuses):
                    cl['overall_status'] = 'rework_required'
                break
        
        collection.update_one(
            {"_id": project["_id"]},
            {"$set": {
                "checklists": checklists,
                "updated_at": datetime.utcnow()
            }}
        )
        
        return {"message": "QC item updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/qc-checklists/add-photo")
async def add_qc_photo(
    data: dict,
    current_user: User = Depends(get_current_user)
):
    """Add photo to QC checklist item"""
    try:
        project_id = data.get('project_id')
        checklist_id = data.get('checklist_id')
        item_id = data.get('item_id')
        photo_url = data.get('photo_url')
        caption = data.get('caption', '')
        taken_by = data.get('taken_by', current_user.full_name)
        location = data.get('location', '')
        
        collection = get_qc_checklists_collection()
        if collection is None:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Find project
        project = collection.find_one({
            "project_id": project_id,
            "user_id": current_user.id
        })
        
        if not project:
            raise HTTPException(status_code=404, detail="QC checklists not found")
        
        # Create photo entry
        photo = {
            "id": f"IMG-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            "url": photo_url,
            "caption": caption,
            "taken_by": taken_by,
            "timestamp": datetime.utcnow().isoformat(),
            "location": location
        }
        
        # Add to item
        checklists = project.get('checklists', [])
        for cl in checklists:
            if cl.get('id') == checklist_id:
                for item in cl.get('items', []):
                    if item.get('id') == item_id:
                        if 'photos' not in item:
                            item['photos'] = []
                        item['photos'].append(photo)
                        break
                break
        
        collection.update_one(
            {"_id": project["_id"]},
            {"$set": {
                "checklists": checklists,
                "updated_at": datetime.utcnow()
            }}
        )
        
        return {"message": "Photo added successfully", "photo": photo}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/qc-checklists/non-conformance")
async def create_non_conformance(
    data: dict,
    current_user: User = Depends(get_current_user)
):
    """Create non-conformance report"""
    try:
        project_id = data.get('project_id')
        checklist_id = data.get('checklist_id')
        item_id = data.get('item_id')
        description = data.get('description')
        severity = data.get('severity', 'minor')
        corrective_action = data.get('corrective_action', '')
        
        collection = get_qc_checklists_collection()
        if collection is None:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Find project
        project = collection.find_one({
            "project_id": project_id,
            "user_id": current_user.id
        })
        
        if not project:
            raise HTTPException(status_code=404, detail="QC checklists not found")
        
        # Create NC entry
        nc = {
            "id": f"NC-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}",
            "item_id": item_id,
            "description": description,
            "severity": severity,
            "photos": [],
            "corrective_action": corrective_action,
            "preventive_action": "",
            "responsible_party": "",
            "target_date": None,
            "closure_date": None,
            "status": "open",
            "created_at": datetime.utcnow()
        }
        
        # Add to checklist and update item status
        checklists = project.get('checklists', [])
        for cl in checklists:
            if cl.get('id') == checklist_id:
                if 'non_conformances' not in cl:
                    cl['non_conformances'] = []
                cl['non_conformances'].append(nc)
                
                # Update item status
                for item in cl.get('items', []):
                    if item.get('id') == item_id:
                        item['status'] = 'failed'
                        break
                
                # Update overall status
                cl['overall_status'] = 'failed'
                break
        
        collection.update_one(
            {"_id": project["_id"]},
            {"$set": {
                "checklists": checklists,
                "updated_at": datetime.utcnow()
            }}
        )
        
        return {"message": "Non-conformance created successfully", "nc": nc}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== STRUCTURAL ENGINEERING ROUTES ====================

@app.post("/api/structural/loads")
async def calculate_structural_loads(
    data: dict,
    current_user: User = Depends(get_current_user)
):
    """Calculate building loads as per IS 875"""
    try:
        num_floors = data.get('num_floors', 3)
        floor_area = data.get('floor_area', 180)  # m²
        occupancy = data.get('occupancy', 'residential')
        floor_finish = data.get('floor_finish', 'tiled_18mm')
        partition = data.get('partition_type', 'brick_150mm')
        
        result = calculate_building_loads(
            num_floors=num_floors,
            floor_area=floor_area,
            occupancy=occupancy,
            floor_finish=floor_finish,
            partition_type=partition
        )
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/structural/seismic")
async def calculate_seismic_load(
    data: dict,
    current_user: User = Depends(get_current_user)
):
    """Calculate seismic loads as per IS 1893:2016"""
    try:
        num_floors = data.get('num_floors', 3)
        floor_area = data.get('floor_area', 180)
        floor_load = data.get('floor_load_kNm2', 8.0)
        floor_height = data.get('floor_height_m', 3.0)
        zone = data.get('zone', 'III')
        occupancy = data.get('occupancy', 'residential')
        structural_system = data.get('structural_system', 'special_rc_frame')
        soil_type = data.get('soil_type', 'medium')
        
        result = calculate_seismic(
            num_floors=num_floors,
            floor_area=floor_area,
            floor_load_kNm2=floor_load,
            floor_height=floor_height,
            zone=zone,
            occupancy=occupancy,
            structural_system=structural_system,
            soil_type=soil_type
        )
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/structural/wind")
async def calculate_wind_loads(
    data: dict,
    current_user: User = Depends(get_current_user)
):
    """Calculate wind loads as per IS 875 Part 3"""
    try:
        city = data.get('city', 'thrissur')
        building_height = data.get('building_height', 10)
        floor_area = data.get('floor_area', 180)
        num_floors = data.get('num_floors', 3)
        terrain = data.get('terrain', 'category_2')
        
        result = calculate_wind_load(
            city=city,
            building_height=building_height,
            floor_area=floor_area,
            num_floors=num_floors,
            terrain=terrain
        )
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/structural/design")
async def design_structural_element(
    data: dict,
    current_user: User = Depends(get_current_user)
):
    """Design structural member (slab, beam, column, foundation)"""
    try:
        member_type = data.get('member_type', 'slab_one_way')
        
        result = design_structural_member(
            member_type=member_type,
            span=data.get('span'),
            short_span=data.get('short_span'),
            long_span=data.get('long_span'),
            thickness=data.get('thickness', 150),
            breadth=data.get('breadth', 300),
            depth=data.get('depth', 450),
            height=data.get('height', 3),
            column_load=data.get('column_load', 800),
            column_breadth=data.get('column_breadth', 300),
            column_depth=data.get('column_depth', 300),
            axial_load=data.get('axial_load', 800),
            moment=data.get('moment', 20),
            shear=data.get('shear', 50),
            live_load=data.get('live_load', 2.0),
            finish_load=data.get('finish_load', 0.5),
            concrete=data.get('concrete_grade', 'M20'),
            steel=data.get('steel_grade', 'Fe415'),
            soil_pressure=data.get('soil_pressure', 100)
        )
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/structural/full-analysis")
async def full_structural_analysis(
    data: dict,
    current_user: User = Depends(get_current_user)
):
    """Complete structural analysis and design"""
    try:
        # Building parameters
        num_floors = data.get('num_floors', 3)
        floor_area = data.get('floor_area', 180)
        floor_height = data.get('floor_height_m', 3.0)
        occupancy = data.get('occupancy', 'residential')
        city = data.get('city', 'thrissur')
        
        # Get seismic zone from lat/lon if provided
        lat = data.get('lat', 10.5)
        lon = data.get('lon', 76.2)
        
        # Calculate loads
        loads = calculate_building_loads(
            num_floors=num_floors,
            floor_area=floor_area,
            occupancy=occupancy
        )
        
        # Calculate seismic
        seismic = calculate_seismic(
            num_floors=num_floors,
            floor_area=floor_area,
            floor_load_kNm2=loads['summary']['total_dead_load_kn'] / num_floors / floor_area,
            floor_height=floor_height,
            zone='III'  # Kerala is mostly Zone III
        )
        
        # Calculate wind
        wind = calculate_wind_load(
            city=city,
            building_height=num_floors * floor_height,
            floor_area=floor_area,
            num_floors=num_floors
        )
        
        return {
            "building_parameters": {
                "num_floors": num_floors,
                "floor_area_m2": floor_area,
                "total_height_m": num_floors * floor_height,
                "occupancy": occupancy
            },
            "loads": loads,
            "seismic": seismic,
            "wind": wind,
            "summary": {
                "total_dead_load_kn": loads['summary']['total_dead_load_kn'],
                "total_live_load_kn": loads['summary']['total_live_load_kn'],
                "max_seismic_base_shear_kn": seismic['results']['base_shear_Vb_kn'],
                "max_wind_force_kn": wind['results']['max_wind_force_kn'],
                "controlling_load": "SEISMIC" if seismic['results']['base_shear_Vb_kn'] > wind['results']['max_wind_force_kn'] else "WIND"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/is-codes")
async def get_is_codes(
    current_user: User = Depends(get_current_user)
):
    """Get IS code references for structural design"""
    try:
        is_codes = ISCodeReferences()
        return {
            "seismic_zones": {
                "II": {"factor": 0.10, "description": "Low damage risk"},
                "III": {"factor": 0.16, "description": "Moderate damage risk"},
                "IV": {"factor": 0.24, "description": "High damage risk"},
                "V": {"factor": 0.36, "description": "Very high damage risk"}
            },
            "concrete_grades": list(is_codes.CONCRETE_GRADES.keys()),
            "steel_grades": list(is_codes.STEEL_GRADES.keys()),
            "live_loads": is_codes.LIVE_LOADS,
            "floor_finishes": is_codes.FLOOR_FINISHES,
            "unit_weights": is_codes.UNIT_WEIGHTS
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/citations")
async def get_citations(
    code: str = Query(None, description="Filter by code (e.g., is_875, is_1893, green_building, lca, ahp)"),
    category: str = Query(None, description="Filter by category (structural, green_building, environmental, materials, bim, cost, quality)")
):
    """
    Get academic citations for EcoBuild modules.
    Returns IEEE format references with DOIs where available.
    Categories: structural, green_building, environmental, materials, bim, cost, quality
    """
    try:
        if code:
            citations_data = get_citations_by_code(code)
            if not citations_data:
                raise HTTPException(
                    status_code=404, 
                    detail=f"Citations not found for code: {code}"
                )
            return {
                "success": True,
                "code": citations_data["code"],
                "title": citations_data["title"],
                "references": citations_data["references"]
            }
        
        if category:
            citations_data = get_citations_by_category(category)
            if not citations_data:
                raise HTTPException(
                    status_code=404,
                    detail=f"Category not found: {category}"
                )
            return {
                "success": True,
                "category": category,
                "citations": citations_data
            }
        
        return {
            "success": True,
            "categories": get_categories(),
            "bibliography": get_bibliography(),
            "all_citations": get_all_citations()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/citations/bibliography")
async def get_bibliography():
    """Get formatted bibliography for all IS codes"""
    try:
        return {
            "success": True,
            "bibliography": get_bibliography()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

"""
Protected Engineering Routes for EcoBuild
All routes require JWT authentication
"""

from fastapi import HTTPException, UploadFile, File, Depends, status, Query
from typing import List, Dict, Optional
from datetime import datetime
import json
from bson.objectid import ObjectId

# Import from main.py (using __main__ reference since this is imported by main)
from __main__ import app, get_current_user
from database import get_cost_tracking_collection, get_qc_checklists_collection
from auth import User

# Import engineering modules
from ahp_engine import AHPEngine, OptimizationMode, Material
from kerala_environmental_engine import KeralaEnvironmentalEngine
from bim_parser import BIMParser
from eco_mix_designer import EcoMixDesigner, ConcreteGrade, ExposureCondition
from kmbr_automator import KeralaBuildingRulesAutomator, BuildingParameters, ZoneType, BuildingType
from cost_tracker import CostTracker, ActualCost, PaymentMilestone, MilestoneType, PaymentStatus
from qc_checklists import QCChecklistManager, QCStage, QCStatus, QCPhoto, Severity

# ==================== MATERIAL OPTIMIZATION ROUTES ====================

@app.post("/api/optimize")
async def optimize_materials(
    data: dict,
    current_user: User = Depends(get_current_user)
):
    """Optimize material selection based on sustainability/luxury/balanced mode"""
    try:
        mode_str = data.get('mode', 'balanced')
        mode = OptimizationMode(mode_str)
        materials_data = data.get('required_materials', [])
        lat = data.get('site_lat', 10.5276)
        lon = data.get('site_lon', 76.2144)
        
        engine = AHPEngine(mode=mode)
        
        # Convert material data to Material objects
        materials = []
        for mat_data in materials_data:
            mat = Material(
                id=mat_data.get('id', ''),
                name=mat_data.get('name', ''),
                category=mat_data.get('category', ''),
                embodied_carbon=mat_data.get('embodied_carbon', 0),
                recycled_content=mat_data.get('recycled_content', 0),
                cost_per_unit=mat_data.get('cost_per_unit', 0),
                thermal_conductivity=mat_data.get('thermal_conductivity', 0),
                durability_years=mat_data.get('durability_years', 50),
                aesthetic_rating=mat_data.get('aesthetic_rating', 5),
                compressive_strength=mat_data.get('compressive_strength', 0),
                supplier_id=mat_data.get('supplier_id', '')
            )
            materials.append(mat)
        
        # Run optimization
        results = engine.optimize_materials(materials, lat, lon)
        
        return {
            "mode": mode_str,
            "optimized_materials": results,
            "recommendations": engine.generate_recommendations(results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/materials/categories")
async def get_material_categories(current_user: User = Depends(get_current_user)):
    """Get available material categories"""
    categories = [
        {"id": "cement", "name": "Cement & Binders"},
        {"id": "aggregate", "name": "Aggregates"},
        {"id": "steel", "name": "Steel & Reinforcement"},
        {"id": "blocks", "name": "Blocks & Bricks"},
        {"id": "sand", "name": "Sand"},
        {"id": "tiles", "name": "Tiles"},
        {"id": "paint", "name": "Paint & Finishes"},
        {"id": "electrical", "name": "Electrical"},
        {"id": "plumbing", "name": "Plumbing"},
        {"id": "wood", "name": "Wood & Laminates"}
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
        engine = AHPEngine(mode=OptimizationMode.BALANCED)
        suppliers = engine.get_nearby_suppliers(lat, lon, radius_km)
        return {"suppliers": suppliers}
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
        
        engine = KeralaEnvironmentalEngine()
        climate_data = engine.get_climate_data(lat, lon)
        rainfall_data = engine.get_rainfall_data(lat, lon)
        seismic_data = engine.get_seismic_zone(lat, lon)
        wind_data = engine.get_wind_data(lat, lon)
        
        return {
            "climate": climate_data,
            "rainfall": rainfall_data,
            "seismic": seismic_data,
            "wind": wind_data,
            "recommendations": engine.generate_recommendations(lat, lon)
        }
    except Exception as e:
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
        
        engine = KeralaEnvironmentalEngine()
        result = engine.calculate_operational_carbon(
            building_area, wall_u_value, roof_u_value, lat, lon
        )
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== MIX DESIGN ROUTES ====================

@app.post("/api/mix-design")
async def design_mix(
    data: dict,
    current_user: User = Depends(get_current_user)
):
    """Design sustainable concrete mix"""
    try:
        grade = ConcreteGrade(data.get('grade', 'M25'))
        exposure = ExposureCondition(data.get('exposure', 'moderate'))
        slump = data.get('slump', 100)
        fly_ash = data.get('fly_ash_percent', 25)
        recycled = data.get('recycled_aggregate_percent', 20)
        
        designer = EcoMixDesigner()
        mix = designer.design_mix(grade, exposure, slump, fly_ash, recycled)
        
        return {
            "grade": mix.grade,
            "target_strength": mix.target_strength_mpa,
            "water_cement_ratio": mix.water_cement_ratio,
            "water_content": mix.water_content_l_m3,
            "cement_content": mix.cement_content_kg_m3,
            "fly_ash_content": mix.fly_ash_content_kg_m3,
            "fine_aggregate": mix.fine_aggregate_kg_m3,
            "coarse_aggregate": mix.coarse_aggregate_kg_m3,
            "recycled_aggregate": mix.recycled_aggregate_kg_m3,
            "admixture_percent": mix.admixture_percent,
            "slump": mix.slump_mm,
            "embodied_carbon": mix.embodied_carbon_kg_m3,
            "recycled_content_percent": mix.recycled_content_percent,
            "cost_per_m3": mix.estimated_cost_per_m3
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== COMPLIANCE CHECK ROUTES ====================

@app.post("/api/compliance-check")
async def check_compliance(
    data: dict,
    current_user: User = Depends(get_current_user)
):
    """Check Kerala Building Rules compliance"""
    try:
        params = BuildingParameters(
            plot_area_sqm=data.get('plot_area_sqm', 200),
            building_footprint_sqm=data.get('building_footprint_sqm', 120),
            total_built_up_area_sqm=data.get('total_built_up_area_sqm', 300),
            num_floors=data.get('num_floors', 2),
            building_height_m=data.get('building_height_m', 7),
            road_width_m=data.get('road_width_m', 6),
            zone_type=ZoneType(data.get('zone_type', 'residential')),
            building_type=BuildingType(data.get('building_type', 'residential_individual')),
            front_setback_m=data.get('front_setback_m', 3),
            rear_setback_m=data.get('rear_setback_m', 2),
            side1_setback_m=data.get('side1_setback_m', 1.5),
            side2_setback_m=data.get('side2_setback_m', 1.5),
            num_parking_spaces=data.get('num_parking_spaces', 2),
            has_rainwater_harvesting=data.get('has_rainwater_harvesting', True),
            has_solar_water_heater=data.get('has_solar_water_heater', True),
            has_sewage_treatment=data.get('has_sewage_treatment', False),
            num_units=data.get('num_units', 1)
        )
        
        automator = KeralaBuildingRulesAutomator()
        results = automator.check_compliance(params)
        
        return {
            "compliance_results": results,
            "summary": automator.get_compliance_summary(results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== BIM PARSING ROUTES ====================

@app.post("/api/bim/parse")
async def parse_bim(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Parse BIM/IFC file and extract material quantities"""
    try:
        # Save uploaded file temporarily
        content = await file.read()
        
        # Parse BIM
        parser = BIMParser()
        materials = parser.extract_materials_from_ifc(content)
        quantities = parser.calculate_quantities(materials)
        
        return {
            "filename": file.filename,
            "materials": materials,
            "quantities": quantities,
            "recommendations": parser.generate_recommendations(quantities)
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
        
        # Recalculate budget health
        tracker = CostTracker(project_id, data['total_budget'])
        tracker.milestones = []
        for ms_data in data.get('milestones', []):
            # Reconstruct milestone objects
            pass
        
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
        status = data.get('status')
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
                        item['status'] = status
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

# EcoBuild System - Backend Core
# Multi-Criteria Decision Making Engine with AHP
# Uses MongoDB materials database

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
import json
from scipy.spatial import distance

class OptimizationMode(Enum):
    SUSTAINABILITY = "sustainability"
    LUXURY = "luxury"
    BALANCED = "balanced"

@dataclass
class Material:
    id: str
    name: str
    category: str
    embodied_carbon: float  # kg CO2/kg
    recycled_content: float  # percentage
    cost_per_unit: float  # INR
    thermal_conductivity: float  # W/m·K
    durability_years: int
    aesthetic_rating: float  # 1-10
    compressive_strength: float  # MPa
    supplier_id: str
    
@dataclass
class Supplier:
    id: str
    name: str
    lat: float
    lon: float
    materials: List[str]
    carbon_per_km: float = 0.12  # kg CO2/km

class AHPEngine:
    """Analytical Hierarchy Process for Multi-Criteria Optimization"""
    
    def __init__(self, mode: OptimizationMode):
        self.mode = mode
        self.criteria_weights = self._set_weights()
        self._materials_db = None
        self._suppliers_db = None
        
    def _set_weights(self) -> Dict[str, float]:
        """Configure criteria weights based on optimization mode (includes IS code compliance)"""
        if self.mode == OptimizationMode.SUSTAINABILITY:
            return {
                'embodied_carbon': 0.30,
                'recycled_content': 0.15,
                'cost': 0.10,
                'durability': 0.15,
                'thermal_performance': 0.10,
                'aesthetics': 0.05,
                'is_code_compliance': 0.15
            }
        elif self.mode == OptimizationMode.LUXURY:
            return {
                'embodied_carbon': 0.10,
                'recycled_content': 0.05,
                'cost': 0.10,
                'durability': 0.25,
                'thermal_performance': 0.10,
                'aesthetics': 0.20,
                'is_code_compliance': 0.20
            }
        else:  # BALANCED
            return {
                'embodied_carbon': 0.15,
                'recycled_content': 0.10,
                'cost': 0.20,
                'durability': 0.15,
                'thermal_performance': 0.10,
                'aesthetics': 0.10,
                'is_code_compliance': 0.20
            }
    
    def _load_materials(self) -> Dict[str, Material]:
        """Load materials from MongoDB database"""
        try:
            from database import get_materials_collection
            
            collection = get_materials_collection()
            if collection is None:
                print("[AHP Engine] Warning: Database not available, using fallback materials")
                return self._load_fallback_materials()
            
            # Fetch all active materials from MongoDB
            materials_cursor = collection.find({
                "$or": [
                    {"is_active": True},
                    {"is_active": {"$exists": False}}
                ]
            }).limit(100)
            
            materials = {}
            for doc in materials_cursor:
                try:
                    mat_id = str(doc.get('_id', ''))
                    env_props = doc.get('environmental_properties', {}) or {}
                    civil_props = doc.get('civil_properties', {}) or {}
                    financial_props = doc.get('financial_properties', {}) or {}
                    physical_props = doc.get('physical_properties', {}) or {}
                    supplier_info = doc.get('supplier', {}) or {}
                    
                    # Create Material object from MongoDB document
                    material = Material(
                        id=mat_id,
                        name=doc.get('name', 'Unknown Material'),
                        category=doc.get('category', 'other'),
                        embodied_carbon=env_props.get('embodied_carbon', 0) or 0,
                        recycled_content=env_props.get('recycled_content', 0) or 0,
                        cost_per_unit=financial_props.get('cost_per_unit', 0) or 0,
                        thermal_conductivity=physical_props.get('thermal_conductivity', 0) or 0,
                        durability_years=civil_props.get('durability_years', 50) or 50,
                        aesthetic_rating=5,  # Default aesthetic rating
                        compressive_strength=physical_props.get('compressive_strength', 0) or 0,
                        supplier_id=supplier_info.get('supplier_name', 'unknown') or 'unknown'
                    )
                    
                    materials[mat_id] = material
                except Exception as e:
                    print(f"[AHP Engine] Warning: Could not process material {doc.get('name', 'unknown')}: {e}")
                    continue
            
            print(f"[AHP Engine] Loaded {len(materials)} materials from MongoDB")
            
            # If no materials found, use fallback
            if not materials:
                print("[AHP Engine] No materials found in database, using fallback")
                return self._load_fallback_materials()
            
            return materials
            
        except Exception as e:
            print(f"[AHP Engine] Error loading materials from database: {e}")
            return self._load_fallback_materials()
    
    def _load_fallback_materials(self) -> Dict[str, Material]:
        """Fallback hardcoded materials if database is unavailable"""
        print("[AHP Engine] Loading fallback materials")
        return {
            'cement_opc': Material(
                id='cement_opc',
                name='OPC 53 Grade Cement',
                category='cement',
                embodied_carbon=0.95,
                recycled_content=0,
                cost_per_unit=380,
                thermal_conductivity=0.29,
                durability_years=50,
                aesthetic_rating=3,
                compressive_strength=53,
                supplier_id='ktj_steel'
            ),
            'cement_ppc': Material(
                id='cement_ppc',
                name='PPC Fly Ash Cement',
                category='cement',
                embodied_carbon=0.65,
                recycled_content=35,
                cost_per_unit=360,
                thermal_conductivity=0.27,
                durability_years=50,
                aesthetic_rating=4,
                compressive_strength=43,
                supplier_id='sri_vallaba'
            ),
            'steel_tmt': Material(
                id='steel_tmt',
                name='TMT Steel Bars (Fe 500)',
                category='steel',
                embodied_carbon=1.85,
                recycled_content=25,
                cost_per_unit=72,
                thermal_conductivity=50.0,
                durability_years=75,
                aesthetic_rating=5,
                compressive_strength=500,
                supplier_id='ktj_steel'
            ),
            'aac_blocks': Material(
                id='aac_blocks',
                name='AAC Blocks (Autoclaved)',
                category='masonry',
                embodied_carbon=0.25,
                recycled_content=65,
                cost_per_unit=42,
                thermal_conductivity=0.16,
                durability_years=60,
                aesthetic_rating=7,
                compressive_strength=4.5,
                supplier_id='bharathi_blocks'
            ),
            'clay_bricks': Material(
                id='clay_bricks',
                name='Clay Bricks (Kerala)',
                category='masonry',
                embodied_carbon=0.38,
                recycled_content=0,
                cost_per_unit=8.5,
                thermal_conductivity=0.70,
                durability_years=100,
                aesthetic_rating=8,
                compressive_strength=10,
                supplier_id='local_brick_kiln'
            )
        }
    
    def _load_suppliers(self) -> Dict[str, Supplier]:
        """Load suppliers from MongoDB database"""
        try:
            from database import get_materials_collection
            
            collection = get_materials_collection()
            if collection is None:
                return self._load_fallback_suppliers()
            
            # Aggregate unique suppliers from materials
            pipeline = [
                {"$match": {"$or": [{"is_active": True}, {"is_active": {"$exists": False}}]}},
                {"$group": {
                    "_id": "$supplier.supplier_name",
                    "supplier_name": {"$first": "$supplier.supplier_name"},
                    "location": {"$first": "$supplier.supplier_location"},
                    "lat": {"$first": "$supplier.lat"},
                    "lon": {"$first": "$supplier.lon"},
                    "materials": {"$push": "$_id"}
                }},
                {"$limit": 150}
            ]
            
            suppliers_cursor = collection.aggregate(pipeline)
            
            suppliers = {}
            for idx, doc in enumerate(suppliers_cursor):
                try:
                    supplier_id = doc.get('_id') or f'supplier_{idx}'
                    if not supplier_id:
                        continue
                    
                    # Generate random coordinates near Thrissur if not provided
                    lat = doc.get('lat') or (10.4 + np.random.random() * 0.3)
                    lon = doc.get('lon') or (76.1 + np.random.random() * 0.3)
                    
                    supplier = Supplier(
                        id=str(supplier_id).replace(' ', '_').lower(),
                        name=doc.get('supplier_name', f'Supplier {idx}'),
                        lat=float(lat),
                        lon=float(lon),
                        materials=[str(m) for m in doc.get('materials', [])],
                        carbon_per_km=0.10 + np.random.random() * 0.05
                    )
                    
                    suppliers[supplier.id] = supplier
                except Exception as e:
                    print(f"[AHP Engine] Warning: Could not process supplier {doc.get('supplier_name', 'unknown')}: {e}")
                    continue
            
            print(f"[AHP Engine] Loaded {len(suppliers)} suppliers from MongoDB")
            
            if not suppliers:
                return self._load_fallback_suppliers()
            
            return suppliers
            
        except Exception as e:
            print(f"[AHP Engine] Error loading suppliers from database: {e}")
            return self._load_fallback_suppliers()
    
    def _load_fallback_suppliers(self) -> Dict[str, Supplier]:
        """Fallback hardcoded suppliers if database is unavailable"""
        return {
            'ktj_steel': Supplier(
                id='ktj_steel',
                name='KTJ Steel & Cement Dealers',
                lat=10.5167,
                lon=76.2167,
                materials=['steel_tmt', 'cement_opc'],
                carbon_per_km=0.12
            ),
            'sri_vallaba': Supplier(
                id='sri_vallaba',
                name='Sri Vallaba Building Materials',
                lat=10.5270,
                lon=76.2140,
                materials=['cement_ppc'],
                carbon_per_km=0.10
            ),
            'bharathi_blocks': Supplier(
                id='bharathi_blocks',
                name='Bharathi AAC Block Industries',
                lat=10.4890,
                lon=76.2580,
                materials=['aac_blocks'],
                carbon_per_km=0.08
            )
        }
    
    @property
    def materials_db(self) -> Dict[str, Material]:
        """Lazy load materials from database"""
        if self._materials_db is None:
            self._materials_db = self._load_materials()
        return self._materials_db
    
    @property
    def suppliers_db(self) -> Dict[str, Supplier]:
        """Lazy load suppliers from database"""
        if self._suppliers_db is None:
            self._suppliers_db = self._load_suppliers()
        return self._suppliers_db
    
    def normalize_matrix(self, values: np.ndarray, criteria_type: str = 'benefit') -> np.ndarray:
        """Normalize decision matrix using vector normalization"""
        if criteria_type == 'benefit':
            return values / np.sqrt(np.sum(values**2))
        else:  # cost criteria
            return (1 / values) / np.sqrt(np.sum((1 / values)**2))
    
    def calculate_ahp_weights(self, pairwise_matrix: np.ndarray) -> np.ndarray:
        """Calculate weights from pairwise comparison matrix"""
        # Eigenvalue method
        eigenvalues, eigenvectors = np.linalg.eig(pairwise_matrix)
        max_index = np.argmax(eigenvalues.real)
        weights = eigenvectors[:, max_index].real
        return weights / np.sum(weights)
    
    def check_consistency(self, pairwise_matrix: np.ndarray, weights: np.ndarray) -> float:
        """Check consistency ratio (CR) - should be < 0.1"""
        n = len(weights)
        lambda_max = np.sum(np.dot(pairwise_matrix, weights) / weights) / n
        ci = (lambda_max - n) / (n - 1)
        ri = {1: 0, 2: 0, 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45}
        cr = ci / ri.get(n, 1.49)
        return cr
    
    def optimize_materials(self, 
                          required_materials: List[str],
                          site_coords: Tuple[float, float],
                          building_params: Optional[Dict] = None) -> Dict:
        """Run complete AHP optimization with IS code compliance filter"""
        from is_code_filter import ISCodeFilter
        
        results = {}
        is_filter = ISCodeFilter(building_params)
        
        # Ensure materials are loaded
        materials = self.materials_db
        suppliers = self.suppliers_db
        
        print(f"[AHP Engine] Optimizing {len(required_materials)} categories with {len(materials)} materials")
        
        for mat_category in required_materials:
            # Find materials matching the category
            alternatives = [m for m in materials.values() 
                          if m.category.lower() == mat_category.lower() or 
                          mat_category.lower() in m.name.lower()]
            
            if not alternatives:
                print(f"[AHP Engine] No materials found for category: {mat_category}")
                continue
            
            # IS CODE COMPLIANCE FILTER - eliminate non-compliant materials
            compliant_alts = []
            non_compliant_count = 0
            for mat in alternatives:
                mat_dict = {
                    'category': mat.category,
                    'physical_properties': {
                        'compressive_strength': mat.compressive_strength,
                        'tensile_strength': getattr(mat, 'tensile_strength', 0),
                        'yield_strength': 0,
                        'water_absorption': getattr(mat, 'water_absorption', 0),
                    },
                    'environmental_properties': {
                        'embodied_carbon': mat.embodied_carbon,
                        'recycled_content': mat.recycled_content,
                    },
                    'civil_properties': {
                        'durability_years': mat.durability_years,
                        'is_code': getattr(mat, 'is_code', ''),
                    }
                }
                check_results = is_filter.check_material_compliance(mat_dict)
                has_fail = any(r.status.value == 'fail' for r in check_results)
                
                if has_fail:
                    non_compliant_count += 1
                    print(f"[AHP Engine] FILTERED OUT: {mat.name} - IS code non-compliant")
                else:
                    compliant_alts.append(mat)
            
            if non_compliant_count > 0:
                print(f"[AHP Engine] Filtered out {non_compliant_count} non-compliant materials for {mat_category}")
            
            if not compliant_alts:
                print(f"[AHP Engine] WARNING: No compliant materials for {mat_category}, using all")
                compliant_alts = alternatives
            
            alternatives = compliant_alts
            print(f"[AHP Engine] {len(alternatives)} IS-compliant alternatives for {mat_category}")
                
            # Calculate logistics carbon
            logistics_scores = []
            for mat in alternatives:
                supplier = suppliers.get(mat.supplier_id)
                if supplier:
                    dist = distance.euclidean(site_coords, (supplier.lat, supplier.lon))
                    logistics_scores.append(supplier.carbon_per_km * dist)
                else:
                    logistics_scores.append(0)
            
            # Calculate IS code compliance scores
            compliance_scores = []
            for mat in alternatives:
                mat_dict = {
                    'category': mat.category,
                    'physical_properties': {
                        'compressive_strength': mat.compressive_strength,
                        'tensile_strength': getattr(mat, 'tensile_strength', 0),
                        'yield_strength': 0,
                        'water_absorption': getattr(mat, 'water_absorption', 0),
                    },
                    'environmental_properties': {
                        'embodied_carbon': mat.embodied_carbon,
                        'recycled_content': mat.recycled_content,
                    },
                    'civil_properties': {
                        'durability_years': mat.durability_years,
                        'is_code': getattr(mat, 'is_code', ''),
                    }
                }
                score = is_filter.get_compliance_score(mat_dict)
                compliance_scores.append(score)
            
            # Build decision matrix (7 criteria including IS code compliance)
            criteria_values = np.array([
                [m.embodied_carbon for m in alternatives],
                [m.recycled_content for m in alternatives],
                [m.cost_per_unit for m in alternatives],
                [m.durability_years for m in alternatives],
                [m.thermal_conductivity for m in alternatives],
                [m.aesthetic_rating for m in alternatives],
                compliance_scores
            ])
            
            # Normalize
            normalized = np.zeros_like(criteria_values, dtype=float)
            normalized[0] = self.normalize_matrix(criteria_values[0], 'cost')
            normalized[1] = self.normalize_matrix(criteria_values[1], 'benefit')
            normalized[2] = self.normalize_matrix(criteria_values[2], 'cost')
            normalized[3] = self.normalize_matrix(criteria_values[3], 'benefit')
            normalized[4] = self.normalize_matrix(criteria_values[4], 'cost')
            normalized[5] = self.normalize_matrix(criteria_values[5], 'benefit')
            normalized[6] = compliance_scores  # Already 0-1 scale
            
            # Weighted sum (7 criteria)
            weights_array = np.array([
                self.criteria_weights['embodied_carbon'],
                self.criteria_weights['recycled_content'],
                self.criteria_weights['cost'],
                self.criteria_weights['durability'],
                self.criteria_weights['thermal_performance'],
                self.criteria_weights['aesthetics'],
                self.criteria_weights['is_code_compliance']
            ])
            
            scores = np.dot(weights_array, normalized)
            
            # Rank materials
            ranked_indices = np.argsort(scores)[::-1]
            ranked_materials = [
                {
                    'material': alternatives[i],
                    'score': float(scores[i]),
                    'logistics_carbon': float(logistics_scores[i]),
                    'is_code_compliance': float(compliance_scores[i]),
                    'rank': idx + 1
                }
                for idx, i in enumerate(ranked_indices)
            ]
            
            results[mat_category] = ranked_materials
            
        return results
    
    def refresh_data(self):
        """Refresh materials and suppliers from database"""
        self._materials_db = None
        self._suppliers_db = None
        # Force reload on next access
        _ = self.materials_db
        _ = self.suppliers_db
        print("[AHP Engine] Data refreshed from database")

# Initialize the engine
if __name__ == '__main__':
    engine = AHPEngine(OptimizationMode.SUSTAINABILITY)
    results = engine.optimize_materials(['cement', 'masonry'], (10.5200, 76.2200))
    print(json.dumps(results, indent=2, default=str))
"""
IS Codes Reference Database
Indian Standard codes for structural engineering
"""

from enum import Enum
from dataclasses import dataclass
from typing import Dict, List, Optional

class SeismicZone(Enum):
    ZONE_II = "II"
    ZONE_III = "III"
    ZONE_IV = "IV"
    ZONE_V = "V"

class SoilType(Enum):
    ROCKY = "rocky"
    DENSE = "dense"
    MEDIUM = "medium"
    SOFT = "soft"

class OccupancyType(Enum):
    RESIDENTIAL = "residential"
    COMMERCIAL = "commercial"
    INDUSTRIAL = "industrial"
    EDUCATIONAL = "educational"
    HOSPITAL = "hospital"
    PUBLIC_BUILDING = "public"

class StructuralSystem(Enum):
    SPECIAL_RC_FRAME = "special_rc_frame"
    ORDINARY_RC_FRAME = "ordinary_rc_frame"
    DUAL_SYSTEM = "dual_system"
    SHEAR_WALL = "shear_wall"

@dataclass
class ISCode:
    """IS Code reference"""
    code: str
    title: str
    year: str
    clause: Optional[str] = None
    description: str = ""

class ISCodeReferences:
    """Database of IS codes used in structural design"""
    
    # Main structural codes
    IS_456 = ISCode("IS 456:2000", "Plain and Reinforced Concrete - Code of Practice", "2000", 
                    description="Code of practice for plain and reinforced concrete")
    
    IS_1893 = ISCode("IS 1893:2016", "Criteria for Earthquake Resistant Design", "2016",
                     description="Seismic design parameters")
    
    IS_875_PT1 = ISCode("IS 875 Part 1:1987", "Dead Loads", "1987",
                        description="Unit weights of building materials")
    
    IS_875_PT2 = ISCode("IS 875 Part 2:1987", "Imposed Loads", "1987",
                        description="Live loads on floors")
    
    IS_875_PT3 = ISCode("IS 875 Part 3:2015", "Wind Loads", "2015",
                        description="Wind loads on buildings")
    
    IS_875_PT5 = ISCode("IS 875 Part 5:1987", "Load Combinations", "1987",
                        description="Load combinations for design")
    
    IS_13920 = ISCode("IS 13920:2016", "Ductile Detailing", "2016",
                      description="Ductile detailing of RCC structures")
    
    # Seismic zone factors (IS 1893 Table 3)
    SEISMIC_ZONE_FACTORS = {
        SeismicZone.ZONE_II: 0.10,
        SeismicZone.ZONE_III: 0.16,
        SeismicZone.ZONE_IV: 0.24,
        SeismicZone.ZONE_V: 0.36,
    }
    
    # Importance factors (IS 1893 Table 6)
    IMPORTANCE_FACTORS = {
        OccupancyType.RESIDENTIAL: 1.0,
        OccupancyType.COMMERCIAL: 1.2,
        OccupancyType.INDUSTRIAL: 1.0,
        OccupancyType.EDUCATIONAL: 1.5,
        OccupancyType.HOSPITAL: 1.5,
        OccupancyType.PUBLIC_BUILDING: 1.2,
    }
    
    # Response reduction factors (IS 1893 Table 7)
    RESPONSE_REDUCTION_FACTORS = {
        StructuralSystem.SPECIAL_RC_FRAME: 5.0,
        StructuralSystem.ORDINARY_RC_FRAME: 3.0,
        StructuralSystem.DUAL_SYSTEM: 4.0,
        StructuralSystem.SHEAR_WALL: 4.0,
    }
    
    # Soil amplification factors (IS 1893 Table 2)
    SOIL_FACTORS = {
        SoilType.ROCKY: 1.0,
        SoilType.DENSE: 1.2,
        SoilType.MEDIUM: 1.5,
        SoilType.SOFT: 2.0,
    }
    
    # Unit weights of materials (IS 875 Part 1, Table 1)
    UNIT_WEIGHTS = {
        "reinforced_concrete": 25.0,  # kN/m³
        "plain_concrete": 24.0,
        "brick_masonry": 19.0,
        "stone_masonry": 26.0,
        "aac_blocks": 5.5,
        "fly_ash_bricks": 12.0,
        "steel": 78.5,  # kN/m³
        "timber": 6.0,
        "glass": 26.0,
        "aluminum": 27.0,
        "sand_dry": 16.0,
        "sand_wet": 19.0,
        "aggregate": 18.0,
        "water": 10.0,
    }
    
    # Floor finish weights (IS 875 Part 1)
    FLOOR_FINISHES = {
        "terrazzo_25mm": 0.60,  # kN/m²
        "tiled_12mm": 0.24,
        "tiled_18mm": 0.36,
        "marble_25mm": 0.65,
        "granite_25mm": 0.70,
        "polished_stone_20mm": 0.55,
        "screed_12mm": 0.22,
        "wood_parquet": 0.15,
        "carpet_10mm": 0.05,
        "pvc_flooring": 0.08,
    }
    
    # Partition wall loads (IS 875 Part 2)
    PARTITION_WALLS = {
        "brick_100mm": 1.90,  # kN/m²
        "brick_150mm": 2.85,
        "brick_200mm": 3.80,
        "aac_100mm": 0.55,
        "aac_150mm": 0.83,
        "aac_200mm": 1.10,
        "hollow_concrete_100mm": 1.00,
        "hollow_concrete_150mm": 1.50,
        "glass_partition": 0.40,
        "plasterboard": 0.25,
    }
    
    # Live loads on floors (IS 875 Part 2, Table 1)
    LIVE_LOADS = {
        "residential": 2.0,  # kN/m²
        "office": 2.5,
        "educational": 3.0,
        "hospital": 2.0,
        "commercial_showroom": 4.0,
        "godown_warehouse": 5.0,
        "assembly_hall": 4.0,
        "staircase": 3.0,
        "corridor": 3.0,
        "balcony": 3.0,
        "kitchen": 2.0,
        "toilet": 2.0,
        "library_reading": 2.0,
        "library_stack": 6.0,
        "roof_accessible": 1.5,
        "roof_inaccessible": 0.75,
    }
    
    # Roof loads
    ROOF_LOADS = {
        "flat_concrete": 2.5,
        "flat_tiled": 3.0,
        "sloped_metal": 0.5,
        "sloped_tiled": 2.0,
        "green_roof": 5.0,
        "solar_panels": 1.0,
    }
    
    # Basic wind speeds by city (IS 875 Part 3, Fig 1)
    WIND_SPEEDS_CITY = {
        # Zone A (47-55 m/s)
        "kolkata": 50,
        "mumbai": 50,
        "chennai": 50,
        # Zone B (39-47 m/s)
        "delhi": 47,
        "bangalore": 45,
        "hyderabad": 45,
        "pune": 45,
        "ahmedabad": 45,
        # Zone C (33-39 m/s)
        "thrissur": 39,
        "kochi": 39,
        "trivandrum": 39,
        "coimbatore": 39,
        "jaipur": 39,
        "lucknow": 39,
        "chandigarh": 39,
        # Zone D (<33 m/s)
        "shimla": 30,
        "srinagar": 30,
        "dehradun": 33,
    }
    
    # Risk coefficients (IS 875 Part 3, Table 1)
    RISK_COEFFICIENTS = {
        "ordinary": 1.0,
        "studio": 1.0,
        "temporary": 0.87,
    }
    
    # Terrain categories (IS 875 Part 3, Table 2)
    TERRAIN_CATEGORIES = {
        "category_1": {"description": "Sea coast", "height_limit": 10, "k2_factor": 1.05},
        "category_2": {"description": "Open terrain", "height_limit": 10, "k2_factor": 1.00},
        "category_3": {"description": "Urban/suburban", "height_limit": 10, "k2_factor": 0.91},
        "category_4": {"description": "City center", "height_limit": 10, "k2_factor": 0.80},
    }
    
    # Concrete grades (IS 456 Table 2)
    CONCRETE_GRADES = {
        "M15": {"fck": 15, "fck_cube": 20},
        "M20": {"fck": 20, "fck_cube": 25},
        "M25": {"fck": 25, "fck_cube": 30},
        "M30": {"fck": 30, "fck_cube": 35},
        "M35": {"fck": 35, "fck_cube": 40},
        "M40": {"fck": 40, "fck_cube": 45},
        "M45": {"fck": 45, "fck_cube": 50},
        "M50": {"fck": 50, "fck_cube": 55},
    }
    
    # Steel grades
    STEEL_GRADES = {
        "Fe250": {"fy": 250, "fu": 410, "type": "mild"},
        "Fe415": {"fy": 415, "fu": 485, "type": " HYSD"},
        "Fe500": {"fy": 500, "fu": 545, "type": "TMT"},
        "Fe550": {"fy": 550, "fu": 585, "type": "TMT"},
    }
    
    # Allowable stress in concrete (IS 456 Table 21)
    ALLOWABLE_STRESS_CONCRETE = {
        "M15": {"flexure": 3.1, "direct": 5.0},
        "M20": {"flexure": 3.5, "direct": 5.0},
        "M25": {"flexure": 4.0, "direct": 5.0},
        "M30": {"flexure": 4.5, "direct": 5.0},
        "M35": {"flexure": 5.0, "direct": 5.0},
        "M40": {"flexure": 5.5, "direct": 5.0},
    }
    
    # Modular ratio (IS 456 Table 2)
    MODULAR_RATIO = {
        "M15": 18,
        "M20": 13,
        "M25": 11,
        "M30": 10,
        "M35": 9,
        "M40": 8,
    }
    
    # Design shear strength of concrete (IS 456 Table 19)
    SHEAR_STRENGTH_CONCRETE = {
        "M15": 0.36,
        "M20": 0.48,
        "M25": 0.56,
        "M30": 0.63,
        "M35": 0.69,
        "M40": 0.75,
    }
    
    # Minimum reinforcement (IS 456 Table 16)
    MIN_REINFORCEMENT = {
        "slab": 0.12,  # % of cross-section
        "beam": 0.85,  # % of cross-section (min)
        "column": 0.8,  # % of cross-section
    }
    
    # Development length coefficients (IS 456 Table 60)
    DEVELOPMENT_LENGTH = {
        "Fe250": {"straight": 47, "hook": 8},
        "Fe415": {"straight": 57, "hook": 10},
        "Fe500": {"straight": 68, "hook": 12},
        "Fe550": {"straight": 75, "hook": 13},
    }
    
    # Deflection limits (IS 456 Table 1)
    DEFLECTION_LIMITS = {
        "cantilever": 0.004,  # span/250
        "beam_simply_supported": 0.002,  # span/500
        "beam_continuous": 0.0024,  # span/600
        "slab_simply_supported": 0.002,  # span/500
        "slab_continuous": 0.0024,  # span/600
    }
    
    @classmethod
    def get_seismic_zone(cls, lat: float, lon: float) -> SeismicZone:
        """Determine seismic zone from lat/lon for Kerala/India"""
        # Simplified zone determination
        # Zone V: < 8° N (Kashmir, NE states)
        # Zone IV: 8-12° N (Gujarat, Maharashtra)
        # Zone III: 12-20° N (Delhi, UP, Bihar)
        # Zone II: > 20° N (Most of South India)
        
        # Kerala specific
        if 8 <= lat <= 12 and 74 <= lon <= 77:
            return SeismicZone.ZONE_III
        
        if lat < 8:
            return SeismicZone.ZONE_V
        
        if lat < 12:
            return SeismicZone.ZONE_IV
            
        if lat < 20:
            return SeismicZone.ZONE_III
            
        return SeismicZone.ZONE_II
    
    @classmethod
    def get_wind_speed(cls, city: str) -> float:
        """Get basic wind speed for city (m/s)"""
        city_lower = city.lower()
        for key, value in cls.WIND_SPEEDS_CITY.items():
            if key in city_lower:
                return value
        return 47  # Default to zone B
    
    @classmethod
    def get_concrete_properties(cls, grade: str) -> Dict:
        """Get concrete properties"""
        return cls.CONCRETE_GRADES.get(grade, cls.CONCRETE_GRADES["M20"])
    
    @classmethod
    def get_steel_properties(cls, grade: str) -> Dict:
        """Get steel properties"""
        return cls.STEEL_GRADES.get(grade, cls.STEEL_GRADES["Fe415"])

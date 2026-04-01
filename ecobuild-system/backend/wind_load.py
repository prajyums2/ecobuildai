"""
Wind Load Calculator - IS 875 Part 3:2015
Wind Loads on Buildings and Structures
"""

import math
from dataclasses import dataclass
from typing import Dict, List, Optional
from is_codes import ISCodeReferences

@dataclass
class WindResult:
    """Wind load calculation result"""
    basic_wind_speed: float  # m/s
    design_wind_speed: float  # m/s
    design_wind_pressure: float  # kN/m²
    total_wind_force: float  # kN
    is_code: str

class WindLoadCalculator:
    """
    Wind load calculator as per IS 875 Part 3:2015
    """
    
    def __init__(self):
        self.is_codes = ISCodeReferences()
    
    def get_basic_wind_speed(self, city: str, zone: str = "B") -> float:
        """
        Get basic wind speed for city (IS 875 Part 3, Fig 1)
        
        Args:
            city: City name
            zone: Wind zone (A: 55+, B: 47-55, C: 39-47, D: <39)
            
        Returns:
            Basic wind speed in m/s
        """
        # Try to get from database
        speed = self.is_codes.get_wind_speed(city)
        if speed > 0:
            return speed
        
        # Default by zone
        zone_speeds = {
            "A": 55,
            "B": 47,
            "C": 39,
            "D": 33
        }
        return zone_speeds.get(zone.upper(), 47)
    
    def calculate_risk_coefficient(self, building_life: str = "ordinary") -> float:
        """
        Calculate risk coefficient k1 (IS 875 Part 3, Table 1)
        
        Args:
            building_life: Ordinary (50yr), Studio (25yr), Temporary
        """
        risk_map = {
            "ordinary": 1.0,
            "studio": 1.0,
            "temporary": 0.87,
            "important": 1.08
        }
        return risk_map.get(building_life.lower(), 1.0)
    
    def calculate_terrain_category(self, 
                                   terrain: str = "category_2", 
                                   building_height: float = 10.0) -> float:
        """
        Calculate terrain category factor k2 (IS 875 Part 3, Table 2)
        
        Args:
            terrain: Category 1-4
            building_height: Height of building in meters
            
        Returns:
            k2 factor
        """
        # Simplified terrain factors (IS 875 Part 3)
        terrain_factors = {
            "category_1": {
                "a": 1.05, "b": 1.00, "c": 0.91, "d": 0.80
            },
            "category_2": {
                "a": 1.00, "b": 0.91, "c": 0.80, "d": 0.67
            },
            "category_3": {
                "a": 0.91, "b": 0.80, "c": 0.67, "d": 0.55
            },
            "category_4": {
                "a": 0.80, "b": 0.67, "c": 0.55, "d": 0.45
            }
        }
        
        factors = terrain_factors.get(terrain, terrain_factors["category_2"])
        
        # Determine height category
        if building_height <= 10:
            return factors["a"]
        elif building_height <= 15:
            return factors["b"]
        elif building_height <= 30:
            return factors["c"]
        else:
            return factors["d"]
    
    def calculate_topography_factor(self, 
                                   slope: float = 0, 
                                   hill_height: float = 0,
                                   distance_upwind: float = 0) -> float:
        """
        Calculate topography factor k3 (IS 875 Part 3, Clause 6.3)
        
        Args:
            slope: Hill slope in degrees
            hill_height: Height of hill in meters
            distance_upwind: Distance from crest to building in meters
        """
        if slope < 3:
            return 1.0
        
        # Simplified calculation
        H_L = hill_height / distance_upwind if distance_upwind > 0 else 0
        
        if H_L <= 0.25:
            return 1.0
        elif H_L <= 0.5:
            return 1.0 + (0.5 * (H_L - 0.25) / 0.25)
        else:
            return 1.5
    
    def calculate_gust_factor(self, 
                              building_height: float,
                              terrain: str = "category_2") -> float:
        """
        Calculate gust factor (IS 875 Part 3, Clause 8.3)
        
        Args:
            building_height: Height of building in meters
            terrain: Terrain category
        """
        # Simplified gust factor
        if building_height <= 10:
            return 1.35
        elif building_height <= 30:
            return 1.45
        elif building_height <= 50:
            return 1.50
        else:
            return 1.55
    
    def calculate_design_wind_speed(self,
                                    basic_speed: float,
                                    k1: float = 1.0,
                                    k2: float = 1.0,
                                    k3: float = 1.0) -> float:
        """
        Calculate design wind speed (IS 875 Part 3, Clause 5.3)
        
        Vz = Vb × k1 × k2 × k3
        """
        return basic_speed * k1 * k2 * k3
    
    def calculate_design_pressure(self, design_speed: float) -> float:
        """
        Calculate design wind pressure (IS 875 Part 3, Clause 7.2)
        
        Pz = 0.6 × Vz² (kN/m²)
        """
        return 0.6 * (design_speed ** 2)
    
    def calculate_wind_load(self,
                           city: str,
                           building_height: float,
                           floor_area: float,
                           building_length: float,
                           building_width: float,
                           terrain: str = "category_2",
                           building_life: str = "ordinary",
                           slope: float = 0,
                           hill_height: float = 0,
                           distance_upwind: float = 0,
                           opening_percentage: float = 0) -> Dict:
        """
        Complete wind load calculation
        
        Args:
            city: City name
            building_height: Total building height in meters
            floor_area: Floor area in m²
            building_length: Length of building in m
            building_width: Width of building in m
            terrain: Terrain category
            building_life: Building life category
            slope: Hill slope in degrees
            hill_height: Height of hill in m
            distance_upwind: Distance from crest in m
            opening_percentage: Opening percentage (for internal pressure)
            
        Returns:
            Dictionary with complete wind analysis
        """
        # Get basic wind speed
        Vb = self.get_basic_wind_speed(city)
        
        # Calculate factors
        k1 = self.calculate_risk_coefficient(building_life)
        k2 = self.calculate_terrain_category(terrain, building_height)
        k3 = self.calculate_topography_factor(slope, hill_height, distance_upwind)
        
        # Design wind speed
        Vz = self.calculate_design_wind_speed(Vb, k1, k2, k3)
        
        # Design wind pressure
        Pz = self.calculate_design_pressure(Vz)
        
        # External pressure coefficients (simplified - IS 875 Part 3, Table 8)
        # For rectangular buildings
        # Wind normal to longer face
        Cp_long = 0.7  # Windward
        Cp_leeward_long = -0.3
        
        # Wind normal to shorter face
        Cp_short = 0.7
        Cp_leeward_short = -0.3
        
        # Gust factor
        G = self.calculate_gust_factor(building_height, terrain)
        
        # Calculate forces for both directions
        # Normal to long face (IS 875 Part 3: Pz * Cp * G * A)
        wind_area_long = building_height * building_width
        Fx_long = Pz * (Cp_long - Cp_leeward_long) * G * wind_area_long / 1000  # kN
        
        # Normal to short face  
        wind_area_short = building_height * building_length
        Fy_short = Pz * (Cp_short - Cp_leeward_short) * G * wind_area_short / 1000  # kN
        
        # Total wind force
        total_force = max(Fx_long, Fy_short)
        
        # Calculate pressure on each face
        face_pressures = [
            {
                "face": "Windward (Long)",
                "area_m2": wind_area_long,
                "Cp": Cp_long,
                "pressure_kNm2": round(Pz * Cp_long * G, 3),
                "force_kn": round(Pz * Cp_long * G * wind_area_long / 1000, 2)
            },
            {
                "face": "Leeward (Long)",
                "area_m2": wind_area_long,
                "Cp": Cp_leeward_long,
                "pressure_kNm2": round(abs(Pz * Cp_leeward_long * G), 3),
                "force_kn": round(abs(Pz * Cp_leeward_long * G * wind_area_long / 1000), 2)
            },
            {
                "face": "Windward (Short)",
                "area_m2": wind_area_short,
                "Cp": Cp_short,
                "pressure_kNm2": round(Pz * Cp_short * G, 3),
                "force_kn": round(Pz * Cp_short * G * wind_area_short / 1000, 2)
            },
            {
                "face": "Leeward (Short)",
                "area_m2": wind_area_short,
                "Cp": Cp_leeward_short,
                "pressure_kNm2": round(abs(Pz * Cp_leeward_short * G), 3),
                "force_kn": round(abs(Pz * Cp_leeward_short * G * wind_area_short / 1000), 2)
            }
        ]
        
        return {
            "input": {
                "city": city,
                "building_height_m": building_height,
                "floor_area_m2": floor_area,
                "building_length_m": building_length,
                "building_width_m": building_width,
                "terrain": terrain,
                "building_life": building_life
            },
            "factors": {
                "basic_wind_speed_m_s": Vb,
                "risk_coefficient_k1": round(k1, 3),
                "terrain_coefficient_k2": round(k2, 3),
                "topography_factor_k3": round(k3, 3),
                "gust_factor_G": round(G, 3)
            },
            "results": {
                "design_wind_speed_m_s": round(Vz, 2),
                "design_pressure_kNm2": round(Pz, 3),
                "max_wind_force_kn": round(total_force, 2),
                "force_per_floor_kn": round(total_force / max(1, building_height / 3), 2)
            },
            "face_pressures": face_pressures,
            "is_code": "IS 875 Part 3:2015"
        }


def calculate_wind_load(
    city: str,
    building_height: float,
    floor_area: float,
    num_floors: int = 3,
    terrain: str = "category_2"
) -> Dict:
    """
    Convenience function for wind load calculation
    """
    calculator = WindLoadCalculator()
    
    # Assume square building for simplicity
    side = math.sqrt(floor_area)
    
    return calculator.calculate_wind_load(
        city=city,
        building_height=building_height,
        floor_area=floor_area,
        building_length=side,
        building_width=side,
        terrain=terrain
    )

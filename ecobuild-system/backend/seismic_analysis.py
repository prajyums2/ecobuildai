"""
Seismic Analysis - IS 1893:2016
Earthquake Resistant Design of Structures
"""

import math
from dataclasses import dataclass
from typing import Dict, List, Optional
from is_codes import ISCodeReferences, SeismicZone, SoilType, OccupancyType, StructuralSystem

@dataclass
class SeismicResult:
    """Seismic analysis result"""
    zone_factor: float
    importance_factor: float
    response_reduction: float
    base_shear: float
    time_period: float
    spectral_acceleration: List[Dict]
    damping: float = 0.05
    is_code: str = "IS 1893:2016"

@dataclass
class FloorForce:
    """Seismic force at each floor"""
    floor: int
    height: float  # m from base
    weight: float  # kN
    shear_force: float  # kN
    moment: float  # kN.m

class SeismicAnalyzer:
    """
    Seismic analysis as per IS 1893:2016
    """
    
    # Spectral acceleration values (Sa/g) for different periods
    # For different soil types
    SPECTRAL_CURVES = {
        SoilType.ROCKY: {
            0.0: 1.0, 0.1: 1.0, 0.2: 1.0, 0.3: 1.0,
            0.4: 1.0, 0.5: 0.9, 0.6: 0.75, 0.7: 0.65,
            0.8: 0.55, 0.9: 0.45, 1.0: 0.40, 1.2: 0.30,
            1.4: 0.25, 1.6: 0.20, 1.8: 0.18, 2.0: 0.15
        },
        SoilType.DENSE: {
            0.0: 1.0, 0.1: 1.0, 0.2: 1.0, 0.3: 1.0,
            0.4: 1.0, 0.5: 1.0, 0.6: 0.95, 0.7: 0.85,
            0.8: 0.75, 0.9: 0.65, 1.0: 0.55, 1.2: 0.45,
            1.4: 0.35, 1.6: 0.30, 1.8: 0.25, 2.0: 0.22
        },
        SoilType.MEDIUM: {
            0.0: 1.0, 0.1: 1.0, 0.2: 1.0, 0.3: 1.0,
            0.4: 1.0, 0.5: 1.0, 0.6: 1.0, 0.7: 0.95,
            0.8: 0.85, 0.9: 0.75, 1.0: 0.65, 1.2: 0.55,
            1.4: 0.45, 1.6: 0.38, 1.8: 0.32, 2.0: 0.28
        },
        SoilType.SOFT: {
            0.0: 1.0, 0.1: 1.0, 0.2: 1.0, 0.3: 1.0,
            0.4: 1.0, 0.5: 1.0, 0.6: 1.0, 0.7: 1.0,
            0.8: 1.0, 0.9: 0.90, 1.0: 0.80, 1.2: 0.65,
            1.4: 0.55, 1.6: 0.45, 1.8: 0.40, 2.0: 0.35
        }
    }
    
    def __init__(self):
        self.is_codes = ISCodeReferences()
    
    def get_zone_factor(self, zone: str = "III") -> float:
        """Get seismic zone factor (IS 1893 Table 3)"""
        zone_map = {
            "II": 0.10,
            "III": 0.16,
            "IV": 0.24,
            "V": 0.36
        }
        return zone_map.get(zone.upper(), 0.16)
    
    def get_importance_factor(self, occupancy: str) -> float:
        """Get importance factor (IS 1893 Table 6)"""
        factor_map = {
            "residential": 1.0,
            "commercial": 1.2,
            "industrial": 1.0,
            "educational": 1.5,
            "hospital": 1.5,
            "public": 1.2,
            "important": 1.5
        }
        return factor_map.get(occupancy.lower(), 1.0)
    
    def get_response_reduction_factor(self, structural_system: str) -> float:
        """Get response reduction factor (IS 1893 Table 7)"""
        system_map = {
            "special_rc_frame": 5.0,
            "ordinary_rc_frame": 3.0,
            "rc_frame_inf_masonry": 4.0,
            "dual_system": 4.0,
            "shear_wall": 4.0,
            "building_frame": 5.0
        }
        return system_map.get(structural_system.lower(), 4.0)
    
    def calculate_time_period(self, 
                              height_m: float, 
                              structural_system: str,
                              soil_type: str = "medium") -> float:
        """
        Calculate fundamental natural period (IS 1893 Clause 7.6)
        
        Args:
            height_m: Total building height in meters
            structural_system: Type of structural system
            soil_type: Type of soil (rocky, dense, medium, soft)
            
        Returns:
            Time period in seconds
        """
        # Approximate formula based on IS 1893
        # T = 0.075h^0.75 for RC frame
        # T = 0.085h^0.75 for others
        
        if "frame" in structural_system.lower() and "dual" not in structural_system.lower():
            T = 0.075 * (height_m ** 0.75)
        else:
            T = 0.085 * (height_m ** 0.75)
        
        return round(T, 3)
    
    def get_spectral_acceleration(self, 
                                   T: float, 
                                   zone_factor: float,
                                   importance_factor: float,
                                   soil_type: str = "medium") -> float:
        """
        Get design spectral acceleration (IS 1893 Clause 6.4)
        
        Args:
            T: Time period in seconds
            zone_factor: Z factor
            importance_factor: I factor
            soil_type: Type of soil
            
        Returns:
            Sa/g value
        """
        soil = SoilType.MEDIUM
        if soil_type.lower() == "rocky":
            soil = SoilType.ROCKY
        elif soil_type.lower() == "dense":
            soil = SoilType.DENSE
        elif soil_type.lower() == "soft":
            soil = SoilType.SOFT
        
        # Get curve for soil type
        curve = self.SPECTRAL_CURVES.get(soil, self.SPECTRAL_CURVES[SoilType.MEDIUM])
        
        # Find Sa/g for given T
        T_values = sorted(curve.keys())
        Sa_g = curve[0.0]  # Default value
        
        if T <= T_values[0]:
            Sa_g = curve[T_values[0]]
        elif T >= T_values[-1]:
            Sa_g = curve[T_values[-1]]
        else:
            # Interpolate
            for i in range(len(T_values) - 1):
                if T_values[i] <= T <= T_values[i+1]:
                    Sa_g = curve[T_values[i]] + (curve[T_values[i+1]] - curve[T_values[i]]) * \
                           (T - T_values[i]) / (T_values[i+1] - T_values[i])
                    break
        
        return round(Sa_g, 3)
    
    def calculate_base_shear(self,
                              total_weight: float,
                              T: float,
                              zone_factor: float,
                              importance_factor: float,
                              response_reduction: float,
                              soil_type: str = "medium") -> float:
        """
        Calculate design seismic base shear (IS 1893 Clause 7.5)
        
        Args:
            total_weight: Total seismic weight of building in kN
            T: Fundamental time period in seconds
            zone_factor: Z factor
            importance_factor: I factor  
            response_reduction: R factor
            soil_type: Type of soil
            
        Returns:
            Base shear in kN
        """
        # Get spectral acceleration
        Sa_g = self.get_spectral_acceleration(T, zone_factor, importance_factor, soil_type)
        
        # Design horizontal seismic coefficient (Ah)
        Ah = (zone_factor * importance_factor * Sa_g) / response_reduction
        
        # Minimum Ah (for small buildings)
        Ah = max(Ah, 0.05 * zone_factor * importance_factor)
        
        # Base shear
        Vb = Ah * total_weight
        
        return round(Vb, 2)
    
    def calculate_seismic_analysis(self,
                                     num_floors: int,
                                     floor_height: float,
                                     floor_weights: List[float],  # kN per floor (bottom to top)
                                     zone: str = "III",
                                     occupancy: str = "residential",
                                     structural_system: str = "special_rc_frame",
                                     soil_type: str = "medium") -> Dict:
        """
        Complete seismic analysis
        
        Args:
            num_floors: Number of floors
            floor_height: Height of each floor in meters
            floor_weights: Weight of each floor in kN (ground floor first)
            zone: Seismic zone (II, III, IV, V)
            occupancy: Building occupancy type
            structural_system: Structural system type
            soil_type: Soil type
            
        Returns:
            Dictionary with complete seismic analysis
        """
        # Get factors
        Z = self.get_zone_factor(zone)
        I = self.get_importance_factor(occupancy)
        R = self.get_response_reduction_factor(structural_system)
        
        # Calculate total weight
        total_weight = sum(floor_weights)
        
        # Calculate height
        height_m = num_floors * floor_height
        
        # Calculate time period
        T = self.calculate_time_period(height_m, structural_system, soil_type)
        
        # Calculate base shear
        Vb = self.calculate_base_shear(
            total_weight, T, Z, I, R, soil_type
        )
        
        # Calculate floor forces (IS 1893 Clause 7.7)
        # Using approximate method (Wi*hi^2)
        heights = [(i + 1) * floor_height for i in range(num_floors)]
        
        # Weight × height factor
        Wi_hi = [floor_weights[i] * heights[i] for i in range(num_floors)]
        total_Wi_hi = sum(Wi_hi)
        
        # Floor forces
        floor_shears = []
        cumulative_shear = Vb
        
        for i in range(num_floors - 1, -1, -1):
            Fi = (floor_weights[i] * heights[i] / total_Wi_hi) * Vb
            cumulative_shear -= Fi
            
            floor_shears.append({
                "floor": i + 1,
                "height_m": round(heights[i], 2),
                "weight_kn": round(floor_weights[i], 2),
                "seismic_force_kn": round(Fi, 2),
                "shear_force_kn": round(cumulative_shear, 2),
                "overturning_moment_knm": round(cumulative_shear * heights[i] * 0.5, 2)
            })
        
        # Reverse to show bottom floor first
        floor_shears.reverse()
        
        # Spectral acceleration curve
        spectral_curve = []
        for T_val in [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0]:
            Sa_g = self.get_spectral_acceleration(T_val, Z, I, soil_type)
            spectral_curve.append({
                "period_s": T_val,
                "sa_g": round(Sa_g, 3)
            })
        
        return {
            "input": {
                "zone": zone.upper(),
                "occupancy": occupancy,
                "structural_system": structural_system,
                "soil_type": soil_type,
                "num_floors": num_floors,
                "total_height_m": height_m
            },
            "factors": {
                "zone_factor_Z": Z,
                "importance_factor_I": I,
                "response_reduction_R": R,
                "time_period_T": round(T, 3),
                "soil_amplification": soil_type.capitalize()
            },
            "results": {
                "total_seismic_weight_kn": round(total_weight, 2),
                "base_shear_Vb_kn": round(Vb, 2),
                "base_shear_percentage": round((Vb / total_weight) * 100, 2),
                "avg_acceleration_g": round(Vb / total_weight, 4)
            },
            "floor_forces": floor_shears,
            "spectral_curve": spectral_curve,
            "is_code": "IS 1893:2016"
        }


def calculate_seismic(
    num_floors: int,
    floor_area: float,
    floor_load_kNm2: float,
    floor_height: float = 3.0,
    zone: str = "III",
    occupancy: str = "residential",
    structural_system: str = "special_rc_frame",
    soil_type: str = "medium"
) -> Dict:
    """
    Convenience function for seismic analysis
    """
    # Calculate floor weights (including self weight of slab)
    slab_self = 3.75  # kN/m² for 150mm slab
    floor_weights = [(floor_load_kNm2 + slab_self) * floor_area 
                     for _ in range(num_floors)]
    
    analyzer = SeismicAnalyzer()
    return analyzer.calculate_seismic_analysis(
        num_floors=num_floors,
        floor_height=floor_height,
        floor_weights=floor_weights,
        zone=zone,
        occupancy=occupancy,
        structural_system=structural_system,
        soil_type=soil_type
    )

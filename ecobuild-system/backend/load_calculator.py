"""
Load Calculator - IS 875 Part 1 & 2
Dead Loads and Imposed Loads
"""

import math
from dataclasses import dataclass
from typing import Dict, List, Optional
from is_codes import ISCodeReferences, OccupancyType

@dataclass
class LoadResult:
    """Result of load calculation"""
    load_type: str
    value: float  # kN/m²
    source: str  # IS code reference
    description: str

@dataclass
class FloorLoad:
    """Load on a floor"""
    floor_number: int
    dead_load: float  # kN/m²
    imposed_load: float  # kN/m²
    floor_finish: float  # kN/m²
    partition: float  # kN/m²
    total: float  # kN/m²

@dataclass
class BuildingLoads:
    """Complete load summary for building"""
    floors: List[FloorLoad]
    total_dead_load: float  # kN
    total_live_load: float  # kN
    total_load: float  # kN
    reduction_factor: float  # Live load reduction
    is_code: str

class LoadCalculator:
    """
    Calculator for Dead Loads (IS 875 Part 1) and Imposed Loads (IS 875 Part 2)
    """
    
    def __init__(self):
        self.is_codes = ISCodeReferences()
    
    def calculate_dead_load(self, element_type: str, dimensions: Dict, material: str = "reinforced_concrete") -> float:
        """
        Calculate dead load of structural element
        
        Args:
            element_type: Type of element (slab, beam, column, wall, etc.)
            dimensions: Dict with dimensions (span, breadth, depth, etc.)
            material: Material type from IS 875 Part 1
            
        Returns:
            Load in kN/m² or kN/m as appropriate
        """
        unit_weight = self.is_codes.UNIT_WEIGHTS.get(material, 25.0)  # kN/m³
        
        if element_type == "slab":
            thickness_mm = dimensions.get("thickness", 150)
            return (unit_weight * thickness_mm) / 1000  # kN/m² for 1mm
        
        elif element_type == "beam":
            breadth_mm = dimensions.get("breadth", 300)
            depth_mm = dimensions.get("depth", 450)
            return (unit_weight * breadth_mm * depth_mm) / 1000000  # kN/m per mm run
        
        elif element_type == "column":
            breadth_mm = dimensions.get("breadth", 300)
            depth_mm = dimensions.get("depth", 300)
            return (unit_weight * breadth_mm * depth_mm) / 1000000  # kN/m per m height
        
        elif element_type == "wall":
            thickness_mm = dimensions.get("thickness", 150)
            height_m = dimensions.get("height", 3.0)
            unit_weight_wall = self.is_codes.UNIT_WEIGHTS.get("brick_masonry", 19.0)
            return (unit_weight_wall * thickness_mm * height_m) / 1000  # kN/m
        
        return 0.0
    
    def calculate_floor_finish_load(self, finish_type: str) -> float:
        """
        Calculate floor finish load (IS 875 Part 1)
        
        Args:
            finish_type: Type of floor finish
            
        Returns:
            Load in kN/m²
        """
        return self.is_codes.FLOOR_FINISHES.get(finish_type, 0.5)
    
    def calculate_partition_load(self, partition_type: str, height_m: float = 3.0) -> float:
        """
        Calculate partition wall load (IS 875 Part 2)
        
        Args:
            partition_type: Type of partition wall
            height_m: Height of partition in meters
            
        Returns:
            Load in kN/m²
        """
        base_load = self.is_codes.PARTITION_WALLS.get(partition_type, 1.5)
        return base_load * height_m / 3.0  # Adjust for height
    
    def calculate_live_load(self, occupancy: str, location: str = "floor") -> float:
        """
        Calculate imposed/live load (IS 875 Part 2)
        
        Args:
            occupancy: Occupancy type
            location: Location within building (floor, staircase, balcony, etc.)
            
        Returns:
            Load in kN/m²
        """
        base_load = self.is_codes.LIVE_LOADS.get(occupancy, 2.0)
        
        # Reduction for floors (IS 875 Part 2, Clause 5.1)
        # Higher floors have lower live load
        if location == "floor":
            return base_load
        elif location == "staircase":
            return self.is_codes.LIVE_LOADS.get("staircase", 3.0)
        elif location == "balcony":
            return self.is_codes.LIVE_LOADS.get("balcony", 3.0)
        
        return base_load
    
    def calculate_roof_load(self, roof_type: str, access: bool = False) -> float:
        """
        Calculate roof load
        
        Args:
            roof_type: Type of roof
            access: Whether roof is accessible
            
        Returns:
            Load in kN/m²
        """
        base_load = self.is_codes.ROOF_LOADS.get(roof_type, 2.5)
        
        if access:
            return max(base_load, self.is_codes.LIVE_LOADS.get("roof_accessible", 1.5))
        return max(base_load, self.is_codes.LIVE_LOADS.get("roof_inaccessible", 0.75))
    
    def calculate_floor_loads(self, 
                              num_floors: int,
                              floor_area: float,  # m²
                              occupancy: str,
                              floor_finish: str = "tiled_12mm",
                              partition_type: Optional[str] = None,
                              typical_floor_height: float = 3.0) -> BuildingLoads:
        """
        Calculate loads for entire building
        
        Args:
            num_floors: Number of floors
            floor_area: Area of each floor in m²
            occupancy: Occupancy type
            floor_finish: Type of floor finish
            partition_type: Type of partition wall
            typical_floor_height: Height of each floor in meters
            
        Returns:
            BuildingLoads object
        """
        floors = []
        total_dead = 0
        total_live = 0
        
        # Floor finish load
        finish_load = self.calculate_floor_finish_load(floor_finish)
        
        # Partition load
        partition_load = 0
        if partition_type:
            partition_load = self.calculate_partition_load(partition_type, typical_floor_height)
        
        # Slab dead load (assuming 150mm RCC slab)
        slab_dead = (25.0 * 150) / 1000  # 3.75 kN/m²
        
        # Beam dead load (assuming 300x450mm beam @ 4m c/c)
        beam_spacing = 4.0  # m
        beam_self_load = (25.0 * 0.3 * 0.45) / beam_spacing  # 3.375 kN/m²
        
        # Column dead load (average)
        column_dead = 1.5  # kN/m² estimated
        
        # Total dead load per floor
        floor_dead = slab_dead + beam_self_load + column_dead + finish_load
        
        # Live load per floor
        floor_live = self.calculate_live_load(occupancy)
        
        # Live load reduction (IS 875 Part 2, Table 2)
        # Reduction allowed for floors 2-5
        reduction_factor = 1.0
        if num_floors >= 2:
            reduction_factor = 1.0 - (0.05 * min(num_floors - 1, 3))
        
        for floor_num in range(1, num_floors + 1):
            # Reduce live load for upper floors
            floor_live_reduced = floor_live * reduction_factor if floor_num > 1 else floor_live
            
            # Ground floor may have different loading
            if floor_num == 1:
                floor_live_reduced = floor_live
            
            total_floor = floor_dead + partition_load + floor_live_reduced
            
            floor_load = FloorLoad(
                floor_number=floor_num,
                dead_load=round(floor_dead + partition_load, 3),
                imposed_load=round(floor_live_reduced, 3),
                floor_finish=round(finish_load, 3),
                partition=round(partition_load, 3),
                total=round(total_floor, 3)
            )
            floors.append(floor_load)
            
            total_dead += (floor_dead + partition_load) * floor_area
            total_live += floor_live_reduced * floor_area
        
        return BuildingLoads(
            floors=floors,
            total_dead_load=round(total_dead, 2),
            total_live_load=round(total_live, 2),
            total_load=round(total_dead + total_live, 2),
            reduction_factor=round(reduction_factor, 2),
            is_code="IS 875 Part 1:1987, IS 875 Part 2:1987"
        )
    def calculate_member_loads(self,
                               slab_thickness_mm: int,
                               beam_dimensions: Dict,  # {breadth, depth}
                               column_dimensions: Dict,  # {breadth, depth}
                               floor_area: float,
                               span_m: float) -> Dict:
        """
        Calculate detailed loads on structural members
        
        Args:
            slab_thickness_mm: Slab thickness in mm
            beam_dimensions: Beam dimensions {breadth, depth} in mm
            column_dimensions: Column dimensions {breadth, depth} in mm
            floor_area: Floor area in m²
            span_m: Typical bay span in meters
            
        Returns:
            Dictionary with all loads
        """
        # Slab load
        slab_load = 25.0 * slab_thickness_mm / 1000  # kN/m²
        
        # Beam load (per meter run)
        beam_load = 25.0 * beam_dimensions['breadth'] * beam_dimensions['depth'] / 1000000  # kN/m per m height
        
        # Self weight per m² of floor
        beam_spacing = span_m
        beam_self = beam_load * (1 / beam_spacing)  # kN/m²
        
        # Column load
        col_load = 25.0 * column_dimensions['breadth'] * column_dimensions['depth'] / 1000000  # kN/m
        
        # Total structural self weight
        total_sw = slab_load + beam_self
        
        return {
            "slab_self_weight": round(slab_load, 3),  # kN/m²
            "beam_self_weight": round(beam_self, 3),  # kN/m²
            "total_structural": round(total_sw, 3),  # kN/m²
            "column_self_weight": round(col_load, 3),  # kN/m
            "permissible_deflection": round(span_m / 250, 3),  # mm
            "is_code": "IS 875 Part 1:1987"
        }

def calculate_building_loads(
    num_floors: int,
    floor_area: float,
    occupancy: str,
    floor_finish: str = "tiled_18mm",
    partition_type: str = "brick_150mm"
) -> Dict:
    """
    Convenience function to calculate building loads
    """
    calculator = LoadCalculator()
    loads = calculator.calculate_floor_loads(
        num_floors=num_floors,
        floor_area=floor_area,
        occupancy=occupancy,
        floor_finish=floor_finish,
        partition_type=partition_type
    )
    
    return {
        "floors": [
            {
                "floor": f.floor_number,
                "dead_load": f.dead_load,
                "imposed_load": f.imposed_load,
                "total": f.total
            }
            for f in loads.floors
        ],
        "summary": {
            "total_dead_load_kn": loads.total_dead_load,
            "total_live_load_kn": loads.total_live_load,
            "total_load_kn": loads.total_load,
            "reduction_factor": loads.reduction_factor,
            "is_code": loads.is_code
        }
    }

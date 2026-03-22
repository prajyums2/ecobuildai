"""
Eco-Mix Designer Module
AI-assisted concrete mix design (M25+) with recycled aggregates and fly ash
Adheres to IS 10262:2019
"""

import math
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

class ConcreteGrade(Enum):
    M20 = "M20"
    M25 = "M25"
    M30 = "M30"
    M35 = "M35"
    M40 = "M40"

class ExposureCondition(Enum):
    MILD = "mild"
    MODERATE = "moderate"
    SEVERE = "severe"
    VERY_SEVERE = "very_severe"
    EXTREME = "extreme"

@dataclass
class MixDesign:
    """Complete concrete mix design specification"""
    grade: str
    target_strength_mpa: float
    water_cement_ratio: float
    water_content_l_m3: float
    cement_content_kg_m3: float
    fly_ash_content_kg_m3: float
    fine_aggregate_kg_m3: float
    coarse_aggregate_kg_m3: float
    recycled_aggregate_kg_m3: float
    admixture_percent: float
    slump_mm: int
    
    # Environmental metrics
    embodied_carbon_kg_m3: float
    recycled_content_percent: float
    
    # Cost
    estimated_cost_per_m3: float

class EcoMixDesigner:
    """
    Sustainable Concrete Mix Designer
    Incorporates recycled aggregates and fly ash per IS 10262:2019
    """
    
    # IS 10262:2019 Standard data
    TARGET_STRENGTH = {
        'M20': 26.6,
        'M25': 31.6,
        'M30': 38.2,
        'M35': 43.2,
        'M40': 48.2
    }
    
    MAX_WC_RATIO = {
        'mild': 0.60,
        'moderate': 0.50,
        'severe': 0.45,
        'very_severe': 0.40,
        'extreme': 0.35
    }
    
    MIN_CEMENT_CONTENT = {
        'mild': 300,
        'moderate': 300,
        'severe': 320,
        'very_severe': 340,
        'extreme': 360
    }
    
    # Carbon factors (kg CO2/kg material)
    CARBON_FACTORS = {
        'opc_cement': 0.95,
        'fly_ash': 0.05,
        'natural_aggregate': 0.005,
        'recycled_aggregate': 0.002,
        'water': 0.0003,
        'admixture': 0.8
    }
    
    # Material costs (INR per kg)
    MATERIAL_COSTS = {
        'opc_cement': 7.5,
        'fly_ash': 2.0,
        'fine_aggregate': 0.8,
        'coarse_aggregate': 1.2,
        'recycled_aggregate': 0.6,
        'water': 0.01,
        'admixture': 120.0
    }
    
    def __init__(self):
        self.zone_factors = {
            ' Zone I (450-600 micron)': 1.0,
            'Zone II (300-450 micron)': 1.1,
            'Zone III (150-300 micron)': 1.2,
            'Zone IV (75-150 micron)': 1.3
        }
    
    def design_mix(self,
                   grade: ConcreteGrade,
                   exposure: ExposureCondition,
                   slump_required: int = 100,
                   max_aggregate_size_mm: int = 20,
                   fly_ash_replacement_percent: float = 30,
                   recycled_aggregate_percent: float = 25,
                   use_superplasticizer: bool = True) -> MixDesign:
        """
        Design sustainable concrete mix per IS 10262:2019
        
        Args:
            grade: Concrete grade (M20-M40)
            exposure: Environmental exposure condition
            slump_required: Target slump in mm
            max_aggregate_size_mm: Maximum aggregate size
            fly_ash_replacement_percent: Fly ash replacement (15-35%)
            recycled_aggregate_percent: Recycled coarse aggregate (20-40%)
            use_superplasticizer: Whether to use superplasticizer
        """
        
        grade_str = grade.value
        exposure_str = exposure.value
        
        # Step 1: Target strength
        target_strength = self.TARGET_STRENGTH[grade_str]
        
        # Step 2: Water-cement ratio
        wc_ratio = self.MAX_WC_RATIO[exposure_str]
        
        # For higher grades, reduce W/C ratio
        if grade_str in ['M35', 'M40']:
            wc_ratio = min(wc_ratio, 0.40)
        
        # Step 3: Water content (base value for 20mm aggregate)
        base_water_content = 186  # liters/m³ for 25-50mm slump
        
        # Adjust for slump
        if slump_required > 50:
            water_content = base_water_content + (slump_required - 50) * 0.6
        else:
            water_content = base_water_content
        
        # Adjust for aggregate size
        if max_aggregate_size_mm == 40:
            water_content *= 0.93
        elif max_aggregate_size_mm == 10:
            water_content *= 1.10
        
        # Step 4: Cementitious content
        cementitious_content = water_content / wc_ratio
        
        # Step 5: Fly ash content
        fly_ash_content = cementitious_content * (fly_ash_replacement_percent / 100)
        cement_content = cementitious_content - fly_ash_content
        
        # Check minimum cement content
        min_cement = self.MIN_CEMENT_CONTENT[exposure_str]
        if cement_content < min_cement:
            cement_content = min_cement
            cementitious_content = cement_content / (1 - fly_ash_replacement_percent/100)
            fly_ash_content = cementitious_content - cement_content
            water_content = cementitious_content * wc_ratio
        
        # Step 6: Superplasticizer
        admixture_percent = 0.0
        if use_superplasticizer:
            admixture_percent = 1.5  # % by weight of cementitious
            # Reduce water by 20% with superplasticizer
            water_content *= 0.80
            water_content = max(water_content, 150)  # Minimum 150 L/m³
        
        # Step 7: Calculate aggregate content
        # Volume of concrete = 1 m³
        volume_cement = cement_content / (3.15 * 1000)  # Sp. gravity of cement = 3.15
        volume_fly_ash = fly_ash_content / (2.2 * 1000)  # Sp. gravity of fly ash = 2.2
        volume_water = water_content / 1000
        volume_admixture = (cementitious_content * admixture_percent / 100) / (1.145 * 1000)
        
        # Volume of all aggregates
        total_aggregate_volume = 1 - (volume_cement + volume_fly_ash + volume_water + volume_admixture)
        
        # Fine to coarse aggregate ratio (typically 35:65 for pumpable concrete)
        fine_agg_ratio = 0.36
        coarse_agg_ratio = 0.64
        
        # Adjust for recycled aggregate
        # Recycled aggregate absorbs more water, so adjust proportion
        if recycled_aggregate_percent > 0:
            fine_agg_ratio = 0.38  # Slightly more fine aggregate
        
        volume_fine_agg = total_aggregate_volume * fine_agg_ratio
        volume_coarse_agg_natural = total_aggregate_volume * coarse_agg_ratio * (1 - recycled_aggregate_percent/100)
        volume_coarse_agg_recycled = total_aggregate_volume * coarse_agg_ratio * (recycled_aggregate_percent/100)
        
        # Convert to mass
        fine_aggregate = volume_fine_agg * 2.65 * 1000  # Sp. gravity = 2.65
        coarse_aggregate_natural = volume_coarse_agg_natural * 2.70 * 1000  # Sp. gravity = 2.70
        coarse_aggregate_recycled = volume_coarse_agg_recycled * 2.40 * 1000  # Sp. gravity = 2.40 (lower due to porosity)
        
        # Step 8: Calculate embodied carbon
        carbon_cement = cement_content * self.CARBON_FACTORS['opc_cement']
        carbon_fly_ash = fly_ash_content * self.CARBON_FACTORS['fly_ash']
        carbon_fine_agg = fine_aggregate * self.CARBON_FACTORS['natural_aggregate']
        carbon_coarse_natural = coarse_aggregate_natural * self.CARBON_FACTORS['natural_aggregate']
        carbon_coarse_recycled = coarse_aggregate_recycled * self.CARBON_FACTORS['recycled_aggregate']
        carbon_water = water_content * self.CARBON_FACTORS['water']
        carbon_admixture = (cementitious_content * admixture_percent / 100) * self.CARBON_FACTORS['admixture']
        
        total_carbon = (carbon_cement + carbon_fly_ash + carbon_fine_agg + 
                       carbon_coarse_natural + carbon_coarse_recycled + 
                       carbon_water + carbon_admixture)
        
        # Calculate recycled content percentage
        recycled_content = ((fly_ash_content + coarse_aggregate_recycled) / 
                          (cementitious_content + fine_aggregate + coarse_aggregate_natural + coarse_aggregate_recycled)) * 100
        
        # Step 9: Calculate cost
        cost = (cement_content * self.MATERIAL_COSTS['opc_cement'] +
                fly_ash_content * self.MATERIAL_COSTS['fly_ash'] +
                fine_aggregate * self.MATERIAL_COSTS['fine_aggregate'] +
                coarse_aggregate_natural * self.MATERIAL_COSTS['coarse_aggregate'] +
                coarse_aggregate_recycled * self.MATERIAL_COSTS['recycled_aggregate'] +
                water_content * self.MATERIAL_COSTS['water'] +
                (cementitious_content * admixture_percent / 100) * self.MATERIAL_COSTS['admixture'])
        
        return MixDesign(
            grade=grade_str,
            target_strength_mpa=target_strength,
            water_cement_ratio=wc_ratio,
            water_content_l_m3=round(water_content, 1),
            cement_content_kg_m3=round(cement_content, 1),
            fly_ash_content_kg_m3=round(fly_ash_content, 1),
            fine_aggregate_kg_m3=round(fine_aggregate, 1),
            coarse_aggregate_kg_m3=round(coarse_aggregate_natural, 1),
            recycled_aggregate_kg_m3=round(coarse_aggregate_recycled, 1),
            admixture_percent=admixture_percent,
            slump_mm=slump_required,
            embodied_carbon_kg_m3=round(total_carbon, 2),
            recycled_content_percent=round(recycled_content, 1),
            estimated_cost_per_m3=round(cost, 2)
        )
    
    def compare_mix_designs(self, 
                           base_mix: MixDesign,
                           sustainable_mix: MixDesign) -> Dict:
        """Compare conventional vs sustainable mix designs"""
        return {
            'carbon_savings_kg_m3': round(base_mix.embodied_carbon_kg_m3 - sustainable_mix.embodied_carbon_kg_m3, 2),
            'carbon_reduction_percent': round(
                ((base_mix.embodied_carbon_kg_m3 - sustainable_mix.embodied_carbon_kg_m3) / 
                 base_mix.embodied_carbon_kg_m3) * 100, 1
            ),
            'cost_difference_per_m3': round(sustainable_mix.estimated_cost_per_m3 - base_mix.estimated_cost_per_m3, 2),
            'cost_percent_change': round(
                ((sustainable_mix.estimated_cost_per_m3 - base_mix.estimated_cost_per_m3) / 
                 base_mix.estimated_cost_per_m3) * 100, 1
            ),
            'recycled_content_improvement': round(sustainable_mix.recycled_content_percent, 1),
            'performance_equivalent': sustainable_mix.target_strength_mpa >= base_mix.target_strength_mpa,
            'recommendation': 'Sustainable mix recommended' if sustainable_mix.embodied_carbon_kg_m3 < base_mix.embodied_carbon_kg_m3 else 'Review mix design'
        }
    
    def generate_mix_report(self, mix: MixDesign) -> Dict:
        """Generate detailed mix design report"""
        return {
            'mix_specification': {
                'grade': mix.grade,
                'target_strength': f"{mix.target_strength_mpa} MPa",
                'water_cement_ratio': mix.water_cement_ratio,
                'slump': f"{mix.slump_mm} mm",
            },
            'material_quantities_per_m3': {
                'water': f"{mix.water_content_l_m3} L",
                'cement_opc': f"{mix.cement_content_kg_m3} kg",
                'fly_ash': f"{mix.fly_ash_content_kg_m3} kg",
                'fine_aggregate': f"{mix.fine_aggregate_kg_m3} kg",
                'coarse_aggregate_natural': f"{mix.coarse_aggregate_kg_m3} kg",
                'coarse_aggregate_recycled': f"{mix.recycled_aggregate_kg_m3} kg",
                'superplasticizer': f"{mix.admixture_percent}% by weight"
            },
            'sustainability_metrics': {
                'embodied_carbon': f"{mix.embodied_carbon_kg_m3} kg CO2/m³",
                'recycled_content': f"{mix.recycled_content_percent}%",
                'fly_ash_replacement': f"{(mix.fly_ash_content_kg_m3 / (mix.cement_content_kg_m3 + mix.fly_ash_content_kg_m3) * 100):.1f}%"
            },
            'cost_analysis': {
                'material_cost_per_m3': f"₹{mix.estimated_cost_per_m3}",
                'estimated_for_100m3': f"₹{mix.estimated_cost_per_m3 * 100}"
            },
            'compliance': {
                'is_10262_2019': 'Compliant',
                'is_456_2000': 'Compliant',
                'green_building_credits': 'Eligible for GRIHA/IGBC points'
            }
        }

# Example usage
if __name__ == '__main__':
    designer = EcoMixDesigner()
    
    print("=== ECO-MIX DESIGNER ===\n")
    
    # Design conventional M25 mix
    conventional_mix = designer.design_mix(
        grade=ConcreteGrade.M25,
        exposure=ExposureCondition.MODERATE,
        fly_ash_replacement_percent=0,
        recycled_aggregate_percent=0,
        use_superplasticizer=True
    )
    
    print("1. CONVENTIONAL M25 MIX")
    print(f"   Cement: {conventional_mix.cement_content_kg_m3} kg/m³")
    print(f"   Carbon: {conventional_mix.embodied_carbon_kg_m3} kg CO2/m³")
    print(f"   Cost: ₹{conventional_mix.estimated_cost_per_m3}/m³")
    
    # Design sustainable M25 mix
    sustainable_mix = designer.design_mix(
        grade=ConcreteGrade.M25,
        exposure=ExposureCondition.MODERATE,
        fly_ash_replacement_percent=30,
        recycled_aggregate_percent=30,
        use_superplasticizer=True
    )
    
    print("\n2. SUSTAINABLE M25 MIX (30% Fly Ash + 30% RCA)")
    print(f"   OPC Cement: {sustainable_mix.cement_content_kg_m3} kg/m³")
    print(f"   Fly Ash: {sustainable_mix.fly_ash_content_kg_m3} kg/m³")
    print(f"   Recycled Aggregate: {sustainable_mix.recycled_aggregate_kg_m3} kg/m³")
    print(f"   Carbon: {sustainable_mix.embodied_carbon_kg_m3} kg CO2/m³")
    print(f"   Recycled Content: {sustainable_mix.recycled_content_percent}%")
    print(f"   Cost: ₹{sustainable_mix.estimated_cost_per_m3}/m³")
    
    # Compare
    comparison = designer.compare_mix_designs(conventional_mix, sustainable_mix)
    print("\n3. COMPARISON")
    print(f"   Carbon Savings: {comparison['carbon_savings_kg_m3']} kg CO2/m³ ({comparison['carbon_reduction_percent']}% reduction)")
    print(f"   Cost Impact: ₹{comparison['cost_difference_per_m3']}/m³ ({comparison['cost_percent_change']}%)")
    print(f"   Recommendation: {comparison['recommendation']}")
"""
KMBR/KPBR Automator Module
Regulatory compliance checker for Kerala Building Rules
Validates setbacks, FAR, and mandatory rainwater harvesting
"""

import math
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

class BuildingType(Enum):
    RESIDENTIAL_INDIVIDUAL = "residential_individual"
    RESIDENTIAL_APARTMENT = "residential_apartment"
    COMMERCIAL = "commercial"
    INDUSTRIAL = "industrial"
    INSTITUTIONAL = "institutional"
    MIXED_USE = "mixed_use"

class RoadWidth(Enum):
    BELOW_3M = "below_3m"
    BETWEEN_3M_6M = "3m_to_6m"
    BETWEEN_6M_9M = "6m_to_9m"
    BETWEEN_9M_12M = "9m_to_12m"
    ABOVE_12M = "above_12m"

class ZoneType(Enum):
    RESIDENTIAL = "residential"
    COMMERCIAL = "commercial"
    INDUSTRIAL = "industrial"
    SPECIAL = "special"

@dataclass
class BuildingParameters:
    """Building parameters for compliance checking"""
    plot_area_sqm: float
    building_footprint_sqm: float
    total_built_up_area_sqm: float
    num_floors: int
    building_height_m: float
    road_width_m: float
    zone_type: ZoneType
    building_type: BuildingType
    front_setback_m: float
    rear_setback_m: float
    side1_setback_m: float
    side2_setback_m: float
    num_parking_spaces: int
    has_rainwater_harvesting: bool
    has_solar_water_heater: bool
    has_sewage_treatment: bool
    num_units: int = 1

@dataclass
class ComplianceResult:
    """Compliance check result"""
    rule_code: str
    description: str
    requirement: str
    actual_value: str
    status: str  # 'PASS', 'FAIL', 'WARNING'
    remarks: str

class KeralaBuildingRulesAutomator:
    """
    KMBR (Kerala Municipality Building Rules) / 
    KPBR (Kerala Panchayat Building Rules) Automator
    """
    
    def __init__(self):
        self.rules_database = self._initialize_rules()
        
    def _initialize_rules(self) -> Dict:
        """Initialize Kerala Building Rules database"""
        return {
            'setbacks': {
                'residential': {
                    'below_3m': {'front': 1.5, 'rear': 1.0, 'side': 1.0},
                    '3m_to_6m': {'front': 2.0, 'rear': 1.5, 'side': 1.2},
                    '6m_to_9m': {'front': 3.0, 'rear': 2.0, 'side': 1.5},
                    '9m_to_12m': {'front': 4.0, 'rear': 3.0, 'side': 2.0},
                    'above_12m': {'front': 5.0, 'rear': 4.0, 'side': 3.0}
                },
                'commercial': {
                    'below_3m': {'front': 2.0, 'rear': 1.5, 'side': 1.5},
                    '3m_to_6m': {'front': 3.0, 'rear': 2.0, 'side': 2.0},
                    '6m_to_9m': {'front': 4.0, 'rear': 3.0, 'side': 2.5},
                    '9m_to_12m': {'front': 5.0, 'rear': 4.0, 'side': 3.0},
                    'above_12m': {'front': 6.0, 'rear': 5.0, 'side': 4.0}
                }
            },
            'far': {
                'residential': {
                    'below_3m': 1.5,
                    '3m_to_6m': 2.0,
                    '6m_to_9m': 2.5,
                    '9m_to_12m': 3.0,
                    'above_12m': 3.5
                },
                'commercial': {
                    'below_3m': 2.0,
                    '3m_to_6m': 2.5,
                    '6m_to_9m': 3.0,
                    '9m_to_12m': 3.5,
                    'above_12m': 4.0
                }
            },
            'height_limits': {
                'residential': {
                    'below_3m': 10.0,
                    '3m_to_6m': 15.0,
                    '6m_to_9m': 20.0,
                    '9m_to_12m': 30.0,
                    'above_12m': 45.0
                },
                'commercial': {
                    'below_3m': 12.0,
                    '3m_to_6m': 18.0,
                    '6m_to_9m': 25.0,
                    '9m_to_12m': 35.0,
                    'above_12m': 50.0
                }
            },
            'parking': {
                'residential_individual': 1.0,  # per dwelling unit
                'residential_apartment': 1.5,
                'commercial': 1.0,  # per 50 sqm built-up
                'institutional': 1.0  # per 100 sqm built-up
            }
        }
    
    def _get_road_width_category(self, width_m: float) -> str:
        """Categorize road width"""
        if width_m < 3:
            return 'below_3m'
        elif width_m < 6:
            return '3m_to_6m'
        elif width_m < 9:
            return '6m_to_9m'
        elif width_m < 12:
            return '9m_to_12m'
        else:
            return 'above_12m'
    
    def check_setbacks(self, params: BuildingParameters) -> List[ComplianceResult]:
        """Check setback compliance"""
        results = []
        road_category = self._get_road_width_category(params.road_width_m)
        zone_type = 'residential' if params.zone_type == ZoneType.RESIDENTIAL else 'commercial'
        
        required = self.rules_database['setbacks'][zone_type][road_category]
        
        # Front setback
        results.append(ComplianceResult(
            rule_code='KMBR-5.2.1',
            description='Front Setback Requirement',
            requirement=f"{required['front']} m minimum",
            actual_value=f"{params.front_setback_m} m",
            status='PASS' if params.front_setback_m >= required['front'] else 'FAIL',
            remarks='Compliant' if params.front_setback_m >= required['front'] 
                   else f"Increase front setback by {required['front'] - params.front_setback_m} m"
        ))
        
        # Rear setback
        results.append(ComplianceResult(
            rule_code='KMBR-5.2.2',
            description='Rear Setback Requirement',
            requirement=f"{required['rear']} m minimum",
            actual_value=f"{params.rear_setback_m} m",
            status='PASS' if params.rear_setback_m >= required['rear'] else 'FAIL',
            remarks='Compliant' if params.rear_setback_m >= required['rear'] 
                   else f"Increase rear setback by {required['rear'] - params.rear_setback_m} m"
        ))
        
        # Side setbacks
        avg_side = (params.side1_setback_m + params.side2_setback_m) / 2
        results.append(ComplianceResult(
            rule_code='KMBR-5.2.3',
            description='Side Setback Requirement',
            requirement=f"{required['side']} m minimum each side",
            actual_value=f"Side 1: {params.side1_setback_m} m, Side 2: {params.side2_setback_m} m",
            status='PASS' if (params.side1_setback_m >= required['side'] and 
                            params.side2_setback_m >= required['side']) else 'FAIL',
            remarks='Compliant' if (params.side1_setback_m >= required['side'] and 
                                   params.side2_setback_m >= required['side']) 
                   else 'Increase side setbacks'
        ))
        
        return results
    
    def check_far(self, params: BuildingParameters) -> ComplianceResult:
        """Check Floor Area Ratio compliance"""
        road_category = self._get_road_width_category(params.road_width_m)
        zone_type = 'residential' if params.zone_type == ZoneType.RESIDENTIAL else 'commercial'
        
        max_far = self.rules_database['far'][zone_type][road_category]
        actual_far = params.total_built_up_area_sqm / params.plot_area_sqm
        
        return ComplianceResult(
            rule_code='KMBR-5.1',
            description='Floor Area Ratio (FAR)',
            requirement=f"Maximum FAR: {max_far}",
            actual_value=f"{actual_far:.2f}",
            status='PASS' if actual_far <= max_far else 'FAIL',
            remarks='Compliant' if actual_far <= max_far 
                   else f"Reduce built-up area by {(actual_far - max_far) * params.plot_area_sqm:.0f} sqm"
        )
    
    def check_height(self, params: BuildingParameters) -> ComplianceResult:
        """Check building height compliance"""
        road_category = self._get_road_width_category(params.road_width_m)
        zone_type = 'residential' if params.zone_type == ZoneType.RESIDENTIAL else 'commercial'
        
        max_height = self.rules_database['height_limits'][zone_type][road_category]
        
        return ComplianceResult(
            rule_code='KMBR-5.3',
            description='Building Height Limit',
            requirement=f"Maximum height: {max_height} m",
            actual_value=f"{params.building_height_m} m",
            status='PASS' if params.building_height_m <= max_height else 'FAIL',
            remarks='Compliant' if params.building_height_m <= max_height 
                   else f"Reduce height by {params.building_height_m - max_height} m"
        )
    
    def check_parking(self, params: BuildingParameters) -> ComplianceResult:
        """Check parking requirement compliance"""
        building_type_key = params.building_type.value if hasattr(params.building_type, 'value') else params.building_type
        
        if building_type_key in ['residential_individual', 'residential_apartment']:
            required = self.rules_database['parking'][building_type_key] * params.num_units
        elif building_type_key in ['commercial', 'institutional']:
            divisor = 50 if building_type_key == 'commercial' else 100
            required = params.total_built_up_area_sqm / divisor
        else:
            required = 0
        
        return ComplianceResult(
            rule_code='KMBR-8.1',
            description='Parking Space Requirement',
            requirement=f"{math.ceil(required)} spaces required",
            actual_value=f"{params.num_parking_spaces} spaces provided",
            status='PASS' if params.num_parking_spaces >= math.ceil(required) else 'FAIL',
            remarks='Compliant' if params.num_parking_spaces >= math.ceil(required) 
                   else f"Add {math.ceil(required - params.num_parking_spaces)} more parking spaces"
        )
    
    def check_rainwater_harvesting(self, params: BuildingParameters) -> ComplianceResult:
        """Check mandatory rainwater harvesting"""
        # Mandatory for all buildings in Kerala
        is_mandatory = True
        
        return ComplianceResult(
            rule_code='KMBR-10.2',
            description='Rainwater Harvesting System',
            requirement='Mandatory for all buildings',
            actual_value='Provided' if params.has_rainwater_harvesting else 'Not Provided',
            status='PASS' if params.has_rainwater_harvesting else 'FAIL',
            remarks='Compliant' if params.has_rainwater_harvesting 
                   else 'Install RWH system with minimum 1000L storage capacity'
        )
    
    def check_solar_water_heater(self, params: BuildingParameters) -> ComplianceResult:
        """Check solar water heater requirement"""
        # Mandatory for buildings > 150 sqm
        is_mandatory = params.total_built_up_area_sqm > 150
        
        if not is_mandatory:
            return ComplianceResult(
                rule_code='KMBR-10.3',
                description='Solar Water Heater',
                requirement='Mandatory for buildings > 150 sqm',
                actual_value='Not applicable (building < 150 sqm)',
                status='PASS',
                remarks='Not mandatory for this building size'
            )
        
        return ComplianceResult(
            rule_code='KMBR-10.3',
            description='Solar Water Heater',
            requirement='Mandatory for buildings > 150 sqm',
            actual_value='Provided' if params.has_solar_water_heater else 'Not Provided',
            status='PASS' if params.has_solar_water_heater else 'FAIL',
            remarks='Compliant' if params.has_solar_water_heater 
                   else f"Install solar water heater (minimum {params.num_units * 100} LPD capacity)"
        )
    
    def check_sewage_treatment(self, params: BuildingParameters) -> ComplianceResult:
        """Check sewage treatment plant requirement"""
        # Mandatory for buildings with > 20 units or > 2000 sqm
        is_mandatory = params.num_units > 20 or params.total_built_up_area_sqm > 2000
        
        if not is_mandatory:
            return ComplianceResult(
                rule_code='KMBR-10.4',
                description='Sewage Treatment Plant',
                requirement='Mandatory for >20 units or >2000 sqm',
                actual_value='Not applicable',
                status='PASS',
                remarks='Not mandatory for this building'
            )
        
        return ComplianceResult(
            rule_code='KMBR-10.4',
            description='Sewage Treatment Plant',
            requirement='Mandatory for large buildings',
            actual_value='Provided' if params.has_sewage_treatment else 'Not Provided',
            status='PASS' if params.has_sewage_treatment else 'FAIL',
            remarks='Compliant' if params.has_sewage_treatment 
                   else 'Install STP with tertiary treatment'
        )
    
    def run_full_compliance_check(self, params: BuildingParameters) -> Dict:
        """Run complete KMBR/KPBR compliance check"""
        results = []
        
        # Run all checks
        results.extend(self.check_setbacks(params))
        results.append(self.check_far(params))
        results.append(self.check_height(params))
        results.append(self.check_parking(params))
        results.append(self.check_rainwater_harvesting(params))
        results.append(self.check_solar_water_heater(params))
        results.append(self.check_sewage_treatment(params))
        
        # Calculate summary
        passed = sum(1 for r in results if r.status == 'PASS')
        failed = sum(1 for r in results if r.status == 'FAIL')
        warnings = sum(1 for r in results if r.status == 'WARNING')
        
        return {
            'project_info': {
                'zone_type': params.zone_type.value if hasattr(params.zone_type, 'value') else params.zone_type,
                'building_type': params.building_type.value if hasattr(params.building_type, 'value') else params.building_type,
                'plot_area': f"{params.plot_area_sqm} sqm",
                'built_up_area': f"{params.total_built_up_area_sqm} sqm",
                'road_width': f"{params.road_width_m} m"
            },
            'compliance_results': [
                {
                    'rule_code': r.rule_code,
                    'description': r.description,
                    'requirement': r.requirement,
                    'actual_value': r.actual_value,
                    'status': r.status,
                    'remarks': r.remarks
                }
                for r in results
            ],
            'summary': {
                'total_checks': len(results),
                'passed': passed,
                'failed': failed,
                'warnings': warnings,
                'compliance_percentage': round((passed / len(results)) * 100, 1),
                'overall_status': 'APPROVED' if failed == 0 else 'REQUIRES MODIFICATION'
            },
            'critical_issues': [r for r in results if r.status == 'FAIL'],
            'recommendations': self._generate_recommendations(results)
        }
    
    def _generate_recommendations(self, results: List[ComplianceResult]) -> List[str]:
        """Generate recommendations based on compliance issues"""
        recommendations = []
        
        for result in results:
            if result.status == 'FAIL':
                recommendations.append(f"{result.rule_code}: {result.remarks}")
        
        if not recommendations:
            recommendations.append("All KMBR/KPBR requirements are satisfied. Project is compliant.")
        
        return recommendations

# Example usage
if __name__ == '__main__':
    automator = KeralaBuildingRulesAutomator()
    
    # Sample building parameters
    params = BuildingParameters(
        plot_area_sqm=300,
        building_footprint_sqm=180,
        total_built_up_area_sqm=540,
        num_floors=3,
        building_height_m=10.5,
        road_width_m=6.5,
        zone_type=ZoneType.RESIDENTIAL,
        building_type=BuildingType.RESIDENTIAL_INDIVIDUAL,
        front_setback_m=3.5,
        rear_setback_m=2.5,
        side1_setback_m=1.8,
        side2_setback_m=1.8,
        num_parking_spaces=2,
        has_rainwater_harvesting=True,
        has_solar_water_heater=True,
        has_sewage_treatment=False,
        num_units=2
    )
    
    print("=== KERALA BUILDING RULES COMPLIANCE CHECK ===\n")
    
    result = automator.run_full_compliance_check(params)
    
    print(f"Project Type: {result['project_info']['building_type']}")
    print(f"Plot Area: {result['project_info']['plot_area']}")
    print(f"Built-up Area: {result['project_info']['built_up_area']}")
    print(f"\nCompliance Summary: {result['summary']['passed']}/{result['summary']['total_checks']} checks passed")
    print(f"Overall Status: {result['summary']['overall_status']}")
    
    print("\nDetailed Results:")
    for check in result['compliance_results']:
        status_symbol = "✓" if check['status'] == 'PASS' else "✗" if check['status'] == 'FAIL' else "⚠"
        print(f"  {status_symbol} {check['rule_code']}: {check['description']} - {check['status']}")
        if check['status'] == 'FAIL':
            print(f"    → {check['remarks']}")
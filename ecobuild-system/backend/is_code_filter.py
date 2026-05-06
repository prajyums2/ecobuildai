# EcoBuild System - IS Code Compliance Filter
# Pre-AHP gate that eliminates materials failing IS code requirements

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

class ComplianceStatus(Enum):
    PASS = "pass"
    FAIL = "fail"
    WARNING = "warning"
    NOT_APPLICABLE = "not_applicable"

@dataclass
class ComplianceResult:
    status: ComplianceStatus
    message: str
    is_code: str
    requirement: str
    actual_value: Optional[float] = None
    required_value: Optional[float] = None

@dataclass
class ISCodeRequirement:
    is_code: str
    name: str
    category: str
    min_compressive_strength: Optional[float] = None
    min_tensile_strength: Optional[float] = None
    min_durability: Optional[float] = None
    max_water_absorption: Optional[float] = None
    max_embodied_carbon: Optional[float] = None
    notes: str = ""

IS_CODE_REQUIREMENTS: Dict[str, ISCodeRequirement] = {
    # CONCRETE (IS 456:2000)
    "concrete_m15": ISCodeRequirement(
        is_code="IS 456:2000", name="M15 PCC", category="concrete",
        min_compressive_strength=15.0, min_durability=30,
        notes="Minimum grade for PCC as per IS 456 Table 5"
    ),
    "concrete_m20": ISCodeRequirement(
        is_code="IS 456:2000", name="M20 RCC", category="concrete",
        min_compressive_strength=20.0, min_durability=50,
        notes="Minimum grade for RCC in mild exposure as per IS 456 Table 5"
    ),
    "concrete_m25": ISCodeRequirement(
        is_code="IS 456:2000", name="M25 RCC", category="concrete",
        min_compressive_strength=25.0, min_durability=50,
        notes="Recommended for moderate exposure as per IS 456 Table 5"
    ),
    "concrete_m30": ISCodeRequirement(
        is_code="IS 456:2000", name="M30 RCC", category="concrete",
        min_compressive_strength=30.0, min_durability=60,
        notes="For severe exposure conditions as per IS 456 Table 5"
    ),
    # STEEL (IS 1786:2008)
    "steel_fe415": ISCodeRequirement(
        is_code="IS 1786:2008", name="Fe415 TMT", category="steel",
        min_tensile_strength=415.0, min_durability=50,
        notes="Minimum yield strength for RCC as per IS 456"
    ),
    "steel_fe500": ISCodeRequirement(
        is_code="IS 1786:2008", name="Fe500 TMT", category="steel",
        min_tensile_strength=500.0, min_durability=50,
        notes="Recommended for seismic zones as per IS 13920"
    ),
    "steel_fe550": ISCodeRequirement(
        is_code="IS 1786:2008", name="Fe550 TMT", category="steel",
        min_tensile_strength=550.0, min_durability=50,
        notes="High strength for heavy structures"
    ),
    # CEMENT
    "cement_opc_53": ISCodeRequirement(
        is_code="IS 12269:2013", name="OPC 53 Grade", category="cement",
        min_compressive_strength=53.0, min_durability=50,
        notes="For high strength concrete as per IS 456"
    ),
    "cement_opc_43": ISCodeRequirement(
        is_code="IS 8112:2013", name="OPC 43 Grade", category="cement",
        min_compressive_strength=43.0, min_durability=50,
        notes="For general construction as per IS 456"
    ),
    "cement_ppc": ISCodeRequirement(
        is_code="IS 1489:2015", name="PPC Fly Ash", category="cement",
        min_compressive_strength=43.0, min_durability=50, max_embodied_carbon=0.65,
        notes="Preferred for Kerala - lower carbon, better durability"
    ),
    "cement_psc": ISCodeRequirement(
        is_code="IS 455:2015", name="PSC Slag", category="cement",
        min_compressive_strength=45.0, min_durability=60, max_embodied_carbon=0.50,
        notes="Excellent for marine environments - IS 456 Table 5"
    ),
    # MASONRY
    "masonry_aac": ISCodeRequirement(
        is_code="IS 2185:2013", name="AAC Blocks", category="masonry",
        min_compressive_strength=3.5, max_water_absorption=30.0, min_durability=50,
        notes="Grade 3 minimum for load-bearing walls as per IS 1905"
    ),
    "masonry_concrete_block": ISCodeRequirement(
        is_code="IS 2185:2013", name="Concrete Blocks", category="masonry",
        min_compressive_strength=4.0, max_water_absorption=15.0, min_durability=50,
        notes="Grade 3.5 minimum as per IS 2185 Part 1"
    ),
    "masonry_clay_brick": ISCodeRequirement(
        is_code="IS 1077:1992", name="Clay Bricks", category="masonry",
        min_compressive_strength=3.5, max_water_absorption=20.0, min_durability=50,
        notes="Class 3.5 minimum as per IS 1077"
    ),
    "masonry_fly_ash_brick": ISCodeRequirement(
        is_code="IS 12894:2010", name="Fly Ash Bricks", category="masonry",
        min_compressive_strength=7.0, max_water_absorption=15.0, min_durability=50,
        notes="Class 7.0 minimum as per IS 12894"
    ),
    "masonry_stone": ISCodeRequirement(
        is_code="IS 1905:1987", name="Stone Masonry", category="masonry",
        min_compressive_strength=3.5, max_water_absorption=10.0, min_durability=75,
        notes="Laterite stone minimum strength as per IS 1905"
    ),
    # AGGREGATES (IS 383:2016)
    "aggregate_fine": ISCodeRequirement(
        is_code="IS 383:2016", name="Fine Aggregate", category="aggregates",
        max_water_absorption=3.0, min_durability=100,
        notes="Zone II grading as per IS 383 Table 4"
    ),
    "aggregate_coarse": ISCodeRequirement(
        is_code="IS 383:2016", name="Coarse Aggregate", category="aggregates",
        max_water_absorption=2.0, min_durability=100,
        notes="Max 20mm size for RCC as per IS 456"
    ),
    "aggregate_rca": ISCodeRequirement(
        is_code="IS 383:2016", name="Recycled Aggregate", category="aggregates",
        max_water_absorption=6.0, min_durability=50,
        notes="Max 25% replacement in RCC as per IS 456"
    ),
    # FINISHING
    "flooring_tiles": ISCodeRequirement(
        is_code="IS 15622:2006", name="Floor Tiles", category="flooring",
        min_compressive_strength=25.0, max_water_absorption=3.0, min_durability=15,
        notes="As per IS 15622 for ceramic/vitrified tiles"
    ),
    "paint_interior": ISCodeRequirement(
        is_code="IS 2619:2003", name="Interior Paint", category="finish",
        min_durability=5, notes="As per IS 2619 for emulsion paints"
    ),
    "paint_exterior": ISCodeRequirement(
        is_code="IS 2619:2003", name="Exterior Paint", category="finish",
        min_durability=7, notes="Weatherproof as per IS 2619"
    ),
    "waterproofing": ISCodeRequirement(
        is_code="IS 2645:2003", name="Waterproofing", category="finish",
        min_durability=10, notes="As per IS 2645 for integral waterproofing"
    ),
    # ADDITIONAL IS CODES
    "steel_structural": ISCodeRequirement(
        is_code="IS 2062:2011", name="Structural Steel", category="steel",
        min_tensile_strength=250.0, min_durability=50,
        notes="General construction steel as per IS 2062"
    ),
    "steel_mild": ISCodeRequirement(
        is_code="IS 432:1982", name="Mild Steel Bars", category="steel",
        min_tensile_strength=250.0, min_durability=50,
        notes="Mild steel for non-structural RCC as per IS 432"
    ),
    "concrete_rmc": ISCodeRequirement(
        is_code="IS 4926:2003", name="Ready Mix Concrete", category="concrete",
        min_compressive_strength=20.0, min_durability=50,
        notes="RMC quality control as per IS 4926"
    ),
    "masonry_laterite": ISCodeRequirement(
        is_code="IS 3620:1979", name="Laterite Stone", category="masonry",
        min_compressive_strength=3.5, max_water_absorption=12.0, min_durability=75,
        notes="Kerala laterite stone as per IS 3620"
    ),
    "masonry_precast": ISCodeRequirement(
        is_code="IS 15658:2006", name="Pre-cast Concrete", category="masonry",
        min_compressive_strength=15.0, min_durability=50,
        notes="Pre-cast concrete elements as per IS 15658"
    ),
    "finish_hdpe": ISCodeRequirement(
        is_code="IS 4984:2016", name="HDPE Pipes", category="finish",
        min_durability=50, notes="HDPE water supply pipes as per IS 4984"
    ),
    "finish_earthing": ISCodeRequirement(
        is_code="IS 3043:2018", name="Earthing Electrode", category="finish",
        min_durability=30, notes="Earthing/grounding as per IS 3043"
    ),
    "timber_bamboo": ISCodeRequirement(
        is_code="IS 1948:1961", name="Bamboo Products", category="timber",
        min_compressive_strength=20.0, min_durability=10,
        notes="Bamboo composite boards as per IS 1948"
    ),
}

class ISCodeFilter:
    """Pre-AHP filter that eliminates materials failing IS code requirements"""

    def __init__(self, building_params: Optional[Dict] = None):
        self.building_params = building_params or {}
        self.seismic_zone = self.building_params.get('seismicZone', 'III')
        self.exposure = self.building_params.get('exposureCondition', 'moderate')

    def check_material_compliance(self, material: Dict, element_type: Optional[str] = None) -> List[ComplianceResult]:
        """Check if a material meets IS code requirements for its category"""
        results = []
        category = material.get('category', '').lower()
        phys = material.get('physical_properties', {})
        env = material.get('environmental_properties', {})
        civ = material.get('civil_properties', {})

        compressive_strength = phys.get('compressive_strength', 0)
        tensile_strength = phys.get('tensile_strength', phys.get('yield_strength', 0))
        water_absorption = phys.get('water_absorption', 0)
        durability = civ.get('durability_years', 0)
        embodied_carbon = env.get('embodied_carbon', 0)

        applicable_reqs = [r for r in IS_CODE_REQUIREMENTS.values() if r.category == category]
        if not applicable_reqs:
            return [ComplianceResult(
                status=ComplianceStatus.NOT_APPLICABLE,
                message=f"No IS code requirements for category: {category}",
                is_code="N/A", requirement="N/A"
            )]

        for req in applicable_reqs:
            result = self._check_requirement(material, req)
            if result:
                results.append(result)
        return results

    def _check_requirement(self, material: Dict, req: ISCodeRequirement) -> Optional[ComplianceResult]:
        phys = material.get('physical_properties', {})
        env = material.get('environmental_properties', {})
        civ = material.get('civil_properties', {})

        cs = phys.get('compressive_strength', 0)
        ts = phys.get('tensile_strength', phys.get('yield_strength', 0))
        wa = phys.get('water_absorption', 0)
        dur = civ.get('durability_years', 0)
        ec = env.get('embodied_carbon', 0)

        if req.min_compressive_strength and cs > 0 and cs < req.min_compressive_strength:
            return ComplianceResult(ComplianceStatus.FAIL,
                f"Compressive strength {cs} MPa < min {req.min_compressive_strength} MPa",
                req.is_code, f"Min {req.min_compressive_strength} MPa", cs, req.min_compressive_strength)
        if req.min_tensile_strength and ts > 0 and ts < req.min_tensile_strength:
            return ComplianceResult(ComplianceStatus.FAIL,
                f"Tensile strength {ts} MPa < min {req.min_tensile_strength} MPa",
                req.is_code, f"Min {req.min_tensile_strength} MPa", ts, req.min_tensile_strength)
        if req.max_water_absorption and wa > 0 and wa > req.max_water_absorption:
            return ComplianceResult(ComplianceStatus.WARNING,
                f"Water absorption {wa}% > max {req.max_water_absorption}%",
                req.is_code, f"Max {req.max_water_absorption}%", wa, req.max_water_absorption)
        if req.min_durability and dur > 0 and dur < req.min_durability:
            return ComplianceResult(ComplianceStatus.WARNING,
                f"Durability {dur} years < recommended {req.min_durability} years",
                req.is_code, f"Min {req.min_durability} years", dur, req.min_durability)
        if req.max_embodied_carbon and ec > 0 and ec > req.max_embodied_carbon:
            return ComplianceResult(ComplianceStatus.WARNING,
                f"Embodied carbon {ec} > max {req.max_embodied_carbon}",
                req.is_code, f"Max {req.max_embodied_carbon}", ec, req.max_embodied_carbon)

        return ComplianceResult(ComplianceStatus.PASS,
            f"Meets {req.is_code} requirements for {req.name}", req.is_code, req.name)

    def filter_materials(self, materials: List[Dict], element_type: Optional[str] = None) -> Tuple[List[Dict], List[Dict]]:
        """Filter materials into compliant and non-compliant lists"""
        compliant, non_compliant = [], []
        for mat in materials:
            results = self.check_material_compliance(mat, element_type)
            has_fail = any(r.status == ComplianceStatus.FAIL for r in results)
            if has_fail:
                non_compliant.append({'material': mat, 'reasons': [r.message for r in results if r.status == ComplianceStatus.FAIL]})
            else:
                compliant.append({'material': mat, 'compliance_results': results})
        return compliant, non_compliant

    def get_compliance_score(self, material: Dict) -> float:
        """Calculate IS code compliance score (0.0 to 1.0) for AHP"""
        results = self.check_material_compliance(material)
        if not results:
            return 0.5
        pass_count = sum(1 for r in results if r.status == ComplianceStatus.PASS)
        fail_count = sum(1 for r in results if r.status == ComplianceStatus.FAIL)
        warning_count = sum(1 for r in results if r.status == ComplianceStatus.WARNING)
        if fail_count > 0:
            return 0.0
        total = len(results)
        return min(1.0, (pass_count + 0.5 * warning_count) / total)

    def get_seismic_requirements(self) -> Dict:
        seismic_reqs = {
            'II': {'min_steel_grade': 'Fe415', 'min_concrete_grade': 'M20'},
            'III': {'min_steel_grade': 'Fe415D', 'min_concrete_grade': 'M20'},
            'IV': {'min_steel_grade': 'Fe500D', 'min_concrete_grade': 'M25'},
            'V': {'min_steel_grade': 'Fe500D', 'min_concrete_grade': 'M30'},
        }
        return seismic_reqs.get(self.seismic_zone, seismic_reqs['III'])

    def get_exposure_requirements(self) -> Dict:
        exposure_reqs = {
            'mild': {'min_concrete_grade': 'M20', 'min_cover': 20},
            'moderate': {'min_concrete_grade': 'M25', 'min_cover': 30},
            'severe': {'min_concrete_grade': 'M30', 'min_cover': 45},
            'very_severe': {'min_concrete_grade': 'M35', 'min_cover': 50},
            'extreme': {'min_concrete_grade': 'M40', 'min_cover': 75},
        }
        return exposure_reqs.get(self.exposure, exposure_reqs['moderate'])

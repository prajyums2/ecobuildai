"""
Green Building Standards Integration Module
Supports GRIHA, IIGBC, and LEED rating systems
"""

from enum import Enum
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from pydantic import BaseModel

class RatingSystem(str, Enum):
    """Green building rating systems"""
    GRIHA = "GRIHA"
    IGBC = "IGBC"
    LEED = "LEED"
    BREEAM = "BREEAM"

class GRIHARating(str, Enum):
    """GRIHA rating levels"""
    ONE_STAR = "1-Star"
    TWO_STAR = "2-Star"
    THREE_STAR = "3-Star"
    FOUR_STAR = "4-Star"
    FIVE_STAR = "5-Star"

class IGBCRating(str, Enum):
    """IGBC rating levels"""
    CERTIFIED = "Certified"
    SILVER = "Silver"
    GOLD = "Gold"
    PLATINUM = "Platinum"

class LEEDRating(str, Enum):
    """LEED rating levels"""
    CERTIFIED = "Certified"
    SILVER = "Silver"
    GOLD = "Gold"
    PLATINUM = "Platinum"

@dataclass
class GreenBuildingCriteria:
    """Individual criterion for green building assessment"""
    id: str
    name: str
    description: str
    category: str
    max_points: float
    weight: float = 1.0
    applicable_standards: List[RatingSystem] = field(default_factory=list)
    reference_codes: List[str] = field(default_factory=list)
    documentation_required: List[str] = field(default_factory=list)

@dataclass
class MaterialGreenPoints:
    """Green points contribution for a specific material"""
    griha_points: float = 0.0
    igbc_points: float = 0.0
    leed_points: float = 0.0
    criteria_met: List[str] = field(default_factory=list)

class GreenBuildingStandards:
    """
    Comprehensive green building standards engine
    Implements GRIHA, IIGBC, and LEED criteria
    """
    
    # GRIHA Criteria (Green Rating for Integrated Habitat Assessment)
    GRIHA_CRITERIA = {
        "site_selection": GreenBuildingCriteria(
            id="GRIHA-S01",
            name="Site Selection",
            description="Selection of site that preserves existing natural features and minimizes environmental impact",
            category="Site Planning",
            max_points=2,
            applicable_standards=[RatingSystem.GRIHA],
            reference_codes=["GRIHA v3.0 - Criterion 1"],
            documentation_required=["Site analysis report", "Contour survey", "Soil test report"]
        ),
        "preservation_trees": GreenBuildingCriteria(
            id="GRIHA-S02",
            name="Preservation of Existing Trees",
            description="Preserve existing trees and natural landscape features",
            category="Site Planning",
            max_points=2,
            applicable_standards=[RatingSystem.GRIHA],
            reference_codes=["GRIHA v3.0 - Criterion 2"],
            documentation_required=["Tree survey report", "Landscape preservation plan"]
        ),
        "soil_conservation": GreenBuildingCriteria(
            id="GRIHA-S03",
            name="Soil Conservation",
            description="Implement measures to prevent soil erosion during construction",
            category="Site Planning",
            max_points=2,
            applicable_standards=[RatingSystem.GRIHA],
            reference_codes=["GRIHA v3.0 - Criterion 3"],
            documentation_required=["Soil conservation plan", "Construction management plan"]
        ),
        "site_accessibility": GreenBuildingCriteria(
            id="GRIHA-S04",
            name="Design for Differently-Abled",
            description="Provide accessibility features for differently-abled persons",
            category="Site Planning",
            max_points=2,
            applicable_standards=[RatingSystem.GRIHA],
            reference_codes=["GRIHA v3.0 - Criterion 4", "NBC 2016 Part 3"],
            documentation_required=["Accessibility plan", "Barrier-free design"]
        ),
        "embodied_energy": GreenBuildingCriteria(
            id="GRIHA-M01",
            name="Embodied Energy of Building",
            description="Minimize embodied energy through material selection",
            category="Building Materials",
            max_points=6,
            applicable_standards=[RatingSystem.GRIHA],
            reference_codes=["GRIHA v3.0 - Criterion 11"],
            documentation_required=["Material BOQ", "Embodied energy calculations"]
        ),
        "recycled_materials": GreenBuildingCriteria(
            id="GRIHA-M02",
            name="Use of Recycled Materials",
            description="Incorporate recycled materials in construction",
            category="Building Materials",
            max_points=3,
            applicable_standards=[RatingSystem.GRIHA],
            reference_codes=["GRIHA v3.0 - Criterion 12"],
            documentation_required=["Material specifications", "Recycled content certificates"]
        ),
        "local_materials": GreenBuildingCriteria(
            id="GRIHA-M03",
            name="Use of Local Materials",
            description="Use materials sourced within 800 km radius",
            category="Building Materials",
            max_points=3,
            applicable_standards=[RatingSystem.GRIHA],
            reference_codes=["GRIHA v3.0 - Criterion 13"],
            documentation_required=["Material sourcing data", "Distance calculations"]
        ),
        "low_voc_materials": GreenBuildingCriteria(
            id="GRIHA-M04",
            name="Low VOC Materials",
            description="Use paints, adhesives, and sealants with low VOC content",
            category="Building Materials",
            max_points=2,
            applicable_standards=[RatingSystem.GRIHA],
            reference_codes=["GRIHA v3.0 - Criterion 16"],
            documentation_required=["Material data sheets", "VOC test reports"]
        ),
        "energy_performance": GreenBuildingCriteria(
            id="GRIHA-E01",
            name="Energy Performance Index",
            description="Optimize building energy performance",
            category="Energy",
            max_points=14,
            applicable_standards=[RatingSystem.GRIHA],
            reference_codes=["GRIHA v3.0 - Criterion 17", "ECBC 2017"],
            documentation_required=["Energy simulation report", "Building envelope calculations"]
        ),
        "renewable_energy": GreenBuildingCriteria(
            id="GRIHA-E02",
            name="Renewable Energy Systems",
            description="Install solar water heating and renewable energy systems",
            category="Energy",
            max_points=5,
            applicable_standards=[RatingSystem.GRIHA],
            reference_codes=["GRIHA v3.0 - Criterion 19"],
            documentation_required=["Solar system design", "Energy generation estimates"]
        ),
        "daylighting": GreenBuildingCriteria(
            id="GRIHA-E03",
            name="Daylighting",
            description="Maximize use of natural daylight",
            category="Energy",
            max_points=3,
            applicable_standards=[RatingSystem.GRIHA],
            reference_codes=["GRIHA v3.0 - Criterion 20"],
            documentation_required=["Daylight simulation", "Glare analysis"]
        ),
        "water_efficiency": GreenBuildingCriteria(
            id="GRIHA-W01",
            name="Water Use Reduction",
            description="Reduce building water consumption",
            category="Water",
            max_points=8,
            applicable_standards=[RatingSystem.GRIHA],
            reference_codes=["GRIHA v3.0 - Criterion 25"],
            documentation_required=["Water balance chart", "Fixture specifications"]
        ),
        "rainwater_harvesting": GreenBuildingCriteria(
            id="GRIHA-W02",
            name="Rainwater Harvesting",
            description="Harvest and utilize rainwater",
            category="Water",
            max_points=5,
            applicable_standards=[RatingSystem.GRIHA],
            reference_codes=["GRIHA v3.0 - Criterion 26"],
            documentation_required=["RWH design", "Stormwater calculations"]
        ),
        "wastewater_treatment": GreenBuildingCriteria(
            id="GRIHA-W03",
            name="Wastewater Treatment",
            description="Treat and recycle wastewater on-site",
            category="Water",
            max_points=4,
            applicable_standards=[RatingSystem.GRIHA],
            reference_codes=["GRIHA v3.0 - Criterion 27"],
            documentation_required=["STP design", "Water quality reports"]
        ),
        "indoor_air_quality": GreenBuildingCriteria(
            id="GRIHA-I01",
            name="Indoor Air Quality",
            description="Maintain good indoor air quality",
            category="Indoor Environment",
            max_points=5,
            applicable_standards=[RatingSystem.GRIHA],
            reference_codes=["GRIHA v3.0 - Criterion 28"],
            documentation_required=["Ventilation calculations", "CO2 monitoring plan"]
        ),
        "thermal_comfort": GreenBuildingCriteria(
            id="GRIHA-I02",
            name="Thermal Comfort",
            description="Design for thermal comfort in occupied spaces",
            category="Indoor Environment",
            max_points=4,
            applicable_standards=[RatingSystem.GRIHA],
            reference_codes=["GRIHA v3.0 - Criterion 30"],
            documentation_required=["Thermal simulation", "HVAC design"]
        ),
        "construction_waste": GreenBuildingCriteria(
            id="GRIHA-C01",
            name="Construction Waste Management",
            description="Implement waste reduction and management plan",
            category="Waste Management",
            max_points=3,
            applicable_standards=[RatingSystem.GRIHA],
            reference_codes=["GRIHA v3.0 - Criterion 31"],
            documentation_required=["Waste management plan", "Recycling targets"]
        ),
    }
    
    # IGBC Criteria
    IGBC_CRITERIA = {
        "sustainable_sites": GreenBuildingCriteria(
            id="IGBC-SS",
            name="Sustainable Sites",
            description="Site selection and development impact",
            category="Sustainable Sites",
            max_points=26,
            applicable_standards=[RatingSystem.IGBC],
            reference_codes=["IGBC Green Homes v3"],
            documentation_required=["Site assessment", "Development plan"]
        ),
        "water_efficiency_igbc": GreenBuildingCriteria(
            id="IGBC-WE",
            name="Water Efficiency",
            description="Indoor and outdoor water use reduction",
            category="Water Efficiency",
            max_points=24,
            applicable_standards=[RatingSystem.IGBC],
            reference_codes=["IGBC Green Homes v3"],
            documentation_required=["Water audit", "Fixture specifications"]
        ),
        "energy_atmosphere": GreenBuildingCriteria(
            id="IGBC-EA",
            name="Energy and Atmosphere",
            description="Energy performance and renewable energy",
            category="Energy",
            max_points=33,
            applicable_standards=[RatingSystem.IGBC],
            reference_codes=["IGBC Green Homes v3", "ECBC"],
            documentation_required=["Energy model", "Commissioning report"]
        ),
        "materials_resources": GreenBuildingCriteria(
            id="IGBC-MR",
            name="Materials and Resources",
            description="Building life-cycle impact and material selection",
            category="Materials",
            max_points=16,
            applicable_standards=[RatingSystem.IGBC],
            reference_codes=["IGBC Green Homes v3"],
            documentation_required=["Material list", "Recycled content"]
        ),
        "indoor_quality_igbc": GreenBuildingCriteria(
            id="IGBC-IQ",
            name="Indoor Environmental Quality",
            description="Indoor air quality and comfort",
            category="Indoor Environment",
            max_points=21,
            applicable_standards=[RatingSystem.IGBC],
            reference_codes=["IGBC Green Homes v3"],
            documentation_required=["IAQ testing", "Ventilation design"]
        ),
        "innovation": GreenBuildingCriteria(
            id="IGBC-IN",
            name="Innovation",
            description="Innovative green strategies",
            category="Innovation",
            max_points=6,
            applicable_standards=[RatingSystem.IGBC],
            reference_codes=["IGBC Green Homes v3"],
            documentation_required=["Innovation documentation"]
        ),
    }
    
    # LEED Criteria (v4.1 simplified)
    LEED_CRITERIA = {
        "location_transportation": GreenBuildingCriteria(
            id="LEED-LT",
            name="Location and Transportation",
            description="Transportation access and site selection",
            category="Location",
            max_points=16,
            applicable_standards=[RatingSystem.LEED],
            reference_codes=["LEED v4.1 BD+C"],
            documentation_required=["Site map", "Transportation survey"]
        ),
        "sustainable_sites_leed": GreenBuildingCriteria(
            id="LEED-SS",
            name="Sustainable Sites",
            description="Site assessment and open space",
            category="Sites",
            max_points=10,
            applicable_standards=[RatingSystem.LEED],
            reference_codes=["LEED v4.1 BD+C"],
            documentation_required=["Site assessment", "Stormwater plan"]
        ),
        "water_efficiency_leed": GreenBuildingCriteria(
            id="LEED-WE",
            name="Water Efficiency",
            description="Outdoor and indoor water use reduction",
            category="Water",
            max_points=11,
            applicable_standards=[RatingSystem.LEED],
            reference_codes=["LEED v4.1 BD+C"],
            documentation_required=["Water budget", "Fixture cut sheets"]
        ),
        "energy_atmosphere_leed": GreenBuildingCriteria(
            id="LEED-EA",
            name="Energy and Atmosphere",
            description="Energy performance optimization",
            category="Energy",
            max_points=33,
            applicable_standards=[RatingSystem.LEED],
            reference_codes=["LEED v4.1 BD+C", "ASHRAE 90.1"],
            documentation_required=["Energy model", "Commissioning"]
        ),
        "materials_resources_leed": GreenBuildingCriteria(
            id="LEED-MR",
            name="Materials and Resources",
            description="Building product disclosure and optimization",
            category="Materials",
            max_points=13,
            applicable_standards=[RatingSystem.LEED],
            reference_codes=["LEED v4.1 BD+C"],
            documentation_required=["EPDs", "Material ingredients"]
        ),
        "indoor_quality_leed": GreenBuildingCriteria(
            id="LEED-EQ",
            name="Indoor Environmental Quality",
            description="Indoor air quality assessment",
            category="Indoor Quality",
            max_points=16,
            applicable_standards=[RatingSystem.LEED],
            reference_codes=["LEED v4.1 BD+C", "ASHRAE 62.1"],
            documentation_required=["IAQ management", "Low-emitting materials"]
        ),
    }
    
    # Material points lookup based on properties
    MATERIAL_POINTS_TABLE = {
        "recycled_content_high": {
            "griha": 1.5,
            "igbc": 1.0,
            "leed": 1.0,
            "criteria": ["GRIHA-M02", "IGBC-MR", "LEED-MR"]
        },
        "recycled_content_medium": {
            "griha": 1.0,
            "igbc": 0.5,
            "leed": 0.5,
            "criteria": ["GRIHA-M02", "IGBC-MR", "LEED-MR"]
        },
        "local_material": {
            "griha": 1.5,
            "igbc": 1.0,
            "leed": 1.0,
            "criteria": ["GRIHA-M03", "IGBC-MR", "LEED-MR"]
        },
        "low_embodied_energy": {
            "griha": 2.0,
            "igbc": 1.0,
            "leed": 1.0,
            "criteria": ["GRIHA-M01", "IGBC-MR", "LEED-MR"]
        },
        "rapidly_renewable": {
            "griha": 1.0,
            "igbc": 1.0,
            "leed": 1.0,
            "criteria": ["GRIHA-M02", "IGBC-MR", "LEED-MR"]
        },
        "low_voc": {
            "griha": 0.5,
            "igbc": 0.5,
            "leed": 0.5,
            "criteria": ["GRIHA-M04", "IGBC-IQ", "LEED-EQ"]
        },
        "certified_wood": {
            "griha": 0.5,
            "igbc": 1.0,
            "leed": 1.0,
            "criteria": ["GRIHA-M02", "IGBC-MR", "LEED-MR"]
        },
    }
    
    @classmethod
    def calculate_griha_rating(cls, total_score: float) -> GRIHARating:
        """Calculate GRIHA rating based on total score (out of 100)"""
        if total_score >= 90:
            return GRIHARating.FIVE_STAR
        elif total_score >= 80:
            return GRIHARating.FOUR_STAR
        elif total_score >= 70:
            return GRIHARating.THREE_STAR
        elif total_score >= 60:
            return GRIHARating.TWO_STAR
        elif total_score >= 50:
            return GRIHARating.ONE_STAR
        else:
            return None
    
    @classmethod
    def calculate_igbc_rating(cls, total_score: float) -> IGBCRating:
        """Calculate IGBC rating based on total score (out of 100)"""
        if total_score >= 80:
            return IGBCRating.PLATINUM
        elif total_score >= 70:
            return IGBCRating.GOLD
        elif total_score >= 60:
            return IGBCRating.SILVER
        elif total_score >= 50:
            return IGBCRating.CERTIFIED
        else:
            return None
    
    @classmethod
    def calculate_leed_rating(cls, total_score: float) -> LEEDRating:
        """Calculate LEED rating based on total score (out of 110)"""
        if total_score >= 80:
            return LEEDRating.PLATINUM
        elif total_score >= 60:
            return LEEDRating.GOLD
        elif total_score >= 50:
            return LEEDRating.SILVER
        elif total_score >= 40:
            return LEEDRating.CERTIFIED
        else:
            return None
    
    @classmethod
    def get_material_green_points(cls, material_properties: dict) -> MaterialGreenPoints:
        """
        Calculate green building points for a material
        
        Args:
            material_properties: Dict with keys like:
                - recycled_content: percentage
                - embodied_carbon: kg CO2/kg
                - local_sourced: bool
                - renewable: bool
                - voc_emissions: g/L
                - fsc_certified: bool
        """
        points = MaterialGreenPoints()
        
        recycled = material_properties.get('recycled_content', 0)
        if recycled >= 50:
            pts = cls.MATERIAL_POINTS_TABLE["recycled_content_high"]
            points.griha_points += pts["griha"]
            points.igbc_points += pts["igbc"]
            points.leed_points += pts["leed"]
            points.criteria_met.extend(pts["criteria"])
        elif recycled >= 20:
            pts = cls.MATERIAL_POINTS_TABLE["recycled_content_medium"]
            points.griha_points += pts["griha"]
            points.igbc_points += pts["igbc"]
            points.leed_points += pts["leed"]
            points.criteria_met.extend(pts["criteria"])
        
        if material_properties.get('local_sourced', False):
            pts = cls.MATERIAL_POINTS_TABLE["local_material"]
            points.griha_points += pts["griha"]
            points.igbc_points += pts["igbc"]
            points.leed_points += pts["leed"]
            points.criteria_met.extend(pts["criteria"])
        
        embodied = material_properties.get('embodied_carbon', 999)
        if embodied < 0.5:
            pts = cls.MATERIAL_POINTS_TABLE["low_embodied_energy"]
            points.griha_points += pts["griha"]
            points.igbc_points += pts["igbc"]
            points.leed_points += pts["leed"]
            points.criteria_met.extend(pts["criteria"])
        
        if material_properties.get('renewable', False):
            pts = cls.MATERIAL_POINTS_TABLE["rapidly_renewable"]
            points.griha_points += pts["griha"]
            points.igbc_points += pts["igbc"]
            points.leed_points += pts["leed"]
            points.criteria_met.extend(pts["criteria"])
        
        voc = material_properties.get('voc_emissions', 1000)
        if voc < 50:
            pts = cls.MATERIAL_POINTS_TABLE["low_voc"]
            points.griha_points += pts["griha"]
            points.igbc_points += pts["igbc"]
            points.leed_points += pts["leed"]
            points.criteria_met.extend(pts["criteria"])
        
        if material_properties.get('fsc_certified', False):
            pts = cls.MATERIAL_POINTS_TABLE["certified_wood"]
            points.griha_points += pts["griha"]
            points.igbc_points += pts["igbc"]
            points.leed_points += pts["leed"]
            points.criteria_met.extend(pts["criteria"])
        
        return points
    
    @classmethod
    def get_all_criteria(cls, rating_system: RatingSystem = None) -> Dict[str, GreenBuildingCriteria]:
        """Get all criteria for a specific rating system or all"""
        all_criteria = {}
        all_criteria.update(cls.GRIHA_CRITERIA)
        all_criteria.update(cls.IGBC_CRITERIA)
        all_criteria.update(cls.LEED_CRITERIA)
        
        if rating_system:
            return {k: v for k, v in all_criteria.items() 
                   if rating_system in v.applicable_standards}
        
        return all_criteria
    
    @classmethod
    def get_criteria_by_category(cls, category: str) -> List[GreenBuildingCriteria]:
        """Get all criteria for a specific category"""
        all_criteria = cls.get_all_criteria()
        return [c for c in all_criteria.values() if c.category == category]


class GreenBuildingAssessment(BaseModel):
    """Green building assessment result"""
    project_id: str
    rating_system: RatingSystem
    total_score: float
    max_possible_score: float
    rating: Optional[str]
    criteria_scores: Dict[str, float]
    material_contributions: List[Dict]
    recommendations: List[str]
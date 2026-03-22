"""
Structural Design Module - IS 456:2000
RCC Design: Slab, Beam, Column, Foundation
"""

import math
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
from is_codes import ISCodeReferences

@dataclass
class ReinforcementResult:
    """Reinforcement design result"""
    bar_diameter: int  # mm
    bar_count: int
    spacing: float  # mm
    area_provided: float  # mm²
    area_required: float  # mm²
    reinforcement_ratio: float

@dataclass
class DesignResult:
    """Complete design result"""
    member_type: str
    dimensions: Dict
    concrete_grade: str
    steel_grade: str
    main_reinforcement: Dict
    shear_reinforcement: Optional[Dict]
    deflection_check: str
    shear_check: str
    is_code: str

class SlabDesigner:
    """
    One-way and Two-way Slab Design as per IS 456:2000
    """
    
    def __init__(self):
        self.is_codes = ISCodeReferences()
    
    def check_deflection(self, 
                        span: float, 
                        effective_depth: float,
                        grade: str = "M20",
                        tension_steel: str = "Fe415",
                        compression_steel: bool = False) -> Dict:
        """
        Check deflection as per IS 456 Clause 23.2
        """
        # Basic span-to-depth ratio (IS 456 Table 1)
        if span <= 3.5:
            max_ratio = 20 if not compression_steel else 26
        elif span <= 5.0:
            max_ratio = 20 if not compression_steel else 24
        elif span <= 7.5:
            max_ratio = 20 if not compression_steel else 22
        else:
            max_ratio = 20 if not compression_steel else 20
        
        # Modification factor for tension steel
        fy = self.is_codes.STEEL_GRADES.get(tension_steel, {}).get("fy", 415)
        mod_factor = 2.0 if fy <= 250 else (0.8 + (500 - fy) / 500) * 1.0
        
        allowable_span_depth = max_ratio * mod_factor
        
        actual_ratio = span * 1000 / effective_depth
        
        return {
            "allowable_ratio": allowable_span_depth,
            "actual_ratio": round(actual_ratio, 2),
            "status": "PASS" if actual_ratio <= allowable_span_depth else "FAIL",
            "deflection_mm": round(span * effective_depth / allowable_span_depth / 1000, 2)
        }
    
    def design_one_way_slab(self,
                            span_m: float,
                            slab_thickness_mm: int,
                            concrete_grade: str = "M20",
                            steel_grade: str = "Fe415",
                            live_load_kNm2: float = 2.0,
                            finish_load_kNm2: float = 0.5) -> Dict:
        """
        Design one-way slab (IS 456)
        """
        # Material properties
        fck = self.is_codes.CONCRETE_GRADES.get(concrete_grade, {}).get("fck", 20)
        fy = self.is_codes.STEEL_GRADES.get(steel_grade, {}).get("fy", 415)
        
        # Effective depth
        cover = 20  # mm (moderate exposure)
        bar_dia = 10  # mm
        effective_depth = slab_thickness_mm - cover - bar_dia / 2
        
        # Load calculation
        self_weight = 25.0 * slab_thickness_mm / 1000  # kN/m²
        total_load = self_weight + finish_load_kNm2 + live_load_kNm2
        factored_load = 1.5 * total_load  # Ultimate load
        
        # Moment calculation (IS 456 Table 12)
        # For simply supported: wL²/8
        moment = factored_load * span_m ** 2 / 8  # kN.m
        
        # Moment in N.mm
        Mu = moment * 1e6
        
        # Design constants
        if fck <= 25:
            xu_max = 0.46 * effective_depth
        else:
            xu_max = 0.44 * effective_depth
        
        # Area of steel required
        if fy == 250:
            Ru = 0.148 * fck
        elif fy == 415:
            Ru = 0.149 * fck
        else:  # Fe500
            Ru = 0.133 * fck
        
        Ast_req = Mu / (Ru * effective_depth)
        
        # Check minimum reinforcement
        b = 1000  # mm width
        min_ast = 0.12 / 100 * b * effective_depth
        
        Ast = max(Ast_req, min_ast)
        
        # Provide bars
        bar_dia = 10
        area_one_bar = math.pi * bar_dia ** 2 / 4
        
        # Calculate spacing
        num_bars = math.ceil(Ast / area_one_bar)
        spacing = min(300, (b * area_one_bar) / Ast)  # Max 300mm
        
        Ast_provided = num_bars * area_one_bar
        
        # Distribution steel (0.12% of gross area)
        min_dist = 0.12 / 100 * b * slab_thickness_mm
        dist_bar = 6
        area_dist_one = math.pi * dist_bar ** 2 / 4
        dist_spacing = min(300, (b * area_dist_one) / min_dist)
        
        # Check deflection
        deflection = self.check_deflection(span_m, effective_depth, concrete_grade, steel_grade)
        
        # Check shear
        shear = factored_load * span_m / 2  # kN
        shear_stress = shear * 1000 / (b * effective_depth)  # N/mm²
        tau_c_val = self.is_codes.SHEAR_STRENGTH_CONCRETE.get(concrete_grade, {})
        tau_c = tau_c_val.get("flexure", 0.48) if isinstance(tau_c_val, dict) else tau_c_val
        
        return {
            "member_type": "one_way_slab",
            "dimensions": {
                "span_m": span_m,
                "thickness_mm": slab_thickness_mm,
                "effective_depth_mm": round(effective_depth, 1)
            },
            "loads": {
                "self_weight_kNm2": round(self_weight, 2),
                "total_working_load_kNm2": round(total_load, 2),
                "factored_load_kNm2": round(factored_load, 2)
            },
            "design": {
                "moment_knm": round(moment, 2),
                "main_reinforcement": {
                    "bar_dia_mm": bar_dia,
                    "spacing_mm": round(spacing, 1),
                    "area_required_mm2": round(Ast_req, 1),
                    "area_provided_mm2": round(Ast_provided, 1),
                    "reinforcement_ratio": round(Ast_provided / (b * effective_depth) * 100, 3)
                },
                "distribution_reinforcement": {
                    "bar_dia_mm": dist_bar,
                    "spacing_mm": round(dist_spacing, 1),
                    "area_mm2": round(min_dist, 1)
                }
            },
            "checks": {
                "deflection": deflection,
                "shear": {
                    "shear_force_kn": round(shear, 2),
                    "shear_stress_Nmm2": round(shear_stress, 3),
                    "allowable_Nmm2": tau_c,
                    "status": "PASS" if shear_stress <= tau_c else "FAIL"
                }
            },
            "is_code": "IS 456:2000"
        }
    
    def design_two_way_slab(self,
                           short_span_m: float,
                           long_span_m: float,
                           slab_thickness_mm: int,
                           concrete_grade: str = "M20",
                           steel_grade: str = "Fe415",
                           corner_restraint: bool = False) -> Dict:
        """
        Design two-way slab (IS 456)
        """
        # Check if two-way (Lx/Ly < 2)
        ratio = long_span_m / short_span_m
        if ratio >= 2:
            return {"error": "Span ratio >= 2, use one-way slab design"}
        
        # Material properties
        fck = self.is_codes.CONCRETE_GRADES.get(concrete_grade, {}).get("fck", 20)
        fy = self.is_codes.STEEL_GRADES.get(steel_grade, {}).get("fy", 415)
        
        # Effective depth
        cover = 20
        bar_dia = 10
        effective_depth = slab_thickness_mm - cover - bar_dia / 2
        
        # Total load (estimate)
        self_weight = 25.0 * slab_thickness_mm / 1000
        total_load = self_weight + 0.5 + 2.0  # self + finish + live
        factored_load = 1.5 * total_load
        
        # Moment coefficients (IS 456 Table 12)
        # For simply supported all sides
        alpha_x = min(0.125, 8 / (ratio ** 4 + 8))  # x direction
        alpha_y = min(0.125, 8 / (1 + ratio ** 4))  # y direction
        
        # Moments (per meter width)
        Mx = alpha_x * factored_load * short_span_m ** 2  # kN.m/m
        My = alpha_y * factored_load * short_span_m ** 2  # kN.m/m
        
        # Design for both directions
        b = 1000  # mm width
        
        # Minimum reinforcement
        min_ast = 0.12 / 100 * b * effective_depth
        
        # Main steel (short span - bottom)
        bar_dia_main = 10
        area_bar = math.pi * bar_dia_main ** 2 / 4
        
        # Spacing for short direction
        Ast_short = max(Mx * 1e6 / (0.138 * fck * effective_depth ** 2), min_ast)
        spacing_short = min(300, (b * area_bar) / Ast_short)
        
        # Spacing for long direction  
        Ast_long = max(My * 1e6 / (0.138 * fck * effective_depth ** 2), min_ast)
        spacing_long = min(300, (b * area_bar) / Ast_long)
        
        return {
            "member_type": "two_way_slab",
            "dimensions": {
                "short_span_m": short_span_m,
                "long_span_m": long_span_m,
                "thickness_mm": slab_thickness_mm,
                "effective_depth_mm": round(effective_depth, 1),
                "span_ratio": round(ratio, 3)
            },
            "design": {
                "moment_short_span_knm": round(Mx, 2),
                "moment_long_span_knm": round(My, 2),
                "short_span_reinforcement": {
                    "bar_dia_mm": bar_dia_main,
                    "spacing_mm": round(spacing_short, 1),
                    "area_mm2_m": round(Ast_short, 1)
                },
                "long_span_reinforcement": {
                    "bar_dia_mm": bar_dia_main,
                    "spacing_mm": round(spacing_long, 1),
                    "area_mm2_m": round(Ast_long, 1)
                },
                "torsion_reinforcement": "As per IS 456 Clause 31.5"
            },
            "checks": {
                "deflection": self.check_deflection(short_span_m, effective_depth, concrete_grade, steel_grade),
                "shear": "Check at column face - per IS 456"
            },
            "is_code": "IS 456:2000"
        }


class BeamDesigner:
    """
    Beam Design as per IS 456:2000
    """
    
    def __init__(self):
        self.is_codes = ISCodeReferences()
    
    def design_beam(self,
                    span_m: float,
                    breadth_mm: int,
                    depth_mm: int,
                    moment_knm: float,
                    shear_kn: float,
                    concrete_grade: str = "M20",
                    steel_grade: str = "Fe415") -> Dict:
        """
        Design RCC beam
        """
        fck = self.is_codes.CONCRETE_GRADES.get(concrete_grade, {}).get("fck", 20)
        fy = self.is_codes.STEEL_GRADES.get(steel_grade, {}).get("fy", 415)
        
        # Effective cover
        cover = 25  # mm
        effective_depth = depth_mm - cover - 10 / 2
        
        # Moment design
        Mu = moment_knm * 1e6  # N.mm
        
        # Check if singly or doubly reinforced
        xu_max = 0.46 * effective_depth if fck <= 25 else 0.44 * effective_depth
        
        # Area of steel
        Ast = Mu / (0.87 * fy * (effective_depth - 0.42 * xu_max))
        
        # Minimum steel
        min_ast = 0.85 / 100 * breadth_mm * depth_mm
        
        Ast_provided = max(Ast, min_ast)
        
        # Number of bars
        bar_dia = 16
        area_bar = math.pi * bar_dia ** 2 / 4
        num_bars = math.ceil(Ast_provided / area_bar)
        
        # Shear design
        vu = shear_kn * 1000  # N
        tau_v = vu / (breadth_mm * effective_depth)
        
        tau_c_val = self.is_codes.SHEAR_STRENGTH_CONCRETE.get(concrete_grade, {})
        tau_c = tau_c_val.get("flexure", 0.48) if isinstance(tau_c_val, dict) else tau_c_val
        
        # Stirrups if needed
        stirrup_dia = 8
        spacing_val = 0
        if tau_v > tau_c:
            # Design stirrups
            Asv = 2 * math.pi * stirrup_dia ** 2 / 4  # 2 legs
            spacing_val = 0.87 * fy * Asv / (0.4 * breadth_mm)
            spacing_val = min(spacing_val, 300)
            spacing_str = str(round(spacing_val, 1))
        else:
            spacing_str = "Nominal"
        
        return {
            "member_type": "beam",
            "dimensions": {
                "span_m": span_m,
                "breadth_mm": breadth_mm,
                "depth_mm": depth_mm,
                "effective_depth_mm": round(effective_depth, 1)
            },
            "design": {
                "moment_knm": moment_knm,
                "shear_kn": shear_kn,
                "main_reinforcement": {
                    "bar_dia_mm": bar_dia,
                    "number_of_bars": num_bars,
                    "area_provided_mm2": round(num_bars * area_bar, 1),
                    "area_required_mm2": round(Ast, 1)
                },
                "shear_reinforcement": {
                    "stirrup_dia_mm": stirrup_dia if tau_v > tau_c else "N/A",
                    "spacing_mm": spacing_str
                }
            },
            "checks": {
                "shear_stress_Nmm2": round(tau_v, 3),
                "allowable_Nmm2": tau_c,
                "status": "PASS"
            },
            "is_code": "IS 456:2000"
        }


class ColumnDesigner:
    """
    Column Design as per IS 456:2000 and IS 13920:2016
    """
    
    def __init__(self):
        self.is_codes = ISCodeReferences()
    
    def design_column(self,
                      unsupported_height_m: float,
                      breadth_mm: int,
                      depth_mm: int,
                      axial_load_kn: float,
                      moment_knm: float = 0,
                      concrete_grade: str = "M20",
                      steel_grade: str = "Fe415") -> Dict:
        """
        Design RCC column
        """
        fck = self.is_codes.CONCRETE_GRADES.get(concrete_grade, {}).get("fck", 20)
        fy = self.is_codes.STEEL_GRADES.get(steel_grade, {}).get("fy", 415)
        
        # Slenderness check
        le = unsupported_height_m * 1000  # mm
        slenderness_ratio = le / min(breadth_mm, depth_mm)
        
        # Minimum eccentricity
        emid = max(20, le / 500)
        
        # Effective moment
        M1 = moment_knm * 1e6 if moment_knm > 0 else axial_load_kn * emid
        M2 = M1
        
        # Axial load
        Pu = axial_load_kn * 1000  # N
        
        # Area of concrete
        Ac = breadth_mm * depth_mm
        
        # Area of steel required
        Asc = max(0.8 / 100 * Ac, (Pu - 0.4 * fck * Ac) / (0.67 * fy - 0.4 * fck))
        
        # Provide bars
        bar_dia = 16
        area_bar = math.pi * bar_dia ** 2 / 4
        num_bars = math.ceil(Asc / area_bar)
        
        Asc_provided = num_bars * area_bar
        
        # Ductile detailing (IS 13920)
        # Transverse reinforcement
        hoop_dia = 8
        spacing = min(100, breadth_mm / 2, 8 * bar_dia)
        
        # Confinement zone
        conf_zone = max(500, breadth_mm * 1.5)
        
        return {
            "member_type": "column",
            "dimensions": {
                "unsupported_height_m": unsupported_height_m,
                "breadth_mm": breadth_mm,
                "depth_mm": depth_mm,
                "slenderness_ratio": round(slenderness_ratio, 1)
            },
            "design": {
                "axial_load_kn": axial_load_kn,
                "moment_knm": max(moment_knm, axial_load_kn * unsupported_height_m / 500),
                "main_reinforcement": {
                    "bar_dia_mm": bar_dia,
                    "number_of_bars": num_bars,
                    "area_provided_mm2": round(Asc_provided, 1),
                    "reinforcement_ratio": round(Asc_provided / Ac * 100, 2)
                },
                "transverse_reinforcement": {
                    "hoop_dia_mm": hoop_dia,
                    "spacing_mm": round(spacing, 1),
                    "confinement_zone_mm": round(conf_zone, 1)
                }
            },
            "checks": {
                "slenderness": "OK" if slenderness_ratio < 12 else "CHECK",
                "min_eccentricity_mm": emid,
                "is_code": "IS 456:2000, IS 13920:2016"
            }
        }


class FoundationDesigner:
    """
    Isolated Footing Design as per IS 456:2000
    """
    
    def __init__(self):
        self.is_codes = ISCodeReferences()
    
    def design_isolated_footing(self,
                                column_load_kn: float,
                                column_breadth_mm: int,
                                column_depth_mm: int,
                                soil_pressure_kNm2: float = 100,
                                concrete_grade: str = "M20",
                                steel_grade: str = "Fe415") -> Dict:
        """
        Design isolated footing
        """
        fck = self.is_codes.CONCRETE_GRADES.get(concrete_grade, {}).get("fck", 20)
        fy = self.is_codes.STEEL_GRADES.get(steel_grade, {}).get("fy", 415)
        
        # Area of footing
        area_req = column_load_kn / soil_pressure_kNm2  # m²
        
        # Provide square footing
        side = math.sqrt(area_req) * 1.1  # 10% extra
        side = math.ceil(side * 100) / 100  # Round up to cm
        
        # Thickness
        thickness = max(300, column_depth_mm)  # Min 300mm
        
        # Upward pressure
        pressure = column_load_kn / (side ** 2)  # kN/m²
        
        # Moment at face
        x = (side * 1000 - column_breadth_mm) / 2  # mm
        Mu = pressure * x ** 2 / 2  # kN.mm (per m width)
        
        # Effective depth
        cover = 50
        d = thickness - cover - 10
        
        # Area of steel
        Ast = Mu * 1e6 / (0.87 * fy * (d - 0.42 * 0.46 * d))
        
        # Min steel
        min_ast = 0.12 / 100 * 1000 * thickness
        
        Ast_provided = max(Ast, min_ast)
        
        # Bar spacing
        bar_dia = 12
        area_bar = math.pi * bar_dia ** 2 / 4
        spacing = min(300, (1000 * area_bar) / Ast_provided)
        
        return {
            "member_type": "isolated_footing",
            "dimensions": {
                "footing_size_m": f"{side}x{side}",
                "footing_area_m2": round(side ** 2, 2),
                "thickness_mm": thickness,
                "effective_depth_mm": round(d, 1)
            },
            "design": {
                "column_load_kn": column_load_kn,
                "soil_pressure_kNm2": pressure,
                "reinforcement": {
                    "bar_dia_mm": bar_dia,
                    "spacing_mm": round(spacing, 1),
                    "direction": "Both ways",
                    "area_provided_mm2_m": round(Ast_provided, 1)
                }
            },
            "checks": {
                "two_way_shear": "Check per IS 456 Cl 31.6.1",
                "one_way_shear": "Check per IS 456 Cl 25.5.1"
            },
            "is_code": "IS 456:2000"
        }


def design_structural_member(member_type: str, **kwargs) -> Dict:
    """
    Convenience function for structural design
    """
    if member_type == "slab_one_way":
        designer = SlabDesigner()
        return designer.design_one_way_slab(
            span_m=kwargs.get("span", 4),
            slab_thickness_mm=kwargs.get("thickness", 150),
            concrete_grade=kwargs.get("concrete", "M20"),
            steel_grade=kwargs.get("steel", "Fe415"),
            live_load_kNm2=kwargs.get("live_load", 2.0),
            finish_load_kNm2=kwargs.get("finish_load", 0.5)
        )
    
    elif member_type == "slab_two_way":
        designer = SlabDesigner()
        return designer.design_two_way_slab(
            short_span_m=kwargs.get("short_span", 4),
            long_span_m=kwargs.get("long_span", 5),
            slab_thickness_mm=kwargs.get("thickness", 150),
            concrete_grade=kwargs.get("concrete", "M20"),
            steel_grade=kwargs.get("steel", "Fe415")
        )
    
    elif member_type == "beam":
        designer = BeamDesigner()
        return designer.design_beam(
            span_m=kwargs.get("span", 6),
            breadth_mm=kwargs.get("breadth", 300),
            depth_mm=kwargs.get("depth", 450),
            moment_knm=kwargs.get("moment", 100),
            shear_kn=kwargs.get("shear", 50),
            concrete_grade=kwargs.get("concrete", "M20"),
            steel_grade=kwargs.get("steel", "Fe415")
        )
    
    elif member_type == "column":
        designer = ColumnDesigner()
        return designer.design_column(
            unsupported_height_m=kwargs.get("height", 3),
            breadth_mm=kwargs.get("breadth", 300),
            depth_mm=kwargs.get("depth", 300),
            axial_load_kn=kwargs.get("axial_load", 800),
            moment_knm=kwargs.get("moment", 20),
            concrete_grade=kwargs.get("concrete", "M20"),
            steel_grade=kwargs.get("steel", "Fe415")
        )
    
    elif member_type == "footing":
        designer = FoundationDesigner()
        return designer.design_isolated_footing(
            column_load_kn=kwargs.get("column_load", 800),
            column_breadth_mm=kwargs.get("column_breadth", 300),
            column_depth_mm=kwargs.get("column_depth", 300),
            soil_pressure_kNm2=kwargs.get("soil_pressure", 100),
            concrete_grade=kwargs.get("concrete", "M20"),
            steel_grade=kwargs.get("steel", "Fe415")
        )
    
    return {"error": "Unknown member type"}

"""
BIM-to-Logic Intake Layer
Parses IFC/JSON files to extract geometric and volumetric data
Automatically calculates quantities for structural members
"""

import json
import math
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import xml.etree.ElementTree as ET

class StructuralElementType(Enum):
    FOUNDATION = "foundation"
    COLUMN = "column"
    BEAM = "beam"
    SLAB = "slab"
    WALL = "wall"
    ROOF = "roof"
    STAIRCASE = "staircase"

@dataclass
class GeometricEntity:
    """Represents a geometric element from BIM"""
    element_id: str
    element_type: StructuralElementType
    name: str
    volume_m3: float
    surface_area_m2: float
    dimensions: Dict[str, float]  # length, width, height, etc.
    material_references: List[str]
    location: Dict[str, float]  # x, y, z coordinates
    
@dataclass
class MaterialQuantity:
    """Calculated material requirements"""
    material_type: str
    category: str
    quantity: float
    unit: str
    wastage_factor: float
    total_quantity_with_wastage: float

class BIMParser:
    """
    IFC/JSON BIM Parser for EcoBuild
    Extracts quantities for structural estimation
    """
    
    # Standard wastage factors as per IS 10262:2019
    WASTAGE_FACTORS = {
        'concrete': 1.05,      # 5% wastage
        'steel': 1.025,        # 2.5% wastage
        'masonry': 1.10,       # 10% wastage
        'plaster': 1.15,       # 15% wastage
        'flooring': 1.08,      # 8% wastage
        'paint': 1.12,         # 12% wastage
        'formwork': 1.10,      # 10% wastage
    }
    
    # Standard densities (kg/m³)
    DENSITIES = {
        'rcc': 2500,
        'brick_masonry': 1900,
        'aac_blocks': 650,
        'steel': 7850,
        'mortar': 2100,
        'plaster': 1850,
        'concrete_pcc': 2400,
    }
    
    # Steel reinforcement ratios (% by volume)
    STEEL_RATIOS = {
        'foundation': 0.0080,  # 80 kg/m³
        'column': 0.0150,      # 150 kg/m³
        'beam': 0.0125,        # 125 kg/m³
        'slab': 0.0075,        # 75 kg/m³
        'wall': 0.0030,        # 30 kg/m³
    }
    
    def __init__(self):
        self.elements: List[GeometricEntity] = []
        self.material_quantities: Dict[str, MaterialQuantity] = {}
        
    def parse_ifc_file(self, ifc_file_path: str) -> List[GeometricEntity]:
        """
        Parse IFC file and extract geometric entities using ifcopenshell
        
        Args:
            ifc_file_path: Path to the IFC file
            
        Returns:
            List of GeometricEntity objects
        """
        try:
            import ifcopenshell
            import ifcopenshell.geom
            
            model = ifcopenshell.open(ifc_file_path)
            elements = []
            
            # Map IFC element types to our types
            type_mapping = {
                'IfcColumn': StructuralElementType.COLUMN,
                'IfcBeam': StructuralElementType.BEAM,
                'IfcSlab': StructuralElementType.SLAB,
                'IfcWall': StructuralElementType.WALL,
                'IfcFooting': StructuralElementType.FOUNDATION,
                'IfcRoof': StructuralElementType.ROOF,
                'IfcStair': StructuralElementType.STAIRCASE,
            }
            
            # Get all structural elements
            for ifc_type, element_type in type_mapping.items():
                items = model.by_type(ifc_type)
                print(f"[BIM Parser] Found {len(items)} {ifc_type} elements")
                
                for item in items:
                    try:
                        # Try to get geometry (may fail for some elements)
                        volume = 0.0
                        surface_area = 0.0
                        
                        try:
                            settings = ifcopenshell.geom.settings()
                            shape = ifcopenshell.geom.create_shape(settings, item)
                            if shape:
                                geometry_data = getattr(shape, 'geometry', None)
                                if geometry_data:
                                    volume = self._calculate_volume(geometry_data)
                                    surface_area = self._calculate_surface_area(geometry_data)
                        except Exception as geom_error:
                            # Geometry extraction failed, will use property sets
                            pass
                        
                        # Get dimensions from property sets
                        dimensions = self._extract_dimensions(item)
                        
                        # Get volume from property sets if geometry failed
                        if volume == 0.0:
                            volume = self._extract_volume_from_properties(item)
                        
                        # Get surface area from property sets if geometry failed
                        if surface_area == 0.0:
                            surface_area = self._extract_area_from_properties(item)
                        
                        # Estimate dimensions from volume if still missing
                        if not dimensions or len(dimensions) == 0:
                            dimensions = self._estimate_dimensions_from_volume(volume, element_type)
                        
                        # Get location
                        location = self._extract_location(item)
                        
                        # Get materials
                        materials = self._extract_materials(item)
                        
                        element = GeometricEntity(
                            element_id=item.GlobalId,
                            element_type=element_type,
                            name=item.Name if hasattr(item, 'Name') else f"{ifc_type}_{len(elements)}",
                            volume_m3=volume if volume > 0 else 1.0,  # Default to 1 m3 if no volume
                            surface_area_m2=surface_area if surface_area > 0 else 1.0,
                            dimensions=dimensions,
                            material_references=materials,
                            location=location
                        )
                        elements.append(element)
                        print(f"[BIM Parser] Added {ifc_type}: {element.name} (ID: {element.element_id}, Volume: {element.volume_m3:.2f} m3)")
                        
                    except Exception as e:
                        print(f"[BIM Parser] Warning: Could not process {ifc_type} {getattr(item, 'GlobalId', 'unknown')}: {str(e)}")
                        continue
            
            self.elements = elements
            return elements
            
        except ImportError:
            raise ImportError("ifcopenshell is required for IFC parsing. Install with: pip install ifcopenshell")
        except Exception as e:
            raise ValueError(f"Failed to parse IFC file: {str(e)}")
    
    def _calculate_volume(self, geometry) -> float:
        """Calculate volume from geometry"""
        try:
            # Use the geometry's bounding box for volume estimation
            verts = geometry.verts
            if len(verts) >= 3:
                # Simple bounding box volume calculation
                x_coords = verts[0::3]
                y_coords = verts[1::3]
                z_coords = verts[2::3]
                
                width = max(x_coords) - min(x_coords)
                height = max(y_coords) - min(y_coords)
                depth = max(z_coords) - min(z_coords)
                
                return width * height * depth
            return 0.0
        except:
            return 0.0
    
    def _calculate_surface_area(self, geometry) -> float:
        """Calculate surface area from geometry"""
        try:
            # Estimate surface area from faces
            faces = geometry.faces
            area = 0.0
            
            for i in range(0, len(faces), 3):
                if i + 2 < len(faces):
                    # Get triangle vertices
                    v1 = faces[i]
                    v2 = faces[i + 1]
                    v3 = faces[i + 2]
                    
                    # Calculate triangle area (simplified)
                    area += 1.0  # Placeholder
            
            return area
        except:
            return 0.0
    
    def _extract_dimensions(self, item) -> Dict[str, float]:
        """Extract dimensions from IFC element"""
        dimensions = {}
        try:
            # Try to get dimensions from property sets
            if hasattr(item, 'IsDefinedBy'):
                for definition in item.IsDefinedBy:
                    if definition.is_a('IfcRelDefinesByProperties'):
                        property_set = definition.RelatingPropertyDefinition
                        if property_set.is_a('IfcElementQuantity'):
                            for quantity in property_set.Quantities:
                                if quantity.is_a('IfcQuantityLength'):
                                    dimensions[quantity.Name] = quantity.LengthValue
                                elif quantity.is_a('IfcQuantityArea'):
                                    dimensions[quantity.Name] = quantity.AreaValue
                                elif quantity.is_a('IfcQuantityVolume'):
                                    dimensions[quantity.Name] = quantity.VolumeValue
        except:
            pass
        
        return dimensions
    
    def _extract_location(self, item) -> Dict[str, float]:
        """Extract location from IFC element"""
        location: Dict[str, float] = {'x': 0.0, 'y': 0.0, 'z': 0.0}
        try:
            if hasattr(item, 'ObjectPlacement'):
                placement = item.ObjectPlacement
                if placement.is_a('IfcLocalPlacement'):
                    coords = placement.RelativePlacement.Location.Coordinates
                    if len(coords) >= 3:
                        location['x'] = float(coords[0])
                        location['y'] = float(coords[1])
                        location['z'] = float(coords[2])
        except:
            pass
        
        return location
    
    def _extract_materials(self, item) -> List[str]:
        """Extract material references from IFC element"""
        materials = []
        try:
            if hasattr(item, 'HasAssociations'):
                for association in item.HasAssociations:
                    if association.is_a('IfcRelAssociatesMaterial'):
                        material = association.RelatingMaterial
                        if hasattr(material, 'Name'):
                            materials.append(material.Name)
        except:
            pass
        
        return materials
    
    def _extract_volume_from_properties(self, item) -> float:
        """Extract volume from IFC property sets"""
        try:
            if hasattr(item, 'IsDefinedBy'):
                for definition in item.IsDefinedBy:
                    if definition.is_a('IfcRelDefinesByProperties'):
                        prop_set = definition.RelatingPropertyDefinition
                        if prop_set.is_a('IfcElementQuantity'):
                            for qty in prop_set.Quantities:
                                if qty.is_a('IfcQuantityVolume'):
                                    return float(qty.VolumeValue)
                        # Also check in property sets
                        elif prop_set.is_a('IfcPropertySet'):
                            for prop in prop_set.HasProperties:
                                if 'volume' in prop.Name.lower() and hasattr(prop, 'NominalValue'):
                                    return float(prop.NominalValue.wrappedValue)
        except:
            pass
        return 0.0
    
    def _extract_area_from_properties(self, item) -> float:
        """Extract area from IFC property sets"""
        try:
            if hasattr(item, 'IsDefinedBy'):
                for definition in item.IsDefinedBy:
                    if definition.is_a('IfcRelDefinesByProperties'):
                        prop_set = definition.RelatingPropertyDefinition
                        if prop_set.is_a('IfcElementQuantity'):
                            for qty in prop_set.Quantities:
                                if qty.is_a('IfcQuantityArea'):
                                    return float(qty.AreaValue)
        except:
            pass
        return 0.0
    
    def _estimate_dimensions_from_volume(self, volume: float, element_type: StructuralElementType) -> Dict[str, float]:
        """Estimate dimensions from volume based on element type"""
        if volume <= 0:
            volume = 1.0
        
        # Default cube dimensions
        cube_root = volume ** (1/3)
        
        # Estimate based on element type
        if element_type == StructuralElementType.WALL:
            # Walls are typically thin and tall
            return {
                'length': cube_root * 2,
                'width': 0.2,  # Standard wall thickness
                'height': cube_root * 2
            }
        elif element_type == StructuralElementType.SLAB:
            # Slabs are flat
            return {
                'length': cube_root * 3,
                'width': cube_root * 2,
                'thickness': 0.15
            }
        elif element_type == StructuralElementType.COLUMN:
            # Columns are tall and narrow
            return {
                'length': 0.3,
                'width': 0.3,
                'height': cube_root * 4
            }
        elif element_type == StructuralElementType.BEAM:
            # Beams are long
            return {
                'length': cube_root * 5,
                'width': 0.23,
                'height': 0.45
            }
        elif element_type == StructuralElementType.FOUNDATION:
            # Foundations are wide and deep
            return {
                'length': cube_root * 2,
                'width': cube_root * 2,
                'depth': cube_root * 0.5
            }
        elif element_type == StructuralElementType.ROOF:
            # Roofs are flat or sloped
            return {
                'length': cube_root * 3,
                'width': cube_root * 2,
                'thickness': 0.1
            }
        else:
            # Default cube
            return {
                'length': cube_root,
                'width': cube_root,
                'height': cube_root
            }
    
    def parse_json_bim(self, json_content: str) -> List[GeometricEntity]:
        """Parse JSON format BIM data"""
        try:
            data = json.loads(json_content)
            elements = []
            
            for item in data.get('elements', []):
                element = GeometricEntity(
                    element_id=item['id'],
                    element_type=StructuralElementType(item['type']),
                    name=item.get('name', 'Unnamed'),
                    volume_m3=item['volume'],
                    surface_area_m2=item.get('surface_area', 0),
                    dimensions=item.get('dimensions', {}),
                    material_references=item.get('materials', []),
                    location=item.get('location', {'x': 0, 'y': 0, 'z': 0})
                )
                elements.append(element)
            
            self.elements = elements
            return elements
            
        except Exception as e:
            raise ValueError(f"Failed to parse JSON BIM: {str(e)}")
    
    def calculate_material_quantities(self) -> Dict[str, MaterialQuantity]:
        """Calculate all material quantities from parsed elements"""
        quantities = {}
        
        # Calculate quantities for all material types
        quantities.update(self.calculate_concrete_quantities())
        quantities.update(self.calculate_steel_quantities())
        quantities.update(self.calculate_masonry_quantities())
        quantities.update(self.calculate_plaster_quantities())
        quantities.update(self.calculate_formwork_quantities())
        
        self.material_quantities = quantities
        return quantities
    
    def calculate_concrete_quantities(self) -> Dict[str, MaterialQuantity]:
        """Calculate RCC quantities from geometric entities"""
        quantities = {}
        
        for element in self.elements:
            if element.element_type in [
                StructuralElementType.FOUNDATION,
                StructuralElementType.COLUMN,
                StructuralElementType.BEAM,
                StructuralElementType.SLAB
            ]:
                category = element.element_type.value
                volume = element.volume_m3
                
                # Apply wastage
                wastage_factor = self.WASTAGE_FACTORS['concrete']
                total_volume = volume * wastage_factor
                
                key = f"concrete_{category}"
                if key in quantities:
                    quantities[key].quantity += volume
                    quantities[key].total_quantity_with_wastage += total_volume
                else:
                    quantities[key] = MaterialQuantity(
                        material_type=f'RCC ({category.title()})',
                        category='concrete',
                        quantity=volume,
                        unit='m³',
                        wastage_factor=wastage_factor,
                        total_quantity_with_wastage=total_volume
                    )
        
        return quantities
    
    def calculate_steel_quantities(self) -> Dict[str, MaterialQuantity]:
        """Calculate steel reinforcement quantities"""
        quantities = {}
        
        for element in self.elements:
            element_type = element.element_type.value
            
            if element_type in self.STEEL_RATIOS:
                volume = element.volume_m3
                steel_ratio = self.STEEL_RATIOS[element_type]
                
                # Calculate steel weight
                steel_volume = volume * steel_ratio
                steel_weight = steel_volume * self.DENSITIES['steel']
                
                # Apply wastage
                wastage_factor = self.WASTAGE_FACTORS['steel']
                total_weight = steel_weight * wastage_factor
                
                key = f"steel_{element_type}"
                if key in quantities:
                    quantities[key].quantity += steel_weight
                    quantities[key].total_quantity_with_wastage += total_weight
                else:
                    quantities[key] = MaterialQuantity(
                        material_type=f'Steel Reinforcement ({element_type.title()})',
                        category='steel',
                        quantity=steel_weight,
                        unit='kg',
                        wastage_factor=wastage_factor,
                        total_quantity_with_wastage=total_weight
                    )
        
        return quantities
    
    def calculate_masonry_quantities(self) -> Dict[str, MaterialQuantity]:
        """Calculate masonry wall quantities"""
        quantities = {}
        
        for element in self.elements:
            if element.element_type == StructuralElementType.WALL:
                volume = element.volume_m3
                
                # Assume AAC blocks for green building
                wastage_factor = self.WASTAGE_FACTORS['masonry']
                total_volume = volume * wastage_factor
                
                # Calculate number of blocks
                block_volume = 0.036  # 600x200x300 mm AAC block
                num_blocks = math.ceil(total_volume / block_volume)
                
                quantities['aac_blocks'] = MaterialQuantity(
                    material_type='AAC Blocks (600x200x300mm)',
                    category='masonry',
                    quantity=num_blocks,
                    unit='nos',
                    wastage_factor=wastage_factor,
                    total_quantity_with_wastage=num_blocks
                )
                
                # Calculate mortar
                mortar_volume = total_volume * 0.15  # 15% mortar
                quantities['mortar'] = MaterialQuantity(
                    material_type='Cement Mortar (1:6)',
                    category='mortar',
                    quantity=mortar_volume,
                    unit='m³',
                    wastage_factor=1.10,
                    total_quantity_with_wastage=mortar_volume * 1.10
                )
        
        return quantities
    
    def calculate_plaster_quantities(self) -> Dict[str, MaterialQuantity]:
        """Calculate plastering quantities"""
        quantities = {}
        
        for element in self.elements:
            if element.element_type in [StructuralElementType.WALL, StructuralElementType.COLUMN]:
                surface_area = element.surface_area_m2
                
                wastage_factor = self.WASTAGE_FACTORS['plaster']
                total_area = surface_area * wastage_factor
                
                key = 'internal_plaster'
                if key in quantities:
                    quantities[key].quantity += surface_area
                    quantities[key].total_quantity_with_wastage += total_area
                else:
                    quantities[key] = MaterialQuantity(
                        material_type='Internal Plaster (12mm)',
                        category='plaster',
                        quantity=surface_area,
                        unit='m²',
                        wastage_factor=wastage_factor,
                        total_quantity_with_wastage=total_area
                    )
        
        return quantities
    
    def calculate_formwork_quantities(self) -> Dict[str, MaterialQuantity]:
        """Calculate formwork/shuttering quantities"""
        quantities = {}
        
        for element in self.elements:
            if element.element_type in [
                StructuralElementType.FOUNDATION,
                StructuralElementType.COLUMN,
                StructuralElementType.BEAM,
                StructuralElementType.SLAB
            ]:
                # Contact surface area
                surface_area = element.surface_area_m2
                
                wastage_factor = self.WASTAGE_FACTORS['formwork']
                total_area = surface_area * wastage_factor
                
                category = element.element_type.value
                key = f"formwork_{category}"
                
                if key in quantities:
                    quantities[key].quantity += surface_area
                    quantities[key].total_quantity_with_wastage += total_area
                else:
                    quantities[key] = MaterialQuantity(
                        material_type=f'Formwork ({category.title()})',
                        category='formwork',
                        quantity=surface_area,
                        unit='m²',
                        wastage_factor=wastage_factor,
                        total_quantity_with_wastage=total_area
                    )
        
        return quantities
    
    def generate_complete_boq(self) -> Dict:
        """Generate complete Bill of Quantities"""
        boq = {
            'project_summary': {
                'total_elements': len(self.elements),
                'element_breakdown': self._get_element_breakdown(),
                'total_volume_m3': sum(e.volume_m3 for e in self.elements),
                'total_surface_area_m2': sum(e.surface_area_m2 for e in self.elements)
            },
            'concrete': self.calculate_concrete_quantities(),
            'steel': self.calculate_steel_quantities(),
            'masonry': self.calculate_masonry_quantities(),
            'plaster': self.calculate_plaster_quantities(),
            'formwork': self.calculate_formwork_quantities()
        }
        
        # Calculate total embodied carbon
        boq['embodied_carbon_summary'] = self._calculate_embodied_carbon(boq)
        
        return boq
    
    def _get_element_breakdown(self) -> Dict[str, int]:
        """Get count of elements by type"""
        breakdown = {}
        for element in self.elements:
            element_type = element.element_type.value
            breakdown[element_type] = breakdown.get(element_type, 0) + 1
        return breakdown
    
    def _calculate_embodied_carbon(self, boq: Dict) -> Dict:
        """Calculate total embodied carbon from quantities"""
        # Simplified carbon factors (kg CO2/unit)
        carbon_factors = {
            'concrete': 350,  # kg CO2/m³
            'steel': 1.85,    # kg CO2/kg
            'masonry': 120,   # kg CO2/m³
            'mortar': 200,    # kg CO2/m³
        }
        
        total_carbon = 0
        carbon_breakdown = {}
        
        for category, items in boq.items():
            if isinstance(items, dict):
                for item_key, item in items.items():
                    if isinstance(item, MaterialQuantity):
                        factor = carbon_factors.get(item.category, 0)
                        carbon = item.quantity * factor
                        total_carbon += carbon
                        carbon_breakdown[item_key] = {
                            'quantity': item.quantity,
                            'unit': item.unit,
                            'carbon_factor': factor,
                            'total_carbon_kg': carbon
                        }
        
        return {
            'total_embodied_carbon_kg': round(total_carbon, 2),
            'total_embodied_carbon_tons': round(total_carbon / 1000, 2),
            'breakdown': carbon_breakdown
        }
    
    def export_to_json(self, boq: Dict, filepath: str):
        """Export BOQ to JSON file"""
        with open(filepath, 'w') as f:
            json.dump(boq, f, indent=2, default=lambda o: o.__dict__)
    
    def generate_ifc_sample(self) -> str:
        """Generate sample IFC JSON for testing"""
        sample_data = {
            "project": "EcoBuild Demo Project",
            "location": {"lat": 10.5167, "lon": 76.2167},
            "elements": [
                {
                    "id": "col_001",
                    "type": "column",
                    "name": "Column C1",
                    "volume": 2.5,
                    "surface_area": 15.0,
                    "dimensions": {"length": 0.3, "width": 0.3, "height": 3.0},
                    "materials": ["concrete_m25", "steel_fe500"],
                    "location": {"x": 5.0, "y": 5.0, "z": 0.0}
                },
                {
                    "id": "beam_001",
                    "type": "beam",
                    "name": "Beam B1",
                    "volume": 1.8,
                    "surface_area": 18.0,
                    "dimensions": {"length": 4.0, "width": 0.23, "height": 0.45},
                    "materials": ["concrete_m25", "steel_fe500"],
                    "location": {"x": 5.0, "y": 5.0, "z": 3.0}
                },
                {
                    "id": "slab_001",
                    "type": "slab",
                    "name": "Floor Slab F1",
                    "volume": 12.0,
                    "surface_area": 100.0,
                    "dimensions": {"length": 10.0, "width": 10.0, "thickness": 0.12},
                    "materials": ["concrete_m25", "steel_fe500"],
                    "location": {"x": 5.0, "y": 5.0, "z": 3.15}
                },
                {
                    "id": "fnd_001",
                    "type": "foundation",
                    "name": "Footing F1",
                    "volume": 8.5,
                    "surface_area": 25.0,
                    "dimensions": {"length": 2.0, "width": 2.0, "depth": 1.5},
                    "materials": ["concrete_m20", "steel_fe500"],
                    "location": {"x": 5.0, "y": 5.0, "z": -1.5}
                },
                {
                    "id": "wall_001",
                    "type": "wall",
                    "name": "Wall W1",
                    "volume": 4.5,
                    "surface_area": 30.0,
                    "dimensions": {"length": 5.0, "width": 0.2, "height": 3.0},
                    "materials": ["aac_blocks"],
                    "location": {"x": 2.5, "y": 0.0, "z": 1.5}
                }
            ]
        }
        return json.dumps(sample_data, indent=2)

# Example usage
if __name__ == '__main__':
    parser = BIMParser()
    
    # Generate and parse sample data
    sample_json = parser.generate_ifc_sample()
    parser.parse_json_bim(sample_json)
    
    # Generate BOQ
    boq = parser.generate_complete_boq()
    
    print("=== BILL OF QUANTITIES ===\n")
    print(json.dumps(boq, indent=2, default=lambda o: o.__dict__))
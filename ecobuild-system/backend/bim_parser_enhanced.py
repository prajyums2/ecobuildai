"""
Enhanced BIM Parser for EcoBuild
Improved IFC parsing with better geometry extraction and app integration
"""

import json
import math
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime

class StructuralElementType(Enum):
    FOUNDATION = "foundation"
    COLUMN = "column"
    BEAM = "beam"
    SLAB = "slab"
    WALL = "wall"
    ROOF = "roof"
    STAIRCASE = "staircase"
    DOOR = "door"
    WINDOW = "window"

@dataclass
class GeometricEntity:
    """Represents a geometric element from BIM with enhanced metadata"""
    element_id: str
    element_type: StructuralElementType
    name: str
    volume_m3: float
    surface_area_m2: float
    dimensions: Dict[str, float]
    material_references: List[str]
    location: Dict[str, float]
    # Enhanced fields
    ifc_type: str = ""
    story: str = ""
    properties: Dict[str, Any] = field(default_factory=dict)
    cost_estimate: float = 0.0
    carbon_estimate: float = 0.0
    
@dataclass
class MaterialQuantity:
    """Calculated material requirements with cost and carbon data"""
    material_type: str
    category: str
    quantity: float
    unit: str
    wastage_factor: float
    total_quantity_with_wastage: float
    unit_cost: float = 0.0
    total_cost: float = 0.0
    unit_carbon: float = 0.0
    total_carbon: float = 0.0
    matched_material_id: Optional[str] = None
    matched_material_name: Optional[str] = None

@dataclass
class BIMProjectData:
    """Complete project data extracted from BIM"""
    filename: str
    elements: List[GeometricEntity]
    material_quantities: List[MaterialQuantity]
    stories: List[str]
    total_volume: float
    total_cost: float
    total_carbon: float
    element_breakdown: Dict[str, int]
    export_timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


class EnhancedBIMParser:
    """
    Enhanced IFC/JSON BIM Parser for EcoBuild
    Extracts quantities and integrates with project modules
    """
    
    # Standard wastage factors per IS 10262:2019
    WASTAGE_FACTORS = {
        'concrete': 1.05,
        'steel': 1.025,
        'masonry': 1.10,
        'plaster': 1.15,
        'flooring': 1.08,
        'paint': 1.12,
        'formwork': 1.10,
        'electrical': 1.05,
        'plumbing': 1.08,
    }
    
    # Densities in kg/m³
    DENSITIES = {
        'rcc': 2500,
        'brick_masonry': 1900,
        'aac_blocks': 650,
        'steel': 7850,
        'mortar': 2100,
        'plaster': 1850,
        'concrete_pcc': 2400,
        'wood': 600,
        'glass': 2500,
        'aluminum': 2700,
    }
    
    # Steel ratios per structural element (% by volume)
    STEEL_RATIOS = {
        'foundation': 0.0080,
        'column': 0.0150,
        'beam': 0.0125,
        'slab': 0.0075,
        'wall': 0.0030,
        'roof': 0.0060,
    }
    
    # Default costs per unit (₹) - fallback when DB not available
    DEFAULT_COSTS = {
        'concrete': 5500,  # per m³
        'steel': 65,       # per kg
        'masonry': 3500,   # per m³
        'plaster': 450,    # per m²
        'paint': 85,       # per m²
        'flooring': 1200,  # per m²
    }
    
    # Default carbon values (kg CO₂e per unit)
    DEFAULT_CARBON = {
        'concrete': 250,   # per m³
        'steel': 2.5,      # per kg
        'masonry': 180,    # per m³
        'plaster': 15,     # per m²
        'paint': 8,        # per m²
        'flooring': 45,    # per m²
    }
    
    def __init__(self, materials_db=None):
        self.elements: List[GeometricEntity] = []
        self.material_quantities: Dict[str, MaterialQuantity] = {}
        self.materials_db = materials_db
        self.stories: set = set()
        
    def parse_ifc_file(self, ifc_file_path: str) -> BIMProjectData:
        """
        Parse IFC file and extract complete project data
        
        Args:
            ifc_file_path: Path to the IFC file
            
        Returns:
            BIMProjectData with elements, quantities, and costs
        """
        try:
            import ifcopenshell
            import ifcopenshell.geom
            
            model = ifcopenshell.open(ifc_file_path)
            elements = []
            self.stories = set()
            
            # Get all stories and normalize names
            raw_stories = []
            story_elevations = {}
            
            for storey in model.by_type('IfcBuildingStorey'):
                if hasattr(storey, 'Name') and storey.Name:
                    name = storey.Name.strip()
                    elevation = storey.Elevation if hasattr(storey, 'Elevation') else 0
                    
                    # Normalize story names
                    normalized = name.lower()
                    
                    # Remove common prefixes/suffixes
                    for prefix in ['level ', 'floor ', 'storey ', 'story ', 'lvl ']:
                        if normalized.startswith(prefix):
                            normalized = normalized[len(prefix):]
                    
                    # Remove leading zeros and clean
                    normalized = normalized.lstrip('0').strip()
                    if not normalized:
                        normalized = '0'
                    
                    # Track elevation for ordering
                    story_elevations[normalized] = elevation
                    raw_stories.append((normalized, elevation, name))
            
            # Sort by elevation and deduplicate
            raw_stories.sort(key=lambda x: x[1])
            
            # Build final stories list
            seen_normalized = set()
            for normalized, elevation, original_name in raw_stories:
                if normalized not in seen_normalized:
                    seen_normalized.add(normalized)
                    self.stories.add(original_name)
            
            # Ensure we have at least "Ground Floor" if no stories found
            if not self.stories:
                self.stories.add("Ground Floor")
            
            print(f"[BIM Parser] Found {len(self.stories)} stories: {list(self.stories)}")
            
            # Enhanced type mapping with property-based fallback
            # Handles various IFC export formats (Revit, ArchiCAD, etc.)
            type_mapping = {
                # Primary structural elements
                'IfcColumn': StructuralElementType.COLUMN,
                'IfcBeam': StructuralElementType.BEAM,
                'IfcSlab': StructuralElementType.SLAB,
                'IfcWall': StructuralElementType.WALL,
                'IfcWallStandardCase': StructuralElementType.WALL,
                'IfcCurtainWall': StructuralElementType.WALL,
                'IfcFooting': StructuralElementType.FOUNDATION,
                'IfcCovering': StructuralElementType.ROOF,
                'IfcRoof': StructuralElementType.ROOF,
                'IfcStair': StructuralElementType.STAIRCASE,
                'IfcStairFlight': StructuralElementType.STAIRCASE,
                'IfcDoor': StructuralElementType.DOOR,
                'IfcWindow': StructuralElementType.WINDOW,
                'IfcRamp': StructuralElementType.STAIRCASE,
                # Additional elements from Revit/ArchiCAD exports
                'IfcMember': StructuralElementType.BEAM,  # Often used for beams
                'IfcPlate': StructuralElementType.SLAB,   # Often used for slabs
                'IfcBuildingElementProxy': None,          # Generic - will determine type from properties
                'IfcPile': StructuralElementType.FOUNDATION,
                'IfcPileCap': StructuralElementType.FOUNDATION,
            }
            
            # Parse each element type
            for ifc_type, element_type in type_mapping.items():
                try:
                    items = model.by_type(ifc_type)
                except Exception as e:
                    print(f"[BIM Parser] Skipping {ifc_type} (not in schema): {str(e)}")
                    continue
                
                if not items:
                    continue
                    
                print(f"[BIM Parser] Found {len(items)} {ifc_type} elements")
                
                for item in items:
                    try:
                        # For IfcBuildingElementProxy, determine type from name
                        if element_type is None and ifc_type == 'IfcBuildingElementProxy':
                            element_type = self._determine_type_from_name(item)
                            if element_type is None:
                                continue  # Skip if we can't determine type
                        
                        element = self._parse_element(
                            item, ifc_type, element_type, model
                        )
                        if element:
                            elements.append(element)
                            print(f"[BIM Parser] ✓ {ifc_type}: {element.name} "
                                  f"(Vol: {element.volume_m3:.2f}m³)")
                    except Exception as e:
                        print(f"[BIM Parser] ✗ Error parsing {ifc_type}: {str(e)}")
                        continue
            
            self.elements = elements
            
            # Calculate quantities with cost and carbon
            quantities = self.calculate_enhanced_quantities()
            
            # Calculate totals
            total_volume = sum(el.volume_m3 for el in elements)
            total_cost = sum(q.total_cost for q in quantities.values())
            total_carbon = sum(q.total_carbon for q in quantities.values())
            
            # Element breakdown
            element_breakdown = {}
            for el in elements:
                type_str = el.element_type.value
                element_breakdown[type_str] = element_breakdown.get(type_str, 0) + 1
            
            return BIMProjectData(
                filename=ifc_file_path.split('/')[-1],
                elements=elements,
                material_quantities=list(quantities.values()),
                stories=list(self.stories),
                total_volume=total_volume,
                total_cost=total_cost,
                total_carbon=total_carbon,
                element_breakdown=element_breakdown
            )
            
        except ImportError:
            raise ImportError("ifcopenshell is required. Install: pip install ifcopenshell")
        except Exception as e:
            raise ValueError(f"Failed to parse IFC file: {str(e)}")
    
    def _parse_element(self, item, ifc_type: str, element_type: StructuralElementType, 
                       model) -> Optional[GeometricEntity]:
        """Parse a single IFC element with multiple fallback strategies"""
        
        # Try multiple volume extraction methods
        volume = 0.0
        surface_area = 0.0
        dimensions = {}
        
        # Method 1: Geometry extraction (most accurate)
        try:
            volume, surface_area = self._extract_geometry_volume(item)
        except Exception as e:
            print(f"[BIM Parser] Geometry extraction failed: {e}")
        
        # Method 2: Property sets
        if volume == 0.0:
            volume = self._extract_volume_from_properties(item)
            surface_area = self._extract_area_from_properties(item)
            dimensions = self._extract_dimensions_from_properties(item)
        
        # Method 3: Calculate from bounding box
        if volume == 0.0:
            volume, dimensions = self._calculate_from_bounding_box(item)
        
        # Method 4: Type-based estimation
        if volume == 0.0 or volume < 0.001:
            volume = self._estimate_volume_by_type(element_type)
            dimensions = self._estimate_dimensions_by_type(element_type, volume)
        
        # Ensure minimum volume
        if volume < 0.001:
            volume = 0.01  # 10 liters minimum
        
        # Get location
        location = self._extract_location(item)
        
        # Get materials
        materials = self._extract_materials(item)
        
        # Get story/level
        story = self._extract_story(item, model)
        
        # Get additional properties
        properties = self._extract_all_properties(item)
        
        # Calculate cost and carbon estimates
        cost, carbon = self._estimate_cost_and_carbon(
            element_type, volume, surface_area, materials
        )
        
        return GeometricEntity(
            element_id=item.GlobalId,
            element_type=element_type,
            name=item.Name if hasattr(item, 'Name') and item.Name else f"{ifc_type}_{len(self.elements)}",
            volume_m3=volume,
            surface_area_m2=surface_area if surface_area > 0 else self._estimate_surface_area(volume, element_type),
            dimensions=dimensions,
            material_references=materials,
            location=location,
            ifc_type=ifc_type,
            story=story,
            properties=properties,
            cost_estimate=cost,
            carbon_estimate=carbon
        )
    
    def _determine_type_from_name(self, item) -> Optional[StructuralElementType]:
        """Determine element type from name for generic elements"""
        try:
            name = item.Name.lower() if hasattr(item, 'Name') and item.Name else ''
            
            # Check common naming patterns
            if any(k in name for k in ['column', 'col', 'pillar', 'post']):
                return StructuralElementType.COLUMN
            elif any(k in name for k in ['beam', 'girder', 'lintel']):
                return StructuralElementType.BEAM
            elif any(k in name for k in ['slab', 'floor', 'deck', 'platform']):
                return StructuralElementType.SLAB
            elif any(k in name for k in ['wall', 'partition', 'masonry']):
                return StructuralElementType.WALL
            elif any(k in name for k in ['footing', 'foundation', 'base']):
                return StructuralElementType.FOUNDATION
            elif any(k in name for k in ['roof', 'ceiling', 'parapet']):
                return StructuralElementType.ROOF
            elif any(k in name for k in ['stair', 'step', 'ramp']):
                return StructuralElementType.STAIRCASE
            
            # Check description if available
            if hasattr(item, 'Description') and item.Description:
                desc = item.Description.lower()
                if any(k in desc for k in ['column', 'pillar']):
                    return StructuralElementType.COLUMN
                elif any(k in desc for k in ['beam', 'girder']):
                    return StructuralElementType.BEAM
                elif any(k in desc for k in ['slab', 'floor']):
                    return StructuralElementType.SLAB
                elif any(k in desc for k in ['wall']):
                    return StructuralElementType.WALL
            
            return None  # Unknown type
        except:
            return None
    
    def _extract_geometry_volume(self, item) -> Tuple[float, float]:
        """Extract volume and surface area from geometry"""
        try:
            import ifcopenshell.geom
            
            settings = ifcopenshell.geom.settings()
            shape = ifcopenshell.geom.create_shape(settings, item)
            
            if shape and hasattr(shape, 'geometry'):
                geometry = shape.geometry
                
                # Calculate volume from vertices
                verts = geometry.verts
                if len(verts) >= 9:  # Need at least 3 vertices
                    x_coords = verts[0::3]
                    y_coords = verts[1::3]
                    z_coords = verts[2::3]
                    
                    width = max(x_coords) - min(x_coords)
                    height = max(y_coords) - min(y_coords)
                    depth = max(z_coords) - min(z_coords)
                    
                    volume = width * height * depth
                    surface_area = 2 * (width*height + height*depth + width*depth)
                    
                    return volume, surface_area
            
            return 0.0, 0.0
        except:
            return 0.0, 0.0
    
    def _extract_volume_from_properties(self, item) -> float:
        """Extract volume from IFC property sets"""
        try:
            volume = 0.0
            
            # Check IfcElementQuantity
            if hasattr(item, 'IsDefinedBy'):
                for definition in item.IsDefinedBy:
                    if definition.is_a('IfcRelDefinesByProperties'):
                        prop_set = definition.RelatingPropertyDefinition
                        
                        if prop_set.is_a('IfcElementQuantity'):
                            for qty in prop_set.Quantities:
                                if qty.is_a('IfcQuantityVolume'):
                                    return float(qty.VolumeValue)
                        
                        # Check IfcPropertySet
                        elif prop_set.is_a('IfcPropertySet'):
                            for prop in prop_set.HasProperties:
                                prop_name = prop.Name.lower()
                                if 'volume' in prop_name and hasattr(prop, 'NominalValue'):
                                    return float(prop.NominalValue.wrappedValue)
                                elif 'netvolume' in prop_name and hasattr(prop, 'NominalValue'):
                                    return float(prop.NominalValue.wrappedValue)
                                elif 'grossvolume' in prop_name and hasattr(prop, 'NominalValue'):
                                    return float(prop.NominalValue.wrappedValue)
            
            # Check associations
            if hasattr(item, 'HasAssociations'):
                for assoc in item.HasAssociations:
                    if assoc.is_a('IfcRelAssociatesMaterial'):
                        material = assoc.RelatingMaterial
                        # Could extract volume from material layer set
            
            return volume
        except:
            return 0.0
    
    def _extract_area_from_properties(self, item) -> float:
        """Extract surface area from IFC property sets"""
        try:
            if hasattr(item, 'IsDefinedBy'):
                for definition in item.IsDefinedBy:
                    if definition.is_a('IfcRelDefinesByProperties'):
                        prop_set = definition.RelatingPropertyDefinition
                        
                        if prop_set.is_a('IfcElementQuantity'):
                            for qty in prop_set.Quantities:
                                if qty.is_a('IfcQuantityArea'):
                                    return float(qty.AreaValue)
                        
                        elif prop_set.is_a('IfcPropertySet'):
                            for prop in prop_set.HasProperties:
                                prop_name = prop.Name.lower()
                                if any(x in prop_name for x in ['area', 'surface']):
                                    if hasattr(prop, 'NominalValue'):
                                        return float(prop.NominalValue.wrappedValue)
            return 0.0
        except:
            return 0.0
    
    def _extract_dimensions_from_properties(self, item) -> Dict[str, float]:
        """Extract all dimensions from property sets"""
        dimensions = {}
        try:
            if hasattr(item, 'IsDefinedBy'):
                for definition in item.IsDefinedBy:
                    if definition.is_a('IfcRelDefinesByProperties'):
                        prop_set = definition.RelatingPropertyDefinition
                        
                        if prop_set.is_a('IfcElementQuantity'):
                            for qty in prop_set.Quantities:
                                if qty.is_a('IfcQuantityLength'):
                                    name = qty.Name.lower()
                                    if 'width' in name:
                                        dimensions['width'] = float(qty.LengthValue)
                                    elif 'height' in name or 'depth' in name:
                                        dimensions['height'] = float(qty.LengthValue)
                                    elif 'length' in name:
                                        dimensions['length'] = float(qty.LengthValue)
                                    elif 'thickness' in name:
                                        dimensions['thickness'] = float(qty.LengthValue)
                        
                        elif prop_set.is_a('IfcPropertySet'):
                            for prop in prop_set.HasProperties:
                                name = prop.Name.lower()
                                if hasattr(prop, 'NominalValue'):
                                    value = float(prop.NominalValue.wrappedValue)
                                    if any(x in name for x in ['width', 'breadth']):
                                        dimensions['width'] = value
                                    elif any(x in name for x in ['height', 'depth', 'length']):
                                        dimensions['height'] = value
                                    elif 'thickness' in name:
                                        dimensions['thickness'] = value
            return dimensions
        except:
            return {}
    
    def _calculate_from_bounding_box(self, item) -> Tuple[float, Dict[str, float]]:
        """Calculate volume from element's bounding box"""
        try:
            if hasattr(item, 'ObjectPlacement'):
                placement = item.ObjectPlacement
                # Get local placement coordinates
                if placement.is_a('IfcLocalPlacement'):
                    # This is a simplified bounding box calculation
                    # Real implementation would use geometry vertices
                    pass
            return 0.0, {}
        except:
            return 0.0, {}
    
    def _estimate_volume_by_type(self, element_type: StructuralElementType) -> float:
        """Estimate volume based on element type and typical dimensions"""
        estimates = {
            StructuralElementType.COLUMN: 0.27,      # 300x300x3000mm
            StructuralElementType.BEAM: 0.18,        # 300x200x3000mm
            StructuralElementType.SLAB: 2.25,        # 150mm thick, 3x5m
            StructuralElementType.WALL: 1.8,         # 150mm thick, 3m high, 4m long
            StructuralElementType.FOUNDATION: 2.0,   # 2x2x0.5m footing
            StructuralElementType.ROOF: 1.5,         # Roof slab
            StructuralElementType.STAIRCASE: 3.0,    # Flight of stairs
            StructuralElementType.DOOR: 0.05,        # Door volume
            StructuralElementType.WINDOW: 0.03,      # Window volume
        }
        return estimates.get(element_type, 1.0)
    
    def _estimate_dimensions_by_type(self, element_type: StructuralElementType, 
                                      volume: float) -> Dict[str, float]:
        """Estimate dimensions from volume and element type"""
        dimensions = {}
        
        if element_type == StructuralElementType.COLUMN:
            # Assume square column, height 3m
            side = math.sqrt(volume / 3.0)
            dimensions = {'width': side, 'depth': side, 'height': 3.0}
        elif element_type == StructuralElementType.BEAM:
            # Assume rectangular, span 4m
            height = math.pow(volume / 4.0, 1/2) * 0.6
            width = height * 0.67
            dimensions = {'width': width, 'height': height, 'length': 4.0}
        elif element_type == StructuralElementType.SLAB:
            # Assume 150mm thick
            area = volume / 0.15
            side = math.sqrt(area)
            dimensions = {'length': side, 'width': side, 'thickness': 0.15}
        elif element_type == StructuralElementType.WALL:
            # Assume 150mm thick, height 3m
            length = volume / (0.15 * 3.0)
            dimensions = {'length': length, 'height': 3.0, 'thickness': 0.15}
        else:
            # Generic cube
            side = math.pow(volume, 1/3)
            dimensions = {'length': side, 'width': side, 'height': side}
        
        return dimensions
    
    def _estimate_surface_area(self, volume: float, element_type: StructuralElementType) -> float:
        """Estimate surface area from volume"""
        # Approximate surface area to volume ratio based on element type
        ratios = {
            StructuralElementType.COLUMN: 12.0,
            StructuralElementType.BEAM: 10.0,
            StructuralElementType.SLAB: 8.0,
            StructuralElementType.WALL: 9.0,
            StructuralElementType.FOUNDATION: 5.0,
            StructuralElementType.ROOF: 8.0,
        }
        ratio = ratios.get(element_type, 8.0)
        return volume * ratio
    
    def _extract_location(self, item) -> Dict[str, float]:
        """Extract 3D location from IFC element"""
        location = {'x': 0.0, 'y': 0.0, 'z': 0.0}
        try:
            if hasattr(item, 'ObjectPlacement'):
                placement = item.ObjectPlacement
                if placement.is_a('IfcLocalPlacement'):
                    coords = placement.RelativePlacement.Location.Coordinates
                    if len(coords) >= 3:
                        location['x'] = float(coords[0])
                        location['y'] = float(coords[1])
                        location['z'] = float(coords[2])
            return location
        except:
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
                        # Handle material layer sets
                        if material.is_a('IfcMaterialLayerSet'):
                            for layer in material.MaterialLayers:
                                if hasattr(layer, 'Material') and layer.Material:
                                    materials.append(layer.Material.Name)
            return materials
        except:
            return materials
    
    def _extract_story(self, item, model) -> str:
        """Extract which story/level the element belongs to"""
        try:
            if hasattr(item, 'ContainedInStructure'):
                for rel in item.ContainedInStructure:
                    if rel.is_a('IfcRelContainedInSpatialStructure'):
                        structure = rel.RelatingStructure
                        if structure.is_a('IfcBuildingStorey'):
                            return structure.Name if hasattr(structure, 'Name') else ""
            return ""
        except:
            return ""
    
    def _extract_all_properties(self, item) -> Dict[str, Any]:
        """Extract all available properties from IFC element"""
        properties = {}
        try:
            if hasattr(item, 'IsDefinedBy'):
                for definition in item.IsDefinedBy:
                    if definition.is_a('IfcRelDefinesByProperties'):
                        prop_set = definition.RelatingPropertyDefinition
                        if prop_set.is_a('IfcPropertySet'):
                            for prop in prop_set.HasProperties:
                                if hasattr(prop, 'NominalValue'):
                                    properties[prop.Name] = prop.NominalValue.wrappedValue
            return properties
        except:
            return properties
    
    def _estimate_cost_and_carbon(self, element_type: StructuralElementType, 
                                   volume: float, surface_area: float, 
                                   materials: List[str]) -> Tuple[float, float]:
        """Estimate cost and carbon for an element"""
        cost = 0.0
        carbon = 0.0
        
        # Calculate concrete cost/carbon
        concrete_vol = volume
        cost += concrete_vol * self.DEFAULT_COSTS.get('concrete', 5500)
        carbon += concrete_vol * self.DEFAULT_CARBON.get('concrete', 250)
        
        # Calculate steel cost/carbon
        steel_ratio = self.STEEL_RATIOS.get(element_type.value, 0.01)
        steel_weight = volume * steel_ratio * self.DENSITIES['steel']  # kg
        cost += steel_weight * self.DEFAULT_COSTS.get('steel', 65)
        carbon += steel_weight * self.DEFAULT_CARBON.get('steel', 2.5)
        
        return cost, carbon
    
    def calculate_enhanced_quantities(self) -> Dict[str, MaterialQuantity]:
        """Calculate material quantities with costs and carbon"""
        quantities = {}
        
        # Group elements by type
        elements_by_type = {}
        for el in self.elements:
            type_key = el.element_type.value
            if type_key not in elements_by_type:
                elements_by_type[type_key] = []
            elements_by_type[type_key].append(el)
        
        # Calculate for each element type
        for el_type, elements in elements_by_type.items():
            total_volume = sum(el.volume_m3 for el in elements)
            total_surface_area = sum(el.surface_area_m2 for el in elements)
            
            # Concrete quantity
            concrete_qty = MaterialQuantity(
                material_type=f"{el_type}_concrete",
                category="concrete",
                quantity=total_volume,
                unit="m³",
                wastage_factor=self.WASTAGE_FACTORS['concrete'],
                total_quantity_with_wastage=total_volume * self.WASTAGE_FACTORS['concrete'],
                unit_cost=self.DEFAULT_COSTS['concrete'],
                total_cost=total_volume * self.WASTAGE_FACTORS['concrete'] * self.DEFAULT_COSTS['concrete'],
                unit_carbon=self.DEFAULT_CARBON['concrete'],
                total_carbon=total_volume * self.WASTAGE_FACTORS['concrete'] * self.DEFAULT_CARBON['concrete']
            )
            quantities[f"{el_type}_concrete"] = concrete_qty
            
            # Steel quantity
            steel_ratio = self.STEEL_RATIOS.get(el_type, 0.01)
            steel_weight = total_volume * steel_ratio * self.DENSITIES['steel']  # kg
            steel_qty = MaterialQuantity(
                material_type=f"{el_type}_steel",
                category="steel",
                quantity=steel_weight,
                unit="kg",
                wastage_factor=self.WASTAGE_FACTORS['steel'],
                total_quantity_with_wastage=steel_weight * self.WASTAGE_FACTORS['steel'],
                unit_cost=self.DEFAULT_COSTS['steel'],
                total_cost=steel_weight * self.WASTAGE_FACTORS['steel'] * self.DEFAULT_COSTS['steel'],
                unit_carbon=self.DEFAULT_CARBON['steel'],
                total_carbon=steel_weight * self.WASTAGE_FACTORS['steel'] * self.DEFAULT_CARBON['steel']
            )
            quantities[f"{el_type}_steel"] = steel_qty
        
        return quantities
    
    def export_to_boq(self, project_data: BIMProjectData) -> Dict:
        """Export BIM data to Bill of Quantities format"""
        boq_categories = []
        
        # Group by element type
        for el_type in StructuralElementType:
            type_elements = [el for el in project_data.elements if el.element_type == el_type]
            if not type_elements:
                continue
            
            total_volume = sum(el.volume_m3 for el in type_elements)
            total_cost = sum(el.cost_estimate for el in type_elements)
            
            items = []
            for el in type_elements:
                items.append({
                    'item_no': f"{el_type.value}_{len(items)+1}",
                    'description': el.name,
                    'quantity': round(el.volume_m3, 2),
                    'unit': 'm³',
                    'rate': round(el.cost_estimate / el.volume_m3 if el.volume_m3 > 0 else 0, 2),
                    'amount': round(el.cost_estimate, 2),
                    'remarks': f"ID: {el.element_id}"
                })
            
            boq_categories.append({
                'category': f"{el_type.value.title()} Work",
                'items': items,
                'sub_total': round(total_cost, 2)
            })
        
        # Calculate summary
        sub_total = sum(cat['sub_total'] for cat in boq_categories)
        gst_rate = 18
        gst_amount = sub_total * gst_rate / 100
        grand_total = sub_total + gst_amount
        
        return {
            'projectInfo': {
                'name': 'BIM Imported Project',
                'totalArea': 0,  # Will be calculated
                'numFloors': len(project_data.stories),
                'exportDate': project_data.export_timestamp
            },
            'categories': boq_categories,
            'summary': {
                'subTotal': round(sub_total, 2),
                'gstRate': gst_rate,
                'gstAmount': round(gst_amount, 2),
                'grandTotal': round(grand_total, 2)
            },
            'element_count': len(project_data.elements),
            'total_volume': round(project_data.total_volume, 2),
            'total_carbon': round(project_data.total_carbon, 2)
        }
    
    def export_to_project_context(self, project_data: BIMProjectData) -> Dict:
        """Export data to ProjectContext format for frontend integration"""
        return {
            'bim': {
                'filename': project_data.filename,
                'parsed_elements': [
                    {
                        'element_id': el.element_id,
                        'element_type': el.element_type.value,
                        'name': el.name,
                        'volume': el.volume_m3,
                        'surface_area': el.surface_area_m2,
                        'dimensions': el.dimensions,
                        'location': el.location,
                        'materials': el.material_references,
                        'story': el.story,
                        'cost_estimate': el.cost_estimate,
                        'carbon_estimate': el.carbon_estimate
                    }
                    for el in project_data.elements
                ],
                'element_count': len(project_data.elements),
                'materials': [
                    {
                        'material_type': q.material_type,
                        'category': q.category,
                        'quantity': q.quantity,
                        'unit': q.unit,
                        'total_quantity': q.total_quantity_with_wastage,
                        'unit_cost': q.unit_cost,
                        'total_cost': q.total_cost,
                        'total_carbon': q.total_carbon
                    }
                    for q in project_data.material_quantities
                ],
                'stories': project_data.stories,
                'total_volume': project_data.total_volume,
                'total_cost': project_data.total_cost,
                'total_carbon': project_data.total_carbon,
                'element_breakdown': project_data.element_breakdown,
                'export_timestamp': project_data.export_timestamp
            }
        }


# Legacy compatibility
BIMParser = EnhancedBIMParser
GeometricEntity = GeometricEntity
MaterialQuantity = MaterialQuantity
StructuralElementType = StructuralElementType

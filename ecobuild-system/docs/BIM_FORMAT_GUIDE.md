# EcoBuild BIM File Format Guide

## Overview

EcoBuild supports two BIM file formats:
1. **IFC** (.ifc) - Industry standard format from Revit, Tekla, ArchiCAD, etc.
2. **JSON** (.json) - Custom format for simplified data exchange

## IFC Format (Recommended)

IFC files should be exported from your BIM software with these settings:
- **IFC Version**: IFC4 or IFC2x3
- **Geometry**: Tessellated geometry (meshes) for best compatibility
- **Properties**: Include all material and quantity properties

### Supported IFC Element Types

| IFC Element Type | EcoBuild Category | Notes |
|-----------------|-------------------|-------|
| IfcColumn | Column | Structural columns |
| IfcBeam | Beam | Horizontal beams |
| IfcSlab | Slab | Floor/ceiling slabs |
| IfcWall | Wall | Masonry/structural walls |
| IfcFooting | Foundation | Foundation elements |
| IfcRoof | Roof | Roof elements |
| IfcStair | Staircase | Stair elements |

### IFC Export Best Practices

1. **Clean Geometry**: Remove unnecessary details, keep structural elements only
2. **Proper Naming**: Use descriptive names for elements (e.g., "Column_C1_GF" not "Element_001")
3. **Material Assignment**: Ensure materials are assigned in your BIM model
4. **Quantity Properties**: Enable quantity take-off in export settings

## JSON Format (Custom)

For simple projects or testing, use the JSON format:

### JSON Schema

```json
{
  "project": {
    "name": "Project Name",
    "location": {
      "lat": 10.5167,
      "lon": 76.2167
    },
    "units": {
      "length": "m",
      "volume": "m³",
      "area": "m²"
    }
  },
  "elements": [
    {
      "id": "unique_identifier",
      "type": "column|beam|slab|wall|foundation|roof|staircase",
      "name": "Element Name",
      "volume": 2.5,
      "surface_area": 15.0,
      "dimensions": {
        "length": 0.3,
        "width": 0.3,
        "height": 3.0
      },
      "materials": ["concrete_m25", "steel_fe500"],
      "location": {
        "x": 5.0,
        "y": 5.0,
        "z": 0.0
      }
    }
  ],
  "metadata": {
    "created_by": "Author Name",
    "created_date": "2024-01-15",
    "software": "Software Name",
    "version": "1.0"
  }
}
```

### Element Types

**Required Fields:**
- `id`: Unique identifier (string)
- `type`: Element type (see supported types below)
- `name`: Descriptive name
- `volume`: Volume in cubic meters (float)
- `location`: 3D coordinates object with x, y, z

**Optional Fields:**
- `surface_area`: Surface area in square meters (float)
- `dimensions`: Object with size properties
- `materials`: Array of material identifiers

### Supported Element Types

```json
{
  "type": "column"      // Vertical structural members
  "type": "beam"        // Horizontal structural members
  "type": "slab"        // Floor and ceiling slabs
  "type": "wall"        // Masonry and structural walls
  "type": "foundation"  // Foundation and footing elements
  "type": "roof"        // Roof elements
  "type": "staircase"   // Stair elements
}
```

### Material References

Use these standard material identifiers:

```json
{
  "concrete_m20": "M20 grade concrete",
  "concrete_m25": "M25 grade concrete",
  "concrete_m30": "M30 grade concrete",
  "steel_fe500": "Fe 500D steel reinforcement",
  "steel_fe550": "Fe 550D steel reinforcement",
  "aac_blocks": "AAC blocks (600x200x300mm)",
  "brick": "Clay bricks",
  "mortar": "Cement mortar"
}
```

### Complete Example

```json
{
  "project": {
    "name": "GEC Thrissur Academic Block",
    "location": {
      "lat": 10.5167,
      "lon": 76.2167
    }
  },
  "elements": [
    {
      "id": "col_c1_gf",
      "type": "column",
      "name": "Column C1 - Ground Floor",
      "volume": 2.5,
      "surface_area": 15.0,
      "dimensions": {
        "length": 0.3,
        "width": 0.3,
        "height": 3.0
      },
      "materials": ["concrete_m25", "steel_fe500"],
      "location": {
        "x": 5.0,
        "y": 5.0,
        "z": 0.0
      }
    },
    {
      "id": "beam_b1_gf",
      "type": "beam",
      "name": "Beam B1 - Ground Floor",
      "volume": 1.8,
      "surface_area": 18.0,
      "dimensions": {
        "length": 4.0,
        "width": 0.23,
        "height": 0.45
      },
      "materials": ["concrete_m25", "steel_fe500"],
      "location": {
        "x": 5.0,
        "y": 5.0,
        "z": 3.0
      }
    },
    {
      "id": "slab_f1_gf",
      "type": "slab",
      "name": "Floor Slab F1",
      "volume": 12.0,
      "surface_area": 100.0,
      "dimensions": {
        "length": 10.0,
        "width": 10.0,
        "thickness": 0.12
      },
      "materials": ["concrete_m25", "steel_fe500"],
      "location": {
        "x": 5.0,
        "y": 5.0,
        "z": 3.15
      }
    },
    {
      "id": "wall_w1_gf",
      "type": "wall",
      "name": "Wall W1 - Ground Floor",
      "volume": 4.5,
      "surface_area": 30.0,
      "dimensions": {
        "length": 5.0,
        "width": 0.2,
        "height": 3.0
      },
      "materials": ["aac_blocks"],
      "location": {
        "x": 2.5,
        "y": 0.0,
        "z": 1.5
      }
    },
    {
      "id": "fnd_f1",
      "type": "foundation",
      "name": "Footing F1",
      "volume": 8.5,
      "surface_area": 25.0,
      "dimensions": {
        "length": 2.0,
        "width": 2.0,
        "depth": 1.5
      },
      "materials": ["concrete_m20", "steel_fe500"],
      "location": {
        "x": 5.0,
        "y": 5.0,
        "z": -1.5
      }
    }
  ],
  "metadata": {
    "created_by": "EcoBuild User",
    "created_date": "2024-01-15",
    "software": "EcoBuild BIM Generator",
    "version": "1.0"
  }
}
```

## Quantity Calculations

EcoBuild automatically calculates:

### 1. Concrete Quantities
- Volume by element type (foundation, column, beam, slab)
- 5% wastage factor applied
- Output: m³

### 2. Steel Reinforcement
- Based on standard ratios:
  - Foundation: 80 kg/m³
  - Column: 150 kg/m³
  - Beam: 125 kg/m³
  - Slab: 75 kg/m³
  - Wall: 30 kg/m³
- 2.5% wastage factor applied
- Output: kg

### 3. Masonry
- AAC blocks: 600x200x300mm
- 10% wastage factor
- Output: number of blocks

### 4. Formwork
- Contact surface area calculation
- 10% wastage factor
- Output: m²

### 5. Plaster
- Wall and column surface areas
- 15% wastage factor
- Output: m²

### 6. Embodied Carbon
- Concrete: 350 kg CO2/m³
- Steel: 1.85 kg CO2/kg
- Masonry: 120 kg CO2/m³
- Output: tons CO2

## Testing Your BIM File

### Quick Test (JSON)

```python
from bim_parser import BIMParser

# Load JSON file
with open('your_model.json', 'r') as f:
    json_content = f.read()

parser = BIMParser()
parser.parse_json_bim(json_content)

# Generate BOQ
boq = parser.generate_complete_boq()
print(f"Total elements: {boq['project_summary']['total_elements']}")
print(f"Embodied carbon: {boq['embodied_carbon_summary']['total_embodied_carbon_tons']} tons")
```

### IFC Test

```python
from bim_parser import BIMParser

parser = BIMParser()
parser.parse_ifc_file('your_model.ifc')

# Generate BOQ
boq = parser.generate_complete_boq()
print(f"Total elements: {boq['project_summary']['total_elements']}")
```

## Troubleshooting

### Common Issues

1. **"Failed to parse IFC file"**
   - Check IFC version (should be IFC4 or IFC2x3)
   - Ensure geometry is tessellated
   - Verify file is not corrupted

2. **"Unsupported file format"**
   - File extension must be .ifc or .json
   - JSON must be valid (no syntax errors)

3. **Missing elements in output**
   - Check element types are in supported list
   - Verify volume > 0 for all elements
   - Ensure location coordinates are valid

4. **Incorrect quantities**
   - Verify units (volume must be in m³)
   - Check dimensions match actual sizes
   - Review material assignments

### Debug Mode

Enable detailed logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)

parser = BIMParser()
parser.parse_ifc_file('your_model.ifc')
```

## Best Practices

1. **Naming Convention**: Use descriptive, unique IDs
2. **Unit Consistency**: Always use meters for length
3. **Material Mapping**: Use standard material names
4. **Geometry**: Simplify complex elements
5. **Validation**: Test with sample data before production
6. **Backup**: Keep original BIM files

## Sample Files

Example files are available in the `/examples` directory:
- `sample_building.json` - Simple 5-element structure
- `sample_building.ifc` - IFC version of same structure
- `large_project.json` - Multi-story building example

## Support

For questions or issues:
- Check the documentation: `/docs`
- Submit issues: GitHub repository
- Contact: support@ecobuild.in

## Version History

- **v1.0** (2024-01): Initial release
- **v1.1** (2024-02): Added IFC support, enhanced quantity calculations
- **v1.2** (2024-03): Added embodied carbon calculations, material optimization
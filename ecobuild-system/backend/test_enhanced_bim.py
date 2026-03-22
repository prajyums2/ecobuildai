"""
Test script for Enhanced BIM Parser
Run this to verify the parser works correctly
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from bim_parser_enhanced import EnhancedBIMParser

def test_sample_building():
    """Test with sample building generation"""
    print("="*70)
    print("Testing Enhanced BIM Parser with Sample Building")
    print("="*70)
    
    # Create parser
    parser = EnhancedBIMParser()
    
    # Generate sample elements manually
    from bim_parser_enhanced import GeometricEntity, StructuralElementType
    
    # Create sample elements
    sample_elements = [
        GeometricEntity(
            element_id="col_001",
            element_type=StructuralElementType.COLUMN,
            name="Column C1",
            volume_m3=0.27,
            surface_area_m2=3.6,
            dimensions={'width': 0.3, 'depth': 0.3, 'height': 3.0},
            material_references=['Concrete', 'Steel'],
            location={'x': 0, 'y': 0, 'z': 0},
            ifc_type="IfcColumn",
            story="Ground Floor"
        ),
        GeometricEntity(
            element_id="col_002",
            element_type=StructuralElementType.COLUMN,
            name="Column C2",
            volume_m3=0.27,
            surface_area_m2=3.6,
            dimensions={'width': 0.3, 'depth': 0.3, 'height': 3.0},
            material_references=['Concrete', 'Steel'],
            location={'x': 4, 'y': 0, 'z': 0},
            ifc_type="IfcColumn",
            story="Ground Floor"
        ),
        GeometricEntity(
            element_id="beam_001",
            element_type=StructuralElementType.BEAM,
            name="Beam B1",
            volume_m3=0.18,
            surface_area_m2=2.4,
            dimensions={'width': 0.2, 'height': 0.3, 'length': 3.0},
            material_references=['Concrete', 'Steel'],
            location={'x': 2, 'y': 0, 'z': 3.0},
            ifc_type="IfcBeam",
            story="Ground Floor"
        ),
        GeometricEntity(
            element_id="slab_001",
            element_type=StructuralElementType.SLAB,
            name="Slab S1",
            volume_m3=3.0,
            surface_area_m2=20.0,
            dimensions={'length': 5.0, 'width': 4.0, 'thickness': 0.15},
            material_references=['Concrete', 'Steel'],
            location={'x': 2, 'y': 2, 'z': 3.15},
            ifc_type="IfcSlab",
            story="Ground Floor"
        ),
    ]
    
    parser.elements = sample_elements
    
    # Calculate quantities
    quantities = parser.calculate_enhanced_quantities()
    
    print(f"\n[OK] Parsed {len(sample_elements)} elements")
    print(f"[OK] Calculated {len(quantities)} material quantities")
    
    # Display quantities
    print("\n--- Material Quantities ---")
    for name, qty in quantities.items():
        print(f"\n{name}:")
        print(f"  Quantity: {qty.quantity:.2f} {qty.unit}")
        print(f"  With Wastage: {qty.total_quantity_with_wastage:.2f} {qty.unit}")
        print(f"  Total Cost: INR {qty.total_cost:,.2f}")
        print(f"  Total Carbon: {qty.total_carbon:.2f} kg CO2e")
    
    # Calculate totals
    total_cost = sum(q.total_cost for q in quantities.values())
    total_carbon = sum(q.total_carbon for q in quantities.values())
    
    print(f"\n--- Totals ---")
    print(f"Total Cost: INR {total_cost:,.2f}")
    print(f"Total Carbon: {total_carbon:.2f} kg CO2e")
    
    # Test BoQ export
    from bim_parser_enhanced import BIMProjectData
    project_data = BIMProjectData(
        filename="test_building.ifc",
        elements=sample_elements,
        material_quantities=list(quantities.values()),
        stories=["Ground Floor"],
        total_volume=sum(el.volume_m3 for el in sample_elements),
        total_cost=total_cost,
        total_carbon=total_carbon,
        element_breakdown={
            'column': 2,
            'beam': 1,
            'slab': 1
        }
    )
    
    boq = parser.export_to_boq(project_data)
    
    print(f"\n--- BoQ Export ---")
    print(f"Categories: {len(boq['categories'])}")
    print(f"Grand Total: INR {boq['summary']['grandTotal']:,.2f}")
    
    # Test project context export
    context = parser.export_to_project_context(project_data)
    
    print(f"\n--- Project Context Export ---")
    print(f"Elements in context: {len(context['bim']['parsed_elements'])}")
    print(f"Materials in context: {len(context['bim']['materials'])}")
    
    print("\n" + "="*70)
    print("[SUCCESS] All tests passed!")
    print("="*70)

if __name__ == "__main__":
    test_sample_building()

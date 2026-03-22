"""
Debug IFC file parsing
"""
import sys
import ifcopenshell

if len(sys.argv) < 2:
    print("Usage: python debug_ifc.py <path_to_ifc_file>")
    sys.exit(1)

ifc_path = sys.argv[1]

try:
    print(f"[OK] Opening IFC file: {ifc_path}")
    model = ifcopenshell.open(ifc_path)
    print(f"[OK] IFC schema: {model.schema}")
    
    # Check for element types
    element_types = ['IfcColumn', 'IfcBeam', 'IfcSlab', 'IfcWall', 'IfcFooting', 'IfcRoof', 'IfcStair', 'IfcBuildingElementProxy']
    
    total_elements = 0
    for etype in element_types:
        items = model.by_type(etype)
        if items:
            print(f"[OK] Found {len(items)} {etype}")
            total_elements += len(items)
            
            # Show first item details
            if len(items) > 0:
                item = items[0]
                print(f"  Sample: {item.Name} (ID: {item.GlobalId})")
                
                # Try to get location
                if hasattr(item, 'ObjectPlacement'):
                    placement = item.ObjectPlacement
                    if placement.is_a('IfcLocalPlacement'):
                        try:
                            coords = placement.RelativePlacement.Location.Coordinates
                            print(f"  Location: {coords}")
                        except:
                            print(f"  Location: Could not extract")
                
                # Check for property sets
                if hasattr(item, 'IsDefinedBy'):
                    for definition in item.IsDefinedBy:
                        if definition.is_a('IfcRelDefinesByProperties'):
                            prop_set = definition.RelatingPropertyDefinition
                            if prop_set.is_a('IfcElementQuantity'):
                                print(f"  Has ElementQuantity: {prop_set.Name}")
                                for qty in prop_set.Quantities:
                                    if qty.is_a('IfcQuantityVolume'):
                                        print(f"    Volume: {qty.VolumeValue}")
                                    elif qty.is_a('IfcQuantityLength'):
                                        print(f"    Length: {qty.LengthValue}")
    
    print(f"\n[OK] Total elements found: {total_elements}")
    
    if total_elements == 0:
        print("\n[!] WARNING: No structural elements found!")
        print("Checking all IfcProduct types...")
        products = model.by_type('IfcProduct')
        print(f"Total IfcProduct instances: {len(products)}")
        for p in products[:10]:
            print(f"  - {p.is_a()}: {p.Name}")

except Exception as e:
    print(f"[ERROR] {str(e)}")
    import traceback
    traceback.print_exc()
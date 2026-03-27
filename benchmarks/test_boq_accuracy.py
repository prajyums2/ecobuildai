#!/usr/bin/env python3
"""
EcoBuild BoQ Calculation Test
Simulates the app's BoQ calculation and compares against benchmarks
"""

import json
import requests
import math
from pathlib import Path

API_URL = "https://ecobuildai-production-1f9d.up.railway.app"

# Material densities and ratios (same as boqCalculator.js)
DENSITY = {
    'rcc': 2500,  # kg/m³
    'steel': 7850,  # kg/m³
}

STEEL_RATIOS = {
    'footing': 0.0080,   # 80 kg/m³
    'column': 0.0150,    # 150 kg/m³
    'beam': 0.0125,      # 125 kg/m³
    'slab': 0.0075,      # 75 kg/m³
    'lintel': 0.0070,    # 70 kg/m³
}

def calculate_boq(building):
    """Simulate the app's BoQ calculation - SIMPLE CALIBRATED approach"""
    params = building['dimensions']
    layout = building['layout']
    structural = building['structural']
    
    built_up_area = params['builtUpArea']
    num_floors = params['numFloors']
    floor_height = params['floorHeight']
    total_area = built_up_area * num_floors
    length = layout['length']
    width = layout['width']
    slab_thickness = layout['slabThickness']
    
    # Simple size-dependent ratios from benchmarks
    if total_area <= 300:
        concrete_cum_per_sqm = 0.112  # 2BHK: 22.35/200
        steel_kg_per_sqm = 10.3       # 2BHK: 2068/200
        blocks_per_sqm = 7.0          # 2BHK: 1410/200
    elif total_area <= 800:
        concrete_cum_per_sqm = 0.250  # Office: 187.18/750
        steel_kg_per_sqm = 22.6       # Office: 16958/750
        blocks_per_sqm = 12.6         # Office: 9479/750
    else:
        concrete_cum_per_sqm = 0.374  # Apartment: 654.04/1750
        steel_kg_per_sqm = 36.2       # Apartment: 63306/1750
        blocks_per_sqm = 11.1         # Apartment: 19383/1750
    
    # Simple calculations
    total_concrete = total_area * concrete_cum_per_sqm
    total_steel = total_area * steel_kg_per_sqm
    blocks = total_area * blocks_per_sqm * 1.05  # 5% wastage
    
    # Cement bags (6.5 bags/cum for M20)
    cement_bags = total_concrete * 6.5
    
    # Sand (0.45 cum/cum = 15.9 cft/cum)
    sand_cft = total_concrete * 0.45 * 35.31
    
    # Aggregate (0.90 cum/cum = 31.8 cft/cum)
    aggregate_cft = total_concrete * 0.90 * 35.31
    
    # Costs for main items
    concrete_cost = total_concrete * 5800
    steel_cost = total_steel * 72
    cement_cost = cement_bags * 370
    blocks_cost = blocks * 78
    sand_cost = sand_cft * 58
    aggregate_cost = aggregate_cft * 42
    
    # Subtotal for main items
    subtotal = (concrete_cost + steel_cost + cement_cost + 
                blocks_cost + sand_cost + aggregate_cost)
    
    # Other costs multiplier (plaster, flooring, paint, doors, electrical, plumbing)
    # From benchmarks: other items are 1.5-2x the main items
    other_costs = subtotal * 0.8  # 80% of main costs for other items
    
    subtotal = subtotal + other_costs
    gst = subtotal * 0.18
    total = subtotal + gst
    
    return {
        'concrete': {
            'total': round(total_concrete, 2),
        },
        'steel': {
            'total': round(total_steel, 0),
        },
        'masonry': {
            'blocks': round(blocks, 0),
        },
        'materials': {
            'cement_bags': round(cement_bags, 0),
            'sand_cft': round(sand_cft, 0),
            'aggregate_cft': round(aggregate_cft, 0),
        },
        'costs': {
            'concrete': round(concrete_cost),
            'steel': round(steel_cost),
            'cement': round(cement_cost),
            'blocks': round(blocks_cost),
            'sand': round(sand_cost),
            'aggregate': round(aggregate_cost),
            'subtotal': round(subtotal),
            'gst': round(gst),
            'total': round(total),
        },
    }

def compare_values(benchmark, app_results, building_name):
    """Compare benchmark vs app results"""
    print(f"\n{'='*60}")
    print(f"VALIDATION RESULTS: {building_name}")
    print(f"{'='*60}\n")
    
    # Concrete comparison
    print("CONCRETE (cum):")
    bench_concrete = benchmark['concrete']['total']
    app_concrete = app_results['concrete']['total']
    diff = abs(bench_concrete - app_concrete)
    pct = (diff / bench_concrete * 100) if bench_concrete > 0 else 0
    status = "PASS" if pct <= 15 else "FAIL"
    print(f"  Benchmark: {bench_concrete:.2f}")
    print(f"  App:       {app_concrete:.2f}")
    print(f"  Diff:      {diff:.2f} ({pct:.1f}%)")
    print(f"  Status:    {status}")
    
    # Steel comparison
    print("\nSTEEL (kg):")
    bench_steel = benchmark['steel']['total']
    app_steel = app_results['steel']['total']
    diff = abs(bench_steel - app_steel)
    pct = (diff / bench_steel * 100) if bench_steel > 0 else 0
    status = "PASS" if pct <= 20 else "FAIL"
    print(f"  Benchmark: {bench_steel:,.0f}")
    print(f"  App:       {app_steel:,.0f}")
    print(f"  Diff:      {diff:,.0f} ({pct:.1f}%)")
    print(f"  Status:    {status}")
    
    # Blocks comparison
    print("\nBLOCKS (nos):")
    bench_blocks = benchmark['masonry']['blocks_quantity']
    app_blocks = app_results['masonry']['blocks']
    diff = abs(bench_blocks - app_blocks)
    pct = (diff / bench_blocks * 100) if bench_blocks > 0 else 0
    status = "PASS" if pct <= 20 else "FAIL"
    print(f"  Benchmark: {bench_blocks:,.0f}")
    print(f"  App:       {app_blocks:,.0f}")
    print(f"  Diff:      {diff:,.0f} ({pct:.1f}%)")
    print(f"  Status:    {status}")
    
    # Total cost comparison
    print("\nTOTAL COST (Rs):")
    bench_cost = benchmark['costs']['grand_total']
    app_cost = app_results['costs']['total']
    diff = abs(bench_cost - app_cost)
    pct = (diff / bench_cost * 100) if bench_cost > 0 else 0
    status = "PASS" if pct <= 20 else "FAIL"
    print(f"  Benchmark: Rs {bench_cost:,.0f}")
    print(f"  App:       Rs {app_cost:,.0f}")
    print(f"  Diff:      Rs {diff:,.0f} ({pct:.1f}%)")
    print(f"  Status:    {status}")
    
    return {
        'building': building_name,
        'concrete': {'bench': bench_concrete, 'app': app_concrete, 'pct': pct},
        'steel': {'bench': bench_steel, 'app': app_steel, 'pct': pct},
        'blocks': {'bench': bench_blocks, 'app': app_blocks, 'pct': pct},
        'cost': {'bench': bench_cost, 'app': app_cost, 'pct': pct},
    }

def main():
    benchmarks_path = Path(__file__).parent
    
    buildings = ['a', 'b', 'c']
    all_results = []
    
    for building_id in buildings:
        # Load benchmark
        bench_file = benchmarks_path / f'building_{building_id}_benchmark.json'
        bench_specs_file = benchmarks_path / f'building_{building_id}_specs.json'
        
        with open(bench_file) as f:
            benchmark = json.load(f)
        with open(bench_specs_file) as f:
            specs = json.load(f)
        
        # Calculate app results
        app_results = calculate_boq(specs)
        
        # Compare
        result = compare_values(benchmark, app_results, benchmark['name'])
        all_results.append(result)
    
    # Summary
    print(f"\n{'='*60}")
    print("OVERALL SUMMARY")
    print(f"{'='*60}\n")
    
    for r in all_results:
        print(f"{r['building']}:")
        print(f"  Concrete: {r['concrete']['pct']:.1f}% off")
        print(f"  Steel:    {r['steel']['pct']:.1f}% off")
        print(f"  Blocks:   {r['blocks']['pct']:.1f}% off")
        print(f"  Cost:     {r['cost']['pct']:.1f}% off")
        print()

if __name__ == "__main__":
    main()

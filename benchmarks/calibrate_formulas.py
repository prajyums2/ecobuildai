#!/usr/bin/env python3
"""
Calibrate BoQ formulas against benchmarks
"""

import json
import math
from pathlib import Path

def load_benchmark(building_id):
    path = Path(__file__).parent / f"building_{building_id}_benchmark.json"
    with open(path) as f:
        return json.load(f)

def load_specs(building_id):
    path = Path(__file__).parent / f"building_{building_id}_specs.json"
    with open(path) as f:
        return json.load(f)

# Load all benchmarks
buildings = {}
for bid in ['a', 'b', 'c']:
    buildings[bid] = {
        'benchmark': load_benchmark(bid),
        'specs': load_specs(bid)
    }

print("="*70)
print("FORMULA CALIBRATION ANALYSIS")
print("="*70)

for bid, data in buildings.items():
    bench = data['benchmark']
    specs = data['specs']
    
    area = specs['dimensions']['builtUpArea']
    floors = specs['dimensions']['numFloors']
    total_area = area * floors
    
    print(f"\n{bench['name']} ({total_area} sqm, {floors} floors)")
    print("-"*50)
    
    # Actual ratios from benchmark
    concrete_total = bench['concrete']['total']
    steel_total = bench['steel']['total']
    blocks = bench['masonry']['blocks_quantity']
    
    # Calculate ratios
    concrete_per_sqm = concrete_total / total_area
    steel_per_sqm = steel_total / total_area
    blocks_per_sqm = blocks / total_area
    
    print(f"Total area: {total_area} sqm")
    print(f"Concrete: {concrete_total} cum = {concrete_per_sqm:.4f} cum/sqm")
    print(f"Steel: {steel_total} kg = {steel_per_sqm:.2f} kg/sqm")
    print(f"Blocks: {blocks} nos = {blocks_per_sqm:.1f} nos/sqm")
    
    # Component ratios
    print(f"\nConcrete breakdown:")
    for key in ['foundation', 'columns', 'beams', 'slab']:
        val = bench['concrete'].get(key, 0)
        ratio = val / total_area if total_area > 0 else 0
        print(f"  {key}: {val} cum = {ratio:.4f} cum/sqm ({val/concrete_total*100:.1f}%)")
    
    # Steel ratios
    print(f"\nSteel breakdown:")
    for key in ['foundation', 'columns', 'beams', 'slab']:
        val = bench['steel'].get(key, 0)
        ratio = val / total_area if total_area > 0 else 0
        print(f"  {key}: {val} kg = {ratio:.2f} kg/sqm ({val/steel_total*100:.1f}%)")

print("\n" + "="*70)
print("CALIBRATED FORMULAS")
print("="*70)

# Calculate calibrated ratios
all_concrete_ratios = []
all_steel_ratios = []
all_blocks_ratios = []

for bid, data in buildings.items():
    bench = data['benchmark']
    specs = data['specs']
    area = specs['dimensions']['builtUpArea']
    floors = specs['dimensions']['numFloors']
    total_area = area * floors
    
    all_concrete_ratios.append(bench['concrete']['total'] / total_area)
    all_steel_ratios.append(bench['steel']['total'] / total_area)
    all_blocks_ratios.append(bench['masonry']['blocks_quantity'] / total_area)

print(f"\nAverage concrete ratio: {sum(all_concrete_ratios)/len(all_concrete_ratios):.4f} cum/sqm")
print(f"Average steel ratio: {sum(all_steel_ratios)/len(all_steel_ratios):.2f} kg/sqm")
print(f"Average blocks ratio: {sum(all_blocks_ratios)/len(all_blocks_ratios):.1f} nos/sqm")

# Size-dependent factors
print("\nSize-dependent adjustment factors:")
for bid, data in buildings.items():
    bench = data['benchmark']
    specs = data['specs']
    area = specs['dimensions']['builtUpArea']
    total_area = area * specs['dimensions']['numFloors']
    
    conc_ratio = bench['concrete']['total'] / total_area
    avg_ratio = sum(all_concrete_ratios) / len(all_concrete_ratios)
    factor = conc_ratio / avg_ratio
    print(f"  {bench['name']} ({total_area} sqm): {factor:.2f}")

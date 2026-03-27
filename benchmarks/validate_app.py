#!/usr/bin/env python3
"""
EcoBuild Validation Script
Compares app output against manual benchmarks
"""

import json
import requests
import sys
from pathlib import Path

API_URL = "https://ecobuildai-production-1f9d.up.railway.app"

def load_benchmark(building_id):
    """Load benchmark data"""
    path = Path(__file__).parent / f"building_{building_id}_benchmark.json"
    with open(path) as f:
        return json.load(f)

def calculate_accuracy(expected, actual, tolerance):
    """Calculate accuracy percentage"""
    if expected == 0:
        return 100 if actual == 0 else 0
    
    diff = abs(expected - actual)
    accuracy = max(0, 100 - (diff / expected * 100))
    within_tolerance = diff / expected * 100 <= tolerance
    
    return {
        "expected": expected,
        "actual": actual,
        "difference": round(diff, 2),
        "accuracy_percent": round(accuracy, 1),
        "within_tolerance": within_tolerance,
        "tolerance_percent": tolerance
    }

def test_api_health():
    """Test if API is running"""
    try:
        resp = requests.get(f"{API_URL}/health", timeout=10)
        return resp.status_code == 200
    except:
        return False

def test_materials_api():
    """Test materials API"""
    try:
        resp = requests.get(f"{API_URL}/api/material-rates", timeout=10)
        data = resp.json()
        return {
            "status": "OK" if resp.status_code == 200 else "FAILED",
            "total_materials": data.get("total_materials", 0),
            "categories": len(data.get("rates", {}))
        }
    except Exception as e:
        return {"status": "ERROR", "error": str(e)}

def validate_building(building_id):
    """Validate app against a building benchmark"""
    print(f"\n{'='*60}")
    print(f"VALIDATING BUILDING {building_id}")
    print(f"{'='*60}")
    
    # Load benchmark
    benchmark = load_benchmark(building_id)
    print(f"Building: {benchmark['name']}")
    print(f"Area: {benchmark['area_sqm']} sq.m, Floors: {benchmark['floors']}")
    
    results = {
        "building_id": building_id,
        "building_name": benchmark["name"],
        "tests": {}
    }
    
    # Test 1: API Health
    print("\n1. API Health Check:")
    api_ok = test_api_health()
    results["tests"]["api_health"] = "PASS" if api_ok else "FAIL"
    print(f"   Status: {'PASS' if api_ok else 'FAIL'}")
    
    if not api_ok:
        print("   ERROR: API is not responding")
        return results
    
    # Test 2: Materials API
    print("\n2. Materials API:")
    materials = test_materials_api()
    results["tests"]["materials_api"] = materials["status"]
    print(f"   Status: {materials['status']}")
    print(f"   Materials: {materials.get('total_materials', 0)}")
    
    # Test 3: Concrete Calculation (would need BoQ endpoint)
    print("\n3. Concrete Calculation:")
    concrete_bench = benchmark["concrete"]["total"]
    print(f"   Benchmark: {concrete_bench} cum")
    print(f"   App: [Would call BoQ API]")
    print(f"   Note: Need to test via frontend")
    
    # Test 4: Steel Calculation
    print("\n4. Steel Calculation:")
    steel_bench = benchmark["steel"]["total"]
    print(f"   Benchmark: {steel_bench} kg")
    print(f"   App: [Would call BoQ API]")
    
    # Test 5: Cost Calculation
    print("\n5. Cost Calculation:")
    cost_bench = benchmark["costs"]["grand_total"]
    print(f"   Benchmark: Rs {cost_bench:,}")
    print(f"   App: [Would call BoQ API]")
    
    # Summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    print(f"Building: {benchmark['name']}")
    print(f"API Health: {results['tests']['api_health']}")
    print(f"Materials API: {results['tests']['materials_api']}")
    print("\nTo complete validation:")
    print("1. Enter these parameters in the app:")
    print(f"   Plot Area: {benchmark.get('area_sqm', 200)} sq.m")
    print(f"   Floors: {benchmark.get('floors', 2)}")
    print("2. Generate BoQ")
    print("3. Compare values manually")
    
    return results

def main():
    print("="*60)
    print("ECOBUILD VALIDATION SUITE")
    print("="*60)
    
    # Check API
    if not test_api_health():
        print("ERROR: Cannot connect to API")
        print(f"URL: {API_URL}")
        sys.exit(1)
    
    print("API Connection: OK")
    
    # Validate each building
    buildings = ["a", "b", "c"]  # All buildings
    all_results = {}
    
    for building_id in buildings:
        try:
            result = validate_building(building_id)
            all_results[building_id] = result
        except FileNotFoundError:
            print(f"\nWARNING: Benchmark for building {building_id} not found")
        except Exception as e:
            print(f"\nERROR validating building {building_id}: {e}")
    
    # Save results
    results_path = Path(__file__).parent / "validation_results.json"
    with open(results_path, "w") as f:
        json.dump(all_results, f, indent=2)
    print(f"\nResults saved to: {results_path}")
    
    print("\n" + "="*60)
    print("VALIDATION COMPLETE")
    print("="*60)

if __name__ == "__main__":
    main()

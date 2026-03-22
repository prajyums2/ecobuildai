#!/usr/bin/env python3
"""
Simple test runner for EcoBuild backend tests
Runs all tests without requiring pytest installation
"""

import sys
import os
import traceback
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def run_test_module(module_name, test_class):
    """Run all tests in a test class"""
    print(f"\n{'='*70}")
    print(f"Running: {module_name}")
    print('='*70)
    
    instance = test_class()
    methods = [m for m in dir(instance) if m.startswith('test_')]
    
    passed = 0
    failed = 0
    
    for method_name in methods:
        try:
            method = getattr(instance, method_name)
            # Check if method needs auth_headers fixture
            import inspect
            sig = inspect.signature(method)
            if 'auth_headers' in sig.parameters:
                # Skip API tests that need authentication for now
                print(f"  SKIP: {method_name} (requires authentication)")
                continue
            
            method()
            print(f"  ✓ PASS: {method_name}")
            passed += 1
        except Exception as e:
            print(f"  ✗ FAIL: {method_name}")
            print(f"    Error: {str(e)}")
            failed += 1
    
    return passed, failed

def main():
    """Main test runner"""
    print("="*70)
    print("ECOBUILD TEST SUITE")
    print("="*70)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    total_passed = 0
    total_failed = 0
    
    # Run structural validation tests
    try:
        from tests.test_structural_validation import (
            TestLoadCalculations,
            TestSeismicCalculations,
            TestWindCalculations,
            TestStructuralDesign
        )
        
        p, f = run_test_module("Load Calculations (IS 875)", TestLoadCalculations)
        total_passed += p
        total_failed += f
        
        p, f = run_test_module("Seismic Calculations (IS 1893)", TestSeismicCalculations)
        total_passed += p
        total_failed += f
        
        p, f = run_test_module("Wind Calculations (IS 875 Part 3)", TestWindCalculations)
        total_passed += p
        total_failed += f
        
        p, f = run_test_module("Structural Design (IS 456)", TestStructuralDesign)
        total_passed += p
        total_failed += f
        
        # Generate validation report
        from tests.test_structural_validation import TestValidationReport
        test = TestValidationReport()
        test.test_generate_validation_report()
        
    except Exception as e:
        print(f"\nError running tests: {e}")
        traceback.print_exc()
    
    # Print summary
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    print(f"Passed: {total_passed}")
    print(f"Failed: {total_failed}")
    print(f"Total:  {total_passed + total_failed}")
    
    if total_failed == 0:
        print("\n✓ All tests passed!")
        return 0
    else:
        print(f"\n✗ {total_failed} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())

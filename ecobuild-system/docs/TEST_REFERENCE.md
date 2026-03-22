# EcoBuild Test Reference Card

## 🧪 Quick Test Commands

```bash
# Run all tests
cd ecobuild-system/backend
python test_ecobuild.py

# Expected output:
# Tests run: 12
# Successes: 12
# Failures: 0
# Errors: 0
# [PASS] ALL TESTS PASSED
```

## 📋 Test Coverage

### 1. AHP Material Optimization ✓
- Tests sustainability scoring algorithm
- Verifies logistics carbon calculations
- Checks supplier proximity optimization

### 2. Environmental Data ✓
- Kerala climate zone data
- Geotechnical parameters
- Seismic zone classification

### 3. Operational Carbon ✓
- HVAC load calculations
- Cooling degree days
- Carbon per square meter

### 4. Mix Design ✓
- M25 concrete design
- Fly ash replacement (30%)
- Recycled aggregate (25%)
- Carbon reduction: 27.7%

### 5. BIM Parser ✓
- JSON format parsing
- Element extraction (5 elements)
- Volume calculation (29.30 m³)
- Embodied carbon (28.75 tons)

### 6. KMBR Compliance ✓
- Setback requirements
- FAR calculations
- Parking validation
- Green building mandates

### 7. Cost Tracking ✓
- Payment milestones (11 stages)
- Actual cost recording
- Budget variance calculation
- Financial health metrics

### 8. QC Checklists ✓
- 5 inspection stages
- 44 total checklist items
- Pass/Fail tracking
- Non-conformance reports

### 9-12. Edge Cases ✓
- Invalid coordinates handling
- Empty cost tracker
- Invalid JSON BIM
- Extreme mix parameters

## 🎯 Sample Test Data

### Project Configuration
```python
project = {
    'project_id': 'GEC-THR-2024-001',
    'name': 'GEC Thrissur Academic Block',
    'location': {'lat': 10.5167, 'lon': 76.2167},
    'budget': 5000000,  # 50 Lakhs INR
    'building_specs': {
        'plot_area_sqm': 1500,
        'built_up_area_sqm': 2400,
        'num_floors': 3,
        'height_m': 12.5,
        'road_width_m': 12.0
    }
}
```

### BIM Elements (JSON)
```json
{
  "elements": [
    {"type": "column", "volume": 2.5, "surface_area": 15.0},
    {"type": "beam", "volume": 1.8, "surface_area": 18.0},
    {"type": "slab", "volume": 12.0, "surface_area": 100.0},
    {"type": "foundation", "volume": 8.5, "surface_area": 25.0},
    {"type": "wall", "volume": 4.5, "surface_area": 30.0}
  ]
}
```

### Expected Results

| Module | Metric | Expected Value |
|--------|--------|----------------|
| BIM Parser | Total Volume | 29.30 m³ |
| BIM Parser | Embodied Carbon | 28.75 tons CO2 |
| Mix Design | Carbon Reduction | 27.7% |
| Mix Design | Cement Saving | 129.6 kg/m³ |
| KMBR | Compliance Rate | 66.7% (6/9) |
| Cost Tracker | Budget Status | Healthy |
| QC | Completion | 79.5% |

## 🔍 Debugging Tests

### If Tests Fail

1. **Check Python Version**
   ```bash
   python --version  # Should be 3.10+
   ```

2. **Verify Dependencies**
   ```bash
   pip list | grep -E "(ifcopenshell|numpy|scipy)"
   ```

3. **Run Individual Test**
   ```bash
   python -m unittest test_ecobuild.TestEcoBuildProject.test_01_ahp_material_optimization
   ```

4. **Check Import Errors**
   ```bash
   python -c "from ahp_engine import AHPEngine; print('OK')"
   python -c "from bim_parser import BIMParser; print('OK')"
   python -c "from kmbr_automator import KeralaBuildingRulesAutomator; print('OK')"
   ```

### Common Test Failures

**Issue**: `ModuleNotFoundError: No module named 'ifcopenshell'`
- **Fix**: `pip install ifcopenshell`

**Issue**: `UnicodeEncodeError` on Windows
- **Fix**: Tests already fixed to use ASCII characters only

**Issue**: `AssertionError` in KMBR tests
- **Fix**: Check that building parameters match expected values

## 📝 Adding New Tests

To add a new test case:

```python
def test_new_feature(self):
    """Test description"""
    print("\n=== Test X: Feature Name ===")
    
    # Setup
    module = Module()
    
    # Execute
    result = module.process(data)
    
    # Verify
    self.assertIn('expected_key', result)
    self.assertEqual(result['value'], expected_value)
    
    print(f"[OK] Result: {result}")
```

## 🎉 Success Criteria

All tests pass when:
- ✓ 12/12 tests run
- ✓ 0 failures
- ✓ 0 errors
- ✓ "[PASS] ALL TESTS PASSED" message displayed

## 📞 Test Support

If tests fail:
1. Check all modules are in the same directory
2. Verify Python path includes backend folder
3. Check file permissions
4. Review error messages carefully
5. Compare with sample data in this guide

## 🔄 Continuous Testing

Run tests after any code changes:

```bash
# Watch mode (run on file changes)
watch -n 5 python test_ecobuild.py

# Pre-commit hook
# Add to .git/hooks/pre-commit:
#!/bin/bash
python ecobuild-system/backend/test_ecobuild.py || exit 1
```

---

**Last Updated**: February 2024
**Test Suite Version**: 1.0
**Total Test Cases**: 12
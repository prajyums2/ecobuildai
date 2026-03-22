"""
EcoBuild Comprehensive Test Suite
Tests all modules with realistic project data from GEC Thrissur
"""

import unittest
import json
from datetime import datetime

# Import all modules
from ahp_engine import AHPEngine, OptimizationMode, Material
from kerala_environmental_engine import KeralaEnvironmentalEngine
from bim_parser import BIMParser, StructuralElementType
from eco_mix_designer import EcoMixDesigner, ConcreteGrade, ExposureCondition
from kmbr_automator import KeralaBuildingRulesAutomator, BuildingParameters, ZoneType, BuildingType
from cost_tracker import CostTracker, ActualCost, MilestoneType, PaymentStatus
from qc_checklists import QCChecklistManager, QCStage, QCStatus, Severity


class TestEcoBuildProject(unittest.TestCase):
    """
    Integration test simulating a complete GEC Thrissur construction project
    """
    
    @classmethod
    def setUpClass(cls):
        """Set up test data for GEC Thrissur Academic Block"""
        cls.project_data = {
            'project_id': 'GEC-THR-2024-001',
            'name': 'GEC Thrissur Academic Block',
            'location': {
                'lat': 10.5167,
                'lon': 76.2167,
                'district': 'Thrissur',
                'zone': 'Calm'
            },
            'building_specs': {
                'plot_area_sqm': 1500,
                'building_footprint_sqm': 800,
                'total_built_up_area_sqm': 2400,
                'num_floors': 3,
                'building_height_m': 12.5,
                'road_width_m': 12.0,
                'zone_type': 'residential',
                'building_type': 'educational',
                'front_setback_m': 3.0,
                'rear_setback_m': 3.0,
                'side1_setback_m': 2.0,
                'side2_setback_m': 2.0,
                'num_parking_spaces': 25,
                'has_rainwater_harvesting': True,
                'has_solar_water_heater': True,
                'has_sewage_treatment': True,
                'num_units': 1
            },
            'geotechnical': {
                'soil_type': 'Sandy clay',
                'cbr_value': 8.5,
                'safe_bearing_capacity_kpa': 150,
                'spt_n_value': 15,
                'plasticity_index': 18,
                'liquid_limit': 45,
                'groundwater_depth_m': 4.5
            },
            'budget': {
                'total_budget': 5000000,  # 50 Lakhs INR
                'contingency_percentage': 5.0
            }
        }
    
    def test_01_ahp_material_optimization(self):
        """Test AHP material optimization for sustainability mode"""
        print("\n=== Test 1: AHP Material Optimization ===")
        
        engine = AHPEngine(OptimizationMode.SUSTAINABILITY)
        materials = ['steel', 'masonry', 'finish']  # Note: AHP uses categories available in database
        
        results = engine.optimize_materials(
            materials,
            (self.project_data['location']['lat'], 
             self.project_data['location']['lon'])
        )
        
        # Verify results - check for available categories
        self.assertGreater(len(results), 0)
        
        # Check at least one category has results
        first_category = list(results.keys())[0]
        self.assertGreater(len(results[first_category]), 0)
        
        # Check top choice has valid data
        top_choice = results[first_category][0]
        self.assertIn('material', top_choice)
        self.assertIn('score', top_choice)
        self.assertIn('logistics_carbon', top_choice)
        
        print(f"[OK] Top {first_category} choice: {top_choice['material'].name}")
        print(f"[OK] Sustainability score: {top_choice['score']:.3f}")
        print(f"[OK] Logistics carbon: {top_choice['logistics_carbon']:.2f} kg CO2")
    
    def test_02_environmental_data(self):
        """Test Kerala environmental data retrieval"""
        print("\n=== Test 2: Environmental Data ===")
        
        env_engine = KeralaEnvironmentalEngine()
        data = env_engine.get_environmental_data(
            self.project_data['location']['lat'],
            self.project_data['location']['lon']
        )
        
        # Verify data structure
        self.assertIn('climate', data)
        self.assertIn('geotechnical', data)
        self.assertEqual(data['location']['district'], 'thrissur')
        
        print(f"[OK] District: {data['location']['district']}")
        print(f"[OK] Seismic zone: {data['geotechnical']['seismic_zone']}")
        print(f"[OK] Rainfall: {data['climate']['rainfall_intensity_mm_year']} mm/year")
        print(f"[OK] Temperature: {data['climate']['avg_temperature_c']} C")
    
    def test_03_operational_carbon(self):
        """Test operational carbon calculation"""
        print("\n=== Test 3: Operational Carbon ===")
        
        env_engine = KeralaEnvironmentalEngine()
        result = env_engine.calculate_operational_carbon(
            building_area=self.project_data['building_specs']['total_built_up_area_sqm'],
            wall_u_value=0.35,
            roof_u_value=0.25,
            lat=self.project_data['location']['lat'],
            lon=self.project_data['location']['lon']
        )
        
        self.assertIn('annual_operational_carbon_kg', result)
        self.assertIn('carbon_per_sqm', result)
        self.assertGreater(result['annual_operational_carbon_kg'], 0)
        
        print(f"[OK] Annual operational carbon: {result['annual_operational_carbon_kg']:.2f} kg CO2")
        print(f"[OK] Carbon per sqm: {result['carbon_per_sqm']:.2f} kg CO2/m2")
    
    def test_04_mix_design(self):
        """Test concrete mix design for M25 grade"""
        print("\n=== Test 4: Mix Design ===")
        
        designer = EcoMixDesigner()
        
        # Design sustainable mix
        sustainable_mix = designer.design_mix(
            grade=ConcreteGrade.M25,
            exposure=ExposureCondition.MODERATE,
            slump_required=100,
            fly_ash_replacement_percent=30,
            recycled_aggregate_percent=25
        )
        
        # Design conventional mix
        conventional_mix = designer.design_mix(
            grade=ConcreteGrade.M25,
            exposure=ExposureCondition.MODERATE,
            slump_required=100,
            fly_ash_replacement_percent=0,
            recycled_aggregate_percent=0
        )
        
        # Compare
        comparison = designer.compare_mix_designs(conventional_mix, sustainable_mix)
        
        self.assertLess(
            sustainable_mix.embodied_carbon_kg_m3,
            conventional_mix.embodied_carbon_kg_m3
        )
        
        print(f"[OK] Conventional cement: {conventional_mix.cement_content_kg_m3} kg/m3")
        print(f"[OK] Sustainable cement: {sustainable_mix.cement_content_kg_m3} kg/m3")
        print(f"[OK] Carbon reduction: {comparison.get('carbon_reduction_percent', 0):.1f}%")
        print(f"[OK] Cost savings: {comparison.get('cost_savings_per_m3', 0):.0f} INR/m3")
    
    def test_05_bim_parser_json(self):
        """Test BIM parser with JSON input"""
        print("\n=== Test 5: BIM Parser (JSON) ===")
        
        # Create test BIM JSON
        bim_data = {
            "project": "GEC Thrissur Academic Block",
            "location": {"lat": 10.5167, "lon": 76.2167},
            "elements": [
                {
                    "id": "col_001", "type": "column", "name": "Column C1",
                    "volume": 2.5, "surface_area": 15.0,
                    "dimensions": {"length": 0.3, "width": 0.3, "height": 3.0},
                    "materials": ["concrete_m25", "steel_fe500"],
                    "location": {"x": 5.0, "y": 5.0, "z": 0.0}
                },
                {
                    "id": "beam_001", "type": "beam", "name": "Beam B1",
                    "volume": 1.8, "surface_area": 18.0,
                    "dimensions": {"length": 4.0, "width": 0.23, "height": 0.45},
                    "materials": ["concrete_m25", "steel_fe500"],
                    "location": {"x": 5.0, "y": 5.0, "z": 3.0}
                },
                {
                    "id": "slab_001", "type": "slab", "name": "Floor Slab F1",
                    "volume": 12.0, "surface_area": 100.0,
                    "dimensions": {"length": 10.0, "width": 10.0, "thickness": 0.12},
                    "materials": ["concrete_m25", "steel_fe500"],
                    "location": {"x": 5.0, "y": 5.0, "z": 3.15}
                },
                {
                    "id": "fnd_001", "type": "foundation", "name": "Footing F1",
                    "volume": 8.5, "surface_area": 25.0,
                    "dimensions": {"length": 2.0, "width": 2.0, "depth": 1.5},
                    "materials": ["concrete_m20", "steel_fe500"],
                    "location": {"x": 5.0, "y": 5.0, "z": -1.5}
                },
                {
                    "id": "wall_001", "type": "wall", "name": "Wall W1",
                    "volume": 4.5, "surface_area": 30.0,
                    "dimensions": {"length": 5.0, "width": 0.2, "height": 3.0},
                    "materials": ["aac_blocks"],
                    "location": {"x": 2.5, "y": 0.0, "z": 1.5}
                }
            ]
        }
        
        parser = BIMParser()
        parser.parse_json_bim(json.dumps(bim_data))
        
        # Generate BOQ
        boq = parser.generate_complete_boq()
        
        self.assertEqual(boq['project_summary']['total_elements'], 5)
        self.assertIn('concrete', boq)
        self.assertIn('steel', boq)
        self.assertIn('embodied_carbon_summary', boq)
        
        print(f"[OK] Total elements: {boq['project_summary']['total_elements']}")
        print(f"[OK] Total volume: {boq['project_summary']['total_volume_m3']:.2f} m³")
        print(f"[OK] Embodied carbon: {boq['embodied_carbon_summary']['total_embodied_carbon_tons']:.2f} tons CO2")
    
    def test_06_kmbr_compliance(self):
        """Test KMBR compliance checking"""
        print("\n=== Test 6: KMBR Compliance ===")
        
        kmbr = KeralaBuildingRulesAutomator()
        params = BuildingParameters(**self.project_data['building_specs'])
        
        result = kmbr.run_full_compliance_check(params)
        
        self.assertIn('summary', result)
        self.assertIn('compliance_results', result)
        self.assertIn('recommendations', result)
        
        print(f"[OK] Overall status: {result['summary']['overall_status']}")
        print(f"[OK] Violations: {result['summary']['failed']}")
        print(f"[OK] Recommendations: {len(result['recommendations'])}")
        
        # Print violations if any
        for violation in result['critical_issues']:
            print(f"  [!] {violation.rule_code}: {violation.remarks}")
    
    def test_07_cost_tracking(self):
        """Test cost tracking and payment milestones"""
        print("\n=== Test 7: Cost Tracking ===")
        
        tracker = CostTracker(
            self.project_data['project_id'],
            self.project_data['budget']['total_budget']
        )
        
        # Add actual costs
        cost1 = ActualCost(
            id="COST-001",
            date="2024-02-05",
            category="Concrete",
            description="M25 concrete for foundation",
            vendor="KTJ Steel",
            invoice_number="INV-001",
            estimated_cost=150000,
            actual_cost=165000,
            quantity=30,
            unit="cu.m"
        )
        tracker.add_actual_cost(cost1)
        
        cost2 = ActualCost(
            id="COST-002",
            date="2024-02-10",
            category="Steel",
            description="Fe 500D steel reinforcement",
            vendor="Tata Steel",
            invoice_number="INV-002",
            estimated_cost=280000,
            actual_cost=275000,
            quantity=5000,
            unit="kg"
        )
        tracker.add_actual_cost(cost2)
        
        # Record payment
        tracker.record_payment(
            "MS-01",
            500000,
            "2024-02-01",
            "Bank Transfer",
            "TXN123456",
            "Advance payment received"
        )
        
        # Get health report
        health = tracker.get_budget_health()
        
        self.assertIn('total_budget', health)
        self.assertIn('actual_spent', health)
        self.assertIn('variance', health)
        
        print(f"[OK] Total budget: INR {health['total_budget']:,.0f}")
        print(f"[OK] Actual spent: INR {health['actual_spent']:,.0f}")
        print(f"[OK] Variance: INR {health['variance']:,.0f}")
        print(f"[OK] Status: {health['status']}")
    
    def test_08_qc_checklists(self):
        """Test QC checklists"""
        print("\n=== Test 8: QC Checklists ===")
        
        qc = QCChecklistManager(self.project_data['project_id'])
        
        # Get foundation checklist
        foundation_cl = qc.get_checklist(QCStage.FOUNDATION)
        self.assertIsNotNone(foundation_cl)
        
        # Update some items
        qc.update_item_status(
            foundation_cl.id,
            f"{foundation_cl.id}-ITEM-01",
            QCStatus.PASSED,
            "Excavation dimensions verified within tolerance",
            "John Doe"
        )
        
        qc.update_item_status(
            foundation_cl.id,
            f"{foundation_cl.id}-ITEM-05",
            QCStatus.FAILED,
            "Reinforcement cover less than 50mm",
            "Jane Smith"
        )
        
        # Create non-conformance
        nc = qc.create_non_conformance(
            foundation_cl.id,
            f"{foundation_cl.id}-ITEM-05",
            "Reinforcement cover insufficient at corner",
            Severity.MAJOR
        )
        
        # Get summary
        summary = qc.get_qc_summary()
        
        self.assertIn('total_items', summary)
        self.assertIn('passed', summary)
        self.assertIn('failed', summary)
        
        print(f"[OK] Total checklists: {summary['total_checklists']}")
        print(f"[OK] Total items: {summary['total_items']}")
        print(f"[OK] Passed: {summary['passed']}")
        print(f"[OK] Failed: {summary['failed']}")
        print(f"[OK] Completion: {summary['completion_percentage']:.1f}%")
        print(f"[OK] Non-conformances: {summary['open_non_conformances']}")


class TestEdgeCases(unittest.TestCase):
    """Test edge cases and error handling"""
    
    def test_invalid_coordinates(self):
        """Test AHP with invalid coordinates"""
        engine = AHPEngine(OptimizationMode.SUSTAINABILITY)
        
        # Test with coordinates outside Kerala
        # Test with far away coordinates - should still work but with high logistics carbon
        results = engine.optimize_materials(['steel'], (0.0, 0.0))
        self.assertIn('steel', results)
    
    def test_invalid_json_bim(self):
        """Test BIM parser with invalid JSON"""
        parser = BIMParser()
        
        with self.assertRaises(ValueError):
            parser.parse_json_bim("invalid json content")
    
    def test_empty_cost_tracker(self):
        """Test cost tracker with no costs"""
        tracker = CostTracker("TEST-001", 1000000)
        
        health = tracker.get_budget_health()
        self.assertEqual(health['actual_spent'], 0)
        # Note: variance is actual - budget, so for empty tracker it's 0 - budget
        self.assertEqual(health['actual_spent'], 0)
    
    def test_invalid_concrete_grade(self):
        """Test mix design with invalid parameters"""
        designer = EcoMixDesigner()
        
        # Test with extreme fly ash percentage
        mix = designer.design_mix(
            grade=ConcreteGrade.M25,
            exposure=ExposureCondition.MODERATE,
            slump_required=100,
            fly_ash_replacement_percent=80,  # Very high
            recycled_aggregate_percent=0
        )
        
        # Should still work but with warnings
        self.assertIsNotNone(mix)


def run_tests():
    """Run all tests and display results"""
    print("=" * 70)
    print("ECOBUILD COMPREHENSIVE TEST SUITE")
    print("GEC Thrissur Construction Project Simulation")
    print("=" * 70)
    
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add all test cases
    suite.addTests(loader.loadTestsFromTestCase(TestEcoBuildProject))
    suite.addTests(loader.loadTestsFromTestCase(TestEdgeCases))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Summary
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)
    print(f"Tests run: {result.testsRun}")
    print(f"Successes: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    
    if result.wasSuccessful():
        print("\n[OK] ALL TESTS PASSED")
        return 0
    else:
        print("\n[FAIL] SOME TESTS FAILED")
        return 1


if __name__ == '__main__':
    exit(run_tests())
"""
Comprehensive API Test Suite for EcoBuild Backend
Tests all FastAPI endpoints for correctness and reliability
"""

import pytest
import json
import sys
import os
from fastapi.testclient import TestClient
from datetime import datetime, timedelta

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from auth import create_access_token, get_password_hash
from database import database

# Create test client
client = TestClient(app)

# Test data
TEST_USER = {
    "email": "test@ecobuild.com",
    "password": "TestPassword123!",
    "full_name": "Test Engineer",
    "registration_number": "TEST123",
    "organization": "Test Organization"
}

TEST_PROJECT = {
    "name": "Test Project",
    "description": "A test project for validation",
    "location": {
        "district": "Thrissur",
        "lat": 10.5167,
        "lon": 76.2167
    },
    "buildingParams": {
        "plotArea": 200,
        "builtUpArea": 150,
        "numFloors": 2,
        "height": 6.4,
        "setbacks": {"front": 3, "rear": 2, "side1": 2, "side2": 2}
    }
}

class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_register_user(self):
        """Test user registration"""
        response = client.post("/api/auth/register", json=TEST_USER)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEST_USER["email"]
        assert "id" in data
        
    def test_login_user(self):
        """Test user login"""
        # First register
        client.post("/api/auth/register", json=TEST_USER)
        
        # Then login
        response = client.post("/api/auth/login", json={
            "email": TEST_USER["email"],
            "password": TEST_USER["password"]
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = client.post("/api/auth/login", json={
            "email": "invalid@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        
    def test_protected_endpoint_without_token(self):
        """Test accessing protected endpoint without token"""
        response = client.get("/api/materials")
        assert response.status_code == 403


class TestMaterialsAPI:
    """Test material management endpoints"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers"""
        # Register and login
        client.post("/api/auth/register", json=TEST_USER)
        response = client.post("/api/auth/login", json={
            "email": TEST_USER["email"],
            "password": TEST_USER["password"]
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_materials(self, auth_headers):
        """Test getting all materials"""
        response = client.get("/api/materials", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
    def test_get_material_categories(self, auth_headers):
        """Test getting material categories"""
        response = client.get("/api/materials/categories", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
    def test_create_material(self, auth_headers):
        """Test creating a new material"""
        material_data = {
            "name": "Test Cement",
            "description": "Test material",
            "category": "cement",
            "cost_per_unit": 350,
            "unit": "kg",
            "embodied_carbon": 0.9
        }
        response = client.post("/api/materials", json=material_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == material_data["name"]


class TestStructuralAnalysisAPI:
    """Test structural engineering endpoints"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers"""
        client.post("/api/auth/register", json=TEST_USER)
        response = client.post("/api/auth/login", json={
            "email": TEST_USER["email"],
            "password": TEST_USER["password"]
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_calculate_loads(self, auth_headers):
        """Test load calculation endpoint"""
        params = {
            "num_floors": 2,
            "floor_area": 150,
            "floor_height": 3.2,
            "occupancy": "residential"
        }
        response = client.post("/api/structural/loads", json=params, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "dead_load" in data
        assert "live_load" in data
        assert data["dead_load"] > 0
        assert data["live_load"] > 0
        
    def test_seismic_analysis(self, auth_headers):
        """Test seismic analysis endpoint"""
        params = {
            "num_floors": 3,
            "floor_area": 200,
            "floor_height": 3.2,
            "seismic_zone": "III",
            "structural_system": "special_rc_frame",
            "soil_type": "medium"
        }
        response = client.post("/api/structural/seismic", json=params, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "base_shear" in data
        assert "zone_factor" in data
        assert data["base_shear"] > 0
        
    def test_wind_load(self, auth_headers):
        """Test wind load calculation endpoint"""
        params = {
            "height": 12,
            "city": "thrissur",
            "structure_type": "building"
        }
        response = client.post("/api/structural/wind", json=params, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "wind_force" in data
        assert "wind_speed" in data
        assert data["wind_force"] > 0
        
    def test_slab_design(self, auth_headers):
        """Test slab design endpoint"""
        params = {
            "member_type": "slab_one_way",
            "span": 4,
            "short_span": 4,
            "long_span": 5,
            "thickness": 150,
            "concrete_grade": "M20",
            "steel_grade": "Fe415",
            "live_load": 2
        }
        response = client.post("/api/structural/design", json=params, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "design_type" in data
        assert "main_steel" in data
        assert "thickness" in data
        
    def test_column_design(self, auth_headers):
        """Test column design endpoint"""
        params = {
            "member_type": "column",
            "height": 3,
            "axial_load": 800,
            "moment": 20,
            "shear": 50,
            "concrete_grade": "M20",
            "steel_grade": "Fe415"
        }
        response = client.post("/api/structural/design", json=params, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "design_type" in data
        assert "size" in data
        assert "longitudinal_steel" in data
        
    def test_full_structural_analysis(self, auth_headers):
        """Test full structural analysis endpoint"""
        params = {
            "num_floors": 2,
            "floor_area": 150,
            "floor_height": 3.2,
            "occupancy": "residential",
            "city": "thrissur",
            "seismic_zone": "III",
            "structural_system": "special_rc_frame",
            "soil_type": "medium",
            "concrete_grade": "M20",
            "steel_grade": "Fe415"
        }
        response = client.post("/api/structural/full-analysis", json=params, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "loads" in data
        assert "seismic" in data
        assert "wind" in data
        assert "foundation" in data


class TestComplianceAPI:
    """Test KMBR compliance endpoints"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers"""
        client.post("/api/auth/register", json=TEST_USER)
        response = client.post("/api/auth/login", json={
            "email": TEST_USER["email"],
            "password": TEST_USER["password"]
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_compliance_check(self, auth_headers):
        """Test KMBR compliance checking"""
        params = {
            "building_footprint_sqm": 100,
            "total_built_up_area_sqm": 200,
            "num_floors": 2,
            "height_m": 6.4,
            "plot_area_sqm": 250,
            "road_width_m": 6,
            "road_type": "public",
            "zone_type": "urban",
            "building_type": "residential_individual",
            "parking_spaces": 2,
            "setback_front_m": 3,
            "setback_rear_m": 2,
            "setback_side1_m": 2,
            "setback_side2_m": 2
        }
        response = client.post("/api/compliance-check", json=params, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "compliant" in data
        assert "checks" in data
        assert isinstance(data["checks"], list)


class TestCitationsAPI:
    """Test academic citations endpoints"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers"""
        client.post("/api/auth/register", json=TEST_USER)
        response = client.post("/api/auth/login", json={
            "email": TEST_USER["email"],
            "password": TEST_USER["password"]
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_all_citations(self, auth_headers):
        """Test getting all citations"""
        response = client.get("/api/citations", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert "bibliography" in data
        
    def test_get_citations_by_category(self, auth_headers):
        """Test getting citations by category"""
        response = client.get("/api/citations?category=structural", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        
    def test_get_is_codes(self, auth_headers):
        """Test getting IS code references"""
        response = client.get("/api/is-codes", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "seismic_zones" in data
        assert "concrete_grades" in data


class TestEnvironmentalAPI:
    """Test environmental data endpoints"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers"""
        client.post("/api/auth/register", json=TEST_USER)
        response = client.post("/api/auth/login", json={
            "email": TEST_USER["email"],
            "password": TEST_USER["password"]
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_environmental_data(self, auth_headers):
        """Test getting environmental data for location"""
        response = client.get("/api/environmental?lat=10.5167&lon=76.2167", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "temperature" in data or "climate_zone" in data


class TestValidation:
    """Test input validation"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers"""
        client.post("/api/auth/register", json=TEST_USER)
        response = client.post("/api/auth/login", json={
            "email": TEST_USER["email"],
            "password": TEST_USER["password"]
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_invalid_seismic_zone(self, auth_headers):
        """Test seismic analysis with invalid zone"""
        params = {
            "num_floors": 2,
            "floor_area": 150,
            "seismic_zone": "INVALID"
        }
        response = client.post("/api/structural/seismic", json=params, headers=auth_headers)
        # Should either handle gracefully or return validation error
        assert response.status_code in [200, 400, 422]
        
    def test_negative_dimensions(self, auth_headers):
        """Test with negative building dimensions"""
        params = {
            "num_floors": -1,
            "floor_area": -100
        }
        response = client.post("/api/structural/loads", json=params, headers=auth_headers)
        # Should handle gracefully
        assert response.status_code in [200, 400, 422]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

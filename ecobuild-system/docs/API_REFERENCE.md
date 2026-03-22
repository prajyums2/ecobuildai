# EcoBuild API Reference

Complete API documentation for the EcoBuild Lifecycle Decision Support System.

**Base URL:** `http://localhost:8000`  
**API Version:** 2.0.0  
**Last Updated:** 2024

---

## Table of Contents

1. [Authentication](#authentication)
2. [Projects](#projects)
3. [Materials](#materials)
4. [Structural Analysis](#structural-analysis)
5. [Environmental Data](#environmental-data)
6. [Compliance Checking](#compliance-checking)
7. [BIM Integration](#bim-integration)
8. [Cost Tracking](#cost-tracking)
9. [Quality Control](#quality-control)
10. [References & Citations](#references--citations)

---

## Authentication

All protected endpoints require a Bearer token in the Authorization header.

```
Authorization: Bearer <your_access_token>
```

### Register User
**POST** `/api/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "full_name": "John Doe",
  "registration_number": "ENG12345",
  "organization": "Construction Corp"
}
```

**Response:**
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "full_name": "John Doe",
  "message": "User registered successfully"
}
```

### Login
**POST** `/api/auth/login`

Authenticate user and receive access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "expires_in": "24h"
}
```

### Get Current User
**GET** `/api/auth/me`

Get currently authenticated user details.

**Response:**
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "full_name": "John Doe",
  "registration_number": "ENG12345",
  "organization": "Construction Corp"
}
```

---

## Projects

### List Projects
**GET** `/api/projects`

Get all projects for the authenticated user.

**Response:**
```json
[
  {
    "id": "proj_123",
    "name": "Residential Building",
    "description": "2-storey house",
    "location": {
      "district": "Thrissur",
      "lat": 10.5167,
      "lon": 76.2167
    },
    "isConfigured": true,
    "created_at": "2024-01-15T10:30:00",
    "lastModified": "2024-01-20T14:45:00"
  }
]
```

### Create Project
**POST** `/api/projects`

Create a new project.

**Request Body:**
```json
{
  "name": "Commercial Complex",
  "description": "Office building project",
  "location": {
    "district": "Thrissur",
    "lat": 10.5167,
    "lon": 76.2167
  },
  "buildingParams": {
    "plotArea": 500,
    "builtUpArea": 400,
    "numFloors": 3,
    "height": 10.5
  }
}
```

**Response:**
```json
{
  "id": "proj_456",
  "name": "Commercial Complex",
  "message": "Project created successfully"
}
```

### Get Project
**GET** `/api/projects/{project_id}`

Get details of a specific project.

**Response:**
```json
{
  "id": "proj_456",
  "name": "Commercial Complex",
  "buildingParams": {
    "plotArea": 500,
    "builtUpArea": 400,
    "numFloors": 3
  },
  "analysisResults": {
    "structural": {...},
    "optimization": {...}
  }
}
```

### Update Project
**PUT** `/api/projects/{project_id}`

Update project details.

**Request Body:**
```json
{
  "name": "Updated Name",
  "buildingParams": {
    "numFloors": 4
  }
}
```

### Delete Project
**DELETE** `/api/projects/{project_id}`

Delete a project.

---

## Materials

### Get Materials
**GET** `/api/materials`

Get all available construction materials.

**Query Parameters:**
- `category` (optional): Filter by category (e.g., "cement", "steel")
- `skip` (optional): Pagination offset (default: 0)
- `limit` (optional): Items per page (default: 100)

**Response:**
```json
[
  {
    "id": "mat_001",
    "name": "OPC 53 Grade Cement",
    "category": "cement",
    "cost_per_unit": 380,
    "unit": "kg",
    "embodied_carbon": 0.9,
    "physical_properties": {
      "density": 1440,
      "compressive_strength": 53
    }
  }
]
```

### Get Material Categories
**GET** `/api/materials/categories`

Get list of material categories.

**Response:**
```json
[
  {"id": "cement", "name": "Cement & Binders"},
  {"id": "steel", "name": "Steel & Reinforcement"},
  {"id": "masonry", "name": "Masonry Units"},
  {"id": "aggregates", "name": "Aggregates"}
]
```

### Create Material
**POST** `/api/materials`

Add a new material to the database.

**Request Body:**
```json
{
  "name": "New Material",
  "description": "Description",
  "category": "cement",
  "cost_per_unit": 400,
  "unit": "kg",
  "embodied_carbon": 0.85,
  "physical_properties": {
    "density": 1400
  }
}
```

### Search Materials
**POST** `/api/materials/search-advanced`

Advanced material search with filters.

**Request Body:**
```json
{
  "query": "cement",
  "categories": ["cement"],
  "max_cost": 500,
  "min_recycled_content": 10
}
```

---

## Structural Analysis

### Calculate Building Loads
**POST** `/api/structural/loads`

Calculate dead and live loads per IS 875.

**Request Body:**
```json
{
  "num_floors": 2,
  "floor_area": 150,
  "occupancy": "residential",
  "floor_height": 3.2
}
```

**Response:**
```json
{
  "dead_load": {
    "foundation": 75.0,
    "columns": 22.5,
    "beams": 18.75,
    "slabs": 90.0,
    "total_kn": 758.0
  },
  "live_load": {
    "floor_load_kn": 300.0,
    "total_kn": 600.0
  },
  "total_load_kn": 1358.0
}
```

### Seismic Analysis
**POST** `/api/structural/seismic`

Perform seismic analysis per IS 1893:2016.

**Request Body:**
```json
{
  "num_floors": 3,
  "floor_area": 200,
  "floor_height": 3.2,
  "seismic_zone": "III",
  "structural_system": "special_rc_frame",
  "soil_type": "medium",
  "importance_factor": 1.0
}
```

**Response:**
```json
{
  "zone_factor": 0.16,
  "importance_factor": 1.0,
  "response_reduction_factor": 5,
  "fundamental_period": 0.41,
  "spectral_acceleration": 2.5,
  "base_shear_kn": 98.5,
  "storey_shear": [
    {"floor": 1, "shear_kn": 98.5},
    {"floor": 2, "shear_kn": 65.7},
    {"floor": 3, "shear_kn": 32.8}
  ]
}
```

### Wind Load Analysis
**POST** `/api/structural/wind`

Calculate wind loads per IS 875 Part 3.

**Request Body:**
```json
{
  "building_height": 12,
  "floor_area": 200,
  "city": "thrissur",
  "structure_type": "building"
}
```

**Response:**
```json
{
  "basic_wind_speed": 39,
  "design_wind_speed": 39,
  "wind_pressure": 0.913,
  "wind_force_kn": 21.9,
  "city": "thrissur",
  "risk_coefficient": 1.0
}
```

### Structural Member Design
**POST** `/api/structural/design`

Design structural members (slab, beam, column, foundation) per IS 456.

**Slab Design Request:**
```json
{
  "member_type": "slab_one_way",
  "span": 4,
  "short_span": 4,
  "long_span": 5,
  "thickness": 150,
  "concrete_grade": "M20",
  "steel_grade": "Fe415",
  "live_load": 2
}
```

**Column Design Request:**
```json
{
  "member_type": "column",
  "height": 3,
  "axial_load": 800,
  "moment": 20,
  "shear": 50,
  "concrete_grade": "M20",
  "steel_grade": "Fe415"
}
```

**Response:**
```json
{
  "design_type": "column",
  "size": "300mm × 300mm",
  "concrete_grade": "M20",
  "steel_grade": "Fe415",
  "longitudinal_steel": "4-16mm bars",
  "transverse_steel": "8mm @ 100mm c/c",
  "steel_area": 804,
  "checks": {
    "axial": "PASS",
    "moment": "PASS",
    "shear": "PASS"
  }
}
```

### Full Structural Analysis
**POST** `/api/structural/full-analysis`

Complete structural analysis including loads, seismic, wind, and member design.

**Request Body:**
```json
{
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
```

**Response:**
```json
{
  "loads": {...},
  "seismic": {...},
  "wind": {...},
  "foundation": {...},
  "summary": {
    "total_concrete_volume": 45.5,
    "total_steel_weight": 3640
  }
}
```

---

## Environmental Data

### Get Environmental Data
**POST** `/api/environmental-data`

Get climate and environmental data for a location.

**Request Body:**
```json
{
  "lat": 10.5167,
  "lon": 76.2167
}
```

**Response:**
```json
{
  "climate_zone": "warm_and_humid",
  "temperature": {
    "summer_max": 35,
    "winter_min": 22
  },
  "rainfall_mm": 3000,
  "humidity_percent": 75
}
```

### Calculate Operational Carbon
**POST** `/api/operational-carbon`

Calculate operational carbon emissions.

**Request Body:**
```json
{
  "built_up_area": 150,
  "num_floors": 2,
  "building_type": "residential",
  "location": {"lat": 10.5167, "lon": 76.2167}
}
```

---

## Compliance Checking

### Building Rules Compliance Check
**POST** `/api/compliance-check`

Check building code compliance (NBC/IS standards).

**Request Body:**
```json
{
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
```

**Response:**
```json
{
  "compliant": true,
  "score": 85,
  "checks": [
    {
      "name": "FAR Check",
      "status": "PASS",
      "message": "FAR of 0.80 is within limit of 2.0"
    },
    {
      "name": "Height Check",
      "status": "PASS",
      "message": "Height of 6.4m is within limit"
    },
    {
      "name": "Setback Check",
      "status": "PASS",
      "message": "All setbacks meet minimum requirements"
    }
  ],
  "recommendations": []
}
```

---

## BIM Integration

### Parse BIM File
**POST** `/api/bim/parse`

Parse IFC/JSON BIM files and extract quantities.

**Content-Type:** `multipart/form-data`

**Request:**
```
file: <IFC or JSON file>
```

**Response:**
```json
{
  "parsed_elements": [
    {
      "element_id": "column_001",
      "element_type": "column",
      "name": "Column C1",
      "volume_m3": 2.5,
      "dimensions": {
        "length": 0.3,
        "width": 0.3,
        "height": 3.0
      }
    }
  ],
  "material_quantities": {
    "concrete_m3": 45.5,
    "steel_kg": 3640
  },
  "project_summary": {
    "total_elements": 25,
    "element_breakdown": {
      "foundation": 4,
      "column": 8,
      "beam": 6,
      "slab": 2
    }
  }
}
```

---

## Cost Tracking

### Initialize Cost Tracking
**POST** `/api/cost-tracking/init`

Initialize cost tracking for a project.

**Request Body:**
```json
{
  "project_id": "proj_123",
  "budget": 5000000,
  "currency": "INR"
}
```

### Get Cost Tracking
**GET** `/api/cost-tracking/{project_id}`

Get cost tracking details for a project.

**Response:**
```json
{
  "project_id": "proj_123",
  "budget": 5000000,
  "actual_cost": 3200000,
  "remaining": 1800000,
  "percent_used": 64,
  "milestones": [...],
  "payment_history": [...]
}
```

### Record Payment
**POST** `/api/cost-tracking/payment`

Record a payment milestone.

**Request Body:**
```json
{
  "project_id": "proj_123",
  "milestone": "Foundation Complete",
  "amount": 500000,
  "due_date": "2024-03-15"
}
```

---

## Quality Control

### Initialize QC Checklists
**POST** `/api/qc-checklists/init`

Initialize quality control checklists for a project.

**Request Body:**
```json
{
  "project_id": "proj_123",
  "checklists": ["foundation", "structure", "finishes"]
}
```

### Get QC Checklists
**GET** `/api/qc-checklists/{project_id}`

Get all QC checklists for a project.

**Response:**
```json
{
  "project_id": "proj_123",
  "checklists": [
    {
      "stage": "foundation",
      "items": [
        {
          "id": "qc_001",
          "description": "Foundation depth as per drawing",
          "status": "completed",
          "verified_by": "Engineer"
        }
      ]
    }
  ]
}
```

### Update QC Item
**POST** `/api/qc-checklists/update-item`

Update status of a QC checklist item.

**Request Body:**
```json
{
  "project_id": "proj_123",
  "item_id": "qc_001",
  "status": "completed",
  "remarks": "Verified on site"
}
```

---

## References & Citations

### Get IS Code References
**GET** `/api/is-codes`

Get IS code references for structural design.

**Response:**
```json
{
  "seismic_zones": {
    "II": {"factor": 0.10, "description": "Low damage risk"},
    "III": {"factor": 0.16, "description": "Moderate damage risk"},
    "IV": {"factor": 0.24, "description": "High damage risk"},
    "V": {"factor": 0.36, "description": "Very high damage risk"}
  },
  "concrete_grades": ["M15", "M20", "M25", "M30", "M35", "M40"],
  "steel_grades": ["Fe250", "Fe415", "Fe500", "Fe550"],
  "live_loads": {...}
}
```

### Get Citations
**GET** `/api/citations`

Get academic citations for the project.

**Query Parameters:**
- `category` (optional): Filter by category (e.g., "structural", "environmental")

**Response:**
```json
{
  "success": true,
  "categories": [...],
  "bibliography": {
    "IS 875 (Part 3):2015": [
      "[1] N. Suthar and P. K. Goyal, \"Comparison of response...\", 2021"
    ]
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 422 | Validation Error - Input validation failed |
| 500 | Internal Server Error |

---

## Rate Limiting

API requests are limited to:
- 100 requests per minute for authenticated users
- 20 requests per minute for unauthenticated users

---

## Support

For API support and questions:
- Email: support@ecobuild.com
- Documentation: https://ecobuild.com/docs
- Issues: https://github.com/ecobuild/issues

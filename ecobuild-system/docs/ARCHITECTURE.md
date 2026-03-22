# EcoBuild System Architecture

## Overview

EcoBuild is a **Lifecycle Decision Support System for Sustainable Construction** that integrates structural engineering calculations, material optimization, BIM integration, and compliance checking into a unified platform.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   React App  │  │  3D Viewer   │  │  Dashboard   │      │
│  │   (SPA)      │  │  (Three.js)  │  │  (Charts)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                       │
│                    FastAPI (Python)                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   Auth      │ │  Structural │ │   BIM       │           │
│  │  (JWT)      │ │  Analysis   │ │  Parser     │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   Materials   │ │ Compliance  │ │ Cost Track  │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   MongoDB   │ │   Redis     │ │  File Store │           │
│  │  (Primary)  │ │   (Cache)   │ │  (IFC/JSON) │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Backend
- **Framework:** FastAPI 0.104.1
- **Language:** Python 3.12
- **Database:** MongoDB 6.0
- **Authentication:** JWT with bcrypt
- **Key Libraries:**
  - NumPy, Pandas, SciPy (computations)
  - Pydantic (validation)
  - PyMongo (database)
  - ifcopenshell (BIM parsing)

### Frontend
- **Framework:** React 18.2.0
- **Language:** JavaScript (ES6+)
- **Styling:** Tailwind CSS 3.3.6
- **State Management:** React Context API
- **Key Libraries:**
  - React Router (navigation)
  - Three.js + React Three Fiber (3D)
  - Recharts (data visualization)
  - Leaflet (maps)
  - Axios (HTTP client)

### DevOps
- **Version Control:** Git
- **Testing:** pytest (backend), Jest (frontend)
- **Documentation:** Markdown, OpenAPI

## Module Architecture

### 1. Authentication Module (`auth.py`)
**Purpose:** User registration, login, and JWT token management

**Key Functions:**
- `verify_password()` - bcrypt password verification
- `get_password_hash()` - bcrypt password hashing
- `create_access_token()` - JWT token generation
- `verify_token()` - JWT token validation

**Data Flow:**
1. User submits credentials
2. Password hashed with bcrypt
3. JWT token generated with 24h expiry
4. Token returned to client
5. Client includes token in Authorization header

### 2. Structural Analysis Module

#### 2.1 Load Calculator (`load_calculator.py`)
**Purpose:** Calculate building loads per IS 875

**Key Calculations:**
- Dead loads (slab, beams, columns, foundation)
- Live loads per occupancy type
- Load combinations

**IS Code References:**
- IS 875 Part 1 (Dead Loads)
- IS 875 Part 2 (Live Loads)

#### 2.2 Seismic Analysis (`seismic_analysis.py`)
**Purpose:** Seismic analysis per IS 1893:2016

**Key Calculations:**
- Fundamental period (Ta = 0.075h^0.75)
- Spectral acceleration (Sa/g)
- Base shear (Vb = Ah × W)
- Storey shear distribution

**Formula:**
```
Ah = (Z/2) × (I/R) × (Sa/g)
Vb = Ah × W
```

**IS Code References:**
- IS 1893 Part 1:2016

#### 2.3 Wind Load (`wind_load.py`)
**Purpose:** Wind load calculation per IS 875 Part 3

**Key Calculations:**
- Design wind speed (Vz = Vb × k1 × k2 × k3)
- Wind pressure (pz = 0.6 × Vz²)
- Wind force on structure

**Formula:**
```
pz = 0.6 × Vz² (N/m²)
F = pz × A (N)
```

**IS Code References:**
- IS 875 Part 3:2015

#### 2.4 Structural Design (`structural_design.py`)
**Purpose:** RCC member design per IS 456:2000

**Design Types:**
- Slab (one-way, two-way)
- Beam (rectangular, T-beam)
- Column (short, slender)
- Foundation (isolated, combined)

**Key Calculations:**
- Steel reinforcement area
- Moment capacity
- Shear capacity
- Deflection checks

**IS Code References:**
- IS 456:2000
- IS 13920:2016 (Ductile Detailing)

### 3. Material Optimization Module (`ahp_engine.py`)
**Purpose:** Multi-criteria material selection using AHP

**Algorithm:**
1. Define criteria (cost, carbon, durability, etc.)
2. Build pairwise comparison matrix
3. Calculate criteria weights (eigenvector method)
4. Score alternatives
5. Rank and select optimal material

**Formula (AHP):**
```
Eigenvector = Principal eigenvector of comparison matrix
Consistency Index (CI) = (λmax - n) / (n - 1)
Consistency Ratio (CR) = CI / RI
```

### 4. BIM Parser (`bim_parser.py`)
**Purpose:** Parse IFC files and extract quantities

**Process:**
1. Read IFC file using ifcopenshell
2. Extract geometric entities
3. Calculate volumes and areas
4. Map to material quantities
5. Generate BoQ

**Supported Formats:**
- IFC (Industry Foundation Classes)
- JSON (custom format)

### 5. Compliance Checker (`kmbr_automator.py`)
**Purpose:** Kerala Building Rules compliance checking

**Checks:**
- Floor Area Ratio (FAR)
- Setbacks (front, rear, sides)
- Height restrictions
- Parking requirements
- Rainwater harvesting

**Rules Engine:**
```python
if building_type == "residential_individual":
    max_far = 2.0
    min_front_setback = 3.0  # meters
    # ... more rules
```

### 6. Database Layer (`database.py`)
**Purpose:** MongoDB connection and operations

**Collections:**
- users (authentication)
- projects (project data)
- materials (material database)
- cost_tracking (budget data)
- qc_checklists (quality control)

**Connection Strategy:**
- Singleton pattern
- Connection pooling
- Fallback to file-based storage

## Data Flow Examples

### Example 1: Structural Analysis Workflow

```
User Input (Frontend)
    ↓
POST /api/structural/full-analysis
    ↓
Validate Input (Pydantic)
    ↓
Load Calculator (IS 875)
    ↓
Seismic Analysis (IS 1893)
    ↓
Wind Analysis (IS 875 Part 3)
    ↓
Member Design (IS 456)
    ↓
Compile Results
    ↓
Return JSON Response
    ↓
Display Results (Frontend)
```

### Example 2: Material Optimization Workflow

```
User Selects Categories
    ↓
POST /api/optimize
    ↓
Fetch Materials from DB
    ↓
AHP Engine Processes
    ↓
Calculate Scores
    ↓
Rank Alternatives
    ↓
Return Optimized Selection
    ↓
Display Recommendation
```

### Example 3: BIM Integration Workflow

```
User Uploads IFC File
    ↓
POST /api/bim/parse
    ↓
Parse IFC (ifcopenshell)
    ↓
Extract Elements
    ↓
Calculate Quantities
    ↓
Generate BoQ
    ↓
Display 3D Model + BoQ
```

## Security Architecture

### Authentication Flow
```
┌─────────┐     ┌──────────┐     ┌─────────┐
│  Client │────▶│  Login   │────▶│  Verify │
│         │     │  Endpoint│     │Password │
└─────────┘     └──────────┘     └────┬────┘
                                      │
                                      ▼
                               ┌──────────┐
                               │ Generate │
                               │   JWT    │
                               └────┬─────┘
                                    │
                                    ▼
┌─────────┐     ┌──────────┐     ┌─────────┐
│  Client │◀────│  Token   │◀────│  Return │
│         │     │          │     │  Token  │
└─────────┘     └──────────┘     └─────────┘
```

### Security Measures
1. **Password Hashing:** bcrypt with salt
2. **Token Expiry:** 24 hours
3. **HTTPS:** All communications encrypted
4. **Input Validation:** Pydantic schemas
5. **CORS:** Configured for specific origins
6. **Rate Limiting:** API throttling

## Performance Considerations

### Backend Optimizations
- **Database Indexing:** On frequently queried fields
- **Caching:** Redis for environmental data
- **Async Processing:** Non-blocking I/O with FastAPI
- **Pagination:** For large material lists

### Frontend Optimizations
- **Lazy Loading:** Code splitting by route
- **Memoization:** React.memo for components
- **Virtual Scrolling:** For long lists
- **Image Optimization:** Compressed assets

## Scalability

### Horizontal Scaling
- **Load Balancer:** Distribute API requests
- **Database Sharding:** Partition by geography
- **CDN:** Serve static assets

### Microservices Potential
Future architecture could split into:
- Auth Service
- Structural Analysis Service
- BIM Processing Service
- Material Database Service

## Deployment Architecture

### Development
```
Local Machine
├── Backend: uvicorn main:app --reload
├── Frontend: npm start
└── Database: MongoDB local
```

### Production
```
Cloud Server (AWS/Azure/GCP)
├── Load Balancer (Nginx)
├── API Servers (FastAPI x 3)
├── MongoDB Cluster
├── Redis Cache
└── File Storage (S3)
```

## Monitoring & Logging

### Backend Logging
- **Level:** INFO, DEBUG, ERROR
- **Format:** Timestamp, Level, Message, Stacktrace
- **Rotation:** Daily log files
- **Location:** `backend/logs/`

### Frontend Logging
- **Console:** Development errors
- **Sentry:** Production error tracking
- **Analytics:** User interactions

## Development Guidelines

### Code Organization
```
backend/
├── modules/          # Feature modules
├── tests/           # Test files
├── utils/           # Helper functions
├── models/          # Database models
└── config/          # Configuration

frontend/
├── src/
│   ├── components/  # Reusable UI
│   ├── pages/       # Route components
│   ├── context/     # State management
│   ├── services/    # API clients
│   └── utils/       # Helpers
└── public/          # Static assets
```

### Coding Standards
- **Python:** PEP 8, type hints
- **JavaScript:** ESLint, Prettier
- **Git:** Conventional commits
- **Documentation:** Docstrings, JSDoc

## API Versioning

Current: **v2.0.0**

Strategy:
- URL versioning: `/api/v2/endpoint`
- Backward compatible changes within major version
- Deprecation warnings for 6 months before removal

## Future Enhancements

1. **Machine Learning:** Predictive cost estimation
2. **IoT Integration:** Real-time site monitoring
3. **Blockchain:** Material supply chain tracking
4. **VR/AR:** Immersive 3D visualization
5. **Mobile App:** React Native companion app

## References

- FastAPI Documentation: https://fastapi.tiangolo.com
- React Documentation: https://react.dev
- IS Codes: IS 456, IS 875, IS 1893
- MongoDB Best Practices
- Three.js Documentation

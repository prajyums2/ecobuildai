# EcoBuild - Technical Documentation
## Lifecycle Decision Support System for Sustainable Construction

**Version:** 1.0  
**Date:** March 2026  
**Status:** Production Ready

---

## 1. Executive Summary

EcoBuild is a comprehensive civil engineering application for sustainable construction planning, material optimization, and Bill of Quantities (BoQ) generation. It integrates IS code-based structural calculations, AHP-based material optimization, BIM/IFC parsing, and sustainability assessment.

### Key Capabilities:
- IS 456:2000 compliant structural design (Slab, Beam, Column, Foundation)
- IS 875 load calculations (Dead, Live, Wind, Seismic)
- AHP-based material optimization with transportation costs
- Bill of Quantities with material-specific GST rates
- GRIHA/IGBC/LEED sustainability assessment
- BIM/IFC file parsing and quantity extraction
- AI-powered construction assistant

---

## 2. Architecture

### Backend (FastAPI + MongoDB)
```
ecobuild-system/backend/
├── main.py                    # Main API server (48 endpoints)
├── auth.py                    # JWT authentication
├── database.py                # MongoDB connection
├── materials.py               # Material CRUD operations
├── seed_materials.py          # Database seeding (8 categories, 60+ materials)
├── structural_design.py       # IS 456 structural designers
│   ├── SlabDesigner          # One-way & two-way slab design
│   ├── BeamDesigner          # RCC beam design
│   ├── ColumnDesigner        # RCC column design
│   └── FoundationDesigner    # Isolated footing design
├── load_calculator.py         # IS 875 load calculations
├── seismic_analysis.py        # IS 1893 seismic analysis
├── wind_load.py               # IS 875 Part 3 wind loads
├── eco_mix_designer.py        # IS 10262 concrete mix design
├── ahp_engine.py              # AHP material optimization
├── bim_parser.py              # IFC file parser
├── cost_tracker.py            # Cost tracking module
├── qc_checklists.py           # Quality control checklists
├── green_building_standards.py # GRIHA/IGBC/LEED assessment
├── is_codes.py                # IS code database
└── citations.py               # Academic citations
```

### Frontend (React)
```
ecobuild-system/frontend/src/
├── App.js                     # Routes (16 routes)
├── pages/
│   ├── Dashboard.js           # Project overview
│   ├── ProjectSetup.js        # Building parameters input
│   ├── Materials.js           # Material database browser
│   ├── MaterialOptimizer.js   # AHP optimization
│   ├── BIMIntegration.js      # IFC file upload & parsing
│   ├── Reports.js             # Comprehensive reports
│   ├── StructuralDesign.js    # Structural analysis & design
│   ├── CostTracking.js        # Cost monitoring
│   ├── QCChecklists.js        # Quality control
│   ├── ComplianceChecker.js   # NBC/KMBR compliance
│   ├── ConstructionSchedule.js # Gantt chart
│   └── MixDesigner.js         # Concrete mix design
├── components/
│   ├── BillOfQuantities.js    # BoQ display & export
│   ├── Sidebar.js             # Navigation
│   ├── WorkflowProgress.js    # Progress tracking
│   └── LLMSidebar.js          # AI assistant
├── utils/
│   └── boqCalculator.js       # BoQ generation engine
├── services/
│   └── api.js                 # API client
└── context/
    └── ProjectContext.js       # Project state management
```

---

## 3. Material Categories

### Category Structure (8 Categories)

| # | Category | Materials | Unit | GST |
|---|----------|-----------|------|-----|
| 1 | **Concrete** | M15 PCC, M20 RCC, M25 RCC, M30 RCC, RMC M20, RMC M25 | cum | 18% |
| 2 | **Cement** | OPC 43, OPC 53, PPC (Fly Ash), PSC (Slag) | bag | 28% |
| 3 | **Steel** | Fe 415, Fe 500, Fe 500D, Fe 550, Binding Wire | kg | 18% |
| 4 | **Blocks/Bricks** | AAC 100/150/200mm, Solid/Hollow Block, Clay/Fly Ash Brick | nos | 5% |
| 5 | **Aggregates** | M-Sand, River Sand, 10/20/40mm Aggregate, RCA | cft | 5% |
| 6 | **Masonry** | CM 1:4, CM 1:6, Thin Bed Mortar, Wire Mesh | cum/kg | 18% |
| 7 | **Flooring** | Terrazzo, Ceramic, Vitrified, Marble, Granite, Wooden | sqft | 18% |
| 8 | **Timber** | Teak, Rosewood, Sal, Mango, Plywood 12/18mm, MDF | cft/sqft | 18% |

### Additional Categories:
| Category | Materials | Unit | GST |
|----------|-----------|------|-----|
| **Finishes** | Primer, Putty, Interior/Exterior Paint, Enamel | litre/kg | 18% |
| **Doors/Windows** | Flush Door, Panel Door, UPVC Window, MS Grill | nos/sqft | 18% |
| **Waterproofing** | Bituminous Coating, Crystalline, APP Membrane | litre/kg/sqm | 18% |
| **Plumbing** | CPVC Pipes (1/2/4in), UPVC Pipes, Sanitary Fittings | m/set | 18% |
| **Electrical** | Copper Wire (2.5/4/6sqmm), Conduit, Switches | m/nos | 18% |

---

## 4. Structural Design Module

### IS Code References:
- IS 456:2000 - Plain and Reinforced Concrete
- IS 875 (Parts 1-5) - Design Loads
- IS 1893:2016 - Earthquake Resistant Design
- IS 10262:2019 - Concrete Mix Proportioning
- IS 1786:2008 - High Strength Deformed Steel Bars
- IS 13920:2016 - Ductile Detailing

### Design Process:

#### Step 1: Load Calculation (IS 875)
```
Dead Load (IS 875 Part 1):
  Slab:    thickness × 25 kN/m³ (RCC density)
  Beam:    breadth × depth × 25 kN/m³
  Column:  breadth × depth × height × 25 kN/m³
  Wall:    thickness × density × height

Live Load (IS 875 Part 2):
  Residential: 2.0 kN/m²
  Commercial:  2.5-4.0 kN/m²
  Educational: 3.0-4.0 kN/m²
  Assembly:    4.0-5.0 kN/m²

Load Combinations (IS 875 Part 5):
  1.5(DL + LL)           Maximum gravity load
  1.2(DL + LL + WL)      With wind
  1.5(DL + EL)           With earthquake
```

#### Step 2: Slab Design (IS 456 Annex D)
```
Input: Room dimensions (Lx × Ly), load w (kN/m²)
1. Slab type: One-way if Ly/Lx > 2, else Two-way
2. Effective span = Clear span + effective depth
3. Moment coefficients from IS 456 Table (Annex D)
4. Bending moment: M = α × w × Lx²
5. Required steel: As = 0.5×fy/fck × [1-√(1-4.6M/fckbd²)] × bd
6. Minimum steel: As,min = 0.12% × b × D (Fe500)
7. Deflection check: L/d ≤ 26 (continuous)
```

#### Step 3: Beam Design (IS 456 Clause 38)
```
Input: Span, loads, support conditions
1. Bending moment: M = wL²/8 (SS) or wL²/10 (continuous)
2. Shear force: V = wL/2
3. Flexural design: Provide tension steel As
4. Shear design: Stirrups if V > τc × bd
5. Deflection check: L/d ≤ 16 (SS), 20 (continuous)
6. Development length: Ld = φ × fy / (4 × τbd)
```

#### Step 4: Column Design (IS 456 Clause 39)
```
Input: Axial load, moments, column size
1. Short/Long: Lex/D ≤ 12 (short column)
2. Min eccentricity: emin = L/500 + D/30 ≤ 20mm
3. Axial capacity: Pu = 0.4×fck×Ac + 0.67×fy×Asc
4. Biaxial check: (Mux/Mux1)^αn + (Muy/Muy1)^αn ≤ 1
5. Steel limits: Min 0.8%, Max 4% of gross area
6. Lateral ties: φ/4 (min 6mm) @ 300mm c/c
```

#### Step 5: Foundation Design (IS 456 + IS 1905)
```
Input: Column load, SBC, column size
1. Footing area = Column load / SBC
2. Footing dimensions: B × L (typically square)
3. BM at column face: M = p × (B-b)² / 2
4. One-way shear check
5. Two-way shear (punching) check
6. Development length of dowels
7. Min depth: d = V / (0.25×fck×perimeter)
```

---

## 5. Bill of Quantities (BoQ)

### BoQ Generation Process:
1. Load material rates from MongoDB database
2. Calculate structural quantities from designed members
3. Apply wastage factors per IS 3861:1966
4. Apply material-specific GST rates
5. Calculate transportation costs
6. Generate itemized BoQ with IS code references

### BoQ Categories:
```
1. Earthwork
   - Excavation for foundation
   - Backfilling
   - PCC bed

2. Concrete Work
   - Foundation RCC
   - Column RCC
   - Beam RCC
   - Slab RCC
   - Lintels, Sunshades

3. Reinforcement Steel
   - Foundation steel
   - Column steel
   - Beam steel
   - Slab steel
   - Binding wire

4. Masonry
   - External walls (230mm)
   - Internal walls (115mm)
   - Parapet walls

5. Plastering
   - Internal plaster (12mm)
   - External plaster (20mm)
   - Ceiling plaster

6. Flooring
   - Vitrified tiles (living/dining)
   - Ceramic tiles (bathrooms)
   - Granite (staircase)

7. Doors & Windows
   - Flush doors
   - UPVC windows
   - MS grills

8. Painting
   - Wall primer
   - Wall putty
   - Interior paint
   - Exterior paint

9. Waterproofing
   - Basement waterproofing
   - Terrace waterproofing

10. Electrical
    - Copper wiring
    - Switches & sockets
    - Distribution board

11. Plumbing
    - CPVC pipes
    - Sanitary fittings

12. Miscellaneous
    - Transportation
    - Contractor's profit
    - GST
```

### GST Calculation:
```javascript
// Per-item GST based on material category
const gstAmount = item.amount * (item.gstRate / 100);

// GST rates:
Cement:     28%
Steel:      18%
Concrete:   18%
Blocks:      5%
Aggregates:  5%
Tiles:      18%
Paint:      18%
Timber:     18%
Labour:     18%
```

---

## 6. Sustainability Assessment

### GRIHA v3.1 Assessment (34 Criteria, 100 Points)

| Category | Criteria | Points |
|----------|----------|--------|
| **Site & Planning** | Site selection, landscaping, heat island, rainwater, solid waste | 18 |
| **Water** | Water efficiency, recycling, rainwater harvesting, monitoring | 14 |
| **Energy** | Building envelope, HVAC, lighting, renewable energy, monitoring | 28 |
| **Materials** | Embodied energy, recycled content, local materials, lifecycle | 28 |
| **Indoor Environment** | Daylighting, ventilation, thermal comfort, acoustics, VOC | 12 |

### IGBC Assessment (100 Points)
| Category | Points |
|----------|--------|
| Site & Planning | 12 |
| Water Efficiency | 14 |
| Energy & Atmosphere | 34 |
| Materials & Resources | 18 |
| Indoor Environmental Quality | 22 |

### LEED v4.1 Assessment (110 Points)
| Category | Points |
|----------|--------|
| Location & Transportation | 16 |
| Sustainable Sites | 10 |
| Water Efficiency | 11 |
| Energy & Atmosphere | 33 |
| Materials & Resources | 13 |
| Indoor Environmental Quality | 16 |
| Innovation | 6 |
| Regional Priority | 4 |

### Embodied Carbon Calculation:
```
Carbon = Σ (Quantity × Carbon Coefficient)

Coefficients:
OPC 53:  0.93 kg CO2/kg
PPC:     0.58 kg CO2/kg (35% reduction)
PSC:     0.42 kg CO2/kg (55% reduction)
Steel:   2.50 kg CO2/kg
Blocks:  0.35 kg CO2/unit (AAC)
Bricks:  0.22 kg CO2/unit (Clay)
```

---

## 7. API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | User registration |
| POST | /api/auth/login | User login |
| GET | /api/auth/me | Get current user |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/projects | List user projects |
| POST | /api/projects | Create project |
| GET | /api/projects/{id} | Get project |
| PUT | /api/projects/{id} | Update project |
| DELETE | /api/projects/{id} | Delete project |

### Materials
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/materials | List materials |
| GET | /api/materials/categories | Get categories |
| GET | /api/materials/{id} | Get material |
| POST | /api/materials | Create material |
| GET | /api/material-rates | Get rates for BoQ |

### Structural Design
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/structural/loads | Calculate loads (IS 875) |
| POST | /api/structural/seismic | Seismic analysis (IS 1893) |
| POST | /api/structural/wind | Wind load (IS 875 Part 3) |
| POST | /api/structural/design | Design structural member |
| POST | /api/structural/full-analysis | Complete analysis |

### BoQ & Cost
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/boq/generate | Generate complete BoQ |
| POST | /api/cost-tracking/init | Initialize cost tracking |
| GET | /api/cost-tracking/{id} | Get cost data |

### Sustainability
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/green-building/criteria | Get assessment criteria |
| POST | /api/green-building/full-assessment | Complete assessment |

### BIM
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/bim/parse | Parse IFC file |

---

## 8. Frontend Routes

| Path | Component | Description |
|------|-----------|-------------|
| / | Dashboard | Project overview |
| /setup | ProjectSetup | Building parameters |
| /materials | Materials | Material database |
| /optimizer | MaterialOptimizer | AHP optimization |
| /bim | BIMIntegration | IFC upload & parsing |
| /reports | Reports | Comprehensive reports |
| /structural | StructuralDesign | Structural analysis |
| /cost-tracking | CostTracking | Cost monitoring |
| /qc-checklists | QCChecklists | Quality control |
| /compliance | ComplianceChecker | NBC/KMBR compliance |
| /schedule | ConstructionSchedule | Gantt chart |
| /mix-design | MixDesigner | Concrete mix design |
| /projects | ProjectManager | Manage projects |
| /profile | EngineerProfile | User profile |
| /login | Login | Authentication |
| /register | Register | Registration |

---

## 9. Calculation Standards

### Concrete Mix Design (IS 10262:2019)
```
M20: 1:1.5:3 (OPC 33/43), w/c = 0.50, 6.5 bags/cum
M25: 1:1:2 (OPC 53), w/c = 0.45, 7.5 bags/cum
M30: 1:0.75:1.5 (OPC 53), w/c = 0.40, 8.5 bags/cum
```

### Material Densities (IS 875 Part 1)
```
Cement:           1440 kg/m³
Sand:             1600 kg/m³
Aggregate:        1550 kg/m³
Steel:            7850 kg/m³
RCC:              2500 kg/m³
Brick Masonry:    1900 kg/m³
AAC Block:        750 kg/m³
```

### Wastage Factors (IS 3861:1966)
```
Cement:     2-5%
Steel:      5-10%
Sand:       5-8%
Aggregate:  5-8%
Blocks:     5-10%
Tiles:      10%
Paint:      5%
```

### Steel Percentages (IS 456:2000)
```
Footing:  0.8% (80 kg/m³)
Column:   1.5% (150 kg/m³)
Beam:     1.2% (120 kg/m³)
Slab:     0.8% (80 kg/m³)
Lintel:   0.7% (70 kg/m³)
```

### Minimum Cover (IS 456:2000 Table 16)
```
Mild Exposure:     Slab 20mm, Beam 25mm, Column 40mm
Moderate:          Slab 30mm, Beam 30mm, Column 40mm
Severe:            Slab 45mm, Beam 45mm, Column 40mm
Very Severe:       Slab 50mm, Beam 50mm, Column 40mm
Extreme:           Slab 75mm, Beam 60mm, Column 40mm
```

---

## 10. Data Flow

```
Project Setup → Load Calculator → Structural Design → BoQ Generator → Reports
     ↓               ↓                   ↓                 ↓            ↓
Building        IS 875 loads      IS 456 design      Material      GRIHA/IGBC
Parameters      Dead/Live         Slab/Beam/         quantities    Sustainability
                Wind/Seismic      Column/Foundation   with rates    Assessment
```

---

## 11. Environment Configuration

### Backend (.env)
```
MONGODB_URL=mongodb://localhost:27017/ecobuild
JWT_SECRET_KEY=your-secret-key-here
CORS_ORIGINS=http://localhost:3000
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_GEMINI_API_KEY=your-gemini-api-key
```

---

## 12. Dependencies

### Backend (Python)
```
fastapi==0.104.1
uvicorn==0.24.0
motor==3.3.2
pymongo==4.6.1
python-jose==3.3.0
passlib==1.7.4
pydantic==2.5.2
numpy==1.26.2
```

### Frontend (Node.js)
```
react==18.2.0
react-router-dom==6.20.1
axios==1.6.2
react-icons==4.12.0
tailwindcss==3.3.6
```

---

*Document Version: 1.0*  
*Last Updated: March 2026*

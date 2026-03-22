# EcoBuild - Comprehensive IS Code Compliant Update

## ✅ Major Features Implemented

### 1. 📋 Complete Building Classification System (IS 875 & KMBR)

**Main Use Categories (per IS 875 Part 2):**
- **A - Residential**: Individual, Apartment, Group Housing, Hostel, Hotel
- **B - Educational**: School, College, Training Center
- **C/D - Institutional**: Hospital, Clinic, Assembly Hall, Theater
- **E/F - Commercial**: Office, Retail, Mall, Restaurant
- **G - Industrial**: Manufacturing, Warehouse, Workshop
- **H - Storage**: Godown, Cold Storage
- **J - Hazardous**: Special structures

**Automatic Parking Calculation (per KMBR 8.1):**
```javascript
Residential: 1 per dwelling unit / 1 per 100 sqm
Commercial: 1 per 50 sqm
Institutional: 1 per 100 sqm
Industrial: 1 per 200 sqm
Storage: 1 per 200 sqm
```

### 2. 🏗️ Comprehensive Geotechnical Investigation Module

**Soil Profile (per IS 1498):**
- Lateritic Soil (SBC: 200 kN/m²)
- Alluvial Soil (SBC: 150 kN/m²)
- Clay - Soft (SBC: 100 kN/m²)
- Sandy Soil (SBC: 150 kN/m²)
- Rock/Hard Stratum (SBC: 400 kN/m²)
- Marshy/Organic (SBC: 50 kN/m²)

**CBR Values (per IS 2720 Part 16):**
- Subgrade CBR (%)
- Sub-base CBR (%)
- Base course CBR (%)
- Soaked & Unsoaked values

**Bearing Capacity (per IS 6403):**
- Safe Bearing Capacity (SBC) - kN/m²
- Net Safe Bearing Capacity
- Ultimate Bearing Capacity
- Allowable Bearing Pressure

**SPT N-Values (per IS 2131):**
- N-value at foundation level
- Depth-wise N-values array
- Correlations for soil properties

**Atterberg Limits (per IS 2720 Part 5):**
- Liquid Limit (LL) %
- Plastic Limit (PL) %
- Plasticity Index (PI) %
- Shrinkage Limit %
- Auto-calculated: `PI = LL - PL`

**Groundwater Investigation:**
- Groundwater Level (m below GL)
- Seasonal variation
- Water table depth
- Dewatering requirements

**Rock Parameters:**
- Rock Quality Designation (RQD) %
- Weathering grade
- Unconfined compressive strength (MPa)
- Rock type classification

**Foundation Recommendations (per IS Codes):**
- Isolated Footing (IS 456:2000)
- Combined Footing (IS 456:2000)
- Raft Foundation (IS 2950)
- Pile Foundation (IS 2911 Part 1/2/4)
- Well Foundation (IS 3955)

**Grain Size Distribution:**
- Gravel content %
- Sand content %
- Silt content %
- Clay content %
- D10, D30, D60
- Uniformity coefficient (Cu)
- Coefficient of curvature (Cc)

**Shear Strength (per IS 2720 Part 13):**
- Cohesion (c) - kN/m²
- Angle of internal friction (φ) - degrees
- Undrained shear strength

### 3. 🅿️ KMBR Parking Compliance

**Automatic Calculation based on:**
- Building use classification
- Built-up area
- KMBR Table 8.1 requirements

**Inputs:**
- Required parking (auto-calculated)
- Provided parking (manual entry)
- Visitor parking spaces
- Two-wheeler parking

### 4. ⚙️ Manual Override Controls

**Advanced Settings Section:**
- **Total Budget** (₹ Lakhs)
- **Max Material Cost** (₹/sqm)
- **Target Carbon** (kg CO₂/sqm) - override auto-calculation
- **Min Recycled Content** (%) - enforce minimum threshold

**All overrides used in:**
- Material optimization algorithms
- Cost estimation
- Sustainability scoring
- Mix design calculations

### 5. 📊 Quick Summary View (QSV)

**Dashboard Widget showing:**
- Carbon Reduction %
- Cost Savings (₹ Lakhs)
- KMBR Compliance Score %
- Direct link to full reports

### 6. 🤖 AI Assistant - Fully Context-Aware

**Now Knows:**
- Complete geotechnical profile
- IS 875 occupancy classification
- All building parameters
- Material selections
- Analysis results
- Kerala climate data

**Provides Technical Responses on:**
- **Foundation Design**: Based on SBC, GWL, building height
- **Pavement Design**: CBR-based thickness per IRC:37
- **Seismic Design**: Zone-specific per IS 1893
- **Groundwater Impact**: Dewatering strategies
- **Construction Methodology**: Sequence & QC
- **Material Selection**: Soil-aware recommendations

**IS Code References in Every Response:**
- IS 875 (Loads)
- IS 456 (Concrete)
- IS 1786 (Steel)
- IS 2911 (Piles)
- IS 2950 (Raft)
- IS 1498 (Soil Classification)
- IS 6403 (Bearing Capacity)
- IS 2720 (Soil Testing)
- IS 1893 (Seismic)
- IS 13920 (Ductile Detailing)
- KMBR 2019 (Kerala Building Rules)

### 7. 📋 Enhanced Building Parameters

**KMBR Compliance Fields:**
- Plot Area (sq.m)
- Built-up Area (sq.m)
- FAR (auto-calculated)
- Number of floors
- Basement floors
- Building Height (m)
- Road Width (m)
- Road type (public/private/interior)

**Setbacks (per KMBR Chapter 5):**
- Front setback (m)
- Rear setback (m)
- Side 1 (Left) setback (m)
- Side 2 (Right) setback (m)
- River setback (if applicable)
- Railway setback (if applicable)

**Compliance Features:**
- Rainwater Harvesting (KMBR 10.2)
- Solar Water Heater (KMBR 10.3)
- Sewage Treatment Plant (KMBR 10.4)
- Fire Fighting System
- Lift/Elevator details

### 8. 🗺️ Interactive Map Location Picker

**Features:**
- Click to select location
- Draggable marker for precision
- Auto-address lookup
- Latitude/Longitude display
- Kerala-focused default view

## 📁 New/Updated Files

```
frontend/src/
├── context/
│   └── ProjectContext.js      # Added geotechnical state
├── pages/
│   └── ProjectSetup.js        # Comprehensive civil engineering inputs
├── services/
│   └── aiService.js           # Geotechnical-aware AI responses
├── components/
│   ├── LocationPicker.js      # Interactive map
│   ├── QuickSummaryView.js    # QSV widget
│   └── OnboardingTutorial.js  # User tutorial
└── App.js                     # Tutorial integration
```

## 🎯 Civil Engineering Workflow

### Step 1: Project Identification
- Project name & description
- Select location on interactive map
- Auto-fetch environmental data

### Step 2: Building Classification
- Select IS 875 occupancy group (A-J)
- Choose sub-type (residential, commercial, etc.)
- **System auto-calculates parking requirement**

### Step 3: Building Parameters
- Enter plot & built-up areas
- FAR auto-calculated
- Set setbacks per KMBR
- Input parking (required vs provided)

### Step 4: Geotechnical Investigation
- Select soil type (auto-fills SBC)
- Enter CBR values
- Input SPT N-values
- Atterberg limits (LL, PL, PI auto-calculated)
- Groundwater level
- Foundation recommendation

### Step 5: Advanced Settings (Optional)
- Set budget constraints
- Override carbon targets
- Set minimum recycled content

### Step 6: Run Analysis
- Material optimization
- KMBR compliance check
- Cost estimation
- Carbon footprint

### Step 7: AI Assistance
Ask technical questions like:
- "What foundation type for SBC of 150 kN/m²?"
- "Calculate pavement thickness with CBR 8%"
- "Is my project compliant with KMBR setbacks?"
- "Recommend concrete grade for chloride exposure"
- "Design pile capacity for this soil profile"

## 📊 IS Code Compliance Matrix

| Feature | IS Code | Section |
|---------|---------|---------|
| Building Classification | IS 875 Part 2 | Occupancy Groups |
| Soil Classification | IS 1498 | Soil Groups |
| Bearing Capacity | IS 6403 | Shallow Foundations |
| Pile Design | IS 2911 | Deep Foundations |
| Concrete Mix | IS 10262 | Mix Proportioning |
| Concrete Construction | IS 456 | Plain & Reinforced |
| Steel Reinforcement | IS 1786 | High Strength Bars |
| Soil Testing | IS 2720 | Methods of Test |
| Seismic Design | IS 1893 | Criteria |
| Ductile Detailing | IS 13920 | RC Structures |
| Pavement Design | IRC:37 | Flexible/Rigid |
| Kerala Building Rules | KMBR 2019 | All chapters |

## 🔧 Technical Specifications

### Foundation Selection Logic
```
SBC >= 200 kN/m² AND GWL > 3m → Isolated Footing
SBC 100-200 kN/m² OR GWL < 3m → Raft Foundation
SBC < 100 kN/m² OR High loads → Pile Foundation
Rock with RQD > 70% → Rock-socketed piles
```

### Pavement Design (IRC:37)
```
CBR >= 15% → Granular sub-base + WMM + DBM + BC
CBR 8-15% → Additional sub-base layer
CBR 5-8% → Cement-stabilized sub-base
CBR < 5% → Lime/cement treated soil
```

### Seismic Parameters
```
Zone II: Z = 0.10, Importance Factor 1.0
Zone III: Z = 0.16, Importance Factor 1.2
Zone IV: Z = 0.24, Importance Factor 1.5
Zone V: Z = 0.36, Importance Factor 1.8
```

## 🚀 Usage Instructions

1. **Start Project**: Click "New Project"
2. **Select Location**: Use interactive map
3. **Classify Building**: Choose IS 875 occupancy
4. **Enter Parameters**: Areas, setbacks, parking
5. **Add Geotechnical Data**: Soil, CBR, SBC, GWL
6. **Set Overrides** (optional): Budget, carbon targets
7. **Run Analysis**: Material optimization
8. **Consult AI**: Ask technical questions
9. **Export Reports**: STAAD.Pro-style output

## ✅ Complete Checklist

- [x] IS 875 Part 2 building classification
- [x] KMBR parking calculation (Chapter 8)
- [x] Geotechnical investigation module
- [x] CBR values (IS 2720 Part 16)
- [x] Safe Bearing Capacity (IS 6403)
- [x] SPT N-values (IS 2131)
- [x] Atterberg limits (IS 2720 Part 5)
- [x] Foundation recommendations (IS 456/2911/2950)
- [x] Groundwater investigation
- [x] Manual override controls
- [x] AI with geotechnical awareness
- [x] IS code references throughout
- [x] Civil engineering terminology
- [x] Professional input forms
- [x] QSV (Quick Summary View)
- [x] Interactive map
- [x] Onboarding tutorial

## 🎓 For Civil Engineers

This system now provides:
- **Complete geotechnical profile** as per IS standards
- **Automated calculations** (FAR, parking, PI, etc.)
- **IS code compliant** recommendations
- **Technical AI assistant** with engineering knowledge
- **Professional report output** (STAAD.Pro style)
- **KMBR compliance checking** for Kerala projects

All calculations follow Indian Standards (IS) and Kerala Municipality Building Rules (KMBR) 2019.
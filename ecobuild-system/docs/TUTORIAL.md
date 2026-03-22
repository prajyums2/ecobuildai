# EcoBuild Tutorial - Complete Guide

## 🎯 Project Overview

EcoBuild is a **Lifecycle Decision Support System** for sustainable construction at **GEC Thrissur**. It integrates AHP optimization, KMBR compliance checking, BIM parsing, cost tracking, and QC management.

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Project Setup](#project-setup)
3. [Material Optimization](#material-optimization)
4. [BIM Integration](#bim-integration)
5. [Cost Tracking](#cost-tracking)
6. [QC Checklists](#qc-checklists)
7. [KMBR Compliance](#kmbr-compliance)
8. [Troubleshooting](#troubleshooting)

## 🚀 Quick Start

### Running the Application

```bash
# Terminal 1: Start Backend
cd ecobuild-system/backend
python main.py

# Terminal 2: Start Frontend
cd ecobuild-system/frontend
npm start
```

### Running Tests

```bash
cd ecobuild-system/backend
python test_ecobuild.py
```

**Expected Result:** 12/12 tests passing ✓

## 📐 Project Setup

### Step 1: Basic Information

1. Navigate to **Project Setup** page
2. Enter project details:
   - **Project Name**: GEC Thrissur Academic Block
   - **Project ID**: GEC-THR-2024-001
   - **Location**: Select on map (Thrissur coordinates: 10.5167°N, 76.2167°E)

### Step 2: Building Specifications

Enter the following for our test project:

```
Plot Area: 1500 sqm
Building Footprint: 800 sqm
Total Built-up Area: 2400 sqm
Number of Floors: 3
Building Height: 12.5 m
Road Width: 12 m
Zone Type: Residential
Building Type: Educational
```

### Step 3: Setbacks

```
Front Setback: 3 m (Required: 6 m - Will show violation)
Rear Setback: 3 m (Required: 5 m - Will show violation)
Side Setback 1: 2 m (Required: 4 m - Will show violation)
Side Setback 2: 2 m (Required: 4 m - Will show violation)
```

### Step 4: Amenities

✓ Rainwater Harvesting: Yes
✓ Solar Water Heater: Yes  
✓ Sewage Treatment: Yes
✓ Parking Spaces: 25

## 🌱 Material Optimization

### Using AHP Engine

1. Go to **Material Optimizer** page
2. Select optimization mode:
   - **Sustainability**: Prioritizes low carbon, recycled content
   - **Luxury**: Prioritizes aesthetics and durability
   - **Balanced**: Equal weight to all factors

3. Choose material categories:
   - Concrete
   - Steel
   - Masonry
   - Aggregates
   - Finishes

4. Click **Optimize** to see rankings with:
   - Sustainability scores
   - Logistics carbon footprint
   - Cost per unit
   - Recycled content percentage

### Example Results (Sustainability Mode)

```
Top Steel Choice: TMT Steel Bars (Fe 500)
  - Sustainability Score: 1.000
  - Logistics Carbon: 0.00 kg CO2
  - Recycled Content: 25%

Top Masonry Choice: Fly Ash Bricks
  - Sustainability Score: 0.623
  - Logistics Carbon: 0.001 kg CO2
  - Recycled Content: 70%
```

## 🏗️ BIM Integration

### Supported Formats

1. **IFC** (.ifc) - Industry standard
2. **JSON** (.json) - Custom format

### Creating a JSON BIM File

Create a file named `sample_building.json`:

```json
{
  "project": "GEC Thrissur Academic Block",
  "location": {"lat": 10.5167, "lon": 76.2167},
  "elements": [
    {
      "id": "col_001",
      "type": "column",
      "name": "Column C1",
      "volume": 2.5,
      "surface_area": 15.0,
      "dimensions": {"length": 0.3, "width": 0.3, "height": 3.0},
      "materials": ["concrete_m25", "steel_fe500"],
      "location": {"x": 5.0, "y": 5.0, "z": 0.0}
    },
    {
      "id": "beam_001",
      "type": "beam",
      "name": "Beam B1",
      "volume": 1.8,
      "surface_area": 18.0,
      "dimensions": {"length": 4.0, "width": 0.23, "height": 0.45},
      "materials": ["concrete_m25", "steel_fe500"],
      "location": {"x": 5.0, "y": 5.0, "z": 3.0}
    },
    {
      "id": "slab_001",
      "type": "slab",
      "name": "Floor Slab F1",
      "volume": 12.0,
      "surface_area": 100.0,
      "dimensions": {"length": 10.0, "width": 10.0, "thickness": 0.12},
      "materials": ["concrete_m25", "steel_fe500"],
      "location": {"x": 5.0, "y": 5.0, "z": 3.15}
    },
    {
      "id": "fnd_001",
      "type": "foundation",
      "name": "Footing F1",
      "volume": 8.5,
      "surface_area": 25.0,
      "dimensions": {"length": 2.0, "width": 2.0, "depth": 1.5},
      "materials": ["concrete_m20", "steel_fe500"],
      "location": {"x": 5.0, "y": 5.0, "z": -1.5}
    },
    {
      "id": "wall_001",
      "type": "wall",
      "name": "Wall W1",
      "volume": 4.5,
      "surface_area": 30.0,
      "dimensions": {"length": 5.0, "width": 0.2, "height": 3.0},
      "materials": ["aac_blocks"],
      "location": {"x": 2.5, "y": 0.0, "z": 1.5}
    }
  ]
}
```

### Uploading BIM Files

1. Go to **BIM Integration** page
2. Drag and drop your .ifc or .json file
3. Wait for parsing (shows progress spinner)
4. View results:
   - **3D Model Viewer** with carbon heat map
   - **Element Breakdown** (columns, beams, slabs, walls, foundations)
   - **Bill of Quantities**:
     - Concrete: 29.30 m³
     - Steel: 6,142 kg
     - Formwork: 188 m²
   - **Embodied Carbon**: 28.75 tons CO2

### Quantity Calculations

EcoBuild automatically calculates:

| Material | Formula | Wastage |
|----------|---------|---------|
| Concrete | Volume × 1.05 | 5% |
| Steel | Volume × ratio × 7850 kg/m³ × 1.025 | 2.5% |
| AAC Blocks | Volume / 0.036 m³ per block × 1.10 | 10% |
| Formwork | Surface area × 1.10 | 10% |

## 💰 Cost Tracking

### Setting Up Cost Tracking

1. Go to **Cost Tracking** page
2. Initialize with total budget: **₹50,00,000** (50 Lakhs)

### Payment Milestones

Standard Kerala construction payment schedule:

| Milestone | Percentage | Amount (₹) | Status |
|-----------|------------|------------|--------|
| Advance | 10% | 5,00,000 | Partial |
| Foundation | 15% | 7,50,000 | Paid |
| Plinth | 5% | 2,50,000 | Paid |
| Superstructure | 15% | 7,50,000 | In Progress |
| Roofing | 15% | 7,50,000 | Pending |
| Masonry | 10% | 5,00,000 | Pending |
| Plastering | 10% | 5,00,000 | Pending |
| Electrical | 5% | 2,50,000 | Pending |
| Flooring | 8% | 4,00,000 | Pending |
| Finishing | 5% | 2,50,000 | Pending |
| Completion | 2% | 1,00,000 | Pending |

### Recording Expenses

Click **Add Expense** to record actual costs:

```
Date: 2024-02-05
Category: Concrete
Description: M25 concrete for foundation
Vendor: KTJ Steel
Invoice: INV-001
Estimated: ₹1,50,000
Actual: ₹1,65,000
Variance: +₹15,000
```

### Recording Payments

Click **Record Payment** to track client payments:

```
Milestone: Advance Payment
Amount: ₹5,00,000
Date: 2024-02-01
Method: Bank Transfer
Reference: TXN123456
Notes: Advance payment received
```

### Budget Health Dashboard

Monitor project financial health:

- **Total Budget**: ₹50,00,000
- **Contingency (5%)**: ₹2,50,000
- **Total Available**: ₹52,50,000
- **Actual Spent**: ₹32,50,000
- **Total Paid**: ₹28,00,000
- **Remaining to Pay**: ₹22,00,000
- **Variance**: -₹2,50,000 (5% under budget)
- **Status**: ✅ Healthy

## ✅ QC Checklists

### Inspection Stages

Five IS Code compliant inspection stages:

1. **Foundation** - IS 456:2000, IS 1200
2. **Superstructure** - IS 456:2000, IS 875
3. **Masonry** - IS 2185, IS 1905
4. **Plastering** - IS 1661:1972
5. **Electrical** - IS 732:1989, IS 3043

### Sample Checklist Items

**Foundation Stage (10 items):**

1. Excavation dimensions as per drawing
   - Criteria: Length, width, depth within ±50mm tolerance
   - IS Code: IS 1200 (Part 1)
   - Severity: 🔴 Critical

2. Soil bearing capacity verification
   - Criteria: SBC ≥ design value (kN/m²)
   - IS Code: IS 6403:1981
   - Severity: 🔴 Critical

3. PCC thickness and grade
   - Criteria: M10 grade, 100mm thick, level surface
   - IS Code: IS 456:2000
   - Severity: 🟡 Major

### Updating Item Status

Click on any checklist item to update:

- **Status**: Passed / Failed / In Progress / Not Started
- **Notes**: Inspection observations
- **Inspector**: Name and designation
- **Photos**: Upload site photos with GPS coordinates

### Non-Conformance Reports

When an item fails:

1. Item automatically marked as Failed
2. Create Non-Conformance Report (NCR):
   ```
   ID: NC-20240301-110000
   Description: Concrete cover less than 40mm at 3 locations
   Severity: Major
   Status: Open
   ```
3. Add corrective action plan
4. Upload rework photos
5. Close NCR after verification

### QC Summary Dashboard

Track overall quality:

- **Total Checklists**: 5
- **Total Items**: 44
- **Passed**: 35 (79.5%)
- **Failed**: 3 (6.8%)
- **Pending**: 12 (27.3%)
- **Completion**: 79.5%
- **Open Non-Conformances**: 2

## ⚖️ KMBR Compliance

### Running Compliance Check

After setting up project details:

1. Go to **Compliance Checker** page
2. Click **Run Full Compliance Check**
3. Review results by category:
   - Setbacks
   - Height restrictions
   - Floor Area Ratio (FAR)
   - Parking requirements
   - Green building mandates

### Example Results

**✓ Compliant Items:**
- FAR: 1.60 ≤ 4.00 ✅
- Building Height: 12.5 m ≤ 50 m ✅
- Parking: 25 spaces provided ✅
- Rainwater Harvesting: Provided ✅
- Solar Water Heater: Provided ✅

**❌ Violations (3):**
- KMBR-5.2.1: Front setback 3.0 m < required 6.0 m ❌
  - Action: Increase by 3.0 m
  
- KMBR-5.2.2: Rear setback 3.0 m < required 5.0 m ❌
  - Action: Increase by 2.0 m
  
- KMBR-5.2.3: Side setbacks 2.0 m < required 4.0 m ❌
  - Action: Increase side setbacks

**Overall Status**: REQUIRES MODIFICATION

## 🔧 Troubleshooting

### Common Issues

#### 1. BIM File Won't Upload

**Problem**: "Failed to parse BIM file"

**Solutions**:
- Ensure file extension is .ifc or .json
- For IFC: Export with tessellated geometry
- For JSON: Validate syntax with online JSON validator
- Check file size (max 50MB)

#### 2. No Materials Found in Optimization

**Problem**: "No results for selected category"

**Solutions**:
- Verify location coordinates are within Kerala
- Check coordinates: lat 8-12°N, lon 74-77°E
- Try different material categories

#### 3. KMBR Check Shows All Violations

**Problem**: All compliance checks fail

**Solutions**:
- Verify building type selection matches actual use
- Check zone type (residential/commercial/industrial)
- Ensure road width is correct
- Review setback requirements for your zone

#### 4. Cost Tracker Shows Wrong Variance

**Problem**: Budget variance doesn't match expectations

**Solutions**:
- Verify all actual costs are recorded
- Check payment milestone amounts
- Ensure budget includes contingency
- Review expense categories

#### 5. QC Photos Won't Upload

**Problem**: Photo upload fails or doesn't save

**Solutions**:
- Check photo file format (JPG, PNG only)
- Ensure file size < 10MB
- Verify internet connection
- Check storage quota

### Getting Help

1. **Check Documentation**: `/docs` folder
2. **Run Tests**: `python test_ecobuild.py`
3. **Review Logs**: Check browser console and backend terminal
4. **Sample Files**: Use files in `/examples` directory
5. **GitHub Issues**: Report bugs at repository

## 📊 Test Results Summary

All 12 integration tests passing:

```
✓ AHP Material Optimization
✓ Environmental Data Retrieval
✓ Operational Carbon Calculation
✓ Concrete Mix Design (M25)
✓ BIM Parser (JSON)
✓ KMBR Compliance Checking
✓ Cost Tracking & Payments
✓ QC Checklists
✓ Edge Cases & Error Handling
```

**Run tests anytime**:
```bash
cd backend
python test_ecobuild.py
```

## 🎓 Next Steps

1. **Complete Project Setup** with actual site data
2. **Upload BIM Model** from Revit/ArchiCAD
3. **Run Material Optimization** for sustainability
4. **Track Costs** throughout construction
5. **Manage QC** with photo documentation
6. **Generate Reports** for stakeholders

## 📞 Support

For questions or assistance:
- 📧 Email: support@ecobuild.in
- 📍 Location: GEC Thrissur, Kerala
- 📱 Phone: +91-XXX-XXXX-XXXX

---

**Version**: 1.2.0  
**Last Updated**: February 2024  
**Built with**: React, FastAPI, Python 3.12
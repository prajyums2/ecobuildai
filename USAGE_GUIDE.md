# 🚀 EcoBuild - Installation & Usage Guide

## ✅ All Features Complete

### What's New:
1. ✅ **IS Code Compliant** - Full compliance with IS 875, IS 456, IS 6403, etc.
2. ✅ **Comprehensive Building Types** - All IS 875 occupancy groups (A-J)
3. ✅ **Automatic Parking Calculation** - Per KMBR 8.1 based on building type
4. ✅ **Geotechnical Module** - CBR, SBC, SPT, Atterberg limits, groundwater
5. ✅ **Manual Overrides** - Budget, carbon targets, recycled content
6. ✅ **AI with Context** - Knows your complete project including geotechnical data
7. ✅ **Civil Engineering Focus** - Professional terminology and IS code references
8. ✅ **Interactive Map** - Click to select location
9. ✅ **Onboarding Tutorial** - 5-step guide for new users
10. ✅ **STAAD.Pro Reports** - Professional engineering report format

---

## 📦 Installation

### Step 1: Install Dependencies

```bash
cd ecobuild-system/frontend
npm install
```

This will install:
- `react-markdown` - For AI assistant formatting
- All existing dependencies (React, Leaflet, Three.js, etc.)

### Step 2: (Optional) Add Gemini API Key

For AI-powered chat (without this, uses smart fallback):

Create `.env` file in `ecobuild-system/frontend/`:

```bash
REACT_APP_GEMINI_API_KEY=your_gemini_api_key_here
```

Get API key from: https://makersuite.google.com/app/apikey

### Step 3: Run Application

```bash
npm start
```

App will open at: **http://localhost:3000**

---

## 🎯 Quick Start Guide

### For First-Time Users:

1. **Onboarding Tutorial** appears automatically
   - Click through 5 steps to learn the system
   - Click "Get Started" at the end

2. **Create New Project**
   - Click "New Project" button in sidebar
   - Enter project name
   - Select location on **interactive map**
   - Click "Continue"

3. **Building Classification**
   - Select **IS 875 Occupancy Group** (A-J)
     - A: Residential
     - B: Educational
     - C/D: Institutional
     - E/F: Commercial
     - G: Industrial
     - H: Storage
     - J: Hazardous
   - Choose sub-type (e.g., Apartment, Hospital, Office)
   - **Parking requirement auto-calculates**

4. **Building Parameters**
   - Enter plot area (sq.m)
   - Enter built-up area (sq.m)
   - **FAR auto-calculates**
   - Number of floors, basement, height
   - Road width
   - **Setbacks** (front, rear, side1, side2)
   - Enter parking provided

5. **Geotechnical Investigation** ⭐ NEW
   - Select **Soil Type**:
     - Lateritic (Kerala typical)
     - Alluvial (river areas)
     - Clay (soft)
     - Sandy
     - Rocky
     - Marshy
   - Enter **CBR values** (%):
     - Subgrade CBR
     - Sub-base CBR
     - Base CBR
   - **Safe Bearing Capacity** (kN/m²):
     - Auto-filled based on soil type
     - Override if you have test data
   - **SPT N-values**:
     - At foundation level
     - Depth-wise values
   - **Atterberg Limits**:
     - Liquid Limit (LL) %
     - Plastic Limit (PL) %
     - **Plasticity Index auto-calculated: PI = LL - PL**
   - **Groundwater Level** (m below GL)
   - **Foundation Recommendation**:
     - Isolated (IS 456)
     - Raft (IS 2950)
     - Pile (IS 2911)

6. **Advanced Settings** (Optional)
   - Expand "Show Advanced Settings"
   - Set **Total Budget** (₹ Lakhs)
   - Set **Max Material Cost** (₹/sqm)
   - Set **Target Carbon** (kg CO₂/sqm)
   - Set **Min Recycled Content** (%)

7. **Complete Setup**
   - Review configuration
   - Click "Start Material Optimization"

---

## 💬 Using the AI Assistant

### The AI Now Knows:
- ✅ Your complete geotechnical profile (SBC, CBR, soil type)
- ✅ Building classification (IS 875 occupancy)
- ✅ All building parameters (FAR, setbacks, parking)
- ✅ Material selections
- ✅ Kerala climate data
- ✅ Analysis results

### Ask Technical Questions Like:

**Geotechnical:**
- "What foundation type for SBC of 150 kN/m² and GWL at 2m?"
- "Calculate pavement thickness with subgrade CBR of 8%"
- "Is raft foundation needed for my soil conditions?"
- "What is the pile capacity for lateritic soil with N=30?"

**Structural:**
- "What concrete grade for chloride exposure in Kerala?"
- "Recommend steel grade for seismic Zone III"
- "Calculate seismic load for my building height"
- "Ductile detailing requirements per IS 13920"

**Compliance:**
- "Is my project KMBR compliant for setbacks?"
- "Do I need solar water heater for 500 sqm built-up?"
- "Rainwater harvesting tank capacity calculation"
- "Parking requirement for group housing"

**Materials:**
- "Best cement type for high humidity (80%)?"
- "AAC blocks vs clay bricks for my climate?"
- "Concrete mix design for M30 with fly ash"
- "Recycled aggregate suitability for foundation?"

**Cost & Sustainability:**
- "Total carbon savings for my material selection?"
- "Cost comparison: PPC vs OPC cement"
- "GRIHA certification eligibility?"
- "ROI for solar water heater installation"

---

## 📊 Quick Summary View (QSV)

On the **Dashboard**, you'll see a green gradient card showing:

- **Carbon Reduction %** - Compared to conventional materials
- **Cost Savings (₹ Lakhs)** - Total project savings
- **KMBR Compliance %** - Building rules compliance score

Click **"View Full Report"** to see STAAD.Pro-style detailed output.

---

## 📄 Generating Reports

### STAAD.Pro-Style Reports:

1. Go to **"Reports & Export"** in sidebar
2. View professional engineering report with:
   - Title block (Project info, engineer, date)
   - Section 1: Project Parameters
   - Section 2: Material Specifications
   - Section 3: Analysis Results
   - Section 4: Compliance Check
3. Click **"Export CSV"** - STAAD-compatible format
4. Click **"Export PDF"** - Print to PDF
5. Click **"Print"** - Optimized for engineering prints

---

## 🏗️ Civil Engineering Features

### IS Code References Throughout:
- **IS 875** - Design Loads (occupancy classification)
- **IS 456** - Plain & Reinforced Concrete
- **IS 1786** - High Strength Steel Bars
- **IS 10262** - Concrete Mix Proportioning
- **IS 2911** - Pile Foundations
- **IS 2950** - Raft Foundations
- **IS 1498** - Soil Classification
- **IS 6403** - Bearing Capacity
- **IS 2720** - Soil Testing Methods
- **IS 1893** - Seismic Design
- **IS 13920** - Ductile Detailing
- **KMBR 2019** - Kerala Building Rules

### Automatic Calculations:
- FAR (Floor Area Ratio)
- Parking requirement (KMBR Table 8.1)
- Plasticity Index (PI = LL - PL)
- Bearing capacity suggestions
- Pavement thickness (IRC:37)
- Seismic parameters (Zone factor)

### Professional Input Forms:
- Technical terminology
- Units in civil engineering standards
- IS code references
- Validation and error messages

---

## 🔧 Troubleshooting

### "npm install" fails:
```bash
rm -rf node_modules package-lock.json
npm install
```

### AI assistant not responding:
- Check internet connection
- Without API key, uses fallback (may be slower)
- Add Gemini API key to `.env` file

### Map not loading:
- Check internet connection
- OpenStreetMap requires connectivity
- Try refreshing the page

### Tutorial keeps showing:
- Click "Settings" (gear icon in header)
- Click "Reset" next to "Show Tutorials"
- Or complete the tutorial fully

---

## 📚 Sample Project Workflow

### Example: 3-Storey Apartment Building in Thrissur

**Step 1:** Name = "Green Valley Apartments"
**Step 2:** Location = Thrissur (click on map)
**Step 3:** Classification = A-2 (Residential Apartment)
**Step 4:** 
- Plot: 500 sq.m
- Built-up: 1200 sq.m
- FAR: 2.4 (auto)
- Floors: 3 + 1 basement
- Height: 12m
- Road: 7m
- Setbacks: Front 4m, Rear 3m, Side 2m each
- Parking Required: 12 (auto-calc)
- Parking Provided: 15

**Step 5 (Geotechnical):**
- Soil: Lateritic
- CBR Subgrade: 12%
- SBC: 200 kN/m² (auto)
- GWL: 4.5m
- SPT N: 25 at 3m depth
- LL: 45%, PL: 25% → PI: 20% (auto)
- Foundation: Isolated Footing (recommended)

**Step 6 (Overrides):**
- Budget: ₹150 Lakhs
- Target Carbon: 200 kg/m²

**Run Analysis → Ask AI → Export Report**

---

## ✅ Verification Checklist

Before starting your project, verify:

- [ ] Project name entered
- [ ] Location selected on map
- [ ] IS 875 occupancy group selected
- [ ] Sub-type chosen (parking auto-calculated)
- [ ] Plot & built-up areas entered
- [ ] FAR calculated correctly
- [ ] Setbacks entered per KMBR
- [ ] Parking provided >= Parking required
- [ ] Geotechnical data entered (soil, CBR, SBC)
- [ ] Foundation type recommended
- [ ] AI assistant recognizes your project
- [ ] Can ask technical questions about geotechnical data

---

## 🎓 Tips for Civil Engineers

1. **Always enter geotechnical data first** - It affects foundation recommendations
2. **Check auto-calculated values** - FAR, parking, PI are calculated automatically
3. **Use AI for code references** - Ask "What does IS 456 say about..."
4. **Export CSV for Excel** - STAAD-compatible format for further analysis
5. **Override when needed** - Manual controls let you set specific targets
6. **Review compliance** - KMBR checks ensure Kerala building rules compliance

---

## 📞 Support

For issues or questions:
- Check browser console (F12) for errors
- Verify all fields are filled correctly
- Ensure backend server is running (python main.py)
- Check internet connection for map and AI features

---

**Ready to start? Run `npm start` and click "New Project"!** 🚀

**The system is now fully IS code compliant and civil engineering focused!**
# EcoBuild System - Complete Project Structure

## System Overview
EcoBuild is a Lifecycle Decision Support System for sustainable construction, developed for GEC Thrissur.

### Key Features
- **Three-Tier Architecture**: BIM Parser, Geospatial Engine, Supplier API
- **Multi-Criteria Optimization**: AHP Engine with 3 modes (Sustainability, Luxury, Balanced)
- **Engineering Modules**: Eco-Mix Designer, Building Code Compliance, Operational Carbon Predictor
- **140+ Thrissur Suppliers**: Integrated supplier network with logistics carbon calculation
- **Professional UI**: Slate & Emerald theme with Three.js 3D viewer
- **Smart Reports**: BoQ, Sustainability Certificate, Compliance Audit, Supplier Maps

## Backend Architecture

### Core Modules
1. **ahp_engine.py** - Analytical Hierarchy Process optimization
2. **environmental_engine.py** - Environmental data
3. **bim_parser.py** - IFC/JSON BIM file parser
4. **eco_mix_designer.py** - Concrete mix design per IS 10262:2019
5. **building_rules.py** - Building code compliance checker
6. **main.py** - FastAPI REST API server

### API Endpoints
- `POST /api/optimize` - Material optimization
- `POST /api/environmental-data` - Kerala climate/geotechnical data
- `POST /api/mix-design` - Concrete mix design
- `POST /api/compliance-check` - Building code compliance
- `POST /api/operational-carbon` - HVAC carbon prediction
- `POST /api/bim/parse` - BIM file parsing
- `GET /api/suppliers` - Supplier network

## Frontend Architecture

### Tech Stack
- React 18 with hooks
- React Router for navigation
- Tailwind CSS for styling
- Recharts for data visualization
- Three.js + React Three Fiber for 3D viewer
- Leaflet for maps

### Components
- **Sidebar** - Navigation menu
- **Header** - Mode selector and actions
- **LLMSidebar** - Gemini AI assistant interface

### Pages
- **Dashboard** - Project overview and metrics
- **MaterialOptimizer** - AHP material selection
- **MixDesigner** - Eco-concrete design
- **ComplianceChecker** - Building code validation
- **BIMIntegration** - 3D model viewer
- **Reports** - Smart report generation

## Installation & Setup

### Backend
```bash
cd backend
pip install fastapi uvicorn numpy pandas scipy
python main.py
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## Usage

1. **Select Optimization Mode**: Sustainability (70% eco), Luxury (70% property), or Balanced (50/50)
2. **Configure Site**: Enter coordinates (default: Thrissur, Kerala)
3. **Run Analysis**: Use any module - Optimizer, Mix Designer, Compliance Checker
4. **View Results**: Interactive dashboards with 3D visualization
5. **Generate Reports**: Export professional PDF/Excel reports

## Data Sources
- Supplier database
- Environmental zones
- IS Code compliance database
- Material properties library (10+ categories)

## Team
GEC Thrissur | A-Grade Project | Sustainable Construction Research
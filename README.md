# EcoBuild
## Lifecycle Decision Support System for Sustainable Construction

### Quick Start

```bash
# Backend
cd ecobuild-system/backend
pip install -r requirements.txt
python main.py

# Frontend
cd ecobuild-system/frontend
npm install
npm start
```

### Features

- **Structural Design**: IS 456:2000 compliant (Slab, Beam, Column, Foundation)
- **Load Calculations**: IS 875 (Dead, Live, Wind, Seismic)
- **Material Optimization**: AHP-based with transportation costs
- **Bill of Quantities**: Material-specific GST rates
- **Sustainability**: GRIHA/IGBC/LEED assessment
- **BIM Integration**: IFC file parsing

### Material Categories (8 Categories)

| Category | Materials | GST |
|----------|-----------|-----|
| Concrete | M15, M20, M25, M30, RMC | 18% |
| Cement | OPC 43, OPC 53, PPC, PSC | 28% |
| Steel | Fe 415, Fe 500, Fe 550 | 18% |
| Blocks/Bricks | AAC, Solid, Hollow, Clay, Fly Ash | 5% |
| Aggregates | M-Sand, River Sand, 10/20/40mm | 5% |
| Masonry | CM 1:4, CM 1:6, Thin Bed Mortar | 18% |
| Flooring | Terrazzo, Ceramic, Vitrified, Marble, Granite | 18% |
| Timber | Teak, Rosewood, Sal, Mango, Plywood | 18% |

### Documentation

See `ECOBUILD_DOCUMENTATION.md` for complete technical documentation.

### IS Codes Referenced

- IS 456:2000 - Plain and Reinforced Concrete
- IS 875 (Parts 1-5) - Design Loads
- IS 1893:2016 - Earthquake Resistant Design
- IS 10262:2019 - Concrete Mix Proportioning
- IS 1786:2008 - Steel Bars
- IS 13920:2016 - Ductile Detailing

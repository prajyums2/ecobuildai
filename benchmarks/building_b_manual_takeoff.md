# BENCHMARK: Building B - Manual Takeoff Report
## Office Building | 250 sq.m per floor | G+2 | Thrissur

---

## PROJECT SPECIFICATIONS
- Plot Area: 800 sq.m
- Built-up Area: 250 sq.m per floor × 3 floors = 750 sq.m total
- Building: 25m × 10m
- Floor Height: 3.5 m
- Wall Thickness: 230mm (9 inches)
- Concrete Grade: M25
- Steel Grade: Fe500

---

## 1. CONCRETE WORK (RCC)

### 1.1 Foundation
```
Combined Footing: 25m × 1.5m × 0.6m = 22.5 cum
Plinth Beam: 70m × 0.3m × 0.5m = 10.5 cum
Foundation Concrete: 33.00 cum
```

### 1.2 Columns
```
Column Size: 300mm × 400mm
Column Height: 3.5m × 3 floors = 10.5m
Number of Columns: 12
Column Volume: 12 × (0.30 × 0.40 × 10.5) = 15.12 cum
```

### 1.3 Beams
```
Beam Size: 300mm × 500mm
Main Beams: 4 × 25m × 0.30 × 0.50 = 15.0 cum
Cross Beams: 6 × 10m × 0.30 × 0.50 = 9.0 cum
Total Beam Volume: 24.0 cum
```

### 1.4 Slab
```
Slab Thickness: 150mm
Slab Area: 250 sqm × 3 floors = 750 sqm
Slab Volume: 750 × 0.150 = 112.5 cum
```

### 1.5 Lintels & Sunshades
```
Lintels: 32 × 1.5m × 0.23 × 0.15 = 1.66 cum
Sunshades: 10 × 1.0m × 0.15 × 0.6 = 0.9 cum
```

### 1.6 TOTAL CONCRETE
```
Foundation: 33.00 cum
Columns: 15.12 cum
Beams: 24.00 cum
Slab: 112.50 cum
Lintels: 1.66 cum
Sunshades: 0.90 cum
─────────────────────────
TOTAL: 187.18 cum
```

---

## 2. STEEL REINFORCEMENT

### Steel Calculation
```
Foundation Steel: 33.00 × 80 = 2,640 kg
Column Steel: 15.12 × 150 = 2,268 kg
Beam Steel: 24.00 × 120 = 2,880 kg
Slab Steel: 112.50 × 80 = 9,000 kg
Lintel Steel: 1.66 × 70 = 116 kg
Sunshade Steel: 0.90 × 60 = 54 kg
─────────────────────────────────────
TOTAL STEEL: 16,958 kg
```

---

## 3. MASONRY

### 3.1 External Walls
```
Perimeter: 70m (25m + 10m + 25m + 10m)
Wall Height: 3.5m × 3 floors = 10.5m
Wall Area: 70 × 10.5 = 735 sqm
```

### 3.2 Internal Walls
```
Internal Wall Length: 40m
Wall Area: 40 × 10.5 = 420 sqm
```

### 3.3 Opening Deduction
```
Main Doors: 2 × 1.5m × 2.4m = 7.2 sqm
Internal Doors: 10 × 0.9m × 2.1m = 18.9 sqm
Windows: 20 × 1.5m × 1.5m = 45.0 sqm
Total Openings: 71.1 sqm
```

### 3.4 Net Masonry Area
```
Gross Wall Area: 735 + 420 = 1155 sqm
Less Openings: 71.1 sqm
Net Masonry Area: 1083.9 sqm
```

### 3.5 Block Quantity
```
Blocks per sqm: 8.33 nos
Total Blocks: 1083.9 × 8.33 = 9,028 nos
Add 5% wastage: 9,028 × 1.05 = 9,479 nos
```

---

## 4. PLASTERING

### 4.1 Internal Plaster
```
Internal Wall Area: 420 sqm × 2 = 840 sqm
Ceiling Area: 250 × 3 = 750 sqm
Total Internal: 1590 sqm
Less Openings (internal): 18.9 sqm
Net Internal Plaster: 1571.1 sqm
```

### 4.2 External Plaster
```
External Wall Area: 735 sqm
Less Openings: 52.2 sqm (doors + windows)
Net External Plaster: 682.8 sqm
```

### 4.3 Total Plaster Area
```
Internal: 1571.1 sqm
External: 682.8 sqm
Total: 2253.9 sqm
```

---

## 5. MATERIAL COST CALCULATION

### 5.1 Concrete
```
Total Concrete: 187.18 cum
Cost: 187.18 × 6500 = Rs 12,16,670
```

### 5.2 Cement
```
Concrete Cement: 187.18 × 7.5 = 1,404 bags
Mortar Cement: 180 bags
Total Cement: 1,584 bags
Cost: 1,584 × 370 = Rs 5,86,080
```

### 5.3 Steel
```
Total Steel: 16,958 kg
Cost: 16,958 × 72 = Rs 12,20,976
```

### 5.4 Masonry
```
AAC Blocks: 9,479 nos
Cost: 9,479 × 78 = Rs 7,39,362
Sand (for mortar): 850 cft
Cost: 850 × 58 = Rs 49,300
```

### 5.5 Aggregates
```
Aggregate: 187.18 × 0.9 × 35.31 = 5,937 cft
Cost: 5,937 × 42 = Rs 2,49,354
```

### 5.6 TOTAL MATERIAL COST
```
Concrete:        Rs 12,16,670
Cement:          Rs 5,86,080
Steel:           Rs 12,20,976
Blocks:          Rs 7,39,362
Sand:            Rs 49,300
Aggregate:       Rs 2,49,354
Flooring:        Rs 15,00,000 (7500 sqft × Rs 200)
Painting:        Rs 3,00,000
Doors/Windows:   Rs 4,00,000
─────────────────────────────
SUBTOTAL:        Rs 62,61,742
GST @ 18%:       Rs 11,27,114
─────────────────────────────
GRAND TOTAL:     Rs 73,88,856
```

---

## APP INPUT VALUES

```json
{
  "name": "Building B - Office",
  "buildingParams": {
    "plotArea": 800,
    "builtUpArea": 250,
    "numFloors": 3,
    "height": 10.5,
    "roadWidth": 8,
    "sustainabilityPriority": "high"
  }
}
```

---

## EXPECTED vs APP OUTPUT

| Item | Manual | Expected App | Tolerance |
|------|--------|--------------|-----------|
| Total Concrete | 187.18 cum | ~170-200 cum | ±10% |
| Total Steel | 16,958 kg | ~15,000-18,000 kg | ±10% |
| Total Blocks | 9,479 nos | ~8,500-10,500 nos | ±10% |
| Total Cost | Rs 73.89L | Rs 65-80L | ±10% |

---

*Calculation based on: IS 456:2000, IS 10262:2019, Kerala market rates 2026*

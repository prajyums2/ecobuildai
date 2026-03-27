# BENCHMARK: Building C - Manual Takeoff Report
## Apartment Building | 350 sq.m per floor | G+4 | Thrissur

---

## PROJECT SPECIFICATIONS
- Plot Area: 2000 sq.m
- Built-up Area: 350 sq.m per floor × 5 floors = 1750 sq.m total
- Building: 25m × 14m
- Floor Height: 3.0 m
- Wall Thickness: 230mm (9 inches)
- Concrete Grade: M30
- Steel Grade: Fe500

---

## 1. CONCRETE WORK (RCC)

### 1.1 Foundation (Raft)
```
Raft Size: 28m × 17m × 0.6m = 285.6 cum
Foundation Concrete: 285.6 cum
```

### 1.2 Columns
```
Column Size: 400mm × 400mm
Column Height: 3.0m × 5 floors = 15.0m
Number of Columns: 20
Column Volume: 20 × (0.40 × 0.40 × 15.0) = 48.0 cum
```

### 1.3 Beams
```
Beam Size: 350mm × 550mm
Main Beams: 6 × 25m × 0.35 × 0.55 = 28.88 cum
Cross Beams: 8 × 14m × 0.35 × 0.55 = 21.56 cum
Total Beam Volume: 50.44 cum
```

### 1.4 Slab
```
Slab Thickness: 150mm
Slab Area: 350 sqm × 5 floors = 1750 sqm
Slab Volume: 1750 × 0.150 = 262.5 cum
```

### 1.5 Lintels & Other
```
Lintels: 72 × 1.5m × 0.23 × 0.15 = 3.73 cum
Staircase: 2 × 3.0m × 1.2m × 0.15 = 1.08 cum
Parapet: 78 × 0.3 × 0.115 = 2.69 cum
```

### 1.6 TOTAL CONCRETE
```
Foundation: 285.60 cum
Columns: 48.00 cum
Beams: 50.44 cum
Slab: 262.50 cum
Lintels: 3.73 cum
Staircase: 1.08 cum
Parapet: 2.69 cum
─────────────────────────
TOTAL: 654.04 cum
```

---

## 2. STEEL REINFORCEMENT

### Steel Calculation
```
Foundation Steel: 285.60 × 100 = 28,560 kg
Column Steel: 48.00 × 150 = 7,200 kg
Beam Steel: 50.44 × 120 = 6,053 kg
Slab Steel: 262.50 × 80 = 21,000 kg
Lintel Steel: 3.73 × 70 = 261 kg
Staircase Steel: 1.08 × 90 = 97 kg
Parapet Steel: 2.69 × 50 = 135 kg
─────────────────────────────────────
TOTAL STEEL: 63,306 kg
```

---

## 3. MASONRY

### 3.1 External Walls
```
Perimeter: 78m
Wall Height: 3.0m × 5 floors = 15.0m
Wall Area: 78 × 15.0 = 1170 sqm
```

### 3.2 Internal Walls
```
Internal Wall Length: 80m
Wall Area: 80 × 15.0 = 1200 sqm
```

### 3.3 Opening Deduction
```
Main Doors: 2 × 1.5m × 2.4m = 7.2 sqm
Internal Doors: 30 × 0.9m × 2.1m = 56.7 sqm
Windows: 40 × 1.5m × 1.5m = 90.0 sqm
Total Openings: 153.9 sqm
```

### 3.4 Net Masonry Area
```
Gross Wall Area: 1170 + 1200 = 2370 sqm
Less Openings: 153.9 sqm
Net Masonry Area: 2216.1 sqm
```

### 3.5 Block Quantity
```
Total Blocks: 2216.1 × 8.33 = 18,460 nos
Add 5% wastage: 18,460 × 1.05 = 19,383 nos
```

---

## 4. MATERIAL COST CALCULATION

### 4.1 Total Costs
```
Concrete:        Rs 42,51,260  (654.04 × 6500)
Cement:          Rs 24,22,000  (6540 bags × 370)
Steel:           Rs 45,58,032  (63,306 × 72)
Blocks:          Rs 15,11,874  (19,383 × 78)
Sand:            Rs 2,50,000
Aggregate:       Rs 10,00,000
Flooring:        Rs 28,00,000  (18750 sqft × 150)
Painting:        Rs 8,00,000
Doors/Windows:   Rs 12,00,000
─────────────────────────────
SUBTOTAL:        Rs 1,87,93,166
GST @ 18%:       Rs 33,82,770
─────────────────────────────
GRAND TOTAL:     Rs 2,21,75,936
```

---

## APP INPUT VALUES

```json
{
  "name": "Building C - Apartment",
  "buildingParams": {
    "plotArea": 2000,
    "builtUpArea": 350,
    "numFloors": 5,
    "height": 15.0,
    "roadWidth": 10
  }
}
```

---

## EXPECTED vs APP OUTPUT

| Item | Manual | Expected App | Tolerance |
|------|--------|--------------|-----------|
| Total Concrete | 654.04 cum | ~590-720 cum | ±10% |
| Total Steel | 63,306 kg | ~57,000-70,000 kg | ±10% |
| Total Blocks | 19,383 nos | ~17,500-21,000 nos | ±10% |
| Total Cost | Rs 221.76L | Rs 200-240L | ±10% |

---

*Calculation based on: IS 456:2000, IS 10262:2019, Kerala market rates 2026*

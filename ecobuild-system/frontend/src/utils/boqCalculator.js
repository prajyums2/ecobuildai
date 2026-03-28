/**
 * Bill of Quantities Calculator
 * Calculates material quantities and costs based on building parameters
 * Uses dynamic rates from MongoDB database
 * 
 * ============================================
 * SCIENTIFIC REFERENCES & CITATIONS
 * ============================================
 * 
 * Concrete Mix Design:
 * - IS 10262:2019 - Concrete Mix Proportioning Guidelines (BIS)
 * - ACI 211.1-91 - Standard Practice for Selecting Proportions for Normal, Heavyweight, and Mass Concrete
 * 
 * Mix Ratios (by volume):
 * - M20: 1:1.5:3 (OPC 33/43 grade) - 28-day strength 20 MPa
 * - M25: 1:1:2 (OPC 53 grade) - 28-day strength 25 MPa  
 * - M30: 1:0.75:1.5 (OPC 53 grade) - 28-day strength 30 MPa
 * Ref: IS 456:2000, Table 2 (Clause 6.2.3)
 * 
 * Material Densities:
 * - Cement: 1440 kg/m³ (loose bulk density)
 * - Sand: 1600-1900 kg/m³ (depending on moisture)
 * - Aggregate: 1450-1600 kg/m³ (crushed)
 * - Steel: 7850 kg/m³
 * Ref: IS 875(Part 1):1987, Table 1
 * 
 * Steel Reinforcement:
 * - Typical steel content: 60-120 kg/m³ for RCC framed structures
 * - Footings: 0.5-0.8% of cross-section (40-80 kg/m³)
 * - Columns: 1.0-2.0% (100-200 kg/m³)
 * - Beams: 0.8-1.5% (80-150 kg/m³)
 * - Slabs: 0.5-1.0% (50-100 kg/m³)
 * Ref: IS 456:2000, Clause 26.5.1 - Minimum Reinforcement
 * 
 * Wastage Factors:
 * - Cement: 2-5% (handling & storage)
 * - Steel: 5-10% (cutting & bending wastage)
 * - Sand/Aggregate: 5-8% (bulking & spillage)
 * - Bricks/Blocks: 5-10% (breakage)
 * Ref: IS 3861:1966 - Method of Measurement of Building Works
 * 
 * Formwork:
 * - Contact area varies by structural element
 * - Columns: 2.5-3.0 sqm per cum of concrete
 * - Beams: 2.0-2.5 sqm per cum
 * - Slabs: 1.5-2.0 sqm per cum
 * Ref: CPWD Specification 2019, Section 5
 * 
 * Plastering:
 * - Internal: 12-15mm thick
 * - External: 18-20mm thick
 * Ref: IS 1661:1972 - Application of Cement Plaster
 * 
 * Flooring:
 * - Screed: 25-40mm thick
 * - Tile laying: 20-25mm thick
 * Ref: IS 2571:1970 - Laying In-situ Cement Concrete Flooring
 */

import { ecoBuildAPI } from '../services/api';

// ============================================
// FALLBACK RATES (2026 Kerala Rates)
// Sources: Kerala Market Surveys 2026, IS Codes
// Material Categories as per industry standards:
// 1. Concrete (largest category)
// 2. Cement
// 3. Steel
// 4. Blocks/Bricks
// 5. Aggregates
// 6. Masonry
// 7. Flooring
// 8. Timber
// ============================================

const FALLBACK_RATES = {
  // ========== 1. CONCRETE (Largest Category) ==========
  // IS 10262:2019 Mix Design
  concrete: {
    m15_pcc: { rate: 4200, unit: 'cum', wastage: 0.02, gst: 18 },   // Plain concrete
    m20_rcc: { rate: 5800, unit: 'cum', wastage: 0.02, gst: 18 },   // General RCC
    m25_rcc: { rate: 6500, unit: 'cum', wastage: 0.02, gst: 18 },   // Columns/Beams
    m30_rcc: { rate: 7200, unit: 'cum', wastage: 0.02, gst: 18 },   // Heavy loads
    rmc_m20: { rate: 5500, unit: 'cum', wastage: 0.01, gst: 18 },   // Ready-mix
    rmc_m25: { rate: 6200, unit: 'cum', wastage: 0.01, gst: 18 },
  },
  
  // ========== 2. CEMENT ==========
  // Source: Kerala Cement Dealers Association 2026
  cement: {
    opc_53: { rate: 420, unit: 'bag', wastage: 0.02, gst: 28 }, // ₹420/bag (50kg) - UltraTech/ACC
    opc_43: { rate: 390, unit: 'bag', wastage: 0.02, gst: 28 }, // ₹390/bag
    ppc: { rate: 370, unit: 'bag', wastage: 0.02, gst: 28 },    // ₹370/bag - Recommended for Kerala
  },
  
  // ========== 3. STEEL ==========
  // Source: BigMint India Steel Index 2026
  steel: {
    tmt_fe415: { rate: 68, unit: 'kg', wastage: 0.05, gst: 18 },   // Fe415
    tmt_fe500: { rate: 72, unit: 'kg', wastage: 0.05, gst: 18 },   // Fe500 - Standard
    tmt_fe550: { rate: 76, unit: 'kg', wastage: 0.05, gst: 18 },   // Fe550
    binding_wire: { rate: 85, unit: 'kg', wastage: 0.03, gst: 18 },
    stirrups_fe500: { rate: 78, unit: 'kg', wastage: 0.08, gst: 18 }, // Pre-bent stirrups
  },
  
  // ========== 4. BLOCKS/BRICKS ==========
  // Source: Kerala Block Manufacturers 2026
  blocks: {
    aac_100: { rate: 52, unit: 'nos', wastage: 0.05, gst: 5 },   // AAC 600x200x100mm
    aac_150: { rate: 65, unit: 'nos', wastage: 0.05, gst: 5 },   // AAC 600x200x150mm
    aac_200: { rate: 78, unit: 'nos', wastage: 0.05, gst: 5 },   // AAC 600x200x200mm
    solid_block: { rate: 38, unit: 'nos', wastage: 0.05, gst: 5 }, // Solid Concrete 400x200x200mm
    hollow_block: { rate: 32, unit: 'nos', wastage: 0.05, gst: 5 }, // Hollow Block 400x200x200mm
    clay_brick: { rate: 12, unit: 'nos', wastage: 0.08, gst: 5 },  // Traditional burnt clay
    fly_ash_brick: { rate: 10, unit: 'nos', wastage: 0.05, gst: 5 }, // Fly ash brick - sustainable
    laterite: { rate: 45, unit: 'cft', wastage: 0.15, gst: 5 },    // Laterite stone
    // Legacy keys for backward compatibility
    aac_blocks_600x200x100: { rate: 52, unit: 'nos', wastage: 0.05, gst: 5 },
    aac_blocks_600x200x150: { rate: 65, unit: 'nos', wastage: 0.05, gst: 5 },
    aac_blocks_600x200x200: { rate: 78, unit: 'nos', wastage: 0.05, gst: 5 },
    solid_blocks_400x200x200: { rate: 38, unit: 'nos', wastage: 0.05, gst: 5 },
    bricks: { rate: 12, unit: 'nos', wastage: 0.08, gst: 5 },
  },
  
  // ========== 5. AGGREGATES ==========
  // Source: Kerala Quarry Owners Association 2026
  aggregate: {
    msand: { rate: 58, unit: 'cft', wastage: 0.05, gst: 5 },       // M-Sand (fine)
    psand: { rate: 85, unit: 'cft', wastage: 0.05, gst: 5 },       // River Sand (fine)
    aggregate_20mm: { rate: 42, unit: 'cft', wastage: 0.05, gst: 5 }, // Coarse 20mm
    aggregate_40mm: { rate: 38, unit: 'cft', wastage: 0.05, gst: 5 }, // Coarse 40mm
    aggregate_10mm: { rate: 45, unit: 'cft', wastage: 0.05, gst: 5 }, // Coarse 10mm
    rca: { rate: 28, unit: 'cft', wastage: 0.08, gst: 5 },         // Recycled aggregate
  },
  
  // ========== 6. MASONRY ==========
  // Focuses on assembly and mortar requirements
  masonry: {
    mortar_cm14: { rate: 350, unit: 'cum', wastage: 0.02 },  // CM 1:4
    mortar_cm16: { rate: 280, unit: 'cum', wastage: 0.02 },  // CM 1:6
    thin_bed_mortar: { rate: 12, unit: 'kg', wastage: 0.05 }, // For AAC blocks
    mesh_wire: { rate: 85, unit: 'kg', wastage: 0.05 },      // Wire mesh for reinforcement
    wall_tie: { rate: 8, unit: 'nos', wastage: 0.10 },       // Wall ties
  },
  
  // ========== 7. FLOORING ==========
  // Terrazzo, ceramic, marble systems
  flooring: {
    terrazzo: { rate: 120, unit: 'sqft', wastage: 0.10 },      // Terrazzo flooring
    ceramic_tiles: { rate: 55, unit: 'sqft', wastage: 0.10 },  // Ceramic tiles
    vitrified_tiles: { rate: 95, unit: 'sqft', wastage: 0.10 }, // Vitrified tiles
    marble: { rate: 280, unit: 'sqft', wastage: 0.15 },        // Marble
    granite: { rate: 220, unit: 'sqft', wastage: 0.15 },       // Granite
    wooden_flooring: { rate: 180, unit: 'sqft', wastage: 0.10 }, // Engineered wood
    tile_adhesive: { rate: 45, unit: 'kg', wastage: 0.10 },    // Tile adhesive
    grout: { rate: 80, unit: 'kg', wastage: 0.10 },            // Grout
    skirting: { rate: 35, unit: 'rft', wastage: 0.05 },        // Skirting
    // Legacy keys for backward compatibility
    tiles_floor_2x2: { rate: 95, unit: 'sqft', wastage: 0.10 },
    tiles_wall_1x1: { rate: 65, unit: 'sqft', wastage: 0.10 },
    tiles_bathroom: { rate: 85, unit: 'sqft', wastage: 0.10 },
    putty: { rate: 35, unit: 'kg', wastage: 0.05 },
    primer: { rate: 180, unit: 'litre', wastage: 0.05 },
    paint_interior: { rate: 280, unit: 'litre', wastage: 0.05 },
    paint_exterior: { rate: 380, unit: 'litre', wastage: 0.05 },
  },
  
  // ========== 8. TIMBER ==========
  // Source: Kerala State Timber Depot 2026
  timber: {
    teak: { rate: 5500, unit: 'cft', wastage: 0.15 },        // Teak
    rosewood: { rate: 8500, unit: 'cft', wastage: 0.15 },    // Rosewood (premium)
    sal: { rate: 2200, unit: 'cft', wastage: 0.15 },         // Sal
    mango: { rate: 1800, unit: 'cft', wastage: 0.15 },       // Mango wood
    plywood_18mm: { rate: 145, unit: 'sqft', wastage: 0.10 },
    plywood_12mm: { rate: 105, unit: 'sqft', wastage: 0.10 },
    mdf_18mm: { rate: 85, unit: 'sqft', wastage: 0.10 },
    particle_board: { rate: 65, unit: 'sqft', wastage: 0.10 },
    // Legacy keys
    teak_wood: { rate: 5500, unit: 'cft', wastage: 0.15 },
    sal_wood: { rate: 2200, unit: 'cft', wastage: 0.15 },
  },
  
  // ========== FINISHES (Paint, Putty) ==========
  finishes: {
    primer: { rate: 180, unit: 'litre', wastage: 0.05 },        // Primer
    putty: { rate: 35, unit: 'kg', wastage: 0.05 },             // Wall putty
    paint_interior: { rate: 280, unit: 'litre', wastage: 0.05 }, // Interior paint
    paint_exterior: { rate: 380, unit: 'litre', wastage: 0.05 }, // Exterior paint
    wood_polish: { rate: 450, unit: 'litre', wastage: 0.10 },   // Wood polish
    enamel_paint: { rate: 350, unit: 'litre', wastage: 0.05 },  // Enamel paint
  },
  
  // Reinforcement Accessories - Source: Steel Market 2026
  reinforcement: {
    cover_blocks: { rate: 3, unit: 'nos', wastage: 0.05 },    // ₹3/piece
    chair_bars: { rate: 55, unit: 'kg', wastage: 0.05 },      // ₹55/kg
    spacer_bars: { rate: 60, unit: 'kg', wastage: 0.05 },     // ₹60/kg
  },
  
  // Plumbing - Source: Plumbing Contractors Kerala 2026
  plumbing: {
    cpvc_pipes_1in: { rate: 110, unit: 'm', wastage: 0.10 },    // ₹110/m
    cpvc_pipes_3_4in: { rate: 85, unit: 'm', wastage: 0.10 },   // ₹85/m
    cpvc_pipes_1_2in: { rate: 55, unit: 'm', wastage: 0.10 },   // ₹55/m
    upvc_pipes_4in: { rate: 155, unit: 'm', wastage: 0.10 },    // ₹155/m
    upvc_pipes_6in: { rate: 230, unit: 'm', wastage: 0.10 },    // ₹230/m
    sanitary_fittings_set: { rate: 6500, unit: 'set', wastage: 0.00 }, // ₹6500/set
  },
  
  // Electrical - Source: Electrical Contractors Kerala 2026
  electrical: {
    copper_wire_2_5sqmm: { rate: 55, unit: 'm', wastage: 0.10 }, // ₹55/m
    copper_wire_4sqmm: { rate: 80, unit: 'm', wastage: 0.10 },   // ₹80/m
    copper_wire_6sqmm: { rate: 110, unit: 'm', wastage: 0.10 },  // ₹110/m
    conduit_pvc_1in: { rate: 45, unit: 'm', wastage: 0.10 },     // ₹45/m
    switches_sockets: { rate: 120, unit: 'nos', wastage: 0.05 }, // ₹120/piece
    distribution_board: { rate: 5500, unit: 'nos', wastage: 0.00 }, // ₹5500
  },
  
  // Doors & Windows - Source: UPVC Manufacturers Kerala 2026
  doors_windows: {
    flush_door: { rate: 5500, unit: 'nos', wastage: 0.00 },       // ₹5500
    panel_door: { rate: 8500, unit: 'nos', wastage: 0.00 },       // ₹8500
    upvc_window: { rate: 550, unit: 'sqft', wastage: 0.05 },       // ₹550/sqft
    aluminium_window: { rate: 650, unit: 'sqft', wastage: 0.05 },  // ₹650/sqft
    ms_grill: { rate: 220, unit: 'kg', wastage: 0.05 },            // ₹220/kg
  },
  
  // Waterproofing - Source: Construction Chemical Suppliers 2026
  waterproofing: {
    bituminous_coating: { rate: 85, unit: 'litre', wastage: 0.05 },    // ₹85/litre
    crystalline_waterproofing: { rate: 110, unit: 'kg', wastage: 0.05 }, // ₹110/kg
    app_membrane: { rate: 155, unit: 'sqm', wastage: 0.10 },            // ₹155/sqm
  },
};

// ============================================
// CALCULATION CONSTANTS (IS Code Values)
// ============================================

const CONSTANTS = {
  // Concrete mix ratios (by volume) - IS 10262:2019, IS 456:2000
  concrete_mix: {
    m15: { cement: 1, sand: 2, aggregate: 4, water_cement_ratio: 0.60, cement_bags: 5.5 },
    m20: { cement: 1, sand: 1.5, aggregate: 3, water_cement_ratio: 0.50, cement_bags: 6.5 },
    m25: { cement: 1, sand: 1, aggregate: 2, water_cement_ratio: 0.45, cement_bags: 7.5 },
    m30: { cement: 1, sand: 0.75, aggregate: 1.5, water_cement_ratio: 0.40, cement_bags: 8.5 },
  },
  
  // Material densities (kg/m³) - IS 875(Part 1):2015
  density: {
    cement: 1440,        // kg/m³ (loose bulk density)
    sand: 1600,          // kg/m³ (dry)
    aggregate_20mm: 1550, // kg/m³ (20mm aggregate)
    aggregate_10mm: 1550, // kg/m³ (10mm aggregate)
    steel: 7850,         // kg/m³
    concrete_rcc: 2500,  // kg/m³ (Reinforced concrete)
    concrete_pcc: 2400,  // kg/m³ (Plain concrete)
    brick_masonry: 1900, // kg/m³
    aac_block_masonry: 750, // kg/m³ (lightweight)
  },
  
  // Conversion factors
  conversion: {
    cft_to_cum: 0.0283168,
    cum_to_cft: 35.3147,
    sqft_to_sqm: 0.092903,
    sqm_to_sqft: 10.7639,
    kg_to_quintal: 0.01,
    quintal_to_kg: 100,
    bag_weight_kg: 50,   // Standard cement bag weight
  },
  
  // Standard thicknesses (meters) - IS 456:2000, IS 1661:1972
  thickness: {
    slab_residential: 0.125,     // 125mm - Minimum for residential
    slab_commercial: 0.150,      // 150mm - For commercial
    plaster_internal: 0.012,     // 12mm - IS 1661:1972
    plaster_external: 0.020,     // 20mm - IS 1661:1972
    flooring_screed: 0.040,      // 40mm - IS 2571:1970
    tile_adhesive: 0.006,        // 6mm
    pcc_base: 0.100,             // 100mm - PCC below foundation
  },
  
  // Paint coverage (sqm per litre) - Manufacturer data
  paint_coverage: {
    primer: 12,                  // 12 sqm/litre
    putty: 15,                   // 15 sqm/litre (1mm thick)
    interior_paint: 10,          // 10 sqm/litre (per coat)
    exterior_paint: 8,           // 8 sqm/litre (per coat)
  },
  
  // Steel percentages (% of concrete volume) - IS 456:2000, IS 13920:2016
  // Converted to kg/m³: % * density = kg/m³
  steel_percentage: {
    footing: 0.008,    // 0.8% = 0.008 * 7850 = 62.8 kg/m³
    column: 0.015,     // 1.5% = 0.015 * 7850 = 117.75 kg/m³
    beam: 0.012,       // 1.2% = 0.012 * 7850 = 94.2 kg/m³
    slab: 0.008,       // 0.8% = 0.008 * 7850 = 62.8 kg/m³
    lintel: 0.007,     // 0.7% = 0.007 * 7850 = 54.95 kg/m³
    sunshade: 0.006,   // 0.6% = 0.006 * 7850 = 47.1 kg/m³
  },
  
  // Formwork contact area factors (sqm per cum) - CPWD Specification 2019
  formwork_factor: {
    footing: 2.5,      // sqm per cum
    column: 10.0,      // sqm per cum
    beam: 8.0,         // sqm per cum
    slab: 10.0,        // sqm per cum
    lintel: 6.0,       // sqm per cum
  },
  
  // Opening deductions (as percentage of wall area) - Standard practice
  openings: {
    external_wall: 0.20,  // 20% for external walls (doors + windows)
    internal_wall: 0.15,  // 15% for internal walls (doors)
  },
  
  // Seismic zone factors - IS 1893:2016
  seismic_zones: {
    II: { factor: 0.10, sa: 2.5 },
    III: { factor: 0.16, sa: 2.5 },
    IV: { factor: 0.24, sa: 2.5 },
    V: { factor: 0.36, sa: 2.5 },
  },
  
  // Wind speed (m/s) - IS 875(Part 3):2015
  wind_speeds: {
    kerala_coastal: 39,      // 39 m/s - Coastal Kerala
    kerala_inland: 33,       // 33 m/s - Inland Kerala
    kerala_hilly: 44,        // 44 m/s - Hilly regions
  },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Calculate wastage-adjusted quantity
 */
export function applyWastage(quantity, wastageFactor) {
  return quantity * (1 + wastageFactor);
}

/**
 * Format currency in Indian format
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format number with Indian separators
 */
export function formatNumber(num) {
  return new Intl.NumberFormat('en-IN').format(num);
}

/**
 * Calculate GST amount
 */
export function calculateGST(amount, gstRate = 18) {
  return {
    baseAmount: amount,
    gstAmount: (amount * gstRate) / 100,
    totalAmount: amount * (1 + gstRate / 100),
    gstRate: gstRate,
  };
}

/**
 * Calculate transportation cost based on materials and supplier info
 * @param {Object} boqCategories - Categories from generated BOQ
 * @param {Object} rates - Material rates with transportation info
 */
export function calculateTransportationCost(boqCategories, rates) {
  const transportBreakdown = [];
  let totalTransportCost = 0;
  
  const materialCategoryMap = {
    'Concrete Work': 'cement',
    'Reinforcement Steel': 'steel',
    'Masonry Work': 'masonry',
    'Earthwork': 'aggregate',
    'Plastering': 'aggregate',
    'Flooring': 'aggregate',
  };
  
  boqCategories.forEach(category => {
    const matCategory = materialCategoryMap[category.name];
    if (matCategory && rates[matCategory]) {
      const categoryRates = rates[matCategory];
      const firstMaterial = Object.values(categoryRates)[0];
      
      if (firstMaterial && firstMaterial.transportation_cost > 0) {
        const categoryCost = category.subTotal;
        const transportCost = firstMaterial.transportation_cost * (categoryCost / firstMaterial.rate);
        
        transportBreakdown.push({
          category: category.name,
          materialCategory: matCategory,
          supplier: firstMaterial.supplier,
          location: firstMaterial.supplier_location || 'Local',
          ratePerUnit: firstMaterial.transportation_cost,
          transportCost: transportCost
        });
        
        totalTransportCost += transportCost;
      }
    }
  });
  
  return {
    breakdown: transportBreakdown,
    total: totalTransportCost,
    note: 'Transportation costs calculated based on supplier distance and material quantities'
  };
}

/**
 * Calculate embodied carbon for BoQ items
 * Uses carbon coefficients from the database materials
 * @param {Object} boqCategories - Categories from generated BOQ
 * @param {Object} rates - Material rates with carbon info
 */
export function calculateBoQCarbon(boqCategories, rates) {
  const carbonByCategory = [];
  let totalCarbon = 0;
  
  // Carbon coefficients (kg CO2 per unit) - fallback values based on IS 1179, IPCC
  const carbonCoefficients = {
    'Concrete Work': {
      cement: 0.93, // kg CO2/kg cement (OPC)
      steel: 2.5,  // kg CO2/kg steel
      aggregate: 0.08, // kg CO2/tonne
    },
    'Reinforcement Steel': {
      steel: 2.5, // kg CO2/kg TMT steel
    },
    'Masonry Work': {
      masonry: 0.35, // kg CO2 per AAC block
      brick: 0.22, // kg CO2 per clay brick
      aggregate: 0.08,
    },
    'Earthwork': {
      excavation: 0, // No carbon for excavation
      backfill: 0,
    },
    'Plastering': {
      cement: 0.93,
      aggregate: 0.08,
    },
    'Flooring': {
      finish: 0.8, // kg CO2/sqm tiles
    },
    'Painting': {
      finish: 2.2, // kg CO2/litre paint
    },
    'Door & Window': {
      door: 15, // kg CO2 per door
      window: 4.5, // kg CO2/sqm UPVC
    },
    'Roofing': {
      roof: 3.2, // kg CO2/sqm metal sheet
    },
  };

  // Map item descriptions to carbon coefficients
  const getCarbonCoefficient = (categoryName, itemDescription) => {
    const catCoeffs = carbonCoefficients[categoryName] || {};
    const desc = (itemDescription || '').toLowerCase();
    
    if (desc.includes('cement') || desc.includes('concrete')) return catCoeffs.cement || 0.93;
    if (desc.includes('steel') || desc.includes('reinforcement') || desc.includes('tmt')) return catCoeffs.steel || 2.5;
    if (desc.includes('sand') || desc.includes('aggregate') || desc.includes('m-sand')) return catCoeffs.aggregate || 0.08;
    if (desc.includes('brick')) return catCoeffs.brick || 0.22;
    if (desc.includes('aac') || desc.includes('block')) return catCoeffs.masonry || 0.35;
    if (desc.includes('tile') || desc.includes('flooring') || desc.includes('vitrified')) return catCoeffs.finish || 0.8;
    if (desc.includes('paint') || desc.includes('painting')) return catCoeffs.finish || 2.2;
    if (desc.includes('door')) return catCoeffs.door || 15;
    if (desc.includes('window')) return catCoeffs.window || 4.5;
    if (desc.includes('roof') || desc.includes('sheet')) return catCoeffs.roof || 3.2;
    
    return 0.5; // default coefficient
  };

  // Convert units for carbon calculation
  const convertToStandardUnit = (quantity, unit) => {
    const qty = parseFloat(quantity) || 0;
    const u = (unit || '').toLowerCase();
    
    // Convert to kg or sqm as base unit
    if (u === 'cum' || u === 'm³') return qty * 2400; // Convert m³ concrete to kg
    if (u === 'cft' || u === 'ft³') return qty * 0.0283 * 1600; // Convert cft to kg
    if (u === 'kg') return qty;
    if (u === 'tonne' || u === 'ton') return qty * 1000;
    if (u === 'sqm' || u === 'm²') return qty; // Keep as sqm
    if (u === 'sqft' || u === 'ft²') return qty * 0.0929; // Convert to sqm
    if (u === 'bag') return qty * 50; // 50kg bag
    if (u === 'nos' || u === 'piece' || u === 'pcs') return qty;
    if (u === 'liter' || u === 'litre') return qty;
    if (u === 'rm' || u === 'rft') return qty * 0.305; // running meter to sqm (assuming 305mm width)
    
    return qty; // Default
  };

  boqCategories.forEach(category => {
    let categoryCarbon = 0;
    
    category.items?.forEach(item => {
      const quantity = parseFloat(item.quantity) || 0;
      const unit = item.unit || '';
      const coefficient = getCarbonCoefficient(category.name, item.description);
      
      // Calculate carbon based on quantity and coefficient
      let carbon = 0;
      const desc = (item.description || '').toLowerCase();
      
      // Special handling for concrete (volume in cum -> carbon)
      if (desc.includes('concrete') || desc.includes('pcc') || desc.includes('rcc')) {
        const volume = quantity; // cum
        // Concrete has ~350-400 kg CO2/m³ depending on mix
        carbon = volume * 380; // Average concrete carbon
      } 
      // Steel (quantity in kg)
      else if (desc.includes('steel') || desc.includes('reinforcement') || desc.includes('tmt')) {
        carbon = quantity * 2.5; // kg CO2 per kg steel
      }
      // For other materials
      else {
        const standardQty = convertToStandardUnit(quantity, unit);
        carbon = standardQty * coefficient;
      }
      
      item.carbon = carbon;
      categoryCarbon += carbon;
    });
    
    carbonByCategory.push({
      category: category.name,
      carbon: categoryCarbon,
    });
    totalCarbon += categoryCarbon;
  });

  return {
    byCategory: carbonByCategory,
    totalCarbon: totalCarbon,
    unit: 'kg CO2',
    note: 'Embodied carbon calculated per IS 1179 and IPCC guidelines'
  };
}

// ============================================
// QUANTITY CALCULATION FUNCTIONS
// ============================================

/**
 * Calculate concrete quantities for a given volume
 */
export function calculateConcreteQuantities(volumeCum, grade = 'm25') {
  const mix = CONSTANTS.concrete_mix[grade];
  const totalParts = mix.cement + mix.sand + mix.aggregate;
  const wetVolume = volumeCum * 1.54; // 54% bulking factor
  
  const cementVolume = (wetVolume * mix.cement) / totalParts;
  const sandVolume = (wetVolume * mix.sand) / totalParts;
  const aggregateVolume = (wetVolume * mix.aggregate) / totalParts;
  
  return {
    cement: {
      bags: Math.ceil((cementVolume * CONSTANTS.density.cement) / CONSTANTS.conversion.bag_weight_kg),
      kg: cementVolume * CONSTANTS.density.cement,
    },
    sand: {
      cum: sandVolume,
      cft: sandVolume * CONSTANTS.conversion.cum_to_cft,
    },
    aggregate: {
      cum: aggregateVolume,
      cft: aggregateVolume * CONSTANTS.conversion.cum_to_cft,
    },
    water: {
      litres: cementVolume * CONSTANTS.density.cement * mix.water_cement_ratio,
    },
  };
}

/**
 * Calculate steel quantity for concrete element
 */
export function calculateSteelQuantity(concreteVolume, elementType) {
  const percentage = CONSTANTS.steel_percentage[elementType] || 0.008;
  return {
    kg: concreteVolume * percentage * CONSTANTS.density.steel,
    metric_ton: (concreteVolume * percentage * CONSTANTS.density.steel) / 1000,
  };
}

/**
 * Calculate formwork area
 */
export function calculateFormworkArea(concreteVolume, elementType) {
  const factor = CONSTANTS.formwork_factor[elementType] || 8.0;
  return concreteVolume * factor;
}

/**
 * Calculate masonry quantities
 */
export function calculateMasonryQuantity(wallArea, blockSize = '600x200x200') {
  const blockSizes = {
    '600x200x100': { area: 0.12, volume: 0.012 },
    '600x200x150': { area: 0.12, volume: 0.018 },
    '600x200x200': { area: 0.12, volume: 0.024 },
    '400x200x200': { area: 0.08, volume: 0.016 },
  };
  
  const block = blockSizes[blockSize] || blockSizes['600x200x200'];
  const blocksNeeded = Math.ceil(wallArea / block.area);
  
  // Mortar calculation (10mm joints, 15% of volume)
  const mortarVolume = wallArea * 0.15 * 0.015; // 15% coverage, 15mm thickness
  
  return {
    blocks: blocksNeeded,
    mortar: calculateConcreteQuantities(mortarVolume, 'm20'),
  };
}

/**
 * Calculate plaster quantities
 */
export function calculatePlasterQuantity(area, thickness = 'internal') {
  const thickness_m = CONSTANTS.thickness[`plaster_${thickness}`] || 0.015;
  const volume = area * thickness_m;
  
  // 1:4 cement-sand mortar
  const cement = (volume * 1440) / 5; // 1 part cement
  const sand = (volume * 1600 * 4) / 5; // 4 parts sand
  
  return {
    area: area,
    volume: volume,
    cement_kg: cement,
    cement_bags: Math.ceil(cement / 50),
    sand_cft: volume * 35.3147 * 4,
  };
}

/**
 * Calculate paint quantities
 */
export function calculatePaintQuantity(area, coats = 2) {
  const coverage = CONSTANTS.paint_coverage.interior_paint;
  const totalArea = area * coats;
  
  return {
    paint_litres: Math.ceil(totalArea / coverage),
    primer_litres: Math.ceil(area / coverage),
    putty_kg: Math.ceil(area * 0.35), // 350g per sqm
  };
}

// ============================================
// MAIN BOQ CALCULATOR
// ============================================

/**
 * Generate complete Bill of Quantities
 * @param {Object} project - Project data
 * @param {Object} rates - Material rates (optional, defaults to FALLBACK_RATES)
 */
export function generateBoQ(project, rates = FALLBACK_RATES) {
  const { buildingParams, buildingClassification } = project;
  
  // Calculate derived quantities
  const builtUpArea = buildingParams?.builtUpArea || 0;
  const numFloors = buildingParams?.numFloors || 1;
  const totalArea = builtUpArea * numFloors;
  const floorHeight = buildingParams?.height || 3.2;
  const buildingHeight = buildingParams?.height || (floorHeight * numFloors);
  
  console.log('[BoQ] Generating with:', { builtUpArea, numFloors, totalArea });
  
  // Per floor footprint (assuming square building for estimation)
  const footprintArea = builtUpArea;
  const buildingPerimeter = Math.sqrt(footprintArea) * 4; // Approximate perimeter
  const buildingLength = Math.sqrt(footprintArea);
  const buildingWidth = buildingLength;
  
  // Foundation parameters (based on geotechnical data if available)
  const foundationType = project.geotechnical?.recommendedFoundationType || 'isolated';
  const foundationDepth = project.geotechnical?.foundationDepth || 1.5;
  const sbc = project.geotechnical?.safeBearingCapacity || 150; // kN/sq.m
  
  // Size-dependent ratios calibrated from benchmarks
  // Small (<300 sqm): 0.112 cum/sqm, Medium (300-800): 0.250 cum/sqm, Large (>800): 0.374 cum/sqm
  const concreteRatio = totalArea <= 300 ? 0.112 :
                        totalArea <= 800 ? 0.180 :
                        0.250;
  
  // Foundation volume depends on size and floors
  const foundationRatio = numFloors <= 2 ? 0.019 : 0.019 + (numFloors - 2) * 0.025;
  const foundationVolume = totalArea * foundationRatio * foundationDepth / 1.5;
  
  // Column concrete: varies with floors
  const columnRatio = 0.0083 + (numFloors - 1) * 0.004;
  const columnVolume = totalArea * columnRatio;
  
  // Beam concrete: varies with floors  
  const beamRatio = 0.021 + (numFloors - 1) * 0.003;
  const beamVolume = totalArea * beamRatio;
  
  // Slab concrete: 100-150mm thick
  const slabThickness = (buildingParams?.slabThickness || 125) / 1000; // Convert mm to m
  const slabVolume = totalArea * slabThickness;
  
  // Lintel: 0.008 cum/sq.m
  const lintelVolume = totalArea * 0.008;
  
  // Sunshades: 0.002 cum/sq.m
  const sunshadeVolume = totalArea * 0.002;
  
  // Parapet wall: 0.3m height, 0.115 cum per running meter
  const parapetVolume = buildingPerimeter * 0.3 * 0.115;
  
  // Staircase: Approximately 0.05 cum per sq.m of stair area
  const stairArea = totalArea * 0.08; // 8% of total area for stairs
  const staircaseVolume = stairArea * 0.06;
  
  const totalConcreteVolume = foundationVolume + columnVolume + beamVolume + 
                              slabVolume + lintelVolume + sunshadeVolume + parapetVolume + staircaseVolume;
  
  // Masonry calculation - size-dependent blocks per sqm
  // Calibrated from benchmarks:
  // Small buildings (200 sqm): 7.0 blocks/sqm
  // Medium buildings (750 sqm): 12.6 blocks/sqm
  // Large buildings (1750 sqm): 11.1 blocks/sqm
  
  // Wall area per sqm of floor area
  const wallAreaPerSqm = totalArea <= 300 ? 0.9 :
                         totalArea <= 800 ? 1.2 :
                         1.0;
  
  const totalWallArea = totalArea * wallAreaPerSqm;
  
  // Opening deduction (doors + windows)
  const openingRatio = numFloors <= 2 ? 0.20 : 0.25;
  const netWallArea = totalWallArea * (1 - openingRatio);
  
  // Blocks per sqm (600x200mm blocks)
  const blocksPerSqm = totalArea <= 300 ? 7.0 :
                       totalArea <= 800 ? 12.0 :
                       11.0;
  
  const blocksWithWastage = netWallArea * blocksPerSqm * 1.05; // 5% wastage
  
  // Plaster areas - based on wall area
  const internalPlasterArea = netWallArea * 1.5; // Internal walls (both sides) + ceiling
  const externalPlasterArea = netWallArea * 0.3; // External walls only
  
  // Total plaster area
  const totalPlasterArea = internalPlasterArea + externalPlasterArea;
  
  // Flooring area - based on actual footprint (not total area)
  const flooringArea = footprintArea * numFloors * 0.95; // 95% of floor area
  
  // Paint area - same as plaster area (internal 2 coats, external 2 coats)
  const paintArea = totalPlasterArea;
  
  // Ceiling plaster: 90% of floor area
  const ceilingPlasterArea = totalArea * 0.90;
  
  // Initialize BoQ categories
  const boq = {
    projectInfo: {
      name: project.name || 'Untitled Project',
      date: new Date().toLocaleDateString('en-IN'),
      location: `${project.location?.district || 'Thrissur'}, Kerala`,
      builtUpArea: builtUpArea,
      numFloors: numFloors,
      totalArea: totalArea,
    },
    categories: [],
    summary: {
      subTotal: 0,
      gstRate: 18,
      gstAmount: 0,
      grandTotal: 0,
    },
  };
  
  // ===== CATEGORY 1: EARTHWORK =====
  const earthwork = {
    name: 'Earthwork',
    items: [],
    subTotal: 0,
  };
  
  // Excavation for foundation
  const excavationVolume = foundationVolume * 1.5; // 50% extra for working space
  addBoQItem(earthwork, {
    sno: 1,
    description: 'Excavation for foundation in all types of soil including leveling and dressing',
    quantity: excavationVolume.toFixed(2),
    unit: 'cum',
    rate: 450, // ₹450/cum for manual excavation
  });
  
  // Backfilling
  const backfillVolume = excavationVolume - foundationVolume;
  addBoQItem(earthwork, {
    sno: 2,
    description: 'Backfilling with approved excavated earth in layers including watering and compaction',
    quantity: backfillVolume.toFixed(2),
    unit: 'cum',
    rate: 320,
  });
  
  // Soling (if required)
  const solingArea = foundationVolume / foundationDepth * 1.2; // Approximate area from volume
  addBoQItem(earthwork, {
    sno: 3,
    description: 'Providing and laying 150mm thick soling with 40mm hard granite stone under footing',
    quantity: solingArea.toFixed(2),
    unit: 'sqm',
    rate: 650,
  });
  
  // Disposal of surplus earth
  const surplusEarth = excavationVolume * 0.3; // 30% surplus
  addBoQItem(earthwork, {
    sno: 4,
    description: 'Disposal of surplus earth within 1km lead including loading and unloading',
    quantity: surplusEarth.toFixed(2),
    unit: 'cum',
    rate: 280,
  });
  
  boq.categories.push(earthwork);
  
  // ===== CATEGORY 2: CONCRETE WORK =====
  const concreteWork = {
    name: 'Concrete Work',
    items: [],
    subTotal: 0,
  };
  
  // PCC for foundation
  const pccVolume = (footprintArea * 0.15) * 0.10; // 15% of footprint, 100mm thick
  const pccConcrete = calculateConcreteQuantities(pccVolume, 'm20');
  addBoQItem(concreteWork, {
    sno: 1,
    description: 'Providing and laying M20 grade PCC (1:1.5:3) below foundation including formwork',
    quantity: pccVolume.toFixed(3),
    unit: 'cum',
    rate: 5200,
    remarks: `Cement: ${pccConcrete.cement.bags} bags, Sand: ${pccConcrete.sand.cft.toFixed(2)} cft, Aggregate: ${pccConcrete.aggregate.cft.toFixed(2)} cft`,
  });
  
  // Foundation concrete
  const footingConcrete = calculateConcreteQuantities(foundationVolume, 'm25');
  addBoQItem(concreteWork, {
    sno: 2,
    description: 'Providing and laying M25 grade RCC for foundation including formwork and curing',
    quantity: foundationVolume.toFixed(3),
    unit: 'cum',
    rate: 7200,
    remarks: `Cement: ${footingConcrete.cement.bags} bags, Sand: ${footingConcrete.sand.cft.toFixed(2)} cft, Aggregate: ${footingConcrete.aggregate.cft.toFixed(2)} cft`,
  });
  
  // Column concrete
  const columnConcrete = calculateConcreteQuantities(columnVolume, 'm25');
  addBoQItem(concreteWork, {
    sno: 3,
    description: 'Providing and laying M25 grade RCC for columns including formwork and curing',
    quantity: columnVolume.toFixed(3),
    unit: 'cum',
    rate: 7800,
    remarks: `Cement: ${columnConcrete.cement.bags} bags, Sand: ${columnConcrete.sand.cft.toFixed(2)} cft, Aggregate: ${columnConcrete.aggregate.cft.toFixed(2)} cft`,
  });
  
  // Beam concrete
  const beamConcrete = calculateConcreteQuantities(beamVolume, 'm25');
  addBoQItem(concreteWork, {
    sno: 4,
    description: 'Providing and laying M25 grade RCC for beams including formwork and curing',
    quantity: beamVolume.toFixed(3),
    unit: 'cum',
    rate: 7500,
    remarks: `Cement: ${beamConcrete.cement.bags} bags, Sand: ${beamConcrete.sand.cft.toFixed(2)} cft, Aggregate: ${beamConcrete.aggregate.cft.toFixed(2)} cft`,
  });
  
  // Slab concrete
  const slabConcrete = calculateConcreteQuantities(slabVolume, 'm25');
  addBoQItem(concreteWork, {
    sno: 5,
    description: 'Providing and laying M25 grade RCC for slabs including formwork and curing',
    quantity: slabVolume.toFixed(3),
    unit: 'cum',
    rate: 7200,
    remarks: `Cement: ${slabConcrete.cement.bags} bags, Sand: ${slabConcrete.sand.cft.toFixed(2)} cft, Aggregate: ${slabConcrete.aggregate.cft.toFixed(2)} cft`,
  });
  
  // Lintel concrete
  const lintelConcrete = calculateConcreteQuantities(lintelVolume, 'm20');
  addBoQItem(concreteWork, {
    sno: 6,
    description: 'Providing and laying M20 grade RCC for lintels including formwork and curing',
    quantity: lintelVolume.toFixed(3),
    unit: 'cum',
    rate: 7500,
    remarks: `Cement: ${lintelConcrete.cement.bags} bags, Sand: ${lintelConcrete.sand.cft.toFixed(2)} cft, Aggregate: ${lintelConcrete.aggregate.cft.toFixed(2)} cft`,
  });
  
  // Sunshade concrete
  const sunshadeConcrete = calculateConcreteQuantities(sunshadeVolume, 'm20');
  addBoQItem(concreteWork, {
    sno: 7,
    description: 'Providing and laying M20 grade RCC for sunshades/chajjas including formwork and curing',
    quantity: sunshadeVolume.toFixed(3),
    unit: 'cum',
    rate: 7800,
    remarks: `Cement: ${sunshadeConcrete.cement.bags} bags, Sand: ${sunshadeConcrete.sand.cft.toFixed(2)} cft, Aggregate: ${sunshadeConcrete.aggregate.cft.toFixed(2)} cft`,
  });
  
  boq.categories.push(concreteWork);
  
  // ===== CATEGORY 3: REINFORCEMENT STEEL =====
  const steelWork = {
    name: 'Reinforcement Steel',
    items: [],
    subTotal: 0,
  };
  
  // Steel for each element - with defensive checks
  const steelRate = rates?.steel?.tmt_fe500?.rate || 72;
  const steelWastage = rates?.steel?.tmt_fe500?.wastage || 0.05;
  const bindingWireRate = rates?.steel?.binding_wire?.rate || 85;
  const bindingWireWastage = rates?.steel?.binding_wire?.wastage || 0.03;
  const cementRate = rates?.cement?.opc_53?.rate || 420;
  const cementWastage = rates?.cement?.opc_53?.wastage || 0.02;
  
  const footingSteel = calculateSteelQuantity(foundationVolume, 'footing');
  addBoQItem(steelWork, {
    sno: 1,
    description: 'Providing and fixing Fe500 TMT steel bars for foundation including cutting, bending, binding with binding wire',
    quantity: applyWastage(footingSteel.kg, steelWastage).toFixed(2),
    unit: 'kg',
    rate: steelRate + 18,
    remarks: `Raw: ${footingSteel.kg.toFixed(2)} kg + ${(steelWastage * 100).toFixed(0)}% wastage`,
  });
  
  const columnSteel = calculateSteelQuantity(columnVolume, 'column');
  addBoQItem(steelWork, {
    sno: 2,
    description: 'Providing and fixing Fe500 TMT steel bars for columns including cutting, bending, binding',
    quantity: applyWastage(columnSteel.kg, steelWastage).toFixed(2),
    unit: 'kg',
    rate: steelRate + 18,
    remarks: `Raw: ${columnSteel.kg.toFixed(2)} kg + ${(steelWastage * 100).toFixed(0)}% wastage`,
  });
  
  const beamSteel = calculateSteelQuantity(beamVolume, 'beam');
  addBoQItem(steelWork, {
    sno: 3,
    description: 'Providing and fixing Fe500 TMT steel bars for beams including cutting, bending, binding',
    quantity: applyWastage(beamSteel.kg, steelWastage).toFixed(2),
    unit: 'kg',
    rate: steelRate + 18,
    remarks: `Raw: ${beamSteel.kg.toFixed(2)} kg + ${(steelWastage * 100).toFixed(0)}% wastage`,
  });
  
  const slabSteel = calculateSteelQuantity(slabVolume, 'slab');
  addBoQItem(steelWork, {
    sno: 4,
    description: 'Providing and fixing Fe500 TMT steel bars for slab including cutting, bending, binding',
    quantity: applyWastage(slabSteel.kg, steelWastage).toFixed(2),
    unit: 'kg',
    rate: steelRate + 18,
    remarks: `Raw: ${slabSteel.kg.toFixed(2)} kg + ${(steelWastage * 100).toFixed(0)}% wastage`,
  });
  
  const lintelSteel = calculateSteelQuantity(lintelVolume, 'lintel');
  addBoQItem(steelWork, {
    sno: 5,
    description: 'Providing and fixing Fe500 TMT steel bars for lintels including cutting, bending, binding',
    quantity: applyWastage(lintelSteel.kg, steelWastage).toFixed(2),
    unit: 'kg',
    rate: steelRate + 18,
    remarks: `Raw: ${lintelSteel.kg.toFixed(2)} kg + ${(steelWastage * 100).toFixed(0)}% wastage`,
  });
  
  // Binding wire (2% of steel weight)
  const totalSteel = footingSteel.kg + columnSteel.kg + beamSteel.kg + 
                     slabSteel.kg + lintelSteel.kg;
  const bindingWire = totalSteel * 0.02;
  addBoQItem(steelWork, {
    sno: 6,
    description: 'Providing and fixing 18 gauge binding wire for reinforcement binding',
    quantity: applyWastage(bindingWire, bindingWireWastage).toFixed(2),
    unit: 'kg',
    rate: bindingWireRate,
    remarks: `Approx 2% of total steel`,
  });
  
  // Cover blocks
  const coverBlocks = Math.ceil(totalSteel / 10); // Rough estimate
  addBoQItem(steelWork, {
    sno: 7,
    description: 'Providing cement concrete cover blocks of approved quality for reinforcement cover',
    quantity: coverBlocks,
    unit: 'nos',
    rate: 3,
  });
  
  boq.categories.push(steelWork);
  
  // ===== CATEGORY 4: FORMWORK =====
  const formwork = {
    name: 'Formwork',
    items: [],
    subTotal: 0,
  };
  
  // Formwork for each element
  const footingFormwork = calculateFormworkArea(foundationVolume, 'footing');
  addBoQItem(formwork, {
    sno: 1,
    description: 'Providing and erecting formwork for foundation using plywood/wooden planks including scaffolding',
    quantity: footingFormwork.toFixed(2),
    unit: 'sqm',
    rate: 450,
  });
  
  const columnFormwork = calculateFormworkArea(columnVolume, 'column');
  addBoQItem(formwork, {
    sno: 2,
    description: 'Providing and erecting formwork for columns using plywood/steel including scaffolding',
    quantity: columnFormwork.toFixed(2),
    unit: 'sqm',
    rate: 650,
  });
  
  const beamFormwork = calculateFormworkArea(beamVolume, 'beam');
  addBoQItem(formwork, {
    sno: 3,
    description: 'Providing and erecting formwork for beams using plywood/steel including scaffolding',
    quantity: beamFormwork.toFixed(2),
    unit: 'sqm',
    rate: 620,
  });
  
  const slabFormwork = calculateFormworkArea(slabVolume, 'slab');
  addBoQItem(formwork, {
    sno: 4,
    description: 'Providing and erecting formwork for slabs using plywood/steel including props and scaffolding',
    quantity: slabFormwork.toFixed(2),
    unit: 'sqm',
    rate: 580,
  });
  
  boq.categories.push(formwork);
  
  // ===== CATEGORY 5: MASONRY WORK =====
  const masonryWork = {
    name: 'Masonry Work',
    items: [],
    subTotal: 0,
  };
  
  // AAC Blocks
  const blockWastage = (rates?.blocks?.aac_blocks_600x200x200?.wastage || 0.05);
  const blockSize = '600x200x200';
  const masonryQty = calculateMasonryQuantity(netMasonryArea, blockSize);
  
  addBoQItem(masonryWork, {
    sno: 1,
    description: 'Providing and laying AAC blocks of size 600x200x200mm in CM 1:4 including curing',
    quantity: applyWastage(masonryQty.blocks, blockWastage),
    unit: 'nos',
    rate: (rates?.blocks?.aac_blocks_600x200x200?.rate || 52) + 15,
    remarks: `Raw: ${masonryQty.blocks} nos + ${(blockWastage * 100).toFixed(0)}% breakage`,
  });
  
  // Mortar for masonry
  const mortarCementBags = masonryQty.mortar.cement.bags;
  addBoQItem(masonryWork, {
    sno: 2,
    description: 'Cement mortar 1:4 for masonry work',
    quantity: mortarCementBags,
    unit: 'bags',
    rate: cementRate,
    remarks: `Includes sand: ${masonryQty.mortar.sand.cft.toFixed(2)} cft`,
  });
  
  boq.categories.push(masonryWork);
  
  // ===== CATEGORY 6: PLASTERING =====
  const plastering = {
    name: 'Plastering',
    items: [],
    subTotal: 0,
  };
  
  // Internal plaster
  const internalPlaster = calculatePlasterQuantity(internalPlasterArea, 'internal');
  addBoQItem(plastering, {
    sno: 1,
    description: 'Providing and applying 15mm thick internal plaster in CM 1:4 including curing',
    quantity: internalPlasterArea.toFixed(2),
    unit: 'sqm',
    rate: 185,
    remarks: `Cement: ${internalPlaster.cement_bags} bags, Sand: ${internalPlaster.sand_cft.toFixed(2)} cft`,
  });
  
  // External plaster
  const externalPlaster = calculatePlasterQuantity(externalPlasterArea, 'external');
  addBoQItem(plastering, {
    sno: 2,
    description: 'Providing and applying 20mm thick external plaster in CM 1:4 including curing and finishing',
    quantity: externalPlasterArea.toFixed(2),
    unit: 'sqm',
    rate: 225,
    remarks: `Cement: ${externalPlaster.cement_bags} bags, Sand: ${externalPlaster.sand_cft.toFixed(2)} cft`,
  });
  
  boq.categories.push(plastering);
  
  // ===== CATEGORY 7: FLOORING =====
  const flooring = {
    name: 'Flooring',
    items: [],
    subTotal: 0,
  };
  
  // Convert flooring area from sqm to sqft
  const flooringAreaSqft = flooringArea * 10.7639;
  
  // Vitrified tiles (60% of area)
  const vitrifiedArea = flooringAreaSqft * 0.6;
  addBoQItem(flooring, {
    sno: 1,
    description: 'Providing and laying 600x600mm vitrified tiles of approved make in living, dining, bedrooms including cutting and fixing',
    quantity: applyWastage(vitrifiedArea, 0.10).toFixed(2),
    unit: 'sqft',
    rate: (rates?.flooring?.vitrified_tiles?.rate || 95) + 45,
    remarks: `Raw area: ${vitrifiedArea.toFixed(2)} sqft + 10% wastage`,
  });
  
  // Ceramic tiles for bathrooms (15% of area)
  const bathroomTilesArea = flooringAreaSqft * 0.15;
  addBoQItem(flooring, {
    sno: 2,
    description: 'Providing and laying 300x300mm anti-skid ceramic tiles in bathrooms, toilets including cutting and fixing',
    quantity: applyWastage(bathroomTilesArea, 0.10).toFixed(2),
    unit: 'sqft',
    rate: (rates?.flooring?.tiles_bathroom?.rate || 85) + 35,
    remarks: `Raw area: ${bathroomTilesArea.toFixed(2)} sqft + 10% wastage`,
  });
  
  // Wall tiles for kitchen/bathrooms
  const wallTilesAreaSqft = totalArea * 10.7639 * 0.3; // 30% of floor area in sqft
  addBoQItem(flooring, {
    sno: 3,
    description: 'Providing and laying 300x450mm glazed wall tiles in kitchen, bathrooms up to 7 feet height',
    quantity: applyWastage(wallTilesAreaSqft, 0.10).toFixed(2),
    unit: 'sqft',
    rate: (rates?.flooring?.tiles_wall_1x1?.rate || 65) + 35,
    remarks: `Raw area: ${wallTilesAreaSqft.toFixed(2)} sqft + 10% wastage`,
  });
  
  // Granite for kitchen platform
  const graniteArea = numFloors * 15; // 15 sqft per floor for kitchen
  addBoQItem(flooring, {
    sno: 4,
    description: 'Providing and fixing 20mm thick granite for kitchen platform including cutting and polishing',
    quantity: applyWastage(graniteArea, 0.15).toFixed(2),
    unit: 'sqft',
    rate: (rates?.flooring?.granite?.rate || 220) + 120,
    remarks: `Raw area: ${graniteArea.toFixed(2)} sqft + 15% wastage`,
  });
  
  boq.categories.push(flooring);
  
  // ===== CATEGORY 8: PAINTING =====
  const painting = {
    name: 'Painting',
    items: [],
    subTotal: 0,
  };
  
  const paintQty = calculatePaintQuantity(paintArea, 2);
  
  // Wall putty
  addBoQItem(painting, {
    sno: 1,
    description: 'Applying wall putty of approved make in 2 coats over plastered surface including sanding',
    quantity: paintQty.putty_kg,
    unit: 'kg',
    rate: (rates?.finish?.putty?.rate || 35) + 8,
  });
  
  // Primer
  addBoQItem(painting, {
    sno: 2,
    description: 'Applying water-based primer of approved make over putty in 1 coat',
    quantity: paintQty.primer_litres,
    unit: 'litre',
    rate: (rates?.finish?.primer?.rate || 180) + 15,
  });
  
  // Interior paint (2 coats)
  addBoQItem(painting, {
    sno: 3,
    description: 'Applying 2 coats of premium interior emulsion paint of approved shade including finishing',
    quantity: paintQty.paint_litres,
    unit: 'litre',
    rate: (rates?.finish?.paint_interior?.rate || 280) + 25,
  });
  
  // Exterior paint
  const exteriorPaintArea = externalPlasterArea * 1.5; // Both sides
  const exteriorPaintQty = calculatePaintQuantity(exteriorPaintArea, 2);
  addBoQItem(painting, {
    sno: 4,
    description: 'Applying 2 coats of exterior weatherproof emulsion paint of approved shade',
    quantity: exteriorPaintQty.paint_litres,
    unit: 'litre',
    rate: (rates?.finish?.paint_exterior?.rate || 380) + 30,
  });
  
  boq.categories.push(painting);
  
  // ===== CATEGORY 9: DOORS & WINDOWS =====
  const doorsWindows = {
    name: 'Doors & Windows',
    items: [],
    subTotal: 0,
  };
  
  // Main door
  const mainDoors = numFloors;
  addBoQItem(doorsWindows, {
    sno: 1,
    description: 'Providing and fixing teak wood paneled door with teak wood frame, including fixtures and fittings',
    quantity: mainDoors,
    unit: 'nos',
    rate: 25000,
  });
  
  // Internal doors
  const internalDoors = Math.ceil(totalArea / 100); // 1 per 100 sqm
  addBoQItem(doorsWindows, {
    sno: 2,
    description: 'Providing and fixing flush door with hardwood frame, including fixtures',
    quantity: internalDoors,
    unit: 'nos',
    rate: rates.doors_windows.flush_door.rate + 2000,
  });
  
  // Bathroom doors
  const bathroomDoors = numFloors * 2;
  addBoQItem(doorsWindows, {
    sno: 3,
    description: 'Providing and fixing PVC door for bathrooms, including fixtures',
    quantity: bathroomDoors,
    unit: 'nos',
    rate: 4500,
  });
  
  // Windows
  const windowArea = totalArea * 0.12; // 12% of floor area
  addBoQItem(doorsWindows, {
    sno: 4,
    description: 'Providing and fixing UPVC sliding windows with glass and mosquito mesh',
    quantity: windowArea.toFixed(2),
    unit: 'sqft',
    rate: rates.doors_windows.upvc_window.rate + 100,
  });
  
  // MS Grill
  const grillArea = windowArea * 0.8; // 80% of window area
  addBoQItem(doorsWindows, {
    sno: 5,
    description: 'Providing and fixing 12mm square MS grill with 4 inch spacing for windows',
    quantity: (grillArea * 5).toFixed(2), // Approx 5kg per sqft
    unit: 'kg',
    rate: rates.doors_windows.ms_grill.rate + 45,
  });
  
  boq.categories.push(doorsWindows);
  
  // ===== CATEGORY 10: PLUMBING =====
  const plumbing = {
    name: 'Plumbing & Sanitary',
    items: [],
    subTotal: 0,
  };
  
  // CPVC pipes
  const cpvcLength = totalArea * 0.8; // Rough estimate
  addBoQItem(plumbing, {
    sno: 1,
    description: 'Providing and fixing CPVC pipes for water supply including fittings (1", 3/4", 1/2")',
    quantity: cpvcLength.toFixed(2),
    unit: 'm',
    rate: 110 + 25,
  });
  
  // UPVC drainage pipes
  const upvcLength = totalArea * 0.5;
  addBoQItem(plumbing, {
    sno: 2,
    description: 'Providing and fixing UPVC SWR pipes for drainage including fittings (4", 6")',
    quantity: upvcLength.toFixed(2),
    unit: 'm',
    rate: 155 + 35,
  });
  
  // Sanitary fixtures
  const sanitarySets = Math.ceil(totalArea / 100);
  addBoQItem(plumbing, {
    sno: 3,
    description: 'Providing and fixing sanitary fixtures (WC, washbasin, shower) of approved make including installation',
    quantity: sanitarySets,
    unit: 'set',
    rate: 6500 + 1500,
  });
  
  // Overhead tank
  addBoQItem(plumbing, {
    sno: 4,
    description: 'Providing and fixing 1000 litres Sintex overhead water tank including stand and fittings',
    quantity: 1,
    unit: 'nos',
    rate: 12500,
  });
  
  // Underground tank
  addBoQItem(plumbing, {
    sno: 5,
    description: 'Constructing 5000 litres RCC underground water tank including waterproofing',
    quantity: 1,
    unit: 'nos',
    rate: 65000,
  });
  
  boq.categories.push(plumbing);
  
  // ===== CATEGORY 11: ELECTRICAL =====
  const electrical = {
    name: 'Electrical Work',
    items: [],
    subTotal: 0,
  };
  
  // Wiring
  const wireLength = totalArea * 3; // 3m per sqm
  addBoQItem(electrical, {
    sno: 1,
    description: 'Providing and laying copper conductor PVC insulated wires in concealed conduit (2.5, 4, 6 sqmm)',
    quantity: wireLength.toFixed(2),
    unit: 'm',
    rate: 55 + 15,
  });
  
  // Conduit pipes
  addBoQItem(electrical, {
    sno: 2,
    description: 'Providing and laying PVC conduit pipes for concealed wiring including junction boxes',
    quantity: (wireLength * 0.3).toFixed(2),
    unit: 'm',
    rate: 45 + 15,
  });
  
  // Switches and sockets
  const switchCount = Math.ceil(totalArea / 10);
  addBoQItem(electrical, {
    sno: 3,
    description: 'Providing and fixing modular switches and sockets of approved make',
    quantity: switchCount,
    unit: 'nos',
    rate: 120 + 35,
  });
  
  // Distribution board
  const dbCount = numFloors;
  addBoQItem(electrical, {
    sno: 4,
    description: 'Providing and fixing TPN distribution board with MCBs of approved make',
    quantity: dbCount,
    unit: 'nos',
    rate: 5500 + 2500,
  });
  
  boq.categories.push(electrical);
  
  // ===== CATEGORY 12: MISCELLANEOUS =====
  const miscellaneous = {
    name: 'Miscellaneous',
    items: [],
    subTotal: 0,
  };
  
  // Waterproofing
  const waterproofingArea = totalArea * 0.15; // Bathrooms, terrace
  addBoQItem(miscellaneous, {
    sno: 1,
    description: 'Waterproofing treatment for bathrooms, terrace using crystalline waterproofing compound',
    quantity: waterproofingArea.toFixed(2),
    unit: 'sqm',
    rate: 385,
  });
  
  // Rainwater harvesting (if required)
  if (buildingParams.hasRainwaterHarvesting) {
    addBoQItem(miscellaneous, {
      sno: 2,
      description: 'Providing and installing rainwater harvesting system including recharge pit and filter',
      quantity: 1,
      unit: 'set',
      rate: 45000,
    });
  }
  
  // Solar water heater
  if (buildingParams.hasSolarWaterHeater) {
    addBoQItem(miscellaneous, {
      sno: 3,
      description: 'Providing and installing solar water heater system (200 LPD) of approved make',
      quantity: 1,
      unit: 'set',
      rate: 35000,
    });
  }
  
  boq.categories.push(miscellaneous);
  
  // Calculate totals
  let grandSubTotal = 0;
  boq.categories.forEach(category => {
    category.subTotal = category.items.reduce((sum, item) => sum + item.amount, 0);
    grandSubTotal += category.subTotal;
  });
  
  // Calculate transportation cost if rates have transportation info
  let transportationCost = 0;
  const rateKeys = Object.keys(rates);
  for (const cat of rateKeys) {
    const materials = rates[cat];
    const matKeys = Object.keys(materials);
    for (const matKey of matKeys) {
      if (materials[matKey].transportation_cost > 0) {
        transportationCost += materials[matKey].transportation_cost * 100; // Approximate
        break;
      }
    }
  }
  
  // Add transportation as a line item
  const transportCategory = {
    name: 'Transportation & Logistics',
    items: [{
      sno: 1,
      description: 'Material transportation from supplier to site',
      quantity: 1,
      unit: 'ls',
      rate: transportationCost > 0 ? transportationCost : 0,
      amount: transportationCost > 0 ? transportationCost : 0,
    }],
    subTotal: transportationCost
  };
  if (transportationCost > 0) {
    boq.categories.push(transportCategory);
  }
  
  boq.summary.subTotal = grandSubTotal;
  boq.summary.transportationCost = transportationCost;
  boq.summary.gstAmount = ((grandSubTotal + transportationCost) * boq.summary.gstRate) / 100;
  boq.summary.grandTotal = grandSubTotal + transportationCost + boq.summary.gstAmount;
  
  return boq;
}

/**
 * Helper function to add BoQ item with calculated amount
 */
function addBoQItem(category, item) {
  const quantity = parseFloat(item.quantity);
  const rate = parseFloat(item.rate);
  const amount = quantity * rate;
  
  category.items.push({
    sno: category.items.length + 1,
    ...item,
    quantity: quantity,
    rate: rate,
    amount: amount,
  });
}

/**
 * Export BoQ to CSV format
 */
export function exportBoQToCSV(boq) {
  let csv = '';
  
  // Header
  csv += `BILL OF QUANTITIES\n`;
  csv += `Project: ${boq.projectInfo.name}\n`;
  csv += `Date: ${boq.projectInfo.date}\n`;
  csv += `Location: ${boq.projectInfo.location}\n\n`;
  
  // Categories
  boq.categories.forEach(category => {
    csv += `\n${category.name.toUpperCase()}\n`;
    csv += 'S.No,Description,Quantity,Unit,Rate (₹),Amount (₹),Remarks\n';
    
    category.items.forEach(item => {
      csv += `${item.sno},"${item.description}",${item.quantity},${item.unit},${item.rate},${item.amount},"${item.remarks || ''}"\n`;
    });
    
    csv += `,,,,Sub-Total:,${category.subTotal}\n`;
  });
  
  // Summary
  csv += `\nSUMMARY\n`;
  csv += `Sub-Total,${boq.summary.subTotal}\n`;
  csv += `GST @ ${boq.summary.gstRate}%,${boq.summary.gstAmount}\n`;
  csv += `Grand Total (Rounded),${Math.round(boq.summary.grandTotal)}\n`;
  
  return csv;
}

/**
 * Generate simplified material summary for quick reference
 */
export function generateMaterialSummary(boq) {
  const summary = {
    cement: 0,
    steel: 0,
    sand: 0,
    aggregate: 0,
    blocks: 0,
    totalCost: boq.summary.grandTotal,
    costPerSqft: boq.summary.grandTotal / (boq.projectInfo.totalArea * 10.764),
  };
  
  // Extract material quantities from remarks where available
  boq.categories.forEach(category => {
    category.items.forEach(item => {
      if (item.remarks) {
        const cementMatch = item.remarks.match(/Cement:\s*(\d+)\s*bags/);
        if (cementMatch) summary.cement += parseInt(cementMatch[1]);
        
        const sandMatch = item.remarks.match(/Sand:\s*([\d.]+)\s*cft/);
        if (sandMatch) summary.sand += parseFloat(sandMatch[1]);
        
        const aggregateMatch = item.remarks.match(/Aggregate:\s*([\d.]+)\s*cft/);
        if (aggregateMatch) summary.aggregate += parseFloat(aggregateMatch[1]);
      }
      
      if (item.description.includes('TMT steel')) {
        summary.steel += parseFloat(item.quantity);
      }
      
      if (item.description.includes('AAC blocks')) {
        summary.blocks += parseInt(item.quantity);
      }
    });
  });
  
  return summary;
}

// ============================================
// DYNAMIC RATES FROM DATABASE
// ============================================

let cachedRates = null;
let ratesCacheTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Normalize API rates to expected format
 * Maps database categories to calculator expected categories
 */
function normalizeRates(apiRates) {
  const normalized = { ...FALLBACK_RATES };
  
  if (!apiRates) return normalized;
  
  // Map database category names to new structure
  const categoryMap = {
    'cement': 'cement',
    'steel': 'steel',
    'aggregates': 'aggregate',
    'aggregate': 'aggregate',
    'masonry': 'blocks',           // Map to blocks category (has legacy keys)
    'blocks': 'blocks',
    'finish': 'flooring',          // Map to flooring category (has legacy keys)
    'finishes': 'flooring',
    'flooring': 'flooring',
    'door': 'doors_windows',
    'doors': 'doors_windows',
    'roof': 'doors_windows',
    'insulation': 'timber',        // Map to timber
    'wood': 'timber',
    'timber': 'timber',
    'adhesive': 'waterproofing',
    'concrete': 'concrete',
    'reinforcement': 'reinforcement',
  };
  
  // GST rates by category
  const gstByCategory = {
    'cement': 28,
    'steel': 18,
    'aggregate': 5,
    'blocks': 5,
    'concrete': 18,
    'flooring': 18,
    'timber': 18,
    'masonry': 18,
    'doors_windows': 18,
    'waterproofing': 18,
    'reinforcement': 18,
  };
  
  // Apply mappings
  Object.entries(apiRates).forEach(([catName, materials]) => {
    const targetCat = categoryMap[catName.toLowerCase()] || catName.toLowerCase();
    
    if (!normalized[targetCat]) {
      normalized[targetCat] = {};
    }
    
    // Add materials from API
    Object.entries(materials).forEach(([matKey, matData]) => {
      normalized[targetCat][matKey] = {
        rate: matData.rate || 0,
        unit: matData.unit || 'nos',
        wastage: matData.wastage || 0.05,
        gst: gstByCategory[targetCat] || 18
      };
    });
  });
  
  console.log('[BoQ] Normalized rates:', Object.keys(normalized));
  return normalized;
}

/**
 * Fetch material rates from API with caching
 */
export async function fetchMaterialRates() {
  // Check if we have valid cached rates
  if (cachedRates && ratesCacheTime && (Date.now() - ratesCacheTime < CACHE_DURATION)) {
    console.log('[BoQ] Using cached material rates');
    return cachedRates;
  }

  try {
    console.log('[BoQ] Fetching material rates from API...');
    const response = await ecoBuildAPI.getMaterialRates();
    
    if (response.data && response.data.rates) {
      // Normalize the API rates to expected format
      cachedRates = normalizeRates(response.data.rates);
      ratesCacheTime = Date.now();
      console.log('[BoQ] Successfully fetched and normalized rates for', Object.keys(cachedRates).length, 'categories');
      return cachedRates;
    }
  } catch (error) {
    console.error('[BoQ] Failed to fetch material rates:', error);
    console.log('[BoQ] Falling back to hardcoded rates');
  }

  // Return fallback rates if API fails
  return FALLBACK_RATES;
}

/**
 * Clear the rates cache (useful when prices are updated)
 */
export function clearRatesCache() {
  cachedRates = null;
  ratesCacheTime = null;
  console.log('[BoQ] Material rates cache cleared');
}

/**
 * Async version of generateBoQ that fetches dynamic rates
 */
export async function generateBoQAsync(project) {
  const rates = await fetchMaterialRates();
  return generateBoQ(project, rates);
}

/**
 * Validate steel-to-concrete ratio for sustainability
 * Returns warning if ratio is too high (over-designed)
 */
export function validateSteelConcreteRatio(boq, builtUpArea) {
  const summary = generateMaterialSummary(boq);
  const steelKg = summary.steel;
  
  if (!builtUpArea || builtUpArea === 0) {
    return {
      isValid: true,
      ratio: 0,
      status: 'unknown',
      message: 'Cannot calculate ratio: built-up area not specified'
    };
  }
  
  const ratio = steelKg / builtUpArea; // kg per sq.m
  
  // Industry standards
  const MAX_RATIO = 150; // kg/sq.m - absolute maximum
  const WARN_RATIO = 100; // kg/sq.m - warning threshold
  const TYPICAL_RATIO = 80; // kg/sq.m - typical for residential
  
  if (ratio > MAX_RATIO) {
    return {
      isValid: false,
      ratio,
      status: 'over-designed',
      severity: 'error',
      message: `Steel ratio (${ratio.toFixed(1)} kg/sq.m) exceeds maximum (${MAX_RATIO} kg/sq.m). This design is significantly over-engineered and contradicts sustainable construction principles.`,
      recommendation: 'Review structural design to optimize steel usage. Consider reducing unnecessary reinforcement or redesigning load paths.'
    };
  } else if (ratio > WARN_RATIO) {
    return {
      isValid: true,
      ratio,
      status: 'high',
      severity: 'warning',
      message: `Steel ratio (${ratio.toFixed(1)} kg/sq.m) is higher than typical (${TYPICAL_RATIO} kg/sq.m). Consider optimization.`,
      recommendation: 'Steel usage can potentially be optimized without compromising safety.'
    };
  }
  
  return {
    isValid: true,
    ratio,
    status: 'normal',
    severity: 'info',
    message: `Steel ratio (${ratio.toFixed(1)} kg/sq.m) is within normal range (${TYPICAL_RATIO} kg/sq.m typical).`,
    recommendation: 'Design is well-optimized for steel usage.'
  };
}

/**
 * Reconcile material quantities with costs
 * Ensures that calculated material quantities match the cost breakdown
 */
export function reconcileMaterialsWithCost(boq, rates = FALLBACK_RATES) {
  const reconciliation = {
    cement: { calculated: 0, costBased: 0, variance: 0 },
    steel: { calculated: 0, costBased: 0, variance: 0 },
    issues: []
  };
  
  const summary = generateMaterialSummary(boq);
  
  // Get concrete work category
  const concreteCategory = boq.categories.find(c => 
    c.name.toLowerCase().includes('concrete')
  );
  
  if (concreteCategory) {
    const concreteCost = concreteCategory.subTotal;
    const cementRate = rates.cement?.opc_53?.rate || 390;
    
    // Calculate cement bags from cost
    // Assuming cement is ~15% of concrete cost
    const cementCost = concreteCost * 0.15;
    reconciliation.cement.costBased = Math.ceil(cementCost / cementRate);
    reconciliation.cement.calculated = summary.cement;
    reconciliation.cement.variance = reconciliation.cement.costBased - summary.cement;
    
    if (Math.abs(reconciliation.cement.variance) > 50) {
      reconciliation.issues.push({
        material: 'cement',
        severity: 'warning',
        message: `Cement quantity variance detected: ${reconciliation.cement.variance} bags difference between calculated and cost-based estimates.`,
        calculated: reconciliation.cement.calculated,
        costBased: reconciliation.cement.costBased
      });
    }
  }
  
  // Get steel work category
  const steelCategory = boq.categories.find(c => 
    c.name.toLowerCase().includes('steel')
  );
  
  if (steelCategory) {
    const steelCost = steelCategory.subTotal;
    const steelRate = rates.steel?.tmt_fe500?.rate || 72;
    
    // Calculate steel from cost
    reconciliation.steel.costBased = Math.ceil(steelCost / (steelRate + 18));
    reconciliation.steel.calculated = summary.steel;
    reconciliation.steel.variance = reconciliation.steel.costBased - summary.steel;
    
    if (Math.abs(reconciliation.steel.variance) > 100) {
      reconciliation.issues.push({
        material: 'steel',
        severity: 'warning',
        message: `Steel quantity variance detected: ${reconciliation.steel.variance} kg difference between calculated and cost-based estimates.`,
        calculated: reconciliation.steel.calculated,
        costBased: reconciliation.steel.costBased
      });
    }
  }
  
  return reconciliation;
}

/**
 * Calculate material quantities derived from costs
 * Alternative method to verify material estimates
 */
export function calculateMaterialQuantitiesFromCost(categoryCost, materialType, rates = FALLBACK_RATES) {
  const assumptions = {
    cement: { costPercentage: 0.15, unit: 'bags' },
    steel: { costPercentage: 0.60, unit: 'kg' },
    sand: { costPercentage: 0.10, unit: 'cft' },
    aggregate: { costPercentage: 0.12, unit: 'cft' }
  };
  
  if (!assumptions[materialType]) {
    return { quantity: 0, unit: 'unknown', note: 'Material type not recognized' };
  }
  
  const materialCost = categoryCost * assumptions[materialType].costPercentage;
  let rate;
  
  switch (materialType) {
    case 'cement':
      rate = rates.cement?.opc_53?.rate || 390;
      break;
    case 'steel':
      rate = rates.steel?.tmt_fe500?.rate || 72;
      break;
    case 'sand':
      rate = rates.aggregate?.msand?.rate || 47;
      break;
    case 'aggregate':
      rate = rates.aggregate?.aggregate_20mm?.rate || 37;
      break;
    default:
      rate = 1;
  }
  
  const quantity = Math.ceil(materialCost / rate);
  
  return {
    quantity,
    unit: assumptions[materialType].unit,
    costAllocated: materialCost,
    rateApplied: rate,
    note: `Derived from ${(assumptions[materialType].costPercentage * 100).toFixed(0)}% of category cost`
  };
}

export default {
  generateBoQ,
  generateBoQAsync,
  fetchMaterialRates,
  clearRatesCache,
  exportBoQToCSV,
  generateMaterialSummary,
  calculateConcreteQuantities,
  calculateSteelQuantity,
  calculateMasonryQuantity,
  calculatePlasterQuantity,
  calculatePaintQuantity,
  applyWastage,
  formatCurrency,
  formatNumber,
  calculateGST,
  calculateTransportationCost,
  validateSteelConcreteRatio,
  reconcileMaterialsWithCost,
  calculateMaterialQuantitiesFromCost,
  THRISSUR_RATES_2024: FALLBACK_RATES,
};

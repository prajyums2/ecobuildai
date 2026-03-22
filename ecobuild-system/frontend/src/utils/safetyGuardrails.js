/**
 * Safety Guardrails & Validation Module
 * ======================================
 * Provides comprehensive input validation and safety checks
 * for a professional civil engineering application.
 * 
 * References:
 * - IS 456:2000 - Plain and Reinforced Concrete
 * - IS 1893:2016 - Earthquake Resistant Design
 * - IS 875 - Design Loads
 * - NBC 2016 - National Building Code
 */

// ============================================
// SAFETY LIMITS (Per IS Codes)
// ============================================

export const SAFETY_LIMITS = {
  // Building Dimensions
  building: {
    minPlotArea: 20,        // sq.m - minimum for any construction
    maxPlotArea: 10000,     // sq.m - reasonable maximum
    minBuiltUpArea: 15,     // sq.m - minimum for a room
    maxBuiltUpArea: 50000,  // sq.m
    minFloors: 1,
    maxFloors: 15,          // practical limit for residential
    minHeight: 2.4,         // m - NBC minimum room height
    maxHeight: 45,          // m - typical limit
    minFloorHeight: 2.4,    // m - NBC minimum
    maxFloorHeight: 5.0,    // m - practical maximum
  },
  
  // FAR Limits (per NBC and local building rules)
  far: {
    residential: { min: 0.5, max: 3.0 },
    commercial: { min: 1.0, max: 5.0 },
    industrial: { min: 0.5, max: 2.0 },
  },
  
  // Setbacks (meters) - Typical for Kerala
  setbacks: {
    front: { min: 1.5, max: 6.0 },
    rear: { min: 1.5, max: 6.0 },
    side1: { min: 1.0, max: 3.0 },
    side2: { min: 1.0, max: 3.0 },
  },
  
  // Structural Parameters
  structural: {
    // Concrete grades (MPa)
    concreteGrades: ['m15', 'm20', 'm25', 'm30', 'm35', 'm40'],
    
    // Steel grades (MPa yield strength)
    steelGrades: ['fe250', 'fe415', 'fe500', 'fe500d', 'fe550', 'fe550d', 'fe600'],
    
    // Slab thickness (mm)
    minSlabThickness: 100,    // IS 456 minimum
    maxSlabThickness: 300,
    
    // Column dimensions (mm)
    minColumnSize: 200,
    maxColumnSize: 1000,
    
    // Beam dimensions (mm)
    minBeamDepth: 200,
    maxBeamDepth: 1200,
    
    // Steel percentage (IS 456:2000)
    steelPercentage: {
      min: 0.004,  // 0.4% - minimum for slabs
      max: 0.04,   // 4.0% - maximum for columns
    },
    
    // Foundation depth (m)
    minFoundationDepth: 0.6,
    maxFoundationDepth: 10.0,
  },
  
  // Soil Parameters
  soil: {
    minSBC: 50,     // kN/m² - minimum bearing capacity
    maxSBC: 500,    // kN/m² - maximum for dense sand
    minWaterTable: 0.5,   // m - minimum depth
    maxWaterTable: 30,    // m
  },
  
  // Environmental
  environmental: {
    maxWindSpeed: 55,   // m/s - maximum in India
    seismicZones: ['II', 'III', 'IV', 'V'],
    exposureConditions: ['mild', 'moderate', 'severe', 'verySevere', 'extreme'],
  },
  
  // Material Constraints
  materials: {
    cement: {
      minRate: 200,   // ₹/bag
      maxRate: 800,
      wastage: { min: 2, max: 10 },  // %
      shelfLife: 3,   // months
    },
    steel: {
      minRate: 40,    // ₹/kg
      maxRate: 150,
      wastage: { min: 3, max: 15 },
    },
    aggregate: {
      minRate: 20,    // ₹/cft
      maxRate: 200,
      wastage: { min: 5, max: 15 },
    },
    masonry: {
      minRate: 5,     // ₹/piece
      maxRate: 200,
      wastage: { min: 5, max: 15 },
    },
  },
  
  // BoQ Validation
  boq: {
    maxItems: 10000,
    maxTotalCost: 10000000000,  // ₹100 Crore
    gstRate: 18,  // %
  },
};

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate building dimensions
 * @returns {Object} { isValid, errors, warnings }
 */
export function validateBuildingDimensions(params) {
  const errors = [];
  const warnings = [];
  
  const { plotArea, builtUpArea, numFloors, height, floorHeight } = params;
  const limits = SAFETY_LIMITS.building;
  
  // Plot Area
  if (!plotArea || plotArea < limits.minPlotArea) {
    errors.push(`Plot area must be at least ${limits.minPlotArea} sq.m`);
  } else if (plotArea > limits.maxPlotArea) {
    warnings.push(`Plot area exceeds ${limits.maxPlotArea} sq.m - verify input`);
  }
  
  // Built-up Area
  if (!builtUpArea || builtUpArea < limits.minBuiltUpArea) {
    errors.push(`Built-up area must be at least ${limits.minBuiltUpArea} sq.m`);
  }
  
  // FAR Check
  if (plotArea > 0 && builtUpArea > 0) {
    const far = builtUpArea / plotArea;
    const maxFAR = SAFETY_LIMITS.far.residential.max;
    if (far > maxFAR) {
      errors.push(`FAR (${far.toFixed(2)}) exceeds maximum allowed (${maxFAR}). Reduce built-up area or increase plot area.`);
    }
  }
  
  // Number of Floors
  if (!numFloors || numFloors < limits.minFloors) {
    errors.push(`Number of floors must be at least ${limits.minFloors}`);
  } else if (numFloors > limits.maxFloors) {
    warnings.push(`${numFloors} floors requires special structural design`);
  }
  
  // Height
  if (height) {
    if (height < limits.minHeight) {
      errors.push(`Building height must be at least ${limits.minHeight}m`);
    }
    if (height > limits.maxHeight) {
      errors.push(`Building height exceeds ${limits.maxHeight}m limit`);
    }
  }
  
  // Floor Height
  if (floorHeight) {
    if (floorHeight < limits.minFloorHeight) {
      errors.push(`Floor height must be at least ${limits.minFloorHeight}m (NBC requirement)`);
    }
    if (floorHeight > limits.maxFloorHeight) {
      warnings.push(`Floor height ${floorHeight}m is unusually high`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate structural parameters
 */
export function validateStructuralParams(params) {
  const errors = [];
  const warnings = [];
  
  const { concreteGrade, steelGrade, slabThickness, beamDepth, columnSize, steelRatio } = params;
  const limits = SAFETY_LIMITS.structural;
  
  // Concrete Grade
  if (concreteGrade && !limits.concreteGrades.includes(concreteGrade)) {
    errors.push(`Invalid concrete grade: ${concreteGrade}`);
  }
  
  // Steel Grade
  if (steelGrade && !limits.steelGrades.includes(steelGrade)) {
    errors.push(`Invalid steel grade: ${steelGrade}`);
  }
  
  // Slab Thickness
  if (slabThickness) {
    if (slabThickness < limits.minSlabThickness) {
      errors.push(`Slab thickness must be at least ${limits.minSlabThickness}mm (IS 456)`);
    }
    if (slabThickness > limits.maxSlabThickness) {
      warnings.push(`Slab thickness ${slabThickness}mm is unusually high`);
    }
  }
  
  // Beam Depth
  if (beamDepth) {
    if (beamDepth < limits.minBeamDepth) {
      errors.push(`Beam depth must be at least ${limits.minBeamDepth}mm`);
    }
  }
  
  // Column Size
  if (columnSize) {
    if (columnSize < limits.minColumnSize) {
      errors.push(`Column size must be at least ${limits.minColumnSize}mm`);
    }
  }
  
  // Steel Ratio
  if (steelRatio) {
    if (steelRatio < limits.steelPercentage.min * 100) {
      warnings.push(`Steel ratio ${steelRatio}% is below IS 456 minimum`);
    }
    if (steelRatio > limits.steelPercentage.max * 100) {
      warnings.push(`Steel ratio ${steelRatio}% exceeds typical maximum - verify design`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate geotechnical parameters
 */
export function validateGeotechnicalParams(params) {
  const errors = [];
  const warnings = [];
  
  const { safeBearingCapacity, groundwaterLevel } = params;
  const limits = SAFETY_LIMITS.soil;
  
  if (safeBearingCapacity) {
    if (safeBearingCapacity < limits.minSBC) {
      warnings.push(`Very low SBC (${safeBearingCapacity} kN/m²) - may need deep foundations`);
    }
    if (safeBearingCapacity > limits.maxSBC) {
      warnings.push(`SBC ${safeBearingCapacity} kN/m² seems unusually high - verify`);
    }
  }
  
  if (groundwaterLevel) {
    if (groundwaterLevel < limits.minWaterTable) {
      warnings.push(`Shallow groundwater (${groundwaterLevel}m) - waterproofing required`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate material selection
 */
export function validateMaterialSelection(selection) {
  const errors = [];
  const warnings = [];
  
  if (!selection || Object.keys(selection).length === 0) {
    warnings.push('No materials selected - using default values');
    return { isValid: true, errors, warnings };
  }
  
  // Check for required material categories
  const requiredCategories = ['cement', 'steel', 'aggregate', 'masonry'];
  const missingCategories = requiredCategories.filter(cat => !selection[cat]);
  
  if (missingCategories.length > 0) {
    warnings.push(`Missing material selections for: ${missingCategories.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate BoQ data
 */
export function validateBoQ(boq) {
  const errors = [];
  const warnings = [];
  
  if (!boq) {
    errors.push('BoQ data is missing');
    return { isValid: false, errors, warnings };
  }
  
  if (!boq.categories || boq.categories.length === 0) {
    errors.push('BoQ has no categories');
    return { isValid: false, errors, warnings };
  }
  
  if (boq.categories.length > SAFETY_LIMITS.boq.maxItems) {
    warnings.push('BoQ has unusually high number of items');
  }
  
  // Check for negative values
  boq.categories.forEach(cat => {
    if (cat.subTotal < 0) {
      errors.push(`Category "${cat.name}" has negative subtotal`);
    }
    cat.items?.forEach(item => {
      if (item.quantity < 0) {
        errors.push(`Item "${item.description}" has negative quantity`);
      }
      if (item.rate < 0) {
        errors.push(`Item "${item.description}" has negative rate`);
      }
    });
  });
  
  // Check total cost
  if (boq.summary?.grandTotal > SAFETY_LIMITS.boq.maxTotalCost) {
    warnings.push('Total project cost exceeds ₹100 Crore - verify inputs');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(value, min = 0, max = Infinity, defaultValue = 0) {
  const num = parseFloat(value);
  if (isNaN(num)) return defaultValue;
  return Math.max(min, Math.min(max, num));
}

/**
 * Sanitize string input
 */
export function sanitizeString(value, maxLength = 1000) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

/**
 * Calculate FAR safely
 */
export function calculateSafeFAR(builtUpArea, plotArea) {
  if (!plotArea || plotArea <= 0) return 0;
  const far = builtUpArea / plotArea;
  return Math.min(far, SAFETY_LIMITS.far.commercial.max);
}

/**
 * Check if seismic design is required
 */
export function isSeismicDesignRequired(seismicZone) {
  return ['III', 'IV', 'V'].includes(seismicZone);
}

/**
 * Get minimum concrete grade for exposure condition
 * IS 456:2000 Table 5
 */
export function getMinConcreteGrade(exposure) {
  const grades = {
    mild: 'm15',
    moderate: 'm20',
    severe: 'm25',
    verySevere: 'm30',
    extreme: 'm35',
  };
  return grades[exposure] || 'm20';
}

/**
 * Get minimum cement content for exposure condition
 * IS 456:2000 Table 6
 */
export function getMinCementContent(exposure) {
  const content = {
    mild: 220,
    moderate: 300,
    severe: 320,
    verySevere: 340,
    extreme: 360,
  };
  return content[exposure] || 300;
}

/**
 * Get minimum steel cover for exposure condition
 * IS 456:2000 Table 16
 */
export function getMinSteelCover(exposure, element) {
  const covers = {
    mild: { slab: 20, beam: 25, column: 40, footing: 50 },
    moderate: { slab: 30, beam: 30, column: 40, footing: 50 },
    severe: { slab: 45, beam: 45, column: 40, footing: 50 },
    verySevere: { slab: 50, beam: 50, column: 40, footing: 75 },
    extreme: { slab: 75, beam: 60, column: 40, footing: 75 },
  };
  return covers[exposure]?.[element] || 25;
}

export default {
  SAFETY_LIMITS,
  validateBuildingDimensions,
  validateStructuralParams,
  validateGeotechnicalParams,
  validateMaterialSelection,
  validateBoQ,
  sanitizeNumber,
  sanitizeString,
  calculateSafeFAR,
  isSeismicDesignRequired,
  getMinConcreteGrade,
  getMinCementContent,
  getMinSteelCover,
};

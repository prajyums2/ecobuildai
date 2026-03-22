/**
 * Project Validation Utilities
 * Provides input sanitization and validation guards
 */

export const VALIDATION_RULES = {
  // Dimensional limits
  MAX_FLOOR_HEIGHT: 6, // meters (reasonable max per floor)
  MIN_FLOOR_HEIGHT: 2.4, // meters (minimum habitable height)
  MAX_BUILDING_HEIGHT: 300, // meters
  
  // Material ratios
  MAX_STEEL_RATIO: 150, // kg/sq.m (typical max for buildings)
  WARN_STEEL_RATIO: 100, // kg/sq.m (warning threshold)
  
  // Structural validation
  MIN_SETBACK: 0, // meters
  MAX_SETBACK: 50, // meters
  
  // FAR can be > 1 for vertical construction
  MAX_FAR: 10, // reasonable max for high-rise
};

/**
 * Validate building dimensions and return warnings/errors
 */
export function validateBuildingDimensions(buildingParams) {
  const warnings = [];
  const errors = [];
  
  const {
    numFloors,
    buildingHeight,
    plotArea,
    builtUpArea,
    setbacks = {}
  } = buildingParams;
  
  // Check floor height outliers
  if (numFloors && buildingHeight) {
    const avgFloorHeight = buildingHeight / numFloors;
    if (avgFloorHeight > VALIDATION_RULES.MAX_FLOOR_HEIGHT) {
      errors.push({
        field: 'buildingHeight',
        message: `Average floor height (${avgFloorHeight.toFixed(1)}m) exceeds typical maximum (${VALIDATION_RULES.MAX_FLOOR_HEIGHT}m). Please verify floor count or building height.`,
        severity: 'error'
      });
    } else if (avgFloorHeight > 5) {
      warnings.push({
        field: 'buildingHeight',
        message: `Average floor height (${avgFloorHeight.toFixed(1)}m) is unusually high. Typical range: 2.8-3.5m per floor.`,
        severity: 'warning'
      });
    } else if (avgFloorHeight < VALIDATION_RULES.MIN_FLOOR_HEIGHT) {
      warnings.push({
        field: 'buildingHeight',
        message: `Average floor height (${avgFloorHeight.toFixed(1)}m) is below minimum habitable height (${VALIDATION_RULES.MIN_FLOOR_HEIGHT}m).`,
        severity: 'warning'
      });
    }
  }
  
  // Check setbacks
  if (setbacks) {
    ['front', 'rear', 'side1', 'side2'].forEach(side => {
      const value = setbacks[side];
      if (value !== undefined && value !== null) {
        if (value < VALIDATION_RULES.MIN_SETBACK) {
          errors.push({
            field: `setbacks.${side}`,
            message: `${side.charAt(0).toUpperCase() + side.slice(1)} setback cannot be negative (${value}m).`,
            severity: 'error'
          });
        } else if (value === 0) {
          warnings.push({
            field: `setbacks.${side}`,
            message: `${side.charAt(0).toUpperCase() + side.slice(1)} setback is 0m. Ensure adequate setback for safety and ventilation.`,
            severity: 'warning'
          });
        }
      }
    });
  }
  
  // Check built-up area vs plot area
  if (plotArea && builtUpArea) {
    if (builtUpArea > plotArea * VALIDATION_RULES.MAX_FAR) {
      errors.push({
        field: 'builtUpArea',
        message: `Built-up area (${builtUpArea} sq.m) seems excessive for plot area (${plotArea} sq.m). FAR would be ${(builtUpArea/plotArea).toFixed(2)}.`,
        severity: 'error'
      });
    }
  }
  
  return { warnings, errors, isValid: errors.length === 0 };
}

/**
 * Validate steel-to-concrete ratio
 */
export function validateSteelRatio(steelQuantityKg, builtUpAreaSqm) {
  if (!steelQuantityKg || !builtUpAreaSqm || builtUpAreaSqm === 0) {
    return { isValid: true, ratio: 0, status: 'unknown' };
  }
  
  const ratio = steelQuantityKg / builtUpAreaSqm;
  
  if (ratio > VALIDATION_RULES.MAX_STEEL_RATIO) {
    return {
      isValid: false,
      ratio,
      status: 'over-designed',
      message: `Steel ratio (${ratio.toFixed(1)} kg/sq.m) exceeds maximum (${VALIDATION_RULES.MAX_STEEL_RATIO} kg/sq.m). This design may be over-engineered and not sustainable.`,
      severity: 'error'
    };
  } else if (ratio > VALIDATION_RULES.WARN_STEEL_RATIO) {
    return {
      isValid: true,
      ratio,
      status: 'high',
      message: `Steel ratio (${ratio.toFixed(1)} kg/sq.m) is higher than typical (${VALIDATION_RULES.WARN_STEEL_RATIO} kg/sq.m). Consider optimization.`,
      severity: 'warning'
    };
  }
  
  return {
    isValid: true,
    ratio,
    status: 'normal',
    message: `Steel ratio (${ratio.toFixed(1)} kg/sq.m) is within normal range.`,
    severity: 'info'
  };
}

/**
 * Calculate carbon reduction percentage correctly
 */
export function calculateCarbonReduction(baselineCarbon, optimizedCarbon) {
  if (!baselineCarbon || !optimizedCarbon || baselineCarbon === 0) {
    return 0;
  }
  
  const reduction = baselineCarbon - optimizedCarbon;
  const percentage = (reduction / baselineCarbon) * 100;
  
  return Math.max(0, Math.round(percentage * 10) / 10); // Round to 1 decimal, ensure non-negative
}

/**
 * Check if project has placeholder data
 */
export function hasPlaceholderData(project) {
  const checks = [
    { field: 'name', check: (v) => !v || v.length < 3 },
    { field: 'buildingClassification.mainUse', check: (v) => !v || v === 'B' || v.length < 3 },
    { field: 'buildingParams.plotArea', check: (v) => !v || v <= 0 },
    { field: 'buildingParams.builtUpArea', check: (v) => !v || v <= 0 },
  ];
  
  const issues = [];
  
  checks.forEach(({ field, check }) => {
    const value = field.split('.').reduce((obj, key) => obj?.[key], project);
    if (check(value)) {
      issues.push(field);
    }
  });
  
  return {
    hasPlaceholders: issues.length > 0,
    issues,
    isDraft: issues.length > 2
  };
}

/**
 * Get structural categories only (exclude finishes)
 */
export const STRUCTURAL_CATEGORIES = [
  'earthwork',
  'concreteWork', 
  'steelWork',
  'formwork',
  'masonryWork',
  'plastering'
];

export const FINISH_CATEGORIES = [
  'flooring',
  'painting',
  'doorsWindows',
  'plumbing',
  'electrical',
  'miscellaneous'
];

/**
 * Filter BoQ categories for sustainability calculation
 */
export function filterStructuralCategories(boqCategories) {
  if (!Array.isArray(boqCategories)) return [];
  
  return boqCategories.filter(cat => 
    STRUCTURAL_CATEGORIES.some(structural => 
      cat.id?.toLowerCase().includes(structural.toLowerCase()) ||
      cat.name?.toLowerCase().includes(structural.toLowerCase())
    )
  );
}

/**
 * Calculate material quantity from cost and rate
 */
export function calculateQuantityFromCost(totalCost, ratePerUnit) {
  if (!totalCost || !ratePerUnit || ratePerUnit <= 0) {
    return { quantity: 0, unit: 'unknown' };
  }
  
  return {
    quantity: Math.ceil(totalCost / ratePerUnit),
    unit: 'unit'
  };
}

export default {
  VALIDATION_RULES,
  STRUCTURAL_CATEGORIES,
  FINISH_CATEGORIES,
  validateBuildingDimensions,
  validateSteelRatio,
  calculateCarbonReduction,
  hasPlaceholderData,
  filterStructuralCategories,
  calculateQuantityFromCost
};

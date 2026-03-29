/**
 * Floorplan Analyzer Service
 * Calls backend API for intelligent floorplan analysis
 */

const API_URL = 'https://ecobuildai-production-1f9d.up.railway.app';

/**
 * Analyze a floorplan image using the backend API
 * @param {File} file - The floorplan image file
 * @param {number} numFloors - Number of floors
 * @param {number|null} scaleFactor - Optional custom scale factor (m per pixel)
 * @returns {Promise<Object>} - Analysis results
 */
export async function analyzeFloorplan(file, numFloors = 2, scaleFactor = null) {
  try {
    // Call backend API
    const formData = new FormData();
    formData.append('file', file);
    formData.append('num_floors', numFloors.toString());
    if (scaleFactor !== null) {
      formData.append('scale_factor', scaleFactor.toString());
    }

    const response = await fetch(`${API_URL}/api/floorplan/analyze`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Validate the detected area - cap at reasonable limits (relaxed constraints)
    let detectedArea = data.analysis?.total_area || null;
    
    // Apply reasonable constraints (relaxed for small floorplans)
    if (detectedArea) {
      // Only reject clearly invalid values
      if (detectedArea < 5) detectedArea = null;  // Too small
      if (detectedArea > 5000) detectedArea = null; // Too large
    }
    
    return {
      dimensions: {
        totalArea: detectedArea,
        length: data.analysis?.dimensions?.length || null,
        width: data.analysis?.dimensions?.width || null,
      },
      rooms: data.analysis?.rooms || [],
      quantities: data.quantities || {},
      confidence: data.confidence || 0,
      scale: {
        factor: data.analysis?.scale_used || null,
        method: data.analysis?.scale_method || 'Unknown',
        pixelsPerMeter: data.analysis?.scale_used ? (1 / data.analysis.scale_used) : null,
      },
      raw: data,
    };
  } catch (error) {
    console.error('Floorplan analysis error:', error);
    
    // Return empty result - user will enter manually
    return {
      dimensions: {
        totalArea: null,
        length: null,
        width: null,
      },
      rooms: [],
      quantities: {},
      confidence: 0,
      scale: null,
      error: error.message,
    };
  }
}

/**
 * Calibrate floorplan scale using a known measurement
 * @param {number} pixelDistance - Distance in pixels between two points
 * @param {number} realDistance - Known real-world distance in meters
 * @returns {Promise<Object>} - Calibration result
 */
export async function calibrateFloorplanScale(pixelDistance, realDistance) {
  try {
    const formData = new FormData();
    formData.append('pixel_distance', pixelDistance.toString());
    formData.append('real_distance', realDistance.toString());

    const response = await fetch(`${API_URL}/api/floorplan/calibrate`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Calibration failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Calibration error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Reset floorplan scale calibration
 * @returns {Promise<Object>} - Reset result
 */
export async function resetFloorplanCalibration() {
  try {
    const response = await fetch(`${API_URL}/api/floorplan/reset-calibration`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Reset failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Reset calibration error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get sample analysis for testing
 */
export async function getSampleAnalysis() {
  try {
    const response = await fetch(`${API_URL}/api/floorplan/sample`);
    const data = await response.json();
    
    return {
      dimensions: {
        totalArea: data.analysis?.total_area || null,
        length: data.analysis?.dimensions?.length || null,
        width: data.analysis?.dimensions?.width || null,
      },
      rooms: data.analysis?.rooms || [],
      quantities: data.quantities || {},
      confidence: data.analysis?.confidence || 0,
    };
  } catch (error) {
    return {
      dimensions: { totalArea: null },
      rooms: [],
      quantities: {},
      confidence: 0,
    };
  }
}

/**
 * Classify room based on dimensions
 */
export function classifyRoom(length, width, area) {
  if (area > 30) return 'Living Room';
  if (area > 20) return 'Master Bedroom';
  if (area > 15) return 'Bedroom';
  if (area > 10) return 'Study/Office';
  if (area > 8) return 'Kitchen';
  if (area > 5) return 'Bathroom';
  return 'Store/Utility';
}

export default analyzeFloorplan;

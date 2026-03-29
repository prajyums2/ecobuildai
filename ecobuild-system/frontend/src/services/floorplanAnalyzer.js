/**
 * Floorplan Analyzer Service
 * Calls backend API for intelligent floorplan analysis
 */

const API_URL = 'https://ecobuildai-production-1f9d.up.railway.app';

/**
 * Analyze a floorplan image using the backend API
 * @param {File} file - The floorplan image file
 * @param {number} numFloors - Number of floors
 * @returns {Promise<Object>} - Analysis results
 */
export async function analyzeFloorplan(file, numFloors = 2) {
  try {
    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('num_floors', numFloors.toString());

    // Call backend API
    const response = await fetch(`${API_URL}/api/floorplan/analyze`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      dimensions: {
        totalArea: data.analysis?.total_area || null,
        length: data.analysis?.dimensions?.length || null,
        width: data.analysis?.dimensions?.width || null,
      },
      rooms: data.analysis?.rooms || [],
      quantities: data.quantities || {},
      confidence: data.confidence || 0,
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

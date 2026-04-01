/**
 * Floorplan Analyzer Service - Powered by Puter.js Vision AI
 * Analyzes floorplan images using AI vision to detect rooms, dimensions, and quantities
 */

import { puter } from '@heyputer/puter.js';

/**
 * Analyze a floorplan image using Puter.js AI vision
 * @param {File} file - The floorplan image file
 * @param {number} numFloors - Number of floors
 * @returns {Promise<Object>} - Analysis results
 */
export async function analyzeFloorplan(file, numFloors = 2) {
  try {
    // Convert file to data URL for Puter.js vision
    const dataUrl = await fileToDataUrl(file);

    const prompt = `You are a civil engineering assistant analyzing an architectural floor plan image. Identify and list:

1. All rooms visible (bedrooms, bathrooms, kitchen, living room, dining, etc.)
2. Approximate dimensions of each room in meters (estimate from the drawing if a scale is visible, otherwise make reasonable estimates for a residential building)
3. Total built-up area estimate in square meters
4. Number of floors (if indicated, otherwise use ${numFloors})
5. Wall thickness estimates (typically 230mm for external, 115mm for internal)
6. Count of doors and windows

Respond ONLY with valid JSON in this exact format:
{
  "rooms": [
    {"name": "Living Room", "length_m": 4.5, "width_m": 3.5, "area_sqm": 15.75},
    {"name": "Bedroom 1", "length_m": 3.5, "width_m": 3.0, "area_sqm": 10.5}
  ],
  "total_built_up_sqm": 120,
  "num_floors": ${numFloors},
  "wall_thickness_mm": 230,
  "doors": 6,
  "windows": 8,
  "notes": "Any additional observations"
}

If the image is not a floor plan or cannot be analyzed, respond with: {"error": "Could not analyze image", "rooms": [], "total_built_up_sqm": 0}`;

    const response = await puter.ai.chat(prompt, dataUrl, { model: 'gpt-4.1-nano' });
    const text = typeof response === 'string' ? response : response.message?.content || response;

    // Parse JSON from response
    const parsed = parseFloorplanJSON(text);

    if (parsed.error) {
      return buildEmptyResult(parsed.error);
    }

    // Calculate material quantities from detected area
    const totalArea = parsed.total_built_up_sqm || 0;
    const floors = parsed.num_floors || numFloors;
    const totalBuiltUp = totalArea * floors;

    return {
      dimensions: {
        totalArea: totalArea > 0 ? totalArea : null,
        length: null,
        width: null,
      },
      rooms: parsed.rooms || [],
      quantities: totalBuiltUp > 0 ? calculateQuantities(totalBuiltUp) : {},
      confidence: parsed.rooms?.length > 0 ? 0.85 : 0.3,
      scale: {
        factor: null,
        method: 'AI Vision (Puter.js)',
        pixelsPerMeter: null,
      },
      raw: parsed,
    };
  } catch (error) {
    console.error('Floorplan analysis error:', error);
    return buildEmptyResult(error.message);
  }
}

/**
 * Calculate material quantities from total built-up area
 * Based on Kerala construction norms and IS codes
 */
function calculateQuantities(totalArea) {
  return {
    concrete: Math.round(totalArea * 0.12),       // cum
    steel: Math.round(totalArea * 12),             // kg
    blocks: Math.round(totalArea * 7.5),           // nos (AAC)
    aggregate: Math.round(totalArea * 20),         // cft
    sand: Math.round(totalArea * 15),              // cft
    cement: Math.round(totalArea * 0.8),           // bags
  };
}

/**
 * Convert File to Data URL
 */
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Parse JSON from AI response text
 */
function parseFloorplanJSON(text) {
  try {
    // Try direct parse
    return JSON.parse(text);
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch {
        // Try to find JSON object in text
        const objMatch = text.match(/\{[\s\S]*\}/);
        if (objMatch) {
          try {
            return JSON.parse(objMatch[0]);
          } catch {
            return { error: 'Could not parse AI response', rooms: [] };
          }
        }
      }
    }
    return { error: 'Could not parse AI response', rooms: [] };
  }
}

/**
 * Build empty result for when analysis fails
 */
function buildEmptyResult(errorMessage) {
  return {
    dimensions: { totalArea: null, length: null, width: null },
    rooms: [],
    quantities: {},
    confidence: 0,
    scale: null,
    error: errorMessage,
  };
}

/**
 * Calibrate floorplan scale (kept for backward compatibility)
 */
export async function calibrateFloorplanScale(pixelDistance, realDistance) {
  return {
    success: true,
    scale_factor: realDistance / pixelDistance,
    message: 'Scale calibrated locally',
  };
}

/**
 * Reset floorplan scale calibration
 */
export async function resetFloorplanCalibration() {
  return { success: true, message: 'Calibration reset' };
}

/**
 * Get sample analysis for testing
 */
export async function getSampleAnalysis() {
  return {
    dimensions: { totalArea: 120 },
    rooms: [
      { name: 'Living Room', length_m: 5.0, width_m: 4.0, area_sqm: 20 },
      { name: 'Bedroom 1', length_m: 3.5, width_m: 3.0, area_sqm: 10.5 },
      { name: 'Bedroom 2', length_m: 3.0, width_m: 3.0, area_sqm: 9 },
      { name: 'Kitchen', length_m: 3.0, width_m: 2.5, area_sqm: 7.5 },
    ],
    quantities: {
      concrete: 29,
      steel: 2880,
      blocks: 1800,
      aggregate: 4800,
      sand: 3600,
      cement: 192,
    },
    confidence: 0.9,
  };
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

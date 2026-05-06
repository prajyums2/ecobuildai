/**
 * Floor Plan Analyzer - Professional AI-Powered Analysis
 * Uses Puter.js Gemini 2.5 Flash for comprehensive floor plan analysis
 * Detects: walls, rooms, doors, windows, scale, structure type
 */

import { puter } from '@heyputer/puter.js';

const AI_MODEL = 'google/gemini-2.5-flash';

/**
 * Complete floor plan analysis - single AI call
 * Returns all structural data needed for BoQ calculations
 */
export async function analyzeFloorPlanComplete(imageDataUrl, floorNumber = 1) {
  const result = {
    rooms: [],
    walls: {
      external: { total_length_m: 0, thickness_mm: 230, count: 0 },
      internal: { total_length_m: 0, thickness_mm: 115, count: 0 },
    },
    doors: [],
    windows: [],
    scale: { detected: false, pixelsPerMeter: 0 },
    structure_type: 'load_bearing',
    total_built_up_sqm: 0,
    building_dimensions: { width_m: 0, length_m: 0 },
    confidence: 0,
    notes: '',
  };

  try {
    const prompt = "You are an expert architectural floor plan analyzer. Analyze this floor plan image and extract ALL structural and spatial information needed for construction cost estimation.\n\nReturn ONLY valid JSON in this exact format:\n{\n  \"rooms\": [\n    {\"name\": \"Living Room\", \"corners\": [[x1,y1],[x2,y2],[x3,y3],[x4,y4]], \"area_sqm\": 20.0}\n  ],\n  \"walls\": {\n    \"external\": {\"total_length_m\": 38.5, \"thickness_mm\": 230, \"count\": 8},\n    \"internal\": {\"total_length_m\": 24.0, \"thickness_mm\": 115, \"count\": 6}\n  },\n  \"doors\": [\n    {\"x\": 150, \"y\": 200, \"width_m\": 1.0, \"height_m\": 2.1, \"type\": \"main\"}\n  ],\n  \"windows\": [\n    {\"x\": 100, \"y\": 50, \"width_m\": 1.2, \"height_m\": 1.2, \"type\": \"standard\"}\n  ],\n  \"scale\": {\n    \"detected\": true,\n    \"pixelDistance\": 150,\n    \"realDistance\": 5.0,\n    \"unit\": \"meters\",\n    \"pixelsPerMeter\": 30.0\n  },\n  \"structure_type\": \"load_bearing\",\n  \"total_built_up_sqm\": 150,\n  \"building_dimensions\": {\"width_m\": 12.0, \"length_m\": 12.5},\n  \"confidence\": 0.85\n}\n\nCRITICAL RULES:\n1. ALL coordinates must be in IMAGE PIXEL coordinates (0,0 = top-left)\n2. Room corners: 4 corners of each room rectangle, clockwise order\n3. Include ALL rooms, even small ones (bathrooms, closets, storage)\n4. Walls: estimate total external and internal wall lengths in meters\n5. External walls typically 230mm, internal walls 115mm\n6. If no scale visible, set \"detected\": false and estimate dimensions\n7. structure_type: \"load_bearing\" if no columns, \"framed\" if columns visible\n8. Door types: \"main\", \"internal\", \"bathroom\"\n9. Window types: \"standard\", \"ventilator\"\n10. Return ONLY JSON, no other text";

    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('AI analysis timed out after 30 seconds')), 30000)
    );

    const response = await Promise.race([
      puter.ai.chat(prompt, imageDataUrl, { model: AI_MODEL }),
      timeout
    ]);

    const text = typeof response === 'string' ? response : response.message?.content || response;
    const parsed = parseJSON(text);

    if (parsed) {
      result.rooms = parsed.rooms || [];
      result.doors = parsed.doors || [];
      result.windows = parsed.windows || [];
      result.walls = parsed.walls || result.walls;
      result.scale = parsed.scale || result.scale;
      result.structure_type = parsed.structure_type || 'load_bearing';
      result.total_built_up_sqm = parsed.total_built_up_sqm || 0;
      result.building_dimensions = parsed.building_dimensions || {};
      result.confidence = parsed.confidence || 0;
    }

    return result;
  } catch (error) {
    console.error('[FloorPlanAnalyzer] Analysis failed:', error.message);
    result.notes = 'Analysis failed: ' + error.message + '. Use manual mode.';
    return result;
  }
}

/**
 * AI-based scale detection from dimension annotations
 */
export async function detectScaleFromImage(imageDataUrl) {
  try {
    const prompt = "Look at this floor plan image. Find any dimension annotations, scale bars, or measurements written on the drawing. For each dimension found, return the pixel distance and real-world measurement. Return ONLY valid JSON: {\"detected\": true, \"annotations\": [{\"pixelDistance\": 150, \"realDistance\": 5.0, \"unit\": \"meters\", \"text\": \"5000\"}], \"pixelsPerMeter\": 30.0, \"confidence\": 0.9}. If no dimensions visible: {\"detected\": false, \"annotations\": [], \"pixelsPerMeter\": 0, \"confidence\": 0}. Return ONLY JSON.";

    const response = await puter.ai.chat(prompt, imageDataUrl, { model: AI_MODEL });
    const text = typeof response === 'string' ? response : response.message?.content || response;
    return parseJSON(text) || { detected: false, annotations: [], pixelsPerMeter: 0, confidence: 0 };
  } catch (error) {
    console.error('[FloorPlanAnalyzer] Scale detection failed:', error.message);
    return { detected: false, annotations: [], pixelsPerMeter: 0, confidence: 0, error: error.message };
  }
}

function parseJSON(text) {
  try { return JSON.parse(text); } catch (e) {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) { try { return JSON.parse(jsonMatch[1].trim()); } catch (e) {} }
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) { try { return JSON.parse(objMatch[0]); } catch (e) {} }
    return null;
  }
}

export default {
  analyzeFloorPlanComplete,
  detectScaleFromImage,
};

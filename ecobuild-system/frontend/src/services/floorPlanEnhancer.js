/**
 * Floor Plan Enhancer - Combined AI Vision
 * Single AI call that detects rooms, doors, windows, scale, and structure type
 * Cost: ~$0.001 per call (Puter.js free tier)
 * Time: 5-10 seconds
 */

import { puter } from '@heyputer/puter.js';

const AI_MODEL = 'google/gemini-2.5-flash';

/**
 * Analyze floor plan with single AI call
 * Detects: rooms, doors, windows, scale, structure type
 * @param {string} imageDataUrl - Preprocessed floor plan as data URL
 * @param {number} floorNumber - Floor number for context
 * @returns {Promise<Object>} Detected elements with pixel coordinates
 */
export async function analyzeFloorPlan(imageDataUrl, floorNumber = 1) {
  const prompt = `You are an expert architectural floor plan analyzer. Analyze this floor plan image and detect all rooms, doors, windows, and any scale indicators.

Return ONLY valid JSON in this exact format:
{
  "rooms": [
    {"name": "Living Room", "corners": [[x1,y1],[x2,y2],[x3,y3],[x4,y4]], "area_sqm": 20.0},
    {"name": "Bedroom 1", "corners": [[x1,y1],[x2,y2],[x3,y3],[x4,y4]], "area_sqm": 12.0}
  ],
  "doors": [
    {"x": 150, "y": 200, "type": "main"},
    {"x": 300, "y": 180, "type": "internal"}
  ],
  "windows": [
    {"x": 100, "y": 50, "type": "standard"},
    {"x": 400, "y": 50, "type": "small"}
  ],
  "scale": {
    "detected": true,
    "pixelDistance": 150,
    "realDistance": 5.0,
    "unit": "meters",
    "pixelsPerMeter": 30.0
  },
  "structure_type": "load_bearing",
  "total_built_up_sqm": 150,
  "confidence": 0.85
}

CRITICAL RULES:
1. ALL coordinates must be in IMAGE PIXEL coordinates (0,0 = top-left of image)
2. Room corners should be the 4 corners of each room rectangle in clockwise order
3. Include ALL visible rooms, even small ones like bathrooms, closets, storage
4. If no scale annotation is visible on the plan, set "detected": false and estimate total_built_up_sqm based on typical residential proportions
5. structure_type: "load_bearing" if walls carry load (no columns shown), "framed" if columns are visible
6. Estimate room areas in square meters based on typical residential proportions
7. Door types: "main" for entrance, "internal" for room doors, "bathroom" for bathroom doors
8. Window types: "standard" for regular windows, "small" for bathroom/ventilator windows
9. If you cannot confidently detect something, omit it rather than guessing
10. Return ONLY the JSON object, no other text`;

  try {
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('AI analysis timed out after 30 seconds')), 30000)
    );

    const response = await Promise.race([
      puter.ai.chat(prompt, imageDataUrl, { model: AI_MODEL }),
      timeout
    ]);

    const text = typeof response === 'string' ? response : response.message?.content || response;
    return parseJSON(text);
  } catch (error) {
    console.error('[FloorPlanEnhancer] AI analysis failed:', error.message);
    return {
      rooms: [],
      doors: [],
      windows: [],
      scale: { detected: false, pixelsPerMeter: 0 },
      structure_type: 'load_bearing',
      total_built_up_sqm: 0,
      confidence: 0,
      error: error.message,
    };
  }
}

/**
 * Parse JSON from AI response text
 */
function parseJSON(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    // Try markdown code block
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[1].trim()); } catch (e) {}
    }
    // Try JSON object
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try { return JSON.parse(objMatch[0]); } catch (e) {}
    }
    return null;
  }
}

export default {
  analyzeFloorPlan,
};

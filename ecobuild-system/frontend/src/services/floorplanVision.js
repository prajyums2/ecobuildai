// EcoBuild Floor Plan Vision AI Service - Puter.js powered
// Analyzes floor plan PNG/JPG images to extract rooms, doors, windows, walls, and structure type

import { puter } from '@heyputer/puter.js';

const AI_MODEL = 'gemini-2.0-flash';

/**
 * Analyze a floor plan image using Puter.js Vision AI
 * @param {string} imageDataUrl - Base64 data URL of the floor plan image
 * @param {number} floorNumber - Floor number (1-based)
 * @returns {Promise<Object>} - Structured floor plan data
 */
export async function analyzeFloorPlanVision(imageDataUrl, floorNumber = 1) {
  const prompt = `You are an expert architectural floor plan analyzer for residential buildings in Kerala, India.

Analyze this floor plan image and extract ALL building parameters with high accuracy.

Return ONLY valid JSON in this exact format:
{
  "floor_number": ${floorNumber},
  "rooms": [
    {"name": "Living Room", "length_m": 5.0, "width_m": 4.0, "area_sqm": 20.0},
    {"name": "Bedroom 1", "length_m": 3.5, "width_m": 3.0, "area_sqm": 10.5}
  ],
  "doors": [
    {"type": "main", "width_m": 1.0, "height_m": 2.1, "count": 1},
    {"type": "internal", "width_m": 0.8, "height_m": 2.0, "count": 4},
    {"type": "bathroom", "width_m": 0.75, "height_m": 2.0, "count": 2}
  ],
  "windows": [
    {"type": "standard", "width_m": 1.2, "height_m": 1.2, "count": 8},
    {"type": "small", "width_m": 0.6, "height_m": 0.6, "count": 3}
  ],
  "walls": {
    "external_thickness_mm": 230,
    "internal_thickness_mm": 115,
    "total_length_m": 85
  },
  "structure_type": "load_bearing",
  "total_built_up_sqm": 150,
  "total_room_area_sqm": 120,
  "confidence": 0.85,
  "notes": "Any observations about the floor plan quality or missing details"
}

CRITICAL RULES:

1. DETECT ALL SPACES - NO EXCEPTIONS:
   - Main rooms: Living, Dining, Bedrooms, Kitchen
   - Small rooms: Bathrooms, Toilets, Powder rooms (EVEN IF UNLABELED)
   - Utility spaces: Closets, Wardrobes, Storage, Laundry, Utility room
   - Circulation: Hallways, Corridors, Staircases, Lobbies, Passages
   - Outdoor: Balconies, Terraces, Verandas, Porches, Sit-outs
   - NEVER skip small rooms - they are critical for accurate BoQ

2. SMALL ROOM TYPICAL SIZES (use these if room is visible but unlabeled):
   - Bathroom: 1.5m × 2.0m (3.0 sqm)
   - Toilet: 1.2m × 1.5m (1.8 sqm)
   - Powder room: 1.0m × 1.5m (1.5 sqm)
   - Closet/Wardrobe: 1.0m × 1.5m (1.5 sqm)
   - Storage: 1.5m × 2.0m (3.0 sqm)
   - Hallway/Corridor: 1.0m × length (estimate from plan)
   - Staircase: 2.0m × 3.0m (6.0 sqm)
   - Balcony: 1.5m × 3.0m (4.5 sqm)

3. AREA CALCULATION:
   - If a scale bar is visible, use it to calculate actual dimensions
   - If no scale, use standard door width (0.8m) as reference for sizing
   - Calculate total_built_up_sqm from the OUTER BOUNDARY of the floor plan
   - Calculate total_room_area_sqm as the SUM of all individual room areas
   - Typical ratio: total_room_area should be 70-85% of total_built_up
   - The difference accounts for walls, columns, and circulation

4. STRUCTURE TYPE:
   - "load_bearing" if walls carry loads (no columns shown)
   - "framed" if columns are visible at intersections
   - "mixed" if both types present

5. DOORS & WINDOWS:
   - Count EVERY visible door and window
   - Main door: typically 1.0m wide
   - Internal doors: typically 0.8m wide
   - Bathroom doors: typically 0.75m wide
   - Standard windows: 1.2m × 1.2m
   - Small windows (bathroom): 0.6m × 0.6m

6. Return ONLY the JSON, no other text`;

  try {
    const response = await puter.ai.chat(prompt, imageDataUrl, { model: AI_MODEL });
    const text = typeof response === 'string' ? response : response.message?.content || response;
    return parseFloorPlanJSON(text);
  } catch (error) {
    console.error('[FloorPlanVision] AI analysis failed:', error.message);
    return {
      floor_number: floorNumber,
      rooms: [],
      doors: [],
      windows: [],
      walls: { external_thickness_mm: 230, internal_thickness_mm: 115, total_length_m: 0 },
      structure_type: 'load_bearing',
      total_built_up_sqm: 0,
      confidence: 0,
      notes: 'AI analysis failed. Please enter data manually.',
      error: error.message
    };
  }
}

/**
 * Parse JSON from AI response text
 */
function parseFloorPlanJSON(text) {
  try {
    return JSON.parse(text);
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[1].trim()); } catch {}
    }
    // Try to find JSON object in text
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try { return JSON.parse(objMatch[0]); } catch {}
    }
    return {
      floor_number: 1,
      rooms: [],
      doors: [],
      windows: [],
      walls: { external_thickness_mm: 230, internal_thickness_mm: 115, total_length_m: 0 },
      structure_type: 'load_bearing',
      total_built_up_sqm: 0,
      confidence: 0,
      notes: 'Could not parse AI response. Please enter data manually.'
    };
  }
}

/**
 * Convert File to Data URL
 */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Validate floor plan data and fill in defaults for missing fields
 */
export function validateFloorPlanData(data) {
  const validated = {
    floor_number: data.floor_number || 1,
    rooms: Array.isArray(data.rooms) ? data.rooms.map(r => ({
      name: r.name || 'Unknown Room',
      length_m: parseFloat(r.length_m) || 3.0,
      width_m: parseFloat(r.width_m) || 3.0,
      area_sqm: parseFloat(r.area_sqm) || 9.0
    })) : [],
    doors: Array.isArray(data.doors) ? data.doors.map(d => ({
      type: d.type || 'internal',
      width_m: parseFloat(d.width_m) || 0.8,
      height_m: parseFloat(d.height_m) || 2.0,
      count: parseInt(d.count) || 0
    })) : [],
    windows: Array.isArray(data.windows) ? data.windows.map(w => ({
      type: w.type || 'standard',
      width_m: parseFloat(w.width_m) || 1.2,
      height_m: parseFloat(w.height_m) || 1.2,
      count: parseInt(w.count) || 0
    })) : [],
    walls: {
      external_thickness_mm: parseInt(data.walls?.external_thickness_mm) || 230,
      internal_thickness_mm: parseInt(data.walls?.internal_thickness_mm) || 115,
      total_length_m: parseFloat(data.walls?.total_length_m) || 0
    },
    structure_type: ['load_bearing', 'framed', 'mixed'].includes(data.structure_type) 
      ? data.structure_type : 'load_bearing',
    total_built_up_sqm: parseFloat(data.total_built_up_sqm) || 0,
    total_room_area_sqm: parseFloat(data.total_room_area_sqm) || 0,
    confidence: parseFloat(data.confidence) || 0,
    notes: data.notes || ''
  };

  // Calculate total room area from rooms
  const roomAreaSum = validated.rooms.reduce((sum, r) => sum + r.area_sqm, 0);
  if (validated.total_room_area_sqm === 0) {
    validated.total_room_area_sqm = roomAreaSum;
  }

  // If total_built_up not provided, estimate from room area (rooms are typically 70-85% of built-up)
  if (validated.total_built_up_sqm === 0 && validated.total_room_area_sqm > 0) {
    validated.total_built_up_sqm = Math.round(validated.total_room_area_sqm / 0.78);
  }

  // Calculate wall length from room perimeters if not provided
  if (validated.walls.total_length_m === 0 && validated.rooms.length > 0) {
    validated.walls.total_length_m = validated.rooms.reduce((sum, r) => 
      sum + 2 * (r.length_m + r.width_m), 0);
  }

  return validated;
}

export default {
  analyzeFloorPlanVision,
  fileToDataUrl,
  validateFloorPlanData
};

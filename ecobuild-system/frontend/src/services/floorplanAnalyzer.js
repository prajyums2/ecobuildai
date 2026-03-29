/**
 * Floorplan Analyzer Service
 * Analyzes floorplan images to extract room layouts and quantities
 * 
 * This uses:
 * 1. Tesseract.js OCR for text extraction
 * 2. Basic image processing for dimension detection
 * 3. Room type classification based on size
 */

/**
 * Analyze a floorplan image and extract room information
 * @param {string} imageUrl - URL or data URL of the image
 * @returns {Promise<Object>} - Extracted data
 */
export async function analyzeFloorplan(imageUrl) {
  try {
    // Import Tesseract for OCR
    const Tesseract = await import('tesseract.js');
    
    // Perform OCR
    const worker = await Tesseract.createWorker('eng');
    const { data: { text, words } } = await worker.recognize(imageUrl);
    await worker.terminate();

    // Extract dimensions
    const dimensions = extractDimensions(text);
    
    // Extract room labels
    const rooms = extractRoomLabels(text);
    
    // Calculate areas
    const areas = calculateAreas(dimensions, rooms);

    return {
      text: text,
      dimensions: dimensions,
      rooms: rooms,
      areas: areas,
      confidence: text.length > 50 ? 'high' : text.length > 20 ? 'medium' : 'low',
    };
  } catch (error) {
    console.error('Floorplan analysis error:', error);
    return {
      text: '',
      dimensions: {},
      rooms: [],
      areas: {},
      confidence: 'error',
      error: error.message,
    };
  }
}

/**
 * Extract dimensions from OCR text
 */
function extractDimensions(text) {
  const dimensions = {
    totalArea: null,
    rooms: [],
  };

  // Pattern 1: "150 sq.m" or "150 sqm"
  const areaPattern = /(\d+\.?\d*)\s*(?:sq\.?\s*m|sqm|square\s*meter|sq\.?\s*mt)/gi;
  let match;
  while ((match = areaPattern.exec(text)) !== null) {
    const area = parseFloat(match[1]);
    if (area > 10 && area < 10000) {
      if (!dimensions.totalArea || area > dimensions.totalArea) {
        dimensions.totalArea = area;
      }
    }
  }

  // Pattern 2: "12m x 10m" or "12 x 10 m"
  const dimPattern = /(\d+\.?\d*)\s*(?:m|meter)?\s*[xX×]\s*(\d+\.?\d*)\s*(?:m|meter)?/gi;
  while ((match = dimPattern.exec(text)) !== null) {
    const l = parseFloat(match[1]);
    const w = parseFloat(match[2]);
    if (l > 0 && w > 0 && l < 100 && w < 100) {
      dimensions.rooms.push({
        length: l,
        width: w,
        area: l * w,
      });
    }
  }

  // Pattern 3: Room dimensions like "Bedroom 12x10"
  const roomDimPattern = /(bedroom|living|kitchen|bathroom|toilet|study|dining|master)\s*(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)/gi;
  while ((match = roomDimPattern.exec(text)) !== null) {
    dimensions.rooms.push({
      name: match[1],
      length: parseFloat(match[2]),
      width: parseFloat(match[3]),
      area: parseFloat(match[2]) * parseFloat(match[3]),
    });
  }

  return dimensions;
}

/**
 * Extract room labels from OCR text
 */
function extractRoomLabels(text) {
  const roomTypes = [
    'bedroom', 'living room', 'kitchen', 'bathroom', 'toilet',
    'master bedroom', 'guest room', 'study room', 'dining room',
    'store room', 'utility', 'balcony', 'veranda', 'lobby',
    'corridor', 'staircase', 'garage', 'car parking'
  ];

  const foundRooms = [];
  const lowerText = text.toLowerCase();

  roomTypes.forEach(room => {
    if (lowerText.includes(room)) {
      // Try to find dimensions next to the room label
      const roomPattern = new RegExp(`${room}\\s*(\\d+\\.?\\d*)\\s*[xX×]\\s*(\\d+\\.?\\d*)`, 'i');
      const match = text.match(roomPattern);
      
      if (match) {
        foundRooms.push({
          type: room,
          length: parseFloat(match[1]),
          width: parseFloat(match[2]),
          area: parseFloat(match[1]) * parseFloat(match[2]),
        });
      } else {
        foundRooms.push({
          type: room,
          length: null,
          width: null,
          area: null,
        });
      }
    }
  });

  return foundRooms;
}

/**
 * Calculate areas for material estimation
 */
function calculateAreas(dimensions, rooms) {
  const totalBuiltUp = dimensions.totalArea || 150;
  const numFloors = 2; // Default assumption
  
  // Room-wise breakdown
  const roomAreas = {};
  rooms.forEach(room => {
    if (room.area) {
      roomAreas[room.type] = (roomAreas[room.type] || 0) + room.area;
    }
  });

  return {
    totalBuiltUp: totalBuiltUp,
    totalFloorArea: totalBuiltUp * numFloors,
    roomBreakdown: roomAreas,
    numFloors: numFloors,
  };
}

/**
 * Get room type from dimensions
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

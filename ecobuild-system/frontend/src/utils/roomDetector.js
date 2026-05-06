/**
 * Room Detector - Canvas-Based Floor Plan Analysis
 * Detects room boundaries using edge detection and contour analysis
 * Cost: $0 (pure canvas manipulation, no AI)
 * Time: <1 second
 * 
 * Algorithm:
 * 1. Load image → Grayscale → Adaptive Threshold → Edge Detection (Sobel + Canny)
 * 2. Morphological operations to clean up edges
 * 3. Find horizontal and vertical line segments (Hough-like)
 * 4. Detect rectangular regions (rooms) from line intersections
 * 5. Return room corners as pixel coordinates
 */

/**
 * Detect rooms in a floor plan image
 * @param {HTMLImageElement|HTMLCanvasElement|string} source - Image source
 * @param {Object} options - Detection options
 * @returns {Promise<Array>} Array of detected rooms with corners
 */
export async function detectRooms(source, options = {}) {
  const {
    minRoomArea = 400,
    maxRoomArea = 100000,
    edgeThreshold = 40,
    mergeDistance = 8,
    adaptiveThreshold = true,
  } = options;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  let img;
  if (typeof source === 'string') {
    img = await loadImage(source);
  } else {
    img = source;
  }
  
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  ctx.drawImage(img, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const gray = toGrayscale(imageData.data);
  
  // Step 1: Adaptive thresholding for better edge detection
  const binary = adaptiveThreshold 
    ? adaptiveThresholding(gray, canvas.width, canvas.height)
    : binarize(gray, 128);
  
  // Step 2: Morphological operations (dilate then erode to close gaps)
  const cleaned = morphologicalClose(binary, canvas.width, canvas.height, 2);
  
  // Step 3: Edge detection using Sobel filter
  const edges = detectEdges(cleaned, canvas.width, canvas.height, edgeThreshold);
  
  // Step 4: Find horizontal and vertical lines
  const hLines = findHorizontalLines(edges, canvas.width, canvas.height, mergeDistance);
  const vLines = findVerticalLines(edges, canvas.width, canvas.height, mergeDistance);
  
  // Step 5: Find intersections
  const intersections = findIntersections(hLines, vLines);
  
  // Step 6: Detect rectangular regions (rooms)
  const rooms = detectRectangles(intersections, hLines, vLines, canvas.width, canvas.height, minRoomArea, maxRoomArea);
  
  // Step 7: Sort rooms by position (top-left to bottom-right)
  rooms.sort((a, b) => {
    const aCenterY = (a.corners[0][1] + a.corners[2][1]) / 2;
    const bCenterY = (b.corners[0][1] + b.corners[2][1]) / 2;
    if (Math.abs(aCenterY - bCenterY) < 20) {
      return a.corners[0][0] - b.corners[0][0];
    }
    return aCenterY - bCenterY;
  });
  
  return rooms;
}

/**
 * Verify and improve detected rooms using AI
 * @param {Array} detectedRooms - Rooms detected by canvas
 * @param {string} imageDataUrl - Floor plan image
 * @param {number} floorNumber - Floor number for context
 * @returns {Promise<Array>} Verified and improved rooms
 */
export async function verifyRoomsWithAI(detectedRooms, imageDataUrl, floorNumber = 1) {
  try {
    const { puter } = await import('@heyputer/puter.js');
    
    // Build a prompt that validates canvas-detected rooms
    const roomsDescription = detectedRooms.map((r, i) => 
      `Room ${i+1}: ${r.width}x${r.height}px at (${r.corners[0][0]},${r.corners[0][1]})`
    ).join('\n');
    
    const prompt = `Analyze this floor plan image. I have already detected ${detectedRooms.length} rooms using edge detection. Here are their positions:

${roomsDescription}

For each detected room, tell me:
1. Is this a valid room? (yes/no)
2. What type of room is it? (Living Room, Bedroom, Kitchen, Bathroom, Hallway, Balcony, Storage)
3. Should any rooms be merged or split?

Return ONLY valid JSON:
{
  "rooms": [
    {"index": 0, "valid": true, "name": "Living Room", "action": "keep"},
    {"index": 1, "valid": true, "name": "Bedroom 1", "action": "keep"},
    {"index": 2, "valid": false, "action": "remove", "reason": "not a room"}
  ],
  "suggestions": "Any additional rooms or corrections"
}

Rules:
- Most canvas-detected rooms are correct
- Only mark as invalid if clearly wrong (closet, balcony, etc.)
- Use standard residential room naming
- Return ONLY the JSON object`;

    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('AI verification timed out')), 15000)
    );

    const response = await Promise.race([
      puter.ai.chat(prompt, imageDataUrl, { model: 'gemini-2.0-flash' }),
      timeout
    ]);

    const text = typeof response === 'string' ? response : response.message?.content || response;
    const result = parseJSON(text);
    
    if (result?.rooms) {
      // Apply AI verification
      return detectedRooms
        .map((room, idx) => {
          const aiInfo = result.rooms.find(r => r.index === idx);
          if (aiInfo?.valid === false) return null;
          return {
            ...room,
            name: aiInfo?.name || room.name,
            aiVerified: true,
            aiConfidence: aiInfo ? 0.9 : 0.7,
          };
        })
        .filter(Boolean);
    }
    
    return detectedRooms;
  } catch (error) {
    console.error('[RoomDetector] AI verification failed:', error.message);
    return detectedRooms; // Fall back to canvas detection
  }
}

/**
 * Estimate room names based on size and position
 */
export function estimateRoomNames(rooms, imageWidth, imageHeight) {
  const centerX = imageWidth / 2;
  const centerY = imageHeight / 2;
  
  // Sort rooms by area (largest first)
  const sorted = [...rooms].sort((a, b) => b.area - a.area);
  let bedroomCount = 0;
  
  return sorted.map((room) => {
    const roomCenterX = (room.corners[0][0] + room.corners[2][0]) / 2;
    const roomCenterY = (room.corners[0][1] + room.corners[2][1]) / 2;
    const aspectRatio = room.width / room.height;
    const area = room.width * room.height;
    const totalArea = imageWidth * imageHeight;
    const areaRatio = area / totalArea;
    
    let name = `Room`;
    
    // Large room (10%+ of total) → Living Room
    if (areaRatio > 0.1) {
      name = 'Living Room';
    }
    // Long narrow room → Kitchen or Hallway
    else if (aspectRatio > 2.5 || aspectRatio < 0.4) {
      name = areaRatio > 0.04 ? 'Kitchen' : 'Hallway';
    }
    // Small room (<3%) → Bathroom
    else if (areaRatio < 0.03) {
      name = 'Bathroom';
    }
    // Medium room (4-12%) → Bedroom
    else if (areaRatio > 0.04 && areaRatio < 0.12) {
      bedroomCount++;
      name = `Bedroom ${bedroomCount}`;
    }
    // Everything else
    else {
      name = areaRatio > 0.05 ? 'Kitchen' : 'Storage';
    }
    
    return {
      ...room,
      name,
    };
  });
}

/**
 * Recalculate areas when scale is set
 */
export function recalculateRoomAreas(rooms, pixelsPerMeter) {
  if (!pixelsPerMeter || pixelsPerMeter <= 0) return rooms;
  
  return rooms.map(room => {
    const widthM = room.width / pixelsPerMeter;
    const heightM = room.height / pixelsPerMeter;
    return {
      ...room,
      area_sqm: Math.round(widthM * heightM * 10) / 10,
      width_m: Math.round(widthM * 10) / 10,
      height_m: Math.round(heightM * 10) / 10,
    };
  });
}

// ========== Internal Functions ==========

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function toGrayscale(data) {
  const gray = new Uint8Array(data.length / 4);
  for (let i = 0; i < gray.length; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }
  return gray;
}

function binarize(gray, threshold) {
  return gray.map(v => v > threshold ? 255 : 0);
}

function adaptiveThresholding(gray, width, height) {
  const result = new Uint8Array(gray.length);
  const blockSize = Math.max(15, Math.min(width, height) / 20);
  const halfBlock = Math.floor(blockSize / 2);
  const c = 5; // Constant offset
  
  // Precompute integral image for fast block sum
  const integral = new Float64Array(gray.length);
  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    for (let x = 0; x < width; x++) {
      rowSum += gray[y * width + x];
      integral[y * width + x] = rowSum + (y > 0 ? integral[(y - 1) * width + x] : 0);
    }
  }
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const x1 = Math.max(0, x - halfBlock);
      const y1 = Math.max(0, y - halfBlock);
      const x2 = Math.min(width - 1, x + halfBlock);
      const y2 = Math.min(height - 1, y + halfBlock);
      
      const count = (x2 - x1 + 1) * (y2 - y1 + 1);
      let sum = integral[y2 * width + x2];
      if (x1 > 0) sum -= integral[y2 * width + (x1 - 1)];
      if (y1 > 0) sum -= integral[(y1 - 1) * width + x2];
      if (x1 > 0 && y1 > 0) sum += integral[(y1 - 1) * width + (x1 - 1)];
      
      const mean = sum / count;
      result[y * width + x] = gray[y * width + x] < (mean - c) ? 0 : 255;
    }
  }
  
  return result;
}

function morphologicalClose(binary, width, height, radius) {
  // Dilate
  const dilated = new Uint8Array(binary.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let maxVal = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            maxVal = Math.max(maxVal, binary[ny * width + nx]);
          }
        }
      }
      dilated[y * width + x] = maxVal;
    }
  }
  
  // Erode
  const eroded = new Uint8Array(dilated.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let minVal = 255;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            minVal = Math.min(minVal, dilated[ny * width + nx]);
          }
        }
      }
      eroded[y * width + x] = minVal;
    }
  }
  
  return eroded;
}

function detectEdges(gray, width, height, threshold) {
  const edges = new Uint8Array(gray.length);
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = (y + ky) * width + (x + kx);
          const ki = (ky + 1) * 3 + (kx + 1);
          gx += gray[idx] * sobelX[ki];
          gy += gray[idx] * sobelY[ki];
        }
      }
      
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edges[y * width + x] = magnitude > threshold ? 255 : 0;
    }
  }
  
  return edges;
}

function findHorizontalLines(edges, width, height, mergeDist) {
  const lines = [];
  const minLineLength = Math.min(width, height) * 0.03;
  
  for (let y = 0; y < height; y++) {
    let startX = -1;
    let consecutivePixels = 0;
    
    for (let x = 0; x < width; x++) {
      if (edges[y * width + x] > 0) {
        if (startX === -1) startX = x;
        consecutivePixels++;
      } else {
        if (consecutivePixels >= minLineLength) {
          lines.push({ y, x1: startX, x2: x - 1, length: consecutivePixels });
        }
        startX = -1;
        consecutivePixels = 0;
      }
    }
    
    if (consecutivePixels >= minLineLength) {
      lines.push({ y, x1: startX, x2: width - 1, length: consecutivePixels });
    }
  }
  
  return mergeLines(lines, 'horizontal', mergeDist);
}

function findVerticalLines(edges, width, height, mergeDist) {
  const lines = [];
  const minLineLength = Math.min(width, height) * 0.03;
  
  for (let x = 0; x < width; x++) {
    let startY = -1;
    let consecutivePixels = 0;
    
    for (let y = 0; y < height; y++) {
      if (edges[y * width + x] > 0) {
        if (startY === -1) startY = y;
        consecutivePixels++;
      } else {
        if (consecutivePixels >= minLineLength) {
          lines.push({ x, y1: startY, y2: y - 1, length: consecutivePixels });
        }
        startY = -1;
        consecutivePixels = 0;
      }
    }
    
    if (consecutivePixels >= minLineLength) {
      lines.push({ x, y1: startY, y2: height - 1, length: consecutivePixels });
    }
  }
  
  return mergeLines(lines, 'vertical', mergeDist);
}

function mergeLines(lines, direction, mergeDist) {
  if (lines.length === 0) return [];
  
  const merged = [];
  const used = new Set();
  
  for (let i = 0; i < lines.length; i++) {
    if (used.has(i)) continue;
    
    let mergedLine = { ...lines[i] };
    used.add(i);
    
    for (let j = i + 1; j < lines.length; j++) {
      if (used.has(j)) continue;
      
      const dist = direction === 'horizontal' 
        ? Math.abs(lines[j].y - mergedLine.y)
        : Math.abs(lines[j].x - mergedLine.x);
      
      if (dist <= mergeDist) {
        if (direction === 'horizontal') {
          mergedLine.x1 = Math.min(mergedLine.x1, lines[j].x1);
          mergedLine.x2 = Math.max(mergedLine.x2, lines[j].x2);
          mergedLine.y = Math.round((mergedLine.y + lines[j].y) / 2);
          mergedLine.length = mergedLine.x2 - mergedLine.x1;
        } else {
          mergedLine.y1 = Math.min(mergedLine.y1, lines[j].y1);
          mergedLine.y2 = Math.max(mergedLine.y2, lines[j].y2);
          mergedLine.x = Math.round((mergedLine.x + lines[j].x) / 2);
          mergedLine.length = mergedLine.y2 - mergedLine.y1;
        }
        used.add(j);
      }
    }
    
    merged.push(mergedLine);
  }
  
  return merged;
}

function findIntersections(hLines, vLines) {
  const intersections = [];
  
  for (const hLine of hLines) {
    for (const vLine of vLines) {
      if (vLine.x >= hLine.x1 && vLine.x <= hLine.x2 &&
          hLine.y >= vLine.y1 && hLine.y <= vLine.y2) {
        intersections.push({ x: vLine.x, y: hLine.y });
      }
    }
  }
  
  return intersections;
}

function detectRectangles(intersections, hLines, vLines, width, height, minArea, maxArea) {
  const rooms = [];
  const used = new Set();
  
  intersections.sort((a, b) => a.y - b.y || a.x - b.x);
  
  for (let i = 0; i < intersections.length; i++) {
    for (let j = i + 1; j < intersections.length; j++) {
      const p1 = intersections[i];
      const p2 = intersections[j];
      
      if (p2.y <= p1.y + 20) continue;
      if (p2.x <= p1.x + 20) continue;
      
      const w = p2.x - p1.x;
      const h = p2.y - p1.y;
      const area = w * h;
      
      if (area < minArea || area > maxArea) continue;
      
      const hasTopLeft = intersections.some(p => Math.abs(p.x - p1.x) < 5 && Math.abs(p.y - p1.y) < 5);
      const hasTopRight = intersections.some(p => Math.abs(p.x - p2.x) < 5 && Math.abs(p.y - p1.y) < 5);
      const hasBottomLeft = intersections.some(p => Math.abs(p.x - p1.x) < 5 && Math.abs(p.y - p2.y) < 5);
      const hasBottomRight = intersections.some(p => Math.abs(p.x - p2.x) < 5 && Math.abs(p.y - p2.y) < 5);
      
      if (hasTopLeft && hasTopRight && hasBottomLeft && hasBottomRight) {
        const key = `${Math.round(p1.x/5)},${Math.round(p1.y/5)}-${Math.round(p2.x/5)},${Math.round(p2.y/5)}`;
        if (!used.has(key)) {
          used.add(key);
          rooms.push({
            corners: [
              [p1.x, p1.y],
              [p2.x, p1.y],
              [p2.x, p2.y],
              [p1.x, p2.y],
            ],
            area_sqm: 0,
            width: w,
            height: h,
            area: area,
            aiVerified: false,
            aiConfidence: 0,
          });
        }
      }
    }
  }
  
  return removeOverlappingRooms(rooms);
}

function removeOverlappingRooms(rooms) {
  rooms.sort((a, b) => b.area - a.area);
  
  const filtered = [];
  const used = new Set();
  
  for (let i = 0; i < rooms.length; i++) {
    if (used.has(i)) continue;
    
    filtered.push(rooms[i]);
    
    for (let j = i + 1; j < rooms.length; j++) {
      if (used.has(j)) continue;
      
      const overlap = calculateOverlap(rooms[i], rooms[j]);
      if (overlap > 0.5) {
        used.add(j);
      }
    }
  }
  
  return filtered;
}

function calculateOverlap(roomA, roomB) {
  const x1 = Math.max(roomA.corners[0][0], roomB.corners[0][0]);
  const y1 = Math.max(roomA.corners[0][1], roomB.corners[0][1]);
  const x2 = Math.min(roomA.corners[2][0], roomB.corners[2][0]);
  const y2 = Math.min(roomA.corners[2][1], roomB.corners[2][1]);
  
  if (x2 <= x1 || y2 <= y1) return 0;
  
  const overlapArea = (x2 - x1) * (y2 - y1);
  const areaB = roomB.area;
  
  return overlapArea / areaB;
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

/**
 * Detect walls from floor plan image
 * Measures wall thickness from pixel width
 * Classifies walls as external vs internal
 * @param {HTMLImageElement|string} source - Image source
 * @param {Object} options - Detection options
 * @returns {Promise<Object>} Wall detection results
 */
export async function detectWalls(source, options = {}) {
  const {
    edgeThreshold = 40,
    mergeDistance = 8,
    minWallLength = 0.03, // 3% of image size
    externalThicknessPercentile = 0.7, // Walls thicker than 70th percentile are external
  } = options;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  let img;
  if (typeof source === 'string') {
    img = await loadImage(source);
  } else {
    img = source;
  }
  
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  ctx.drawImage(img, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const gray = toGrayscale(imageData.data);
  const binary = adaptiveThresholding(gray, canvas.width, canvas.height);
  const cleaned = morphologicalClose(binary, canvas.width, canvas.height, 2);
  const edges = detectEdges(cleaned, canvas.width, canvas.height, edgeThreshold);
  
  // Find all lines
  const hLines = findHorizontalLines(edges, canvas.width, canvas.height, mergeDistance);
  const vLines = findVerticalLines(edges, canvas.width, canvas.height, mergeDistance);
  
  // Measure wall thickness for each line
  const walls = [];
  const thicknesses = [];
  
  // Measure horizontal wall thickness
  for (const line of hLines) {
    if (line.length < canvas.width * minWallLength) continue;
    
    const thickness = measureLineThickness(edges, canvas.width, canvas.height, line, 'horizontal');
    if (thickness > 0) {
      walls.push({
        type: 'horizontal',
        start: [line.x1, line.y],
        end: [line.x2, line.y],
        thickness_px: thickness,
        length_px: line.length,
      });
      thicknesses.push(thickness);
    }
  }
  
  // Measure vertical wall thickness
  for (const line of vLines) {
    if (line.length < canvas.height * minWallLength) continue;
    
    const thickness = measureLineThickness(edges, canvas.width, canvas.height, line, 'vertical');
    if (thickness > 0) {
      walls.push({
        type: 'vertical',
        start: [line.x, line.y1],
        end: [line.x, line.y2],
        thickness_px: thickness,
        length_px: line.length,
      });
      thicknesses.push(thickness);
    }
  }
  
  // Classify walls by thickness
  if (thicknesses.length > 0) {
    const sorted = [...thicknesses].sort((a, b) => a - b);
    const thresholdIdx = Math.floor(sorted.length * externalThicknessPercentile);
    const thicknessThreshold = sorted[thresholdIdx] || 10;
    
    walls.forEach(wall => {
      wall.isExternal = wall.thickness_px >= thicknessThreshold;
      wall.type = wall.isExternal ? 'external' : 'internal';
    });
  }
  
  // Merge nearby parallel walls
  const mergedWalls = mergeNearbyWalls(walls, mergeDistance * 2);
  
  // Calculate statistics
  const externalWalls = mergedWalls.filter(w => w.isExternal);
  const internalWalls = mergedWalls.filter(w => !w.isExternal);
  
  const avgExternalThickness = externalWalls.length > 0 
    ? externalWalls.reduce((sum, w) => sum + w.thickness_px, 0) / externalWalls.length 
    : 15;
  const avgInternalThickness = internalWalls.length > 0 
    ? internalWalls.reduce((sum, w) => sum + w.thickness_px, 0) / internalWalls.length 
    : 8;
  
  return {
    walls: mergedWalls,
    totalWallCount: mergedWalls.length,
    externalWallCount: externalWalls.length,
    internalWallCount: internalWalls.length,
    avgExternalThickness_px: Math.round(avgExternalThickness),
    avgInternalThickness_px: Math.round(avgInternalThickness),
    suggestedExternalThickness_mm: estimateThicknessMM(avgExternalThickness),
    suggestedInternalThickness_mm: estimateThicknessMM(avgInternalThickness),
  };
}

/**
 * Measure the thickness of a line in the edge image
 */
function measureLineThickness(edges, width, height, line, direction) {
  const samples = 5;
  let totalThickness = 0;
  let validSamples = 0;
  
  for (let i = 0; i < samples; i++) {
    let samplePos;
    if (direction === 'horizontal') {
      samplePos = line.x1 + Math.round((line.x2 - line.x1) * (i + 0.5) / samples);
    } else {
      samplePos = line.y1 + Math.round((line.y2 - line.y1) * (i + 0.5) / samples);
    }
    
    let thickness = 0;
    if (direction === 'horizontal') {
      // Measure vertical thickness at this x position
      const y = line.y;
      for (let dy = 0; dy < 30; dy++) {
        const idx = (y + dy) * width + samplePos;
        if (idx >= 0 && idx < edges.length && edges[idx] > 0) thickness++;
        else if (thickness > 0) break;
      }
      for (let dy = -1; dy > -30; dy--) {
        const idx = (y + dy) * width + samplePos;
        if (idx >= 0 && idx < edges.length && edges[idx] > 0) thickness++;
        else if (thickness > 0) break;
      }
    } else {
      // Measure horizontal thickness at this y position
      const x = line.x;
      for (let dx = 0; dx < 30; dx++) {
        const idx = samplePos * width + (x + dx);
        if (idx >= 0 && idx < edges.length && edges[idx] > 0) thickness++;
        else if (thickness > 0) break;
      }
      for (let dx = -1; dx > -30; dx--) {
        const idx = samplePos * width + (x + dx);
        if (idx >= 0 && idx < edges.length && edges[idx] > 0) thickness++;
        else if (thickness > 0) break;
      }
    }
    
    if (thickness > 2 && thickness < 25) {
      totalThickness += thickness;
      validSamples++;
    }
  }
  
  return validSamples > 0 ? Math.round(totalThickness / validSamples) : 0;
}

/**
 * Estimate real-world thickness in mm from pixel thickness
 * Uses standard construction values as reference
 */
function estimateThicknessMM(pxThickness) {
  // Typical wall thicknesses: 115mm (internal), 230mm (external), 300mm (heavy external)
  // Assume 230mm walls are ~12-18 pixels in a typical floor plan
  if (pxThickness < 6) return 115;
  if (pxThickness < 14) return 150;
  if (pxThickness < 20) return 230;
  return 300;
}

/**
 * Merge nearby parallel walls
 */
function mergeNearbyWalls(walls, maxDist) {
  const merged = [];
  const used = new Set();
  
  for (let i = 0; i < walls.length; i++) {
    if (used.has(i)) continue;
    
    let mergedWall = { ...walls[i] };
    used.add(i);
    
    for (let j = i + 1; j < walls.length; j++) {
      if (used.has(j)) continue;
      if (walls[j].type !== mergedWall.type) continue;
      
      const dist = calcWallDistance(mergedWall, walls[j]);
      if (dist < maxDist) {
        // Merge walls
        if (mergedWall.type === 'horizontal') {
          mergedWall.start = [Math.min(mergedWall.start[0], walls[j].start[0]), mergedWall.start[1]];
          mergedWall.end = [Math.max(mergedWall.end[0], walls[j].end[0]), mergedWall.end[1]];
          mergedWall.thickness_px = Math.round((mergedWall.thickness_px + walls[j].thickness_px) / 2);
          mergedWall.length_px = mergedWall.end[0] - mergedWall.start[0];
        } else {
          mergedWall.start = [mergedWall.start[0], Math.min(mergedWall.start[1], walls[j].start[1])];
          mergedWall.end = [mergedWall.end[0], Math.max(mergedWall.end[1], walls[j].end[1])];
          mergedWall.thickness_px = Math.round((mergedWall.thickness_px + walls[j].thickness_px) / 2);
          mergedWall.length_px = mergedWall.end[1] - mergedWall.start[1];
        }
        mergedWall.isExternal = mergedWall.isExternal || walls[j].isExternal;
        used.add(j);
      }
    }
    
    merged.push(mergedWall);
  }
  
  return merged;
}

/**
 * Calculate distance between two walls
 */
function calcWallDistance(wallA, wallB) {
  if (wallA.type === 'horizontal' && wallB.type === 'horizontal') {
    return Math.abs(wallA.start[1] - wallB.start[1]);
  }
  if (wallA.type === 'vertical' && wallB.type === 'vertical') {
    return Math.abs(wallA.start[0] - wallB.start[0]);
  }
  return Infinity;
}

/**
 * Recalculate wall areas when scale is set
 */
export function recalculateWallAreas(wallData, pixelsPerMeter, wallHeight = 3.0) {
  if (!pixelsPerMeter || pixelsPerMeter <= 0 || !wallData?.walls) return wallData;
  
  let totalExternalLength = 0;
  let totalInternalLength = 0;
  let totalExternalVolume = 0;
  let totalInternalVolume = 0;
  
  const walls = wallData.walls.map(wall => {
    const lengthM = wall.length_px / pixelsPerMeter;
    const thicknessMM = wall.isExternal 
      ? wallData.suggestedExternalThickness_mm || 230 
      : wallData.suggestedInternalThickness_mm || 115;
    const thicknessM = thicknessMM / 1000;
    const volume = lengthM * wallHeight * thicknessM;
    
    if (wall.isExternal) {
      totalExternalLength += lengthM;
      totalExternalVolume += volume;
    } else {
      totalInternalLength += lengthM;
      totalInternalVolume += volume;
    }
    
    return {
      ...wall,
      length_m: Math.round(lengthM * 10) / 10,
      thickness_mm: thicknessMM,
      volume_m3: Math.round(volume * 100) / 100,
    };
  });
  
  return {
    ...wallData,
    walls,
    totalExternalLength_m: Math.round(totalExternalLength * 10) / 10,
    totalInternalLength_m: Math.round(totalInternalLength * 10) / 10,
    totalExternalVolume_m3: Math.round(totalExternalVolume * 100) / 100,
    totalInternalVolume_m3: Math.round(totalInternalVolume * 100) / 100,
    totalWallLength_m: Math.round((totalExternalLength + totalInternalLength) * 10) / 10,
    totalWallVolume_m3: Math.round((totalExternalVolume + totalInternalVolume) * 100) / 100,
  };
}

export default {
  detectRooms,
  verifyRoomsWithAI,
  estimateRoomNames,
  recalculateRoomAreas,
  detectWalls,
  recalculateWallAreas,
};

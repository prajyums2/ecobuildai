/**
 * Floor Plan Image Processor
 * Canvas-based preprocessing for floor plan images
 * - Removes white background (makes it transparent)
 * - Enhances contrast for better edge detection
 * - Preserves anti-aliased edges (smooth, not jagged)
 * 
 * Cost: $0 (pure canvas manipulation, no AI)
 * Time: <1 second
 */

/**
 * Process a floor plan image to remove white background and enhance edges
 * @param {HTMLImageElement|HTMLCanvasElement} source - The source image
 * @param {Object} options - Processing options
 * @param {number} options.whiteThreshold - RGB threshold for white detection (default: 240)
 * @param {number} options.contrast - Contrast enhancement factor (default: 1.2)
 * @param {boolean} options.preserveEdges - Preserve anti-aliased edges (default: true)
 * @returns {Promise<string>} Processed image as data URL
 */
export async function preprocessFloorPlan(source, options = {}) {
  const {
    whiteThreshold = 240,
    contrast = 1.2,
    preserveEdges = true,
  } = options;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = source.naturalWidth || source.width;
  canvas.height = source.naturalHeight || source.height;
  
  ctx.drawImage(source, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // First pass: calculate statistics for adaptive processing
  let whitePixelCount = 0;
  let darkPixelCount = 0;
  const totalPixels = canvas.width * canvas.height;
  
  for (let i = 0; i < data.length; i += 4) {
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    if (brightness > whiteThreshold) whitePixelCount++;
    else if (brightness < 128) darkPixelCount++;
  }
  
  const whiteRatio = whitePixelCount / totalPixels;
  
  // Only process if image has significant white areas (>30%)
  if (whiteRatio < 0.3) {
    return source.src || canvas.toDataURL();
  }
  
  // Second pass: process pixels
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = (r + g + b) / 3;
    
    if (preserveEdges) {
      // Check if this is an edge pixel (has neighboring dark pixels)
      const isEdge = isEdgePixel(data, i, canvas.width, canvas.height, whiteThreshold);
      
      if (isEdge) {
        // Enhance edge contrast but preserve anti-aliasing
        const factor = contrast;
        data[i] = clamp(r * factor);
        data[i + 1] = clamp(g * factor);
        data[i + 2] = clamp(b * factor);
        data[i + 3] = 255; // Keep edge pixels opaque
      } else if (brightness > whiteThreshold) {
        // Make white pixels transparent with smooth falloff
        const alpha = Math.max(0, 255 - (brightness - whiteThreshold) * 5);
        data[i + 3] = alpha;
      } else {
        // Dark pixels: enhance contrast
        const factor = contrast;
        data[i] = clamp(r * factor);
        data[i + 1] = clamp(g * factor);
        data[i + 2] = clamp(b * factor);
        data[i + 3] = 255;
      }
    } else {
      // Simple processing: no edge preservation
      if (brightness > whiteThreshold) {
        const alpha = Math.max(0, 255 - (brightness - whiteThreshold) * 5);
        data[i + 3] = alpha;
      } else {
        const factor = contrast;
        data[i] = clamp(r * factor);
        data[i + 1] = clamp(g * factor);
        data[i + 2] = clamp(b * factor);
        data[i + 3] = 255;
      }
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Check if a pixel is part of an edge (has neighboring dark pixels)
 */
function isEdgePixel(data, index, width, height, threshold) {
  const x = (index / 4) % width;
  const y = Math.floor((index / 4) / width);
  
  // Check 8 neighbors
  const neighbors = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0],           [1, 0],
    [-1, 1],  [0, 1],  [1, 1],
  ];
  
  for (const [dx, dy] of neighbors) {
    const nx = x + dx;
    const ny = y + dy;
    
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
    
    const ni = (ny * width + nx) * 4;
    const brightness = (data[ni] + data[ni + 1] + data[ni + 2]) / 3;
    
    if (brightness < threshold - 20) {
      return true; // Found a dark neighbor
    }
  }
  
  return false;
}

/**
 * Clamp value to 0-255 range
 */
function clamp(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * Calculate the percentage of white pixels in an image
 * @param {HTMLImageElement} image - The source image
 * @param {number} threshold - White threshold (default: 240)
 * @returns {Promise<number>} White pixel percentage (0-1)
 */
export async function calculateWhitePercentage(image, threshold = 240) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  
  ctx.drawImage(image, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  let whiteCount = 0;
  const totalPixels = canvas.width * canvas.height;
  
  for (let i = 0; i < data.length; i += 4) {
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    if (brightness > threshold) whiteCount++;
  }
  
  return whiteCount / totalPixels;
}

export default {
  preprocessFloorPlan,
  calculateWhitePercentage,
};

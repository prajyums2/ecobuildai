"""
Floorplan Analyzer Service
Analyzes floorplan images to extract room layouts and quantities

This module provides intelligent floorplan analysis using:
1. Image feature extraction
2. Room detection based on shape analysis
3. Quantity estimation based on detected features
"""

import cv2
import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import json
import os

@dataclass
class RoomInfo:
    """Detected room information"""
    name: str
    area: float  # sq.m
    length: float  # m
    width: float  # m
    confidence: float  # 0-1

@dataclass
class FloorplanAnalysis:
    """Complete floorplan analysis result"""
    total_area: float  # sq.m
    rooms: List[RoomInfo]
    walls_detected: int
    openings_detected: int
    confidence: float
    dimensions: Dict[str, float]
    scale_used: float = 0.0  # meters per pixel
    scale_method: str = ""  # how scale was determined

class FloorplanAnalyzer:
    """
    Intelligent floorplan analyzer
    Uses image processing to detect rooms and estimate quantities
    """
    
    # Room type classifications based on size
    ROOM_TYPES = {
        'Master Bedroom': {'min_area': 15, 'max_area': 30},
        'Bedroom': {'min_area': 10, 'max_area': 20},
        'Living Room': {'min_area': 20, 'max_area': 50},
        'Kitchen': {'min_area': 8, 'max_area': 20},
        'Bathroom': {'min_area': 3, 'max_area': 10},
        'Dining Room': {'min_area': 12, 'max_area': 25},
        'Study': {'min_area': 8, 'max_area': 15},
        'Store': {'min_area': 3, 'max_area': 8},
    }
    
    def __init__(self):
        self.min_room_area = 3  # sq.m
        self.max_room_area = 100  # sq.m
        # Default scale factor (m per pixel) - can be overridden by environment
        self.default_scale = float(os.getenv('FLOORPLAN_SCALE', '0.02'))
        # User calibration storage
        self._calibrated_scale: Optional[float] = None
    
    def calibrate_scale(self, pixel_distance: float, real_distance: float) -> float:
        """Calibrate scale using a known measurement (draw a line of known length)."""
        if pixel_distance <= 0 or real_distance <= 0:
            raise ValueError("Distances must be positive")
        self._calibrated_scale = real_distance / pixel_distance
        return self._calibrated_scale
    
    def reset_calibration(self):
        """Reset user calibration"""
        self._calibrated_scale = None
    
    def _get_dpi_scale(self, image_path: str) -> Tuple[Optional[float], str]:
        """Try to determine scale from image DPI metadata."""
        try:
            from PIL import Image
            from PIL.ExifTags import TAGS
            with Image.open(image_path) as img:
                # Try EXIF first
                exif_data = img._getexif()
                if exif_data:
                    x_dpi = y_dpi = None
                    for tag_id, value in exif_data.items():
                        tag = TAGS.get(tag_id, tag_id)
                        if tag == 'XResolution' and value:
                            x_dpi = value[0] / value[1] if isinstance(value, tuple) else value
                        if tag == 'YResolution' and value:
                            y_dpi = value[0] / value[1] if isinstance(value, tuple) else value
                    if x_dpi and x_dpi > 0:
                        dpi = (x_dpi + (y_dpi or x_dpi)) / 2.0
                        return 0.0254 / dpi, f"DPI from EXIF ({dpi:.0f} DPI)"
                
                # Try img.info for DPI
                if 'dpi' in img.info:
                    dpi = img.info['dpi']
                    avg_dpi = ((dpi[0] + dpi[1]) / 2.0) if isinstance(dpi, tuple) else float(dpi)
                    if avg_dpi > 0:
                        return 0.0254 / avg_dpi, f"DPI from image info ({avg_dpi:.0f} DPI)"
        except (ImportError, Exception):
            pass
        return None, "No DPI metadata found"
    
    def _get_fallback_scale(self, img_width: int, img_height: int, img_path: str) -> Tuple[float, str]:
        """Calculate scale based on typical floorplan image characteristics."""
        # Try DPI first
        dpi_scale, dpi_method = self._get_dpi_scale(img_path)
        if dpi_scale is not None:
            return dpi_scale, dpi_method
        
        # Fallback: estimate from image size assuming typical residential building (10m wide)
        typical_building_width_m = 10.0
        drawing_area_ratio = 0.8
        scale = typical_building_width_m / (img_width * drawing_area_ratio)
        return scale, f"Estimated ({img_width}px width, assumed {typical_building_width_m}m building)"
    
    def _get_scale(self, image_path: str, img_width: int, img_height: int) -> Tuple[float, str]:
        """Get scale factor: user calibration > DPI > fallback estimation."""
        if self._calibrated_scale is not None:
            return self._calibrated_scale, "User calibrated"
        return self._get_fallback_scale(img_width, img_height, image_path)
    
    def analyze_image(self, image_path: str, scale_factor: Optional[float] = None) -> FloorplanAnalysis:
        """
        Analyze floorplan image
        Returns detected rooms and quantities
        """
        try:
            # Read image
            img = cv2.imread(image_path)
            if img is None:
                raise ValueError("Could not read image")
            
            # Get image dimensions
            height, width = img.shape[:2]
            
            # Convert to grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Apply threshold
            _, binary = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)
            
            # Find contours
            contours, _ = cv2.findContours(binary, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
            
            # Determine scale factor (m per pixel)
            if scale_factor is not None:
                scale = scale_factor
                scale_method = "User provided"
            else:
                scale, scale_method = self._get_scale(image_path, width, height)
            
            # Detect rooms (enclosed areas)
            rooms = self._detect_rooms(contours, width, height, scale)
            
            # Detect walls (linear features)
            walls = self._detect_walls(contours)
            
            # Calculate total area
            total_area = sum(r.area for r in rooms) if rooms else 0
            
            # Apply reasonable constraints
            if total_area > 0:
                # Cap at reasonable limits (50-2000 sq.m for residential)
                if total_area < 50 or total_area > 2000:
                    total_area = 0  # Invalid, will require manual entry
            
            # Estimate building dimensions
            if total_area > 0:
                # Assume roughly square building
                side = np.sqrt(total_area)
                dimensions = {
                    'length': round(side * 1.2, 1),
                    'width': round(side / 1.2, 1),
                    'height': 3.0,
                }
            else:
                dimensions = {'length': 0, 'width': 0, 'height': 0}
            
            return FloorplanAnalysis(
                total_area=round(total_area, 1),
                rooms=rooms,
                walls_detected=len(walls),
                openings_detected=0,
                confidence=0.7 if rooms else 0.3,
                dimensions=dimensions,
                scale_used=scale,
                scale_method=scale_method
            )
            
        except Exception as e:
            print(f"Analysis error: {e}")
            return FloorplanAnalysis(
                total_area=0,
                rooms=[],
                walls_detected=0,
                openings_detected=0,
                confidence=0,
                dimensions={'length': 0, 'width': 0, 'height': 0},
                scale_used=0,
                scale_method="Error"
            )
    
    def _detect_rooms(self, contours, img_width, img_height, scale) -> List[RoomInfo]:
        """Detect rooms from contours using given scale (m per pixel)"""
        rooms = []
        
        for contour in contours:
            # Calculate area in pixels
            area_px = cv2.contourArea(contour)
            
            # Skip small contours
            if area_px < 1000:
                continue
            
            # Get bounding box
            x, y, w, h = cv2.boundingRect(contour)
            
            # Convert to meters using provided scale
            area_m = area_px * (scale ** 2)
            width_m = w * scale
            height_m = h * scale
            
            # Classify room
            room_type = self._classify_room(area_m, width_m, height_m)
            
            rooms.append(RoomInfo(
                name=room_type,
                area=round(area_m, 1),
                length=round(max(width_m, height_m), 1),
                width=round(min(width_m, height_m), 1),
                confidence=0.8
            ))
        
        return rooms
    
    def _classify_room(self, area, length, width) -> str:
        """Classify room based on area and dimensions"""
        for room_type, criteria in self.ROOM_TYPES.items():
            if criteria['min_area'] <= area <= criteria['max_area']:
                return room_type
        return 'Room'
    
    def _detect_walls(self, contours) -> List:
        """Detect wall segments"""
        walls = []
        for contour in contours:
            perimeter = cv2.arcLength(contour, True)
            if perimeter > 50:
                walls.append(contour)
        return walls
    
    def calculate_quantities(self, analysis: FloorplanAnalysis, floors: int = 1) -> Dict:
        """
        Calculate material quantities based on analysis
        Uses IS code calibrated ratios
        """
        total_area = analysis.total_area * floors
        
        if total_area <= 300:
            concrete_ratio = 0.112
            steel_ratio = 10.3
            blocks_ratio = 7.0
        elif total_area <= 800:
            concrete_ratio = 0.18
            steel_ratio = 18.0
            blocks_ratio = 12.0
        else:
            concrete_ratio = 0.25
            steel_ratio = 28.0
            blocks_ratio = 11.0
        
        concrete = round(total_area * concrete_ratio)
        steel = round(total_area * steel_ratio)
        blocks = round(total_area * blocks_ratio)
        
        return {
            'area': round(analysis.total_area),
            'floors': floors,
            'concrete': concrete,
            'steel': steel,
            'blocks': blocks,
            'aggregate': round(concrete * 0.9 * 35.31),
            'sand': round(concrete * 0.45 * 35.31),
            'cement': round(concrete * 6.5),
            'rooms': len(analysis.rooms),
            'walls': analysis.walls_detected,
        }

# Global analyzer instance
analyzer = FloorplanAnalyzer()

def analyze_floorplan(image_path: str, floors: int = 1, scale_factor: Optional[float] = None) -> Dict:
    """
    Analyze a floorplan image
    Returns analysis and quantities
    """
    analysis = analyzer.analyze_image(image_path, scale_factor)
    quantities = analyzer.calculate_quantities(analysis, floors)
    
    return {
        'analysis': {
            'total_area': analysis.total_area,
            'rooms': [
                {
                    'name': r.name,
                    'area': r.area,
                    'length': r.length,
                    'width': r.width,
                    'confidence': r.confidence
                } for r in analysis.rooms
            ],
            'walls': analysis.walls_detected,
            'dimensions': analysis.dimensions,
            'confidence': analysis.confidence,
            'scale_used': analysis.scale_used,
            'scale_method': analysis.scale_method,
        },
        'quantities': quantities,
    }

def calibrate_floorplan_scale(pixel_distance: float, real_distance: float) -> Dict:
    """
    Calibrate the floorplan scale using a known measurement.
    
    Args:
        pixel_distance: Distance in pixels between two points
        real_distance: Known real-world distance in meters
        
    Returns:
        Calibration result with scale factor
    """
    try:
        scale = analyzer.calibrate_scale(pixel_distance, real_distance)
        return {
            'success': True,
            'scale': scale,
            'scale_display': f"{scale:.6f} m/pixel",
            'pixels_per_meter': 1.0 / scale,
            'message': f"Scale calibrated: 1 meter = {1.0/scale:.1f} pixels"
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def reset_floorplan_calibration() -> Dict:
    """Reset the floorplan scale calibration"""
    analyzer.reset_calibration()
    return {'success': True, 'message': 'Calibration reset'}

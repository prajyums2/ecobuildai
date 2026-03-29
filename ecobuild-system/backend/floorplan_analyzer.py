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
    
    def analyze_image(self, image_path: str) -> FloorplanAnalysis:
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
            
            # Detect rooms (enclosed areas)
            rooms = self._detect_rooms(contours, width, height)
            
            # Detect walls (linear features)
            walls = self._detect_walls(contours)
            
            # Calculate total area
            total_area = sum(r.area for r in rooms) if rooms else 0
            
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
                dimensions=dimensions
            )
            
        except Exception as e:
            print(f"Analysis error: {e}")
            return FloorplanAnalysis(
                total_area=0,
                rooms=[],
                walls_detected=0,
                openings_detected=0,
                confidence=0,
                dimensions={'length': 0, 'width': 0, 'height': 0}
            )
    
    def _detect_rooms(self, contours, img_width, img_height) -> List[RoomInfo]:
        """Detect rooms from contours"""
        rooms = []
        
        for contour in contours:
            # Calculate area in pixels
            area_px = cv2.contourArea(contour)
            
            # Skip small contours
            if area_px < 1000:
                continue
            
            # Get bounding box
            x, y, w, h = cv2.boundingRect(contour)
            
            # Convert to meters (assume 1 pixel = 0.02m for typical floorplan)
            scale = 0.02  # m per pixel
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

def analyze_floorplan(image_path: str, floors: int = 1) -> Dict:
    """
    Analyze a floorplan image
    Returns analysis and quantities
    """
    analysis = analyzer.analyze_image(image_path)
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
        },
        'quantities': quantities,
    }

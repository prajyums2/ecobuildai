"""
Floorplan Analyzer Service
Analyzes floorplan images to extract room layouts and quantities

This module provides intelligent floorplan analysis using:
1. Image feature extraction
2. Room detection based on shape analysis (with contour filtering and hierarchy)
3. Opening detection (doors/windows) for area subtraction
4. Quantity estimation based on detected features and user-specified structural parameters
"""

import cv2
import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import json
import os
import math

@dataclass
class RoomInfo:
    """Detected room information"""
    name: str
    area: float  # sq.m
    length: float  # m
    width: float  # m
    confidence: float  # 0-1
    user_edited: bool = False  # whether user has edited dimensions

@dataclass
class StructuralSpec:
    """Structural parameters for quantity calculation"""
    slab_thickness: float = 150.0  # mm
    beam_width: float = 230.0      # mm
    beam_height: float = 300.0     # mm
    column_width: float = 230.0    # mm
    column_height: float = 300.0   # mm
    wall_thickness: float = 200.0  # mm
    plaster_thickness: float = 12.0 # mm
    floor_finish_thickness: float = 20.0 # mm
    # Optional: reinforcement ratios (kg/m3) for concrete elements
    slab_rebar_ratio: float = 80.0  # kg/m3
    beam_rebar_ratio: float = 120.0 # kg/m3
    column_rebar_ratio: float = 160.0 # kg/m3
    # Wall finish: both sides plaster
    wall_plaster_sides: int = 2

@dataclass
class OpeningInfo:
    """Detected opening (door/window) information"""
    width: float  # m
    height: float  # m
    area: float  # sq.m
    confidence: float  # 0-1

@dataclass
class FloorplanAnalysis:
    """Complete floorplan analysis result"""
    total_area: float  # sq.m
    rooms: List[RoomInfo]
    walls_detected: int
    openings_detected: List[OpeningInfo]
    confidence: float
    dimensions: Dict[str, float]
    scale_used: float = 0.0  # meters per pixel
    scale_method: str = ""  # how scale was determined
    structural_spec: Optional[StructuralSpec] = None

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
        self.min_room_area = 3.0  # sq.m
        self.max_room_area = 100.0  # sq.m
        # Default scale factor (m per pixel) - can be overridden by environment
        self.default_scale = float(os.getenv('FLOORPLAN_SCALE', '0.02'))
        # Calibrated scale storage (per session/file)
        self._calibrated_scale: Optional[float] = None
        # Material library (simplified)
        self.material_library = {
            'concrete': {'unit': 'm3', 'wastage': 0.02},
            'steel': {'unit': 'kg', 'wastage': 0.03},
            'cement': {'unit': 'bags (50kg)', 'wastage': 0.05},
            'sand': {'unit': 'm3', 'wastage': 0.02},
            'aggregate': {'unit': 'm3', 'wastage': 0.02},
            'blocks': {'unit': 'nos', 'wastage': 0.05},
            'plaster': {'unit': 'm2', 'wastage': 0.05},
            'floor_finish': {'unit': 'm2', 'wastage': 0.05}
        }
    
    def calibrate_scale(self, pixel_distance: float, real_distance: float) -> float:
        """
        Calibrate scale using a known measurement.
        
        Args:
            pixel_distance: Distance in pixels from user measurement
            real_distance: Known real-world distance in meters
            
        Returns:
            Calculated scale factor (meters per pixel)
        """
        if pixel_distance <= 0:
            raise ValueError("Pixel distance must be positive")
        if real_distance <= 0:
            raise ValueError("Real distance must be positive")
        
        self._calibrated_scale = real_distance / pixel_distance
        return self._calibrated_scale
    
    def reset_calibration(self):
        """Reset any user calibration"""
        self._calibrated_scale = None
    
    def _get_dpi_scale(self, image_path: str) -> Tuple[Optional[float], str]:
        """
        Try to determine scale from image DPI metadata.
        
        Returns:
            Tuple of (scale_factor_or_None, method_description)
        """
        try:
            from PIL import Image
            from PIL.ExifTags import TAGS
            with Image.open(image_path) as img:
                # First try EXIF
                exif_data = img._getexif()
                if exif_data:
                    x_dpi = None
                    y_dpi = None
                    for tag_id, value in exif_data.items():
                        tag = TAGS.get(tag_id, tag_id)
                        if tag == 'XResolution' and value:
                            x_dpi = value[0] / value[1] if isinstance(value, tuple) else value
                        if tag == 'YResolution' and value:
                            y_dpi = value[0] / value[1] if isinstance(value, tuple) else value
                    
                    if x_dpi and y_dpi and x_dpi > 0:
                        dpi = (x_dpi + y_dpi) / 2.0
                        meters_per_pixel = 0.0254 / dpi  # 1 inch = 0.0254 meters
                        return meters_per_pixel, f"DPI from EXIF ({dpi:.0f} DPI)"
                
                # Try img.info for DPI
                if 'dpi' in img.info:
                    dpi = img.info['dpi']
                    if isinstance(dpi, tuple) and len(dpi) >= 2:
                        avg_dpi = (dpi[0] + dpi[1]) / 2.0
                    else:
                        avg_dpi = float(dpi)
                    if avg_dpi > 0:
                        meters_per_pixel = 0.0254 / avg_dpi
                        return meters_per_pixel, f"DPI from image info ({avg_dpi:.0f} DPI)"
                        
        except ImportError:
            pass
        except Exception:
            pass
        
        return None, "No DPI metadata found"
    
    def _get_fallback_scale(self, img_width: int, img_height: int, img_path: str) -> Tuple[float, str]:
        """
        Calculate scale based on typical floorplan image characteristics.
        
        Assumptions for architectural drawings:
        - Floorplans are typically at scales like 1:50, 1:100, or 1:200
        - The drawing area is usually centered with margins
        - Typical residential floorplans are 6-20 meters wide
        
        Returns:
            Tuple of (scale_factor, method_description)
        """
        # Try DPI-based scale first
        dpi_scale, dpi_method = self._get_dpi_scale(img_path)
        if dpi_scale is not None:
            return dpi_scale, dpi_method
        
        # Fallback: estimate scale based on image dimensions
        # Assume the floorplan occupies about 80% of the image
        # and represents a typical residential building (8-15m wide)
        typical_building_width_m = 10.0  # meters
        drawing_area_ratio = 0.8  # drawing occupies 80% of image
        
        estimated_drawing_width_px = img_width * drawing_area_ratio
        scale = typical_building_width_m / estimated_drawing_width_px
        
        return scale, f"Estimated from image size ({img_width}x{img_height}px, assumed {typical_building_width_m}m building)"
    
    def _get_scale(self, image_path: str, img_width: int, img_height: int) -> Tuple[float, str]:
        """
        Get the scale factor to use for this analysis.
        
        Priority:
        1. User calibration (if set)
        2. DPI from image metadata
        3. Fallback estimation based on image dimensions
        """
        if self._calibrated_scale is not None:
            return self._calibrated_scale, "User calibrated"
        
        return self._get_fallback_scale(img_width, img_height, image_path)
    
    def _is_valid_room_contour(self, contour, img_width, img_height) -> bool:
        """
        Validate if a contour is likely a room based on geometric properties.
        """
        area = cv2.contourArea(contour)
        if area < 1000:  # too small to be a room
            return False
        
        # Get bounding box
        x, y, w, h = cv2.boundingRect(contour)
        if w == 0 or h == 0:
            return False
        
        aspect_ratio = max(w, h) / min(w, h)
        if aspect_ratio > 15:  # too elongated, likely a wall segment or text
            return False
        
        # Compute solidity (area / convex hull area)
        hull = cv2.convexHull(contour)
        hull_area = cv2.contourArea(hull)
        if hull_area == 0:
            return False
        solidity = area / hull_area
        if solidity < 0.3:  # low solidity indicates irregular shape like text or symbol
            return False
        
        # Check if area is too large (likely the whole image or a large false positive)
        image_area = img_width * img_height
        if area > image_area * 0.9:
            return False
        
        return True
    
    def _detect_rooms_and_openings(self, contours, img_width, img_height, scale) -> Tuple[List[RoomInfo], List[OpeningInfo]]:
        """Detect rooms and openings from contours"""
        rooms = []
        openings = []
        
        # We'll use hierarchy to separate outer contours (rooms) from inner contours (potential openings or islands)
        # But findContours with RETR_TREE gives us hierarchy.
        # We'll recompute with RETR_TREE to get hierarchy.
        # However, we already have contours from RETR_TREE, but we need the hierarchy array.
        # Let's change the findContours call to return hierarchy as well.
        # We'll do that in analyze_image and pass the hierarchy here.
        # For now, we'll assume we have the hierarchy as an argument? We'll change the function signature.
        # But to keep changes minimal, we'll do a simple approach: 
        #   - First, detect rooms as valid contours (as before).
        #   - Then, for each room, look for inner contours that could be openings.
        # We'll need the hierarchy to know parent-child relationships.
        # Let's adjust: we'll return the contours and hierarchy from analyze_image and then use them here.
        # We'll change the function signature to include hierarchy.
        # Since we are rewriting, we'll do it.
        pass  # We'll implement below
    
    # Let's rewrite the analyze_image to get hierarchy and then call a helper that uses hierarchy.
    # We'll replace the analyze_image method accordingly.
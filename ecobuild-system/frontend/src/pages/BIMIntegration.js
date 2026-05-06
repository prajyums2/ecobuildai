import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useProject } from "../context/ProjectContext";
import { analyzeFloorPlanComplete } from "../services/floorplanAnalyzer";
import { preprocessFloorPlan } from "../utils/imageProcessor";
import {
  FaUpload, FaSpinner, FaCheck, FaExclamationTriangle, FaTimes,
  FaRuler, FaPlus, FaSave, FaMousePointer, FaSearchPlus, FaSearchMinus,
  FaExpand, FaDoorOpen, FaWindowMaximize, FaLayerGroup, FaFileImage,
  FaGripVertical, FaBuilding, FaCube, FaTrash, FaUndo, FaRedo, FaHandPaper,
} from "react-icons/fa";

// Draggable Panel Component
function DraggablePanel({ title, icon: Icon, children, initialPosition = { x: 16, y: 64 }, defaultOpen = true }) {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleMouseDown = (e) => {
    if (e.target.closest('.panel-content')) return;
    setIsDragging(true);
    setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e) => setPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [isDragging, dragOffset]);

  return (
    <div className="absolute z-30 bg-white rounded-lg shadow-xl border border-gray-200 select-none"
      style={{ left: position.x, top: position.y, minWidth: 200 }}>
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200 rounded-t-lg cursor-move"
        onMouseDown={handleMouseDown}>
        <div className="flex items-center gap-2">
          <FaGripVertical className="text-gray-400 text-xs" />
          {Icon && <Icon className="text-primary text-sm" />}
          <span className="text-xs font-semibold text-gray-700">{title}</span>
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="text-gray-400 hover:text-gray-600">
          {isOpen ? <FaTimes className="text-xs" /> : <FaSearchPlus className="text-xs" />}
        </button>
      </div>
      {isOpen && <div className="panel-content p-3">{children}</div>}
    </div>
  );
}

function BIMIntegration() {
  const navigate = useNavigate();
  const { project, updateBuildingParams, updateBIMData } = useProject();
  const numFloors = project?.buildingParams?.numFloors || 2;

  // State
  const [activeFloor, setActiveFloor] = useState(1);
  const [floorData, setFloorData] = useState({});
  const [floorUrls, setFloorUrls] = useState({});
  const [processedUrls, setProcessedUrls] = useState({});
  const [calibration, setCalibration] = useState({});
  const [canvasMode, setCanvasMode] = useState('select');
  const [imageDimensions, setImageDimensions] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [error, setError] = useState(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [drawCurrent, setDrawCurrent] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const [pendingRoom, setPendingRoom] = useState(null);
  const [newRoomName, setNewRoomName] = useState('');

  const imageRef = useRef(null);
  const viewportRef = useRef(null);
  const gridCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialize floor data
  useEffect(() => {
    const initial = {};
    for (let i = 1; i <= numFloors; i++) {
      initial[i] = {
        rooms: [], doors: [], windows: [],
        walls: { external_thickness_mm: 230, internal_thickness_mm: 115, total_length_m: 0, total_volume_m3: 0, detected: false, wallData: null },
        structure_type: project?.buildingParams?.structureType || 'load_bearing',
        total_built_up_sqm: 0, confidence: 0, notes: ''
      };
    }
    setFloorData(initial);
  }, [numFloors]);

  // Draw AutoCAD-style grid
  const drawGrid = useCallback(() => {
    const canvas = gridCanvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    ctx.fillStyle = '#f5f6fa';
    ctx.fillRect(0, 0, width, height);

    const baseSpacing = 20;
    const spacing = Math.max(8, baseSpacing / zoom);
    const dotSize = Math.max(0.5, 1.2 / zoom);

    ctx.fillStyle = '#c8d6e5';
    for (let x = 0; x < width; x += spacing) {
      for (let y = 0; y < height; y += spacing) {
        ctx.beginPath(); ctx.arc(x, y, dotSize, 0, Math.PI * 2); ctx.fill();
      }
    }

    const majorSpacing = spacing * 5;
    ctx.strokeStyle = '#e0e7ef';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < width; x += majorSpacing) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += majorSpacing) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
  }, [zoom]);

  useEffect(() => { drawGrid(); }, [drawGrid]);
  useEffect(() => {
    const handleResize = () => drawGrid();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawGrid]);

      // Draw overlay (rooms, doors, windows, drawing in progress)
  const drawOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas || !imageDimensions) return;

    canvas.width = imageDimensions.width;
    canvas.height = imageDimensions.height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const currentFloorData = floorData[activeFloor] || {};
    const rooms = currentFloorData.rooms || [];

    // Debug: log room data
    if (rooms.length > 0) {
      console.log('[BIM] Drawing', rooms.length, 'rooms. First room corners:', rooms[0]?.corners);
    }

    rooms.forEach((room, idx) => {
      if (!room.corners || room.corners.length < 2) return;
      const isSelected = selectedRoom === idx;

      ctx.beginPath();
      ctx.moveTo(room.corners[0].x, room.corners[0].y);
      room.corners.forEach(c => ctx.lineTo(c.x, c.y));
      ctx.closePath();
      ctx.fillStyle = isSelected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.05)';
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#2563eb' : '#3b82f6';
      ctx.lineWidth = isSelected ? 2 : 1.5;
      ctx.stroke();

      const centerX = room.corners.reduce((s, c) => s + c.x, 0) / room.corners.length;
      const centerY = room.corners.reduce((s, c) => s + c.y, 0) / room.corners.length;
      ctx.fillStyle = '#1e40af';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(room.name || `Room ${idx + 1}`, centerX, centerY - 4);
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#3b82f6';
      ctx.fillText((room.area_sqm?.toFixed(1) || 0) + ' m\u00B2', centerX, centerY + 10);

      if (isSelected && room.corners.length === 4) {
        room.corners.forEach((corner) => {
          ctx.fillStyle = '#fff'; ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 1.5;
          const hs = 5;
          ctx.fillRect(corner.x - hs, corner.y - hs, hs * 2, hs * 2);
          ctx.strokeRect(corner.x - hs, corner.y - hs, hs * 2, hs * 2);
        });
      }
    });

    (currentFloorData.doors || []).forEach((door) => {
      if (!door.x || !door.y) return;
      ctx.beginPath(); ctx.arc(door.x, door.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#10b981'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('\uD83D\uDEAA', door.x, door.y + 3);
    });

    (currentFloorData.windows || []).forEach((win) => {
      if (!win.x || !win.y) return;
      ctx.beginPath(); ctx.arc(win.x, win.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#8b5cf6'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('\uD83E\uDE9F', win.x, win.y + 3);
    });

    if (isDrawing && drawStart && drawCurrent && canvasMode === 'draw-room') {
      const x = Math.min(drawStart.x, drawCurrent.x);
      const y = Math.min(drawStart.y, drawCurrent.y);
      const w = Math.abs(drawCurrent.x - drawStart.x);
      const h = Math.abs(drawCurrent.y - drawStart.y);
      ctx.beginPath(); ctx.rect(x, y, w, h);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'; ctx.fill();
      ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);

      const scaleX = imageDimensions.naturalWidth / imageDimensions.width;
      const scaleY = imageDimensions.naturalHeight / imageDimensions.height;
      const ppm = calibration?.pixelsPerMeter || 1;
      const widthM = (w * scaleX) / ppm;
      const heightM = (h * scaleY) / ppm;
      ctx.fillStyle = '#1e40af'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(widthM.toFixed(1) + 'm x ' + heightM.toFixed(1) + 'm', x + w / 2, y - 6);
      ctx.fillText((widthM * heightM).toFixed(1) + ' m\u00B2', x + w / 2, y + 8);
    }
  }, [floorData, activeFloor, selectedRoom, isDrawing, drawStart, drawCurrent, canvasMode, imageDimensions, calibration]);

  useEffect(() => { drawOverlay(); }, [drawOverlay]);

  const handleImageLoad = () => {
    if (imageRef.current) {
      const img = imageRef.current;
      setImageDimensions({ width: img.clientWidth, height: img.clientHeight, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
    }
  };

  // Get mouse coords relative to overlay canvas (accounting for zoom/pan)
  const getCanvasCoords = useCallback((e) => {
    if (!overlayCanvasRef.current) return { x: 0, y: 0 };
    const rect = overlayCanvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom,
    };
  }, [zoom]);

  const handleFileUpload = async (floorNum, file) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) { setError('Please upload PNG or JPG'); return; }

    const url = URL.createObjectURL(file);
    setFloorUrls(prev => ({ ...prev, [floorNum]: url }));
    setError(null);
    setCalibration({}); setCanvasMode('select'); setImageDimensions(null);
    setZoom(1); setPan({ x: 0, y: 0 });
    processFloorPlan(floorNum, url);
  };

  const handleDrop = async (e) => { e.preventDefault(); setIsDraggingFile(false); const file = e.dataTransfer.files[0]; if (file) handleFileUpload(activeFloor, file); };

  const processFloorPlan = async (floorNum, imageUrl) => {
    setIsProcessing(true); setProcessingStep('Preprocessing...'); setProcessingProgress(10);
    try {
      const img = new Image(); img.crossOrigin = 'anonymous'; img.src = imageUrl;
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });

      setProcessingStep('Enhancing...'); setProcessingProgress(25);
      const processedUrl = await preprocessFloorPlan(img, { whiteThreshold: 240, contrast: 1.3, preserveEdges: true });
      setProcessedUrls(prev => ({ ...prev, [floorNum]: processedUrl }));

      setProcessingStep('AI Analysis...'); setProcessingProgress(50);
      const aiResult = await analyzeFloorPlanComplete(processedUrl, floorNum);
      console.log('[BIM] AI result:', JSON.stringify(aiResult, null, 2));
      setProcessingProgress(80);

      // Wait for the processed image to load
      await new Promise(resolve => {
        if (imageRef.current?.complete && imageRef.current?.clientWidth > 0) resolve();
        else {
          const onLoad = () => { imageRef.current?.removeEventListener('load', onLoad); resolve(); };
          imageRef.current?.addEventListener('load', onLoad);
          // Fallback timeout
          setTimeout(resolve, 2000);
        }
      });

      console.log('[BIM] Image dimensions:', imageRef.current?.clientWidth, 'x', imageRef.current?.clientHeight);
      console.log('[BIM] Image natural:', imageRef.current?.naturalWidth, 'x', imageRef.current?.naturalHeight);

      const scaleX = imageRef.current.clientWidth / imageRef.current.naturalWidth;
      const scaleY = imageRef.current.clientHeight / imageRef.current.naturalHeight;
      console.log('[BIM] Scale factors:', scaleX, scaleY);

      const convertedRooms = (aiResult.rooms || []).map(room => ({
        ...room, corners: (room.corners || []).map(c => ({ x: c[0] * scaleX, y: c[1] * scaleY })), area_sqm: room.area_sqm || 0,
      }));
      const convertedDoors = (aiResult.doors || []).map(d => ({ x: d.x * scaleX, y: d.y * scaleY, type: d.type || 'internal', width_m: d.width_m || 0.8, height_m: d.height_m || 2.0, count: 1 }));
      const convertedWindows = (aiResult.windows || []).map(w => ({ x: w.x * scaleX, y: w.y * scaleY, type: w.type || 'standard', width_m: w.width_m || 1.2, height_m: w.height_m || 1.2, count: 1 }));

      console.log('[BIM] Converted rooms:', convertedRooms.length, 'first room corners:', convertedRooms[0]?.corners);

      if (aiResult.scale?.detected && aiResult.scale.pixelsPerMeter > 0) {
        setCalibration({ pointA: { x: 0, y: 0 }, pointB: { x: aiResult.scale.pixelsPerMeter * scaleX, y: 0 }, realDistance: 1.0, pixelsPerMeter: aiResult.scale.pixelsPerMeter * scaleX, autoDetected: true });
      }

      const wallData = aiResult.walls || { external: { total_length_m: 0, thickness_mm: 230, count: 0 }, internal: { total_length_m: 0, thickness_mm: 115, count: 0 } };

      setFloorData(prev => ({
        ...prev, [floorNum]: {
          ...prev[floorNum], rooms: convertedRooms, doors: convertedDoors, windows: convertedWindows,
          walls: { external_thickness_mm: wallData.external?.thickness_mm || 230, internal_thickness_mm: wallData.internal?.thickness_mm || 115, total_length_m: (wallData.external?.total_length_m || 0) + (wallData.internal?.total_length_m || 0), total_volume_m3: 0, detected: true, wallData },
          structure_type: aiResult.structure_type || prev[floorNum]?.structure_type || 'load_bearing',
          total_built_up_sqm: aiResult.total_built_up_sqm || 0, confidence: aiResult.confidence || 0,
          notes: `${convertedRooms.length} rooms, ${convertedDoors.length} doors, ${convertedWindows.length} windows detected.`,
        }
      }));

      if (aiResult.structure_type) updateBuildingParams({ structureType: aiResult.structure_type });
      setProcessingProgress(100); setProcessingStep('Complete!');
      setTimeout(() => { setIsProcessing(false); setProcessingStep(''); setProcessingProgress(0); }, 500);
    } catch (err) {
      console.error('Floor plan processing error:', err);
      setError('AI processing failed. Use manual tools.');
      setIsProcessing(false); setProcessingStep(''); setProcessingProgress(0);
    }
  };

  // Canvas mouse handlers
  const handleCanvasMouseDown = (e) => {
    // Middle mouse or space+click → pan
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    const coords = getCanvasCoords(e);

    if (canvasMode === 'select') {
      // Check resize handles
      if (selectedRoom !== null) {
        const room = floorData[activeFloor]?.rooms?.[selectedRoom];
        if (room?.corners?.length === 4) {
          for (let i = 0; i < room.corners.length; i++) {
            const c = room.corners[i];
            if (Math.abs(coords.x - c.x) < 8 && Math.abs(coords.y - c.y) < 8) {
              setIsResizing(true); setResizeHandle(i); return;
            }
          }
        }
      }
      // Check room selection
      const rooms = floorData[activeFloor]?.rooms || [];
      for (let i = rooms.length - 1; i >= 0; i--) {
        const room = rooms[i];
        if (room.corners?.length >= 3 && pointInPolygon(coords, room.corners)) { setSelectedRoom(i); return; }
      }
      setSelectedRoom(null);
    } else if (canvasMode === 'draw-room') {
      setDrawStart(coords); setDrawCurrent(coords); setIsDrawing(true);
    } else if (canvasMode === 'add-door') {
      setFloorData(prev => ({ ...prev, [activeFloor]: { ...prev[activeFloor], doors: [...(prev[activeFloor]?.doors || []), { x: coords.x, y: coords.y, type: 'internal', width_m: 0.8, height_m: 2.0, count: 1 }] } }));
    } else if (canvasMode === 'add-window') {
      setFloorData(prev => ({ ...prev, [activeFloor]: { ...prev[activeFloor], windows: [...(prev[activeFloor]?.windows || []), { x: coords.x, y: coords.y, type: 'standard', width_m: 1.2, height_m: 1.2, count: 1 }] } }));
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }
    if (isResizing && selectedRoom !== null) {
      const coords = getCanvasCoords(e);
      setFloorData(prev => {
        const floor = prev[activeFloor];
        if (!floor?.rooms?.[selectedRoom]) return prev;
        const rooms = [...floor.rooms];
        const room = { ...rooms[selectedRoom] };
        const corners = [...room.corners];
        corners[resizeHandle] = coords;
        if (corners.length === 4) {
          const next = (resizeHandle + 1) % 4;
          const prevCorner = (resizeHandle + 3) % 4;
          if (resizeHandle === 0 || resizeHandle === 2) { corners[next].x = coords.x; corners[prevCorner].y = coords.y; }
          else { corners[next].y = coords.y; corners[prevCorner].x = coords.x; }
        }
        const w = Math.abs(corners[2].x - corners[0].x);
        const h = Math.abs(corners[2].y - corners[0].y);
        const scaleX = imageDimensions?.naturalWidth / imageDimensions?.width || 1;
        const scaleY = imageDimensions?.naturalHeight / imageDimensions?.height || 1;
        const ppm = calibration?.pixelsPerMeter || 1;
        const areaSqm = ((w * scaleX) / ppm) * ((h * scaleY) / ppm);
        rooms[selectedRoom] = { ...room, corners, area_sqm: Math.round(areaSqm * 10) / 10 };
        return { ...prev, [activeFloor]: { ...floor, rooms, total_built_up_sqm: Math.round(rooms.reduce((s, r) => s + (r.area_sqm || 0), 0) * 10) / 10 } };
      });
      return;
    }
    if (!isDrawing) return;
    setDrawCurrent(getCanvasCoords(e));
  };

  const handleCanvasMouseUp = (e) => {
    if (isPanning) { setIsPanning(false); return; }
    if (isResizing) { setIsResizing(false); setResizeHandle(null); return; }
    if (!isDrawing) return;
    const endCoords = getCanvasCoords(e);
    if (canvasMode === 'draw-room' && drawStart) {
      const x1 = Math.min(drawStart.x, endCoords.x); const y1 = Math.min(drawStart.y, endCoords.y);
      const x2 = Math.max(drawStart.x, endCoords.x); const y2 = Math.max(drawStart.y, endCoords.y);
      const w = x2 - x1; const h = y2 - y1;
      if (w > 20 && h > 20) {
        const corners = [{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }];
        const scaleX = imageDimensions?.naturalWidth / imageDimensions?.width || 1;
        const scaleY = imageDimensions?.naturalHeight / imageDimensions?.height || 1;
        const ppm = calibration?.pixelsPerMeter || 1;
        const areaSqm = ((w * scaleX) / ppm) * ((h * scaleY) / ppm);
        setPendingRoom({ corners, area_sqm: Math.round(areaSqm * 10) / 10 });
        setNewRoomName(''); setShowRoomDialog(true);
      }
    }
    setIsDrawing(false); setDrawStart(null); setDrawCurrent(null);
  };

  // Zoom with Ctrl+Scroll
  const handleWheel = useCallback((e) => {
    if (!imageDimensions) return;
    e.preventDefault();

    if (e.ctrlKey) {
      // Ctrl+scroll → zoom
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.2, Math.min(10, zoom * delta));

      // Zoom towards mouse position
      const rect = viewportRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const scale = newZoom / zoom;
      const newPanX = mouseX - (mouseX - pan.x) * scale;
      const newPanY = mouseY - (mouseY - pan.y) * scale;

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    } else {
      // Regular scroll → pan
      setPan(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
    }
  }, [zoom, pan, imageDimensions]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.addEventListener('wheel', handleWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const pointInPolygon = (point, polygon) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      const intersect = ((yi > point.y) !== (yj > point.y)) && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const confirmRoom = () => {
    if (pendingRoom) {
      let suggestedName = newRoomName.trim() || `Room ${(floorData[activeFloor]?.rooms?.length || 0) + 1}`;
      if (!newRoomName.trim() && pendingRoom.area_sqm) {
        if (pendingRoom.area_sqm > 20) suggestedName = 'Living Room';
        else if (pendingRoom.area_sqm > 12) suggestedName = 'Bedroom ' + ((floorData[activeFloor]?.rooms?.filter(r => r.name?.includes('Bedroom')).length || 0) + 1);
        else if (pendingRoom.area_sqm > 5) suggestedName = 'Kitchen';
        else if (pendingRoom.area_sqm > 3) suggestedName = 'Bathroom';
        else suggestedName = 'Storage';
      }
      const newRoom = { ...pendingRoom, name: suggestedName };
      setFloorData(prev => {
        const floor = prev[activeFloor];
        const rooms = [...(floor?.rooms || []), newRoom];
        return { ...prev, [activeFloor]: { ...floor, rooms, total_built_up_sqm: Math.round(rooms.reduce((s, r) => s + (r.area_sqm || 0), 0) * 10) / 10 } };
      });
      setShowRoomDialog(false); setPendingRoom(null); setNewRoomName('');
    }
  };

  const handleDeleteSelected = () => {
    if (selectedRoom === null) return;
    setFloorData(prev => {
      const floor = prev[activeFloor];
      if (!floor?.rooms) return prev;
      const rooms = floor.rooms.filter((_, i) => i !== selectedRoom);
      return { ...prev, [activeFloor]: { ...floor, rooms, total_built_up_sqm: Math.round(rooms.reduce((s, r) => s + (r.area_sqm || 0), 0) * 10) / 10 } };
    });
    setSelectedRoom(null);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' && selectedRoom !== null) handleDeleteSelected();
      if (e.key === 'Escape') { setSelectedRoom(null); setShowRoomDialog(false); setIsResizing(false); setIsDrawing(false); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRoom]);

  const currentFloorData = floorData[activeFloor] || {};

  return (
    <div className="h-[calc(100vh-80px)] relative overflow-hidden" style={{ margin: '-24px' }}>
      {/* Grid Canvas */}
      <canvas ref={gridCanvasRef} className="absolute inset-0 z-0" style={{ width: '100%', height: '100%' }} />

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-2 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="flex items-center gap-3">
          <FaCube className="text-primary text-lg" />
          <span className="font-semibold text-gray-800">Floor Plan Analyzer</span>
          {floorUrls[activeFloor] && (
            <div className="flex items-center gap-1 ml-4">
              {Array.from({ length: numFloors }, (_, i) => i + 1).map(floor => (
                <button key={floor} onClick={() => setActiveFloor(floor)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${activeFloor === floor ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  F{floor}
                  {floorData[floor]?.rooms?.length > 0 && <FaCheck className="inline ml-1 text-[8px]" />}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!floorUrls[activeFloor] && (
            <button onClick={() => fileInputRef.current?.click()} className="btn btn-primary text-sm">
              <FaUpload className="mr-2" /> Upload Floor Plan
            </button>
          )}
          {floorUrls[activeFloor] && (
            <button onClick={() => navigate('/optimizer')} className="btn btn-primary text-sm">
              <FaSave className="mr-2" /> Save & Continue
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg"
            onChange={(e) => handleFileUpload(activeFloor, e.target.files[0])} className="hidden" />
        </div>
      </div>

      {/* Viewport (pan/zoom container) */}
      <div ref={viewportRef} className="absolute inset-0 z-10" style={{ paddingTop: 48, cursor: isPanning ? 'grabbing' : canvasMode === 'select' ? 'default' : 'crosshair' }}
        onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }} onDragLeave={() => setIsDraggingFile(false)}
        onMouseDown={handleCanvasMouseDown} onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp}>

        {/* Upload Area */}
        {!floorUrls[activeFloor] && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`text-center p-16 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${isDraggingFile ? 'border-primary bg-primary/5 scale-105' : 'border-gray-300 hover:border-primary'}`}
              onClick={() => fileInputRef.current?.click()}>
              <FaFileImage className="text-7xl text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Upload Floor Plan</h3>
              <p className="text-gray-500 mb-4">Drag and drop a PNG or JPG file here</p>
              <button className="btn btn-primary"><FaUpload className="mr-2" /> Browse Files</button>
            </div>
          </div>
        )}

        {/* Image + Overlay */}
        {floorUrls[activeFloor] && (
          <div className="relative" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0', width: '100%' }}>
            <img ref={imageRef} src={processedUrls[activeFloor] || floorUrls[activeFloor]} alt=""
              className="block" style={{ backgroundColor: 'transparent', width: '100%' }} onLoad={handleImageLoad} />
            {imageDimensions && (
              <canvas ref={overlayCanvasRef} className="absolute inset-0" style={{ width: '100%', height: '100%', zIndex: 10 }} />
            )}
          </div>
        )}
      </div>

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 z-50 bg-white/95 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-6">
              <FaSpinner className="text-primary text-2xl animate-spin" />
              <h3 className="text-lg font-bold text-gray-800">Analyzing Floor Plan</h3>
            </div>
            <div className="space-y-2 mb-4">
              {['Preprocessing', 'Enhancing', 'AI Analysis', 'Finalizing'].map((step, idx) => (
                <div key={idx} className={`flex items-center gap-2 text-sm ${processingProgress >= (idx + 1) * 25 ? 'text-green-600' : 'text-gray-400'}`}>
                  {processingProgress >= (idx + 1) * 25 + 10 ? <FaCheck className="text-xs" /> : processingProgress >= (idx + 1) * 25 ? <FaSpinner className="animate-spin text-xs" /> : <div className="w-3" />}
                  <span>{step}</span>
                </div>
              ))}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${processingProgress}%` }} />
            </div>
            <p className="text-xs text-gray-500 text-center">{processingStep}</p>
          </div>
        </div>
      )}

      {/* Room Name Dialog */}
      {showRoomDialog && (
        <div className="absolute inset-0 z-40 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-80">
            <h4 className="font-bold text-gray-800 mb-3">Name Room</h4>
            <p className="text-xs text-gray-500 mb-3">Area: {(pendingRoom?.area_sqm || 0).toFixed(1)} m\u00B2</p>
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {['Living Room', 'Bedroom', 'Kitchen', 'Bathroom'].map(name => (
                <button key={name} onClick={() => setNewRoomName(name)}
                  className={`text-xs px-2 py-1 rounded ${newRoomName === name ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}>{name}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} placeholder="Room name"
                className="input text-sm flex-1" autoFocus onKeyDown={(e) => e.key === 'Enter' && confirmRoom()} />
              <button onClick={confirmRoom} className="btn btn-primary text-sm"><FaCheck /></button>
              <button onClick={() => { setShowRoomDialog(false); setPendingRoom(null); }} className="btn btn-outline text-sm"><FaTimes /></button>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !isProcessing && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-40 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <FaExclamationTriangle className="text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="text-red-500"><FaTimes /></button>
        </div>
      )}

      {/* Floating Panels */}
      {floorUrls[activeFloor] && (
        <>
          {/* Toolbox */}
          <DraggablePanel title="Toolbox" icon={FaCube} initialPosition={{ x: 16, y: 64 }}>
            <div className="space-y-2">
              <div className="grid grid-cols-5 gap-1">
                {[
                  { mode: 'select', icon: FaMousePointer, label: 'Select' },
                  { mode: 'draw-room', icon: FaPlus, label: 'Room' },
                  { mode: 'add-door', icon: FaDoorOpen, label: 'Door' },
                  { mode: 'add-window', icon: FaWindowMaximize, label: 'Window' },
                  { mode: 'calibrate', icon: FaRuler, label: 'Scale' },
                ].map(tool => (
                  <button key={tool.mode} onClick={() => setCanvasMode(tool.mode)}
                    className={`p-2 rounded flex flex-col items-center gap-0.5 ${canvasMode === tool.mode ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    title={tool.label}>
                    <tool.icon className="text-xs" />
                    <span className="text-[9px]">{tool.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setZoom(z => Math.max(0.2, z - 0.2))} className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 flex-1" title="Zoom Out"><FaSearchMinus className="text-xs" /></button>
                <input type="number" value={Math.round(zoom * 100)} onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 20 && v <= 1000) setZoom(v / 100); }}
                  className="w-14 text-center text-xs bg-gray-100 rounded" min="20" max="1000" />
                <button onClick={() => setZoom(z => Math.min(10, z + 0.2))} className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 flex-1" title="Zoom In"><FaSearchPlus className="text-xs" /></button>
                <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="p-1.5 rounded bg-gray-100 hover:bg-gray-200" title="Fit"><FaExpand className="text-xs" /></button>
              </div>
              <div className="flex gap-1">
                <button onClick={() => {}} className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 flex-1" title="Undo (Ctrl+Z)"><FaUndo className="text-xs" /></button>
                <button onClick={() => {}} className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 flex-1" title="Redo (Ctrl+Y)"><FaRedo className="text-xs" /></button>
                {selectedRoom !== null && (
                  <button onClick={handleDeleteSelected} className="p-1.5 rounded bg-red-100 hover:bg-red-200 text-red-600 flex-1" title="Delete"><FaTrash className="text-xs" /></button>
                )}
              </div>
              <div className="text-[10px] text-gray-500 space-y-0.5">
                <p><kbd className="px-1 bg-gray-100 rounded">Ctrl</kbd>+Scroll: Zoom</p>
                <p><kbd className="px-1 bg-gray-100 rounded">Scroll</kbd>: Pan</p>
                <p><kbd className="px-1 bg-gray-100 rounded">Alt</kbd>+Drag: Pan</p>
                <p><kbd className="px-1 bg-gray-100 rounded">Del</kbd>: Delete selected</p>
              </div>
            </div>
          </DraggablePanel>

          {/* Properties */}
          <DraggablePanel title="Properties" icon={FaLayerGroup} initialPosition={{ x: 16, y: 340 }}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-gray-50 rounded text-center">
                  <p className="text-[10px] text-gray-500">Rooms</p>
                  <p className="text-lg font-bold text-gray-800">{currentFloorData.rooms?.length || 0}</p>
                </div>
                <div className="p-2 bg-gray-50 rounded text-center">
                  <p className="text-[10px] text-gray-500">Area</p>
                  <p className="text-lg font-bold text-gray-800">{currentFloorData.total_built_up_sqm?.toFixed(1) || 0}</p>
                </div>
                <div className="p-2 bg-gray-50 rounded text-center">
                  <p className="text-[10px] text-gray-500">Doors</p>
                  <p className="text-lg font-bold text-gray-800">{currentFloorData.doors?.length || 0}</p>
                </div>
                <div className="p-2 bg-gray-50 rounded text-center">
                  <p className="text-[10px] text-gray-500">Windows</p>
                  <p className="text-lg font-bold text-gray-800">{currentFloorData.windows?.length || 0}</p>
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Structure</label>
                <select value={currentFloorData.structure_type || 'load_bearing'}
                  onChange={(e) => setFloorData(prev => ({ ...prev, [activeFloor]: { ...prev[activeFloor], structure_type: e.target.value } }))}
                  className="input text-xs py-1">
                  <option value="load_bearing">Load-Bearing</option>
                  <option value="framed">Framed</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
              {currentFloorData.walls && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-gray-500">Ext. Wall (mm)</label>
                  <input type="number" value={currentFloorData.walls.external_thickness_mm || 230}
                    onChange={(e) => setFloorData(prev => ({ ...prev, [activeFloor]: { ...prev[activeFloor], walls: { ...prev[activeFloor].walls, external_thickness_mm: parseInt(e.target.value) || 230 } } }))}
                    className="input text-xs py-1" min="100" max="500" step="5" />
                  <label className="block text-[10px] text-gray-500">Int. Wall (mm)</label>
                  <input type="number" value={currentFloorData.walls.internal_thickness_mm || 115}
                    onChange={(e) => setFloorData(prev => ({ ...prev, [activeFloor]: { ...prev[activeFloor], walls: { ...prev[activeFloor].walls, internal_thickness_mm: parseInt(e.target.value) || 115 } } }))}
                    className="input text-xs py-1" min="50" max="300" step="5" />
                </div>
              )}
              {calibration?.pixelsPerMeter && (
                <div className="p-2 bg-green-50 rounded text-center">
                  <p className="text-[10px] text-green-600">Scale Set</p>
                  <p className="text-sm font-bold text-green-700">{calibration.pixelsPerMeter.toFixed(1)} px/m</p>
                </div>
              )}
            </div>
          </DraggablePanel>

          {/* Room List */}
          {currentFloorData.rooms?.length > 0 && (
            <DraggablePanel title="Rooms" icon={FaBuilding} initialPosition={{ x: 16, y: 600 }}>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {currentFloorData.rooms.map((room, idx) => (
                  <div key={idx} onClick={() => setSelectedRoom(idx)}
                    className={`flex items-center justify-between p-1.5 rounded text-xs cursor-pointer ${selectedRoom === idx ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'}`}>
                    <span className="font-medium truncate">{room.name || `Room ${idx + 1}`}</span>
                    <span className="text-gray-500">{room.area_sqm?.toFixed(1) || 0} m\u00B2</span>
                  </div>
                ))}
              </div>
            </DraggablePanel>
          )}
        </>
      )}
    </div>
  );
}

export default BIMIntegration;

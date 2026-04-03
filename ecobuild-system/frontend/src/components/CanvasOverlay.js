import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  FaRuler, FaMousePointer, FaPlus, FaTrash, FaUndo, FaRedo, 
  FaSave, FaEye, FaEyeSlash, FaSearchPlus, FaSearchMinus, FaExpand,
  FaCheck, FaTimes,
} from 'react-icons/fa';

/**
 * Professional Floor Plan Canvas Editor
 * Supports: Scale calibration, room drawing, element editing, undo/redo, zoom
 */
function CanvasOverlay({ 
  imageUrl,
  calibration, 
  setCalibration,
  rooms, 
  setRooms,
  doors,
  setDoors,
  windows,
  setWindows,
  walls,
  setWalls,
  mode = 'select',
  onModeChange,
  imageDimensions,
  aiDetectedData = null,
  onAcceptAIDetection,
  onRejectAIDetection,
  showAIDetection = true,
  externalZoom = 1,
  externalPan = { x: 0, y: 0 },
  onZoomChange,
  onPanChange,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [drawCurrent, setDrawCurrent] = useState(null);
  const [calibPoint1, setCalibPoint1] = useState(null);
  const [calibPoint2, setCalibPoint2] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null);
  const [showCalibDialog, setShowCalibDialog] = useState(false);
  const [calibDistance, setCalibDistance] = useState('');
  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [pendingRoom, setPendingRoom] = useState(null);
  
  // Undo/Redo history
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Use external zoom/pan from parent
  const zoom = externalZoom;
  const pan = externalPan;
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);
  
  // Layer visibility
  const [showLayers, setShowLayers] = useState({
    rooms: true,
    doors: true,
    windows: true,
    walls: true,
    aiDetection: true,
  });

  const canvas = canvasRef.current;
  const ctx = canvas?.getContext('2d');

  // Save state to history for undo
  const saveToHistory = useCallback((newRooms, newDoors, newWindows) => {
    const newState = {
      rooms: JSON.parse(JSON.stringify(newRooms)),
      doors: JSON.parse(JSON.stringify(newDoors)),
      windows: JSON.parse(JSON.stringify(newWindows)),
    };
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newState);
      return newHistory.slice(-50); // Keep last 50 states
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setRooms(prevState.rooms);
      setDoors(prevState.doors);
      setWindows(prevState.windows);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex, setRooms, setDoors, setWindows]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setRooms(nextState.rooms);
      setDoors(nextState.doors);
      setWindows(nextState.windows);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex, setRooms, setDoors, setWindows]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); handleUndo(); }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); handleRedo(); }
      if (e.key === 'Delete' && selectedElement) { handleDeleteSelected(); }
      if (e.key === 'Escape') { setSelectedElement(null); setShowRoomDialog(false); setShowCalibDialog(false); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, selectedElement]);

  // Resize canvas
  useEffect(() => {
    if (canvas && imageDimensions) {
      canvas.width = imageDimensions.width * zoom;
      canvas.height = imageDimensions.height * zoom;
      redraw();
    }
  }, [canvas, imageDimensions, rooms, doors, windows, walls, calibration, drawStart, drawCurrent, calibPoint1, calibPoint2, zoom, pan, showLayers, aiDetectedData, showAIDetection]);

  const getCanvasCoords = (e) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    };
  };

  const pixelsToMeters = (pixels) => {
    if (!calibration?.pixelsPerMeter) return 0;
    return pixels / calibration.pixelsPerMeter;
  };

  const distance = (p1, p2) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  const redraw = useCallback(() => {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    const w = imageDimensions?.width || 0;
    const h = imageDimensions?.height || 0;

    // Draw AI detection overlay (semi-transparent)
    if (showAIDetection && showLayers.aiDetection && aiDetectedData?.rooms?.length > 0) {
      aiDetectedData.rooms.forEach((room, idx) => {
        if (room.corners && room.corners.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(room.corners[0].x, room.corners[0].y);
          room.corners.forEach(c => ctx.lineTo(c.x, c.y));
          ctx.closePath();
          ctx.fillStyle = 'rgba(139, 92, 246, 0.15)';
          ctx.fill();
          ctx.strokeStyle = '#8B5CF6';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });
    }

    // Draw calibration points
    if (mode === 'calibrate') {
      if (calibPoint1) {
        ctx.beginPath();
        ctx.arc(calibPoint1.x, calibPoint1.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#3B82F6';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#3B82F6';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('P1', calibPoint1.x, calibPoint1.y - 10);
      }
      if (calibPoint2) {
        ctx.beginPath();
        ctx.arc(calibPoint2.x, calibPoint2.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#EF4444';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#EF4444';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('P2', calibPoint2.x, calibPoint2.y - 10);
        
        ctx.beginPath();
        ctx.moveTo(calibPoint1.x, calibPoint1.y);
        ctx.lineTo(calibPoint2.x, calibPoint2.y);
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        const dist = pixelsToMeters(distance(calibPoint1, calibPoint2));
        ctx.fillStyle = '#F59E0B';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(`${dist.toFixed(2)}m`, (calibPoint1.x + calibPoint2.x) / 2, (calibPoint1.y + calibPoint2.y) / 2 - 10);
      }
    }

    // Draw existing rooms
    if (showLayers.rooms) {
      rooms.forEach((room, idx) => {
        if (room.corners && room.corners.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(room.corners[0].x, room.corners[0].y);
          room.corners.forEach(c => ctx.lineTo(c.x, c.y));
          ctx.closePath();
          const isSelected = selectedElement?.type === 'room' && selectedElement?.index === idx;
          ctx.fillStyle = isSelected ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.1)';
          ctx.fill();
          ctx.strokeStyle = isSelected ? '#1D4ED8' : '#3B82F6';
          ctx.lineWidth = isSelected ? 3 : 2;
          ctx.stroke();

          const centerX = room.corners.reduce((s, c) => s + c.x, 0) / room.corners.length;
          const centerY = room.corners.reduce((s, c) => s + c.y, 0) / room.corners.length;
          ctx.fillStyle = '#1E40AF';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(room.name, centerX, centerY - 6);
          ctx.font = '10px sans-serif';
          ctx.fillStyle = '#3B82F6';
          ctx.fillText(`${room.area_sqm?.toFixed(1) || 0} m²`, centerX, centerY + 8);
        }
      });
    }

    // Draw existing doors
    if (showLayers.doors) {
      doors.forEach((door, idx) => {
        if (door.x && door.y) {
          ctx.beginPath();
          ctx.arc(door.x, door.y, 7, 0, Math.PI * 2);
          ctx.fillStyle = '#10B981';
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = '#065F46';
          ctx.font = '9px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🚪', door.x, door.y + 3);
        }
      });
    }

    // Draw existing windows
    if (showLayers.windows) {
      windows.forEach((win, idx) => {
        if (win.x && win.y) {
          ctx.beginPath();
          ctx.arc(win.x, win.y, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#8B5CF6';
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = '#5B21B6';
          ctx.font = '9px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🪟', win.x, win.y + 3);
        }
      });
    }

    // Draw drawing in progress
    if (isDrawing && drawStart && drawCurrent) {
      if (mode === 'draw-room') {
        const x = Math.min(drawStart.x, drawCurrent.x);
        const y = Math.min(drawStart.y, drawCurrent.y);
        const w = Math.abs(drawCurrent.x - drawStart.x);
        const h = Math.abs(drawCurrent.y - drawStart.y);
        
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
        ctx.fill();
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        const widthM = pixelsToMeters(w);
        const heightM = pixelsToMeters(h);
        const areaM = widthM * heightM;
        
        ctx.fillStyle = '#1E40AF';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${widthM.toFixed(1)}m × ${heightM.toFixed(1)}m`, (drawStart.x + drawCurrent.x) / 2, (drawStart.y + drawCurrent.y) / 2 - 6);
        ctx.fillText(`${areaM.toFixed(1)} m²`, (drawStart.x + drawCurrent.x) / 2, (drawStart.y + drawCurrent.y) / 2 + 8);
      }
    }

    // Draw scale indicator
    if (calibration?.pixelsPerMeter) {
      const scaleBarPixels = calibration.pixelsPerMeter * 2;
      const startX = 15;
      const startY = h - 25;
      
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + scaleBarPixels, startY);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(startX, startY - 5);
      ctx.lineTo(startX, startY + 5);
      ctx.moveTo(startX + scaleBarPixels, startY - 5);
      ctx.lineTo(startX + scaleBarPixels, startY + 5);
      ctx.stroke();
      
      ctx.fillStyle = '#000';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('2m', startX + scaleBarPixels / 2, startY - 8);
    }

    ctx.restore();
  }, [ctx, canvas, rooms, doors, windows, calibration, drawStart, drawCurrent, calibPoint1, calibPoint2, isDrawing, mode, selectedElement, pixelsToMeters, zoom, pan, showLayers, aiDetectedData, showAIDetection, imageDimensions]);

  const handleMouseDown = (e) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }
    
    const coords = getCanvasCoords(e);
    
    if (mode === 'calibrate') {
      if (!calibPoint1) {
        setCalibPoint1(coords);
        setCalibPoint2(null);
        setDrawStart(coords);
        setIsDrawing(true);
      } else if (!calibPoint2) {
        setCalibPoint2(coords);
        setDrawCurrent(coords);
        setIsDrawing(false);
        setShowCalibDialog(true);
      }
    } else if (mode === 'draw-room') {
      setDrawStart(coords);
      setDrawCurrent(coords);
      setIsDrawing(true);
    } else if (mode === 'add-door') {
      const newDoor = { x: coords.x, y: coords.y, type: 'internal', width_m: 0.8, height_m: 2.0, count: 1 };
      setDoors(prev => {
        const next = [...prev, newDoor];
        saveToHistory(rooms, next, windows);
        return next;
      });
    } else if (mode === 'add-window') {
      const newWindow = { x: coords.x, y: coords.y, type: 'standard', width_m: 1.2, height_m: 1.2, count: 1 };
      setWindows(prev => {
        const next = [...prev, newWindow];
        saveToHistory(rooms, doors, next);
        return next;
      });
    } else if (mode === 'select') {
      const clickedRoom = rooms.findIndex(r => r.corners?.length >= 3 && pointInPolygon(coords, r.corners));
      setSelectedElement(clickedRoom >= 0 ? { type: 'room', index: clickedRoom } : null);
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }
    if (!isDrawing) return;
    setDrawCurrent(getCanvasCoords(e));
  };

  const handleMouseUp = (e) => {
    if (isPanning) { setIsPanning(false); return; }
    if (!isDrawing) return;
    const endCoords = getCanvasCoords(e);
    
    if (mode === 'draw-room' && drawStart) {
      const x1 = Math.min(drawStart.x, endCoords.x);
      const y1 = Math.min(drawStart.y, endCoords.y);
      const x2 = Math.max(drawStart.x, endCoords.x);
      const y2 = Math.max(drawStart.y, endCoords.y);
      
      const widthM = pixelsToMeters(x2 - x1);
      const heightM = pixelsToMeters(y2 - y1);
      
      if (widthM > 0.5 && heightM > 0.5) {
        const corners = [{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }];
        setPendingRoom({ corners, area_sqm: widthM * heightM, width_m: widthM, height_m: heightM });
        setNewRoomName('');
        setShowRoomDialog(true);
      }
    }
    
    setIsDrawing(false);
    if (mode !== 'calibrate') {
      setDrawStart(null);
      setDrawCurrent(null);
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.5, Math.min(5, prev * delta)));
  };

  const confirmCalibration = () => {
    const dist = parseFloat(calibDistance);
    if (dist > 0 && calibPoint1 && calibPoint2) {
      const pixelDist = distance(calibPoint1, calibPoint2);
      setCalibration({ pointA: calibPoint1, pointB: calibPoint2, realDistance: dist, pixelsPerMeter: pixelDist / dist });
      setShowCalibDialog(false);
      setCalibPoint1(null);
      setCalibPoint2(null);
      setCalibDistance('');
      setDrawStart(null);
      setDrawCurrent(null);
      onModeChange?.('draw-room');
    }
  };

  const confirmRoom = () => {
    if (pendingRoom) {
      let suggestedName = newRoomName.trim() || `Room ${rooms.length + 1}`;
      if (!newRoomName.trim() && pendingRoom.area_sqm) {
        if (pendingRoom.area_sqm > 20) suggestedName = 'Living Room';
        else if (pendingRoom.area_sqm > 12) suggestedName = `Bedroom ${rooms.filter(r => r.name?.includes('Bedroom')).length + 1}`;
        else if (pendingRoom.area_sqm > 8) suggestedName = `Bedroom ${rooms.filter(r => r.name?.includes('Bedroom')).length + 1}`;
        else if (pendingRoom.area_sqm > 5) suggestedName = 'Kitchen';
        else if (pendingRoom.area_sqm > 3) suggestedName = 'Bathroom';
        else suggestedName = 'Storage';
      }
      
      const newRoom = { ...pendingRoom, name: suggestedName };
      setRooms(prev => {
        const next = [...prev, newRoom];
        saveToHistory(next, doors, windows);
        return next;
      });
      setShowRoomDialog(false);
      setPendingRoom(null);
      setNewRoomName('');
    }
  };

  const handleDeleteSelected = () => {
    if (selectedElement?.type === 'room') {
      setRooms(prev => {
        const next = prev.filter((_, i) => i !== selectedElement.index);
        saveToHistory(next, doors, windows);
        return next;
      });
      setSelectedElement(null);
    }
  };

  const handleAcceptAI = () => {
    if (aiDetectedData) {
      setRooms(aiDetectedData.rooms || []);
      setDoors(aiDetectedData.doors || []);
      setWindows(aiDetectedData.windows || []);
      saveToHistory(aiDetectedData.rooms || [], aiDetectedData.doors || [], aiDetectedData.windows || []);
      onAcceptAIDetection?.();
    }
  };

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

  return (
    <div ref={containerRef} className="relative select-none overflow-hidden rounded-lg" style={{ width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className="absolute inset-0"
        style={{ touchAction: 'none', cursor: isPanning ? 'grabbing' : mode === 'select' ? 'default' : 'crosshair' }}
      />
      
      {/* Calibration Dialog */}
      {showCalibDialog && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 w-80">
          <h4 className="font-semibold text-foreground mb-1 flex items-center gap-2"><FaRuler className="text-blue-500" /> Set Scale</h4>
          <p className="text-xs text-foreground-secondary mb-3">Enter the real-world distance between the two points.</p>
          <div className="flex gap-2">
            <input type="number" value={calibDistance} onChange={(e) => setCalibDistance(e.target.value)} placeholder="Distance in meters" className="input text-sm flex-1" autoFocus onKeyDown={(e) => e.key === 'Enter' && confirmCalibration()} />
            <button onClick={confirmCalibration} className="btn btn-primary text-sm"><FaCheck /></button>
            <button onClick={() => { setShowCalibDialog(false); setCalibPoint1(null); setCalibPoint2(null); }} className="btn btn-outline text-sm"><FaTimes /></button>
          </div>
        </div>
      )}

      {/* Room Name Dialog */}
      {showRoomDialog && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 w-80">
          <h4 className="font-semibold text-foreground mb-1 flex items-center gap-2"><FaPlus className="text-blue-500" /> Name Room</h4>
          <p className="text-xs text-foreground-secondary mb-2">Area: {pendingRoom?.area_sqm?.toFixed(1)} m² ({pendingRoom?.width_m?.toFixed(1)}m × {pendingRoom?.height_m?.toFixed(1)}m)</p>
          <div className="flex gap-1.5 mb-2 flex-wrap">
            {['Living Room', 'Bedroom', 'Kitchen', 'Bathroom'].map(name => (
              <button key={name} onClick={() => setNewRoomName(name)} className={`text-xs px-2 py-1 rounded ${newRoomName === name ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-foreground-secondary'}`}>{name}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} placeholder="Room name" className="input text-sm flex-1" autoFocus onKeyDown={(e) => e.key === 'Enter' && confirmRoom()} />
            <button onClick={confirmRoom} className="btn btn-primary text-sm"><FaCheck /></button>
            <button onClick={() => { setShowRoomDialog(false); setPendingRoom(null); }} className="btn btn-outline text-sm"><FaTimes /></button>
          </div>
        </div>
      )}

      {/* AI Detection Banner */}
      {showAIDetection && aiDetectedData?.rooms?.length > 0 && (
        <div className="absolute top-4 right-4 z-30 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-3 max-w-xs">
          <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-2">AI detected {aiDetectedData.rooms.length} rooms</p>
          <div className="flex gap-2">
            <button onClick={handleAcceptAI} className="text-xs px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700">Accept</button>
            <button onClick={onRejectAIDetection} className="text-xs px-3 py-1 bg-gray-200 dark:bg-gray-700 text-foreground-secondary rounded hover:bg-gray-300">Dismiss</button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30 flex items-center gap-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-1.5">
        <button onClick={() => onModeChange?.('calibrate')} className={`p-2 rounded-lg transition-colors ${mode === 'calibrate' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-foreground-secondary'}`} title="Set Scale (S)"><FaRuler /></button>
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
        <button onClick={() => onModeChange?.('draw-room')} className={`p-2 rounded-lg transition-colors ${mode === 'draw-room' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-foreground-secondary'}`} title="Draw Room (R)" disabled={!calibration?.pixelsPerMeter}><FaPlus /></button>
        <button onClick={() => onModeChange?.('add-door')} className={`p-2 rounded-lg transition-colors ${mode === 'add-door' ? 'bg-green-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-foreground-secondary'}`} title="Add Door (D)" disabled={!calibration?.pixelsPerMeter}><span className="text-sm">🚪</span></button>
        <button onClick={() => onModeChange?.('add-window')} className={`p-2 rounded-lg transition-colors ${mode === 'add-window' ? 'bg-purple-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-foreground-secondary'}`} title="Add Window (W)" disabled={!calibration?.pixelsPerMeter}><span className="text-sm">🪟</span></button>
        <button onClick={() => onModeChange?.('select')} className={`p-2 rounded-lg transition-colors ${mode === 'select' ? 'bg-gray-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-foreground-secondary'}`} title="Select (V)"><FaMousePointer /></button>
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
        <button onClick={handleUndo} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-foreground-secondary transition-colors" title="Undo (Ctrl+Z)" disabled={historyIndex <= 0}><FaUndo /></button>
        <button onClick={handleRedo} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-foreground-secondary transition-colors" title="Redo (Ctrl+Y)" disabled={historyIndex >= history.length - 1}><FaRedo /></button>
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
        <button onClick={() => onZoomChange?.(Math.max(0.5, externalZoom - 0.2))} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-foreground-secondary transition-colors" title="Zoom Out"><FaSearchMinus /></button>
        <input 
          type="number" 
          value={Math.round(externalZoom * 100)} 
          onChange={(e) => onZoomChange?.(parseInt(e.target.value) / 100)}
          onBlur={(e) => {
            const val = parseInt(e.target.value);
            if (isNaN(val) || val < 50) onZoomChange?.(0.5);
            else if (val > 500) onZoomChange?.(5);
          }}
          className="w-14 text-center text-xs bg-transparent text-foreground-muted focus:outline-none focus:ring-1 focus:ring-primary rounded"
          min="50"
          max="500"
          step="10"
          title="Zoom percentage"
        />
        <button onClick={() => onZoomChange?.(Math.min(5, externalZoom + 0.2))} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-foreground-secondary transition-colors" title="Zoom In"><FaSearchPlus /></button>
        <button onClick={() => { onZoomChange?.(1); onPanChange?.({ x: 0, y: 0 }); }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-foreground-secondary transition-colors" title="Fit to View"><FaExpand /></button>
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
        <button onClick={() => setShowLayers(l => ({ ...l, rooms: !l.rooms }))} className={`p-2 rounded-lg transition-colors ${showLayers.rooms ? 'text-blue-500' : 'text-foreground-muted'}`} title="Toggle Rooms"><FaEye /></button>
        <button onClick={() => setShowLayers(l => ({ ...l, doors: !l.doors }))} className={`p-2 rounded-lg transition-colors ${showLayers.doors ? 'text-green-500' : 'text-foreground-muted'}`} title="Toggle Doors"><span className="text-xs">🚪</span></button>
        <button onClick={() => setShowLayers(l => ({ ...l, windows: !l.windows }))} className={`p-2 rounded-lg transition-colors ${showLayers.windows ? 'text-purple-500' : 'text-foreground-muted'}`} title="Toggle Windows"><span className="text-xs">🪟</span></button>
        {selectedElement && (
          <>
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
            <button onClick={handleDeleteSelected} className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors" title="Delete (Del)"><FaTrash /></button>
          </>
        )}
      </div>

      {/* Mode indicator */}
      <div className="absolute top-4 left-4 z-30 bg-black/70 text-white px-3 py-2 rounded-lg text-xs">
        {mode === 'calibrate' && '📏 Click two points to set scale'}
        {mode === 'draw-room' && '🏠 Click and drag to draw rooms'}
        {mode === 'add-door' && '🚪 Click to place doors'}
        {mode === 'add-window' && '🪟 Click to place windows'}
        {mode === 'select' && '👆 Click to select • Alt+Drag to pan'}
        {calibration?.pixelsPerMeter && <span className="ml-2 text-green-400">Scale: {calibration.pixelsPerMeter.toFixed(1)} px/m</span>}
      </div>
    </div>
  );
}

export default CanvasOverlay;

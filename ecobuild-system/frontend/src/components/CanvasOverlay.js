import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  FaRuler, FaMousePointer, FaPlus, FaTrash, FaUndo, FaRedo, 
  FaSearchPlus, FaSearchMinus, FaExpand, FaEye, FaEyeSlash, FaHandPaper,
  FaCheck, FaTimes
} from 'react-icons/fa';

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
  externalZoom = 1,
  externalPan = { x: 0, y: 0 },
  onZoomChange,
  onPanChange,
}) {
  const canvasRef = useRef(null);
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
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [showLayers, setShowLayers] = useState({ rooms: true, doors: true, windows: true, walls: true });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const canvas = canvasRef.current;
  const ctx = canvas?.getContext('2d');
  const HANDLE_SIZE = 10;
  const SNAP_DISTANCE = 15;

  const saveToHistory = useCallback((newRooms, newDoors, newWindows) => {
    const newState = {
      rooms: JSON.parse(JSON.stringify(newRooms)),
      doors: JSON.parse(JSON.stringify(newDoors)),
      windows: JSON.parse(JSON.stringify(newWindows)),
    };
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newState);
      return newHistory.slice(-50);
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setRooms(prevState.rooms);
      setDoors(prevState.doors);
      setWindows(prevState.windows);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex, setRooms, setDoors, setWindows]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setRooms(nextState.rooms);
      setDoors(nextState.doors);
      setWindows(nextState.windows);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex, setRooms, setDoors, setWindows]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); handleUndo(); }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); handleRedo(); }
      if (e.key === 'Delete' && selectedElement) { handleDeleteSelected(); }
      if (e.key === 'Escape') { setSelectedElement(null); setShowRoomDialog(false); setShowCalibDialog(false); setIsResizing(false); setIsDragging(false); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, selectedElement]);

  useEffect(() => {
    if (canvas && imageDimensions) {
      canvas.width = imageDimensions.width;
      canvas.height = imageDimensions.height;
      redraw();
    }
  }, [canvas, imageDimensions, rooms, doors, windows, walls, calibration, drawStart, drawCurrent, calibPoint1, calibPoint2, externalZoom, externalPan, showLayers, selectedElement]);

  const getCanvasCoords = (e) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const pixelsToMeters = (pixels) => {
    if (!calibration?.pixelsPerMeter) return 0;
    return pixels / calibration.pixelsPerMeter;
  };

  const distance = (p1, p2) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

  const snapToEdge = (point, snapDistance = SNAP_DISTANCE) => {
    const snapPoints = [];
    rooms.forEach(room => { room.corners?.forEach(c => snapPoints.push({ x: c.x, y: c.y })); });
    doors.forEach(d => { if (d.x && d.y) snapPoints.push({ x: d.x, y: d.y }); });
    windows.forEach(w => { if (w.x && w.y) snapPoints.push({ x: w.x, y: w.y }); });

    let closest = null;
    let minDist = snapDistance;
    
    snapPoints.forEach(sp => {
      const dist = distance(sp, point);
      if (dist < minDist) { minDist = dist; closest = sp; }
    });

    rooms.forEach(room => {
      if (!room.corners || room.corners.length < 2) return;
      for (let i = 0; i < room.corners.length; i++) {
        const c1 = room.corners[i];
        const c2 = room.corners[(i + 1) % room.corners.length];
        const projected = projectPointToLine(point, c1, c2);
        if (projected) {
          const dist = distance(projected, point);
          if (dist < minDist) { minDist = dist; closest = { x: projected.x, y: projected.y }; }
        }
      }
    });

    return closest || point;
  };

  const projectPointToLine = (point, lineStart, lineEnd) => {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq === 0) return null;
    let t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));
    return { x: lineStart.x + t * dx, y: lineStart.y + t * dy };
  };

  const getResizeHandle = (point) => {
    if (!selectedElement || selectedElement.type !== 'room') return null;
    const room = rooms[selectedElement.index];
    if (!room?.corners) return null;
    for (let i = 0; i < room.corners.length; i++) {
      const corner = room.corners[i];
      if (Math.abs(point.x - corner.x) < HANDLE_SIZE && Math.abs(point.y - corner.y) < HANDLE_SIZE) return i;
    }
    return null;
  };

  const getRoomAtPoint = (point) => {
    for (let i = rooms.length - 1; i >= 0; i--) {
      const room = rooms[i];
      if (room.corners?.length >= 3 && pointInPolygon(point, room.corners)) return i;
    }
    return -1;
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

  const handleMouseDown = (e) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - externalPan.x, y: e.clientY - externalPan.y });
      return;
    }
    
    const coords = getCanvasCoords(e);
    const snappedCoords = mode === 'calibrate' ? snapToEdge(coords) : coords;

    if (mode === 'select') {
      const handle = getResizeHandle(coords);
      if (handle !== null) { setIsResizing(true); setResizeHandle(handle); return; }
      const roomIdx = getRoomAtPoint(coords);
      if (roomIdx >= 0) {
        setSelectedElement({ type: 'room', index: roomIdx });
        setIsDragging(true);
        setDragOffset({ x: coords.x - rooms[roomIdx].corners[0].x, y: coords.y - rooms[roomIdx].corners[0].y });
        return;
      }
      for (let i = 0; i < doors.length; i++) {
        if (doors[i].x && Math.abs(coords.x - doors[i].x) < 15 && Math.abs(coords.y - doors[i].y) < 15) {
          setSelectedElement({ type: 'door', index: i }); return;
        }
      }
      for (let i = 0; i < windows.length; i++) {
        if (windows[i].x && Math.abs(coords.x - windows[i].x) < 15 && Math.abs(coords.y - windows[i].y) < 15) {
          setSelectedElement({ type: 'window', index: i }); return;
        }
      }
      setSelectedElement(null);
      return;
    }
    
    if (mode === 'calibrate') {
      if (!calibPoint1) { setCalibPoint1(snappedCoords); setCalibPoint2(null); setDrawStart(snappedCoords); setIsDrawing(true); } 
      else if (!calibPoint2) { setCalibPoint2(snappedCoords); setDrawCurrent(snappedCoords); setIsDrawing(false); setShowCalibDialog(true); }
    } else if (mode === 'draw-room') {
      setDrawStart(snappedCoords); setDrawCurrent(snappedCoords); setIsDrawing(true);
    } else if (mode === 'add-door') {
      const newDoor = { x: snappedCoords.x, y: snappedCoords.y, type: 'internal', width_m: 0.8, height_m: 2.0, count: 1 };
      setDoors(prev => { const next = [...prev, newDoor]; saveToHistory(rooms, next, windows); return next; });
    } else if (mode === 'add-window') {
      const newWindow = { x: snappedCoords.x, y: snappedCoords.y, type: 'standard', width_m: 1.2, height_m: 1.2, count: 1 };
      setWindows(prev => { const next = [...prev, newWindow]; saveToHistory(rooms, doors, next); return next; });
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) { onPanChange?.({ x: e.clientX - panStart.x, y: e.clientY - panStart.y }); return; }
    if (isResizing && selectedElement?.type === 'room') {
      const coords = getCanvasCoords(e);
      const snapped = snapToEdge(coords);
      setRooms(prev => {
        const newRooms = [...prev];
        const room = { ...newRooms[selectedElement.index] };
        const newCorners = [...room.corners];
        newCorners[resizeHandle] = snapped;
        if (newCorners.length === 4) {
          const next = (resizeHandle + 1) % 4;
          const prev = (resizeHandle + 3) % 4;
          if (resizeHandle === 0 || resizeHandle === 2) { newCorners[next].x = snapped.x; newCorners[prev].y = snapped.y; } 
          else { newCorners[next].y = snapped.y; newCorners[prev].x = snapped.x; }
        }
        const w = Math.abs(newCorners[2].x - newCorners[0].x);
        const h = Math.abs(newCorners[2].y - newCorners[0].y);
        newRooms[selectedElement.index] = { ...room, corners: newCorners, width: w, height: h, area: w * h, area_sqm: calibration?.pixelsPerMeter > 0 ? (w / calibration.pixelsPerMeter) * (h / calibration.pixelsPerMeter) : 0 };
        return newRooms;
      });
      return;
    }
    if (isDragging && selectedElement?.type === 'room') {
      const coords = getCanvasCoords(e);
      const dx = coords.x - dragOffset.x - rooms[selectedElement.index].corners[0].x;
      const dy = coords.y - dragOffset.y - rooms[selectedElement.index].corners[0].y;
      setRooms(prev => {
        const newRooms = [...prev];
        const room = { ...newRooms[selectedElement.index] };
        room.corners = room.corners.map(c => ({ x: c.x + dx, y: c.y + dy }));
        newRooms[selectedElement.index] = room;
        return newRooms;
      });
      return;
    }
    if (!isDrawing) return;
    setDrawCurrent(getCanvasCoords(e));
  };

  const handleMouseUp = (e) => {
    if (isPanning) { setIsPanning(false); return; }
    if (isResizing) { setIsResizing(false); setResizeHandle(null); saveToHistory(rooms, doors, windows); return; }
    if (isDragging) { setIsDragging(false); setDragOffset(null); saveToHistory(rooms, doors, windows); return; }
    if (!isDrawing) return;
    const endCoords = getCanvasCoords(e);
    if (mode === 'draw-room' && drawStart) {
      const x1 = Math.min(drawStart.x, endCoords.x);
      const y1 = Math.min(drawStart.y, endCoords.y);
      const x2 = Math.max(drawStart.x, endCoords.x);
      const y2 = Math.max(drawStart.y, endCoords.y);
      const w = x2 - x1; const h = y2 - y1;
      if (w > 20 && h > 20) {
        const corners = [{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }];
        setPendingRoom({ corners, area_sqm: 0, width: w, height: h, area: w * h });
        setNewRoomName(''); setShowRoomDialog(true);
      }
    }
    setIsDrawing(false);
    if (mode !== 'calibrate') { setDrawStart(null); setDrawCurrent(null); }
  };

  const confirmCalibration = () => {
    const dist = parseFloat(calibDistance);
    if (dist > 0 && calibPoint1 && calibPoint2) {
      setCalibration({ pointA: calibPoint1, pointB: calibPoint2, realDistance: dist, pixelsPerMeter: distance(calibPoint1, calibPoint2) / dist });
      setShowCalibDialog(false); setCalibPoint1(null); setCalibPoint2(null); setCalibDistance(''); setDrawStart(null); setDrawCurrent(null);
      onModeChange?.('draw-room');
    }
  };

  const confirmRoom = () => {
    if (pendingRoom) {
      let suggestedName = newRoomName.trim() || `Room ${rooms.length + 1}`;
      if (!newRoomName.trim() && pendingRoom.area > 0) {
        const areaRatio = pendingRoom.area / (imageDimensions?.width * imageDimensions?.height || 1);
        if (areaRatio > 0.1) suggestedName = 'Living Room';
        else if (areaRatio > 0.04 && areaRatio < 0.12) suggestedName = `Bedroom ${rooms.filter(r => r.name?.includes('Bedroom')).length + 1}`;
        else if (areaRatio > 0.03 && areaRatio < 0.06) suggestedName = 'Kitchen';
        else if (areaRatio < 0.03) suggestedName = 'Bathroom';
        else suggestedName = 'Storage';
      }
      const newRoom = { ...pendingRoom, name: suggestedName };
      setRooms(prev => { const next = [...prev, newRoom]; saveToHistory(next, doors, windows); return next; });
      setShowRoomDialog(false); setPendingRoom(null); setNewRoomName('');
    }
  };

  const handleDeleteSelected = () => {
    if (!selectedElement) return;
    if (selectedElement.type === 'room') {
      setRooms(prev => { const next = prev.filter((_, i) => i !== selectedElement.index); saveToHistory(next, doors, windows); return next; });
    } else if (selectedElement.type === 'door') {
      setDoors(prev => { const next = prev.filter((_, i) => i !== selectedElement.index); saveToHistory(rooms, next, windows); return next; });
    } else if (selectedElement.type === 'window') {
      setWindows(prev => { const next = prev.filter((_, i) => i !== selectedElement.index); saveToHistory(rooms, doors, next); return next; });
    }
    setSelectedElement(null);
  };

  const redraw = useCallback(() => {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (mode === 'calibrate') {
      const snapPoints = [];
      rooms.forEach(room => { room.corners?.forEach(c => snapPoints.push({ x: c.x, y: c.y })); });
      doors.forEach(d => { if (d.x && d.y) snapPoints.push({ x: d.x, y: d.y }); });
      windows.forEach(w => { if (w.x && w.y) snapPoints.push({ x: w.x, y: w.y }); });
      snapPoints.forEach(sp => {
        ctx.beginPath(); ctx.moveTo(sp.x - 6, sp.y); ctx.lineTo(sp.x + 6, sp.y); ctx.moveTo(sp.x, sp.y - 6); ctx.lineTo(sp.x, sp.y + 6);
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(sp.x, sp.y, 3, 0, Math.PI * 2); ctx.fillStyle = 'rgba(59, 130, 246, 0.4)'; ctx.fill();
      });
      if (calibPoint1) {
        ctx.beginPath(); ctx.arc(calibPoint1.x, calibPoint1.y, 6, 0, Math.PI * 2); ctx.fillStyle = '#3B82F6'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#3B82F6'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('P1', calibPoint1.x, calibPoint1.y - 10);
      }
      if (calibPoint2) {
        ctx.beginPath(); ctx.arc(calibPoint2.x, calibPoint2.y, 6, 0, Math.PI * 2); ctx.fillStyle = '#EF4444'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#EF4444'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('P2', calibPoint2.x, calibPoint2.y - 10);
        ctx.beginPath(); ctx.moveTo(calibPoint1.x, calibPoint1.y); ctx.lineTo(calibPoint2.x, calibPoint2.y);
        ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
        const dist = pixelsToMeters(distance(calibPoint1, calibPoint2));
        ctx.fillStyle = '#F59E0B'; ctx.font = 'bold 13px sans-serif'; ctx.fillText(dist.toFixed(2) + 'm', (calibPoint1.x + calibPoint2.x) / 2, (calibPoint1.y + calibPoint2.y) / 2 - 10);
      }
    }
    if (showLayers.rooms) {
      rooms.forEach((room, idx) => {
        if (room.corners && room.corners.length >= 2) {
          ctx.beginPath(); ctx.moveTo(room.corners[0].x, room.corners[0].y);
          room.corners.forEach(c => ctx.lineTo(c.x, c.y)); ctx.closePath();
          const isSelected = selectedElement?.type === 'room' && selectedElement?.index === idx;
          ctx.fillStyle = isSelected ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.08)'; ctx.fill();
          ctx.strokeStyle = isSelected ? '#1D4ED8' : '#3B82F6'; ctx.lineWidth = isSelected ? 3 : 2; ctx.stroke();
          const centerX = room.corners.reduce((s, c) => s + c.x, 0) / room.corners.length;
          const centerY = room.corners.reduce((s, c) => s + c.y, 0) / room.corners.length;
          ctx.fillStyle = '#1E40AF'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText(room.name || ('Room ' + (idx + 1)), centerX, centerY - 6);
          ctx.font = '10px sans-serif'; ctx.fillStyle = '#3B82F6';
          ctx.fillText((room.area_sqm?.toFixed(1) || 0) + ' m\u00B2', centerX, centerY + 8);
          if (isSelected && room.corners.length === 4) {
            room.corners.forEach(corner => {
              ctx.fillStyle = '#fff'; ctx.strokeStyle = '#3B82F6'; ctx.lineWidth = 2;
              ctx.fillRect(corner.x - HANDLE_SIZE/2, corner.y - HANDLE_SIZE/2, HANDLE_SIZE, HANDLE_SIZE);
              ctx.strokeRect(corner.x - HANDLE_SIZE/2, corner.y - HANDLE_SIZE/2, HANDLE_SIZE, HANDLE_SIZE);
            });
          }
        }
      });
    }
    if (showLayers.doors) {
      doors.forEach((door, idx) => {
        if (door.x && door.y) {
          const isSelected = selectedElement?.type === 'door' && selectedElement?.index === idx;
          ctx.beginPath(); ctx.arc(door.x, door.y, isSelected ? 10 : 7, 0, Math.PI * 2);
          ctx.fillStyle = isSelected ? '#F59E0B' : '#10B981'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('\uD83D\uDEAA', door.x, door.y + 4);
        }
      });
    }
    if (showLayers.windows) {
      windows.forEach((win, idx) => {
        if (win.x && win.y) {
          const isSelected = selectedElement?.type === 'window' && selectedElement?.index === idx;
          ctx.beginPath(); ctx.arc(win.x, win.y, isSelected ? 9 : 6, 0, Math.PI * 2);
          ctx.fillStyle = isSelected ? '#F59E0B' : '#8B5CF6'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('\uD83E\uDE9F', win.x, win.y + 3);
        }
      });
    }
    if (isDrawing && drawStart && drawCurrent) {
      if (mode === 'calibrate') {
        ctx.beginPath(); ctx.moveTo(drawStart.x, drawStart.y); ctx.lineTo(drawCurrent.x, drawCurrent.y);
        ctx.strokeStyle = '#3B82F6'; ctx.lineWidth = 3; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
        const dist = pixelsToMeters(distance(drawStart, drawCurrent));
        ctx.fillStyle = '#3B82F6'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(dist.toFixed(2) + 'm', (drawStart.x + drawCurrent.x) / 2, (drawStart.y + drawCurrent.y) / 2 - 10);
      } else if (mode === 'draw-room') {
        const x = Math.min(drawStart.x, drawCurrent.x); const y = Math.min(drawStart.y, drawCurrent.y);
        const rw = Math.abs(drawCurrent.x - drawStart.x); const rh = Math.abs(drawCurrent.y - drawStart.y);
        ctx.beginPath(); ctx.rect(x, y, rw, rh); ctx.fillStyle = 'rgba(59, 130, 246, 0.15)'; ctx.fill();
        ctx.strokeStyle = '#3B82F6'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
        const widthM = pixelsToMeters(rw); const heightM = pixelsToMeters(rh); const areaM = widthM * heightM;
        ctx.fillStyle = '#1E40AF'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(widthM.toFixed(1) + 'm \u00D7 ' + heightM.toFixed(1) + 'm', (drawStart.x + drawCurrent.x) / 2, (drawStart.y + drawCurrent.y) / 2 - 6);
        ctx.fillText(areaM.toFixed(1) + ' m\u00B2', (drawStart.x + drawCurrent.x) / 2, (drawStart.y + drawCurrent.y) / 2 + 8);
      }
    }
  }, [ctx, canvas, rooms, doors, windows, walls, calibration, drawStart, drawCurrent, calibPoint1, calibPoint2, externalZoom, externalPan, showLayers, selectedElement, mode, pixelsToMeters, distance, isDrawing]);

  return (
    <div className="absolute inset-0 select-none" style={{ cursor: isPanning ? 'grabbing' : mode === 'select' ? 'default' : 'crosshair' }}>
      <canvas ref={canvasRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} className="absolute inset-0 w-full h-full" style={{ touchAction: 'none', pointerEvents: 'auto' }} />
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
      {showRoomDialog && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 w-80">
          <h4 className="font-semibold text-foreground mb-1 flex items-center gap-2"><FaPlus className="text-blue-500" /> Name Room</h4>
          <p className="text-xs text-foreground-secondary mb-2">Area: {(pendingRoom?.area_sqm || 0).toFixed(1)} m\u00B2</p>
          <div className="flex gap-1.5 mb-2 flex-wrap">
            {['Living Room', 'Bedroom', 'Kitchen', 'Bathroom'].map(name => (
              <button key={name} onClick={() => setNewRoomName(name)} className={'text-xs px-2 py-1 rounded ' + (newRoomName === name ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-foreground-secondary')}>{name}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} placeholder="Room name" className="input text-sm flex-1" autoFocus onKeyDown={(e) => e.key === 'Enter' && confirmRoom()} />
            <button onClick={confirmRoom} className="btn btn-primary text-sm"><FaCheck /></button>
            <button onClick={() => { setShowRoomDialog(false); setPendingRoom(null); }} className="btn btn-outline text-sm"><FaTimes /></button>
          </div>
        </div>
      )}
      <div className="absolute top-4 left-4 z-30 bg-black/70 text-white px-3 py-2 rounded-lg text-xs">
        {mode === 'calibrate' && 'Click two points to set scale'}
        {mode === 'draw-room' && 'Click and drag to draw rooms'}
        {mode === 'add-door' && 'Click to place doors'}
        {mode === 'add-window' && 'Click to place windows'}
        {mode === 'select' && 'Click to select \u2022 Drag to move \u2022 Handles to resize \u2022 Del to delete'}
        {calibration?.pixelsPerMeter && <span className="ml-2 text-green-400">Scale: {calibration.pixelsPerMeter.toFixed(1)} px/m</span>}
      </div>
    </div>
  );
}

export default CanvasOverlay;

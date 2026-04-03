import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FaRuler, FaMousePointer, FaEraser, FaCheck, FaTimes, FaPlus, FaTrash } from 'react-icons/fa';

/**
 * Interactive Canvas Overlay for Floor Plan Analysis
 * Supports: Scale calibration, room drawing, element editing
 */
function CanvasOverlay({ 
  imageUrl, 
  imageNaturalSize,
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
  mode = 'select', // 'calibrate' | 'draw-room' | 'add-door' | 'add-window' | 'select'
  onModeChange,
  imageDimensions // { width, height } of displayed image
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [drawCurrent, setDrawCurrent] = useState(null);
  const [calibPoint1, setCalibPoint1] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null);
  const [showCalibDialog, setShowCalibDialog] = useState(false);
  const [calibDistance, setCalibDistance] = useState('');
  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [pendingRoom, setPendingRoom] = useState(null);

  const canvas = canvasRef.current;
  const ctx = canvas?.getContext('2d');

  // Resize canvas to match displayed image
  useEffect(() => {
    if (canvas && imageDimensions) {
      canvas.width = imageDimensions.width;
      canvas.height = imageDimensions.height;
      redraw();
    }
  }, [canvas, imageDimensions, rooms, doors, windows, walls, calibration, drawStart, drawCurrent, calibPoint1]);

  const getCanvasCoords = (e) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const pixelsToMeters = (pixels) => {
    if (!calibration?.pixelsPerMeter) return 0;
    return pixels / calibration.pixelsPerMeter;
  };

  const metersToPixels = (meters) => {
    if (!calibration?.pixelsPerMeter) return 0;
    return meters * calibration.pixelsPerMeter;
  };

  const distance = (p1, p2) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  const redraw = useCallback(() => {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

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
        ctx.font = '12px sans-serif';
        ctx.fillText('Point 1 - Click second point', calibPoint1.x + 10, calibPoint1.y - 10);
      }
    }

    // Draw existing rooms
    rooms.forEach((room, idx) => {
      if (room.corners && room.corners.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(room.corners[0].x, room.corners[0].y);
        room.corners.forEach(c => ctx.lineTo(c.x, c.y));
        ctx.closePath();
        ctx.fillStyle = selectedElement?.type === 'room' && selectedElement?.index === idx 
          ? 'rgba(59, 130, 246, 0.3)' 
          : 'rgba(59, 130, 246, 0.15)';
        ctx.fill();
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Room label
        const centerX = room.corners.reduce((s, c) => s + c.x, 0) / room.corners.length;
        const centerY = room.corners.reduce((s, c) => s + c.y, 0) / room.corners.length;
        ctx.fillStyle = '#1E40AF';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(room.name, centerX, centerY - 8);
        ctx.font = '10px sans-serif';
        ctx.fillText(`${room.area_sqm?.toFixed(1) || 0} m²`, centerX, centerY + 6);
      }
    });

    // Draw existing doors
    doors.forEach((door, idx) => {
      if (door.x && door.y) {
        ctx.beginPath();
        ctx.arc(door.x, door.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = selectedElement?.type === 'door' && selectedElement?.index === idx 
          ? '#F59E0B' : '#10B981';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.fillStyle = '#065F46';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(door.type || 'door', door.x, door.y - 12);
      }
    });

    // Draw existing windows
    windows.forEach((win, idx) => {
      if (win.x && win.y) {
        ctx.beginPath();
        ctx.arc(win.x, win.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = selectedElement?.type === 'window' && selectedElement?.index === idx 
          ? '#F59E0B' : '#8B5CF6';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.fillStyle = '#5B21B6';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(win.type || 'window', win.x, win.y - 10);
      }
    });

    // Draw drawing in progress
    if (isDrawing && drawStart && drawCurrent) {
      if (mode === 'calibrate') {
        // Draw calibration line
        ctx.beginPath();
        ctx.moveTo(drawStart.x, drawStart.y);
        ctx.lineTo(drawCurrent.x, drawCurrent.y);
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        const dist = pixelsToMeters(distance(drawStart, drawCurrent));
        ctx.fillStyle = '#3B82F6';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${dist.toFixed(2)}m`, (drawStart.x + drawCurrent.x) / 2, (drawStart.y + drawCurrent.y) / 2 - 10);
      } else if (mode === 'draw-room') {
        // Draw room rectangle
        ctx.beginPath();
        ctx.rect(
          Math.min(drawStart.x, drawCurrent.x),
          Math.min(drawStart.y, drawCurrent.y),
          Math.abs(drawCurrent.x - drawStart.x),
          Math.abs(drawCurrent.y - drawStart.y)
        );
        ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
        ctx.fill();
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        const widthM = pixelsToMeters(Math.abs(drawCurrent.x - drawStart.x));
        const heightM = pixelsToMeters(Math.abs(drawCurrent.y - drawStart.y));
        const areaM = widthM * heightM;
        
        ctx.fillStyle = '#1E40AF';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${widthM.toFixed(1)}m × ${heightM.toFixed(1)}m = ${areaM.toFixed(1)}m²`, 
          (drawStart.x + drawCurrent.x) / 2, (drawStart.y + drawCurrent.y) / 2);
      }
    }

    // Draw scale indicator
    if (calibration?.pixelsPerMeter) {
      const scaleBarPixels = metersToPixels(2); // 2 meter scale bar
      const startX = 20;
      const startY = canvas.height - 30;
      
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + scaleBarPixels, startY);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // End ticks
      ctx.beginPath();
      ctx.moveTo(startX, startY - 5);
      ctx.lineTo(startX, startY + 5);
      ctx.moveTo(startX + scaleBarPixels, startY - 5);
      ctx.lineTo(startX + scaleBarPixels, startY + 5);
      ctx.stroke();
      
      ctx.fillStyle = '#000';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('2m', startX + scaleBarPixels / 2, startY - 8);
    }
  }, [ctx, canvas, rooms, doors, windows, calibration, drawStart, drawCurrent, calibPoint1, isDrawing, mode, selectedElement, pixelsToMeters, metersToPixels]);

  const handleMouseDown = (e) => {
    const coords = getCanvasCoords(e);
    
    if (mode === 'calibrate') {
      if (!calibPoint1) {
        setCalibPoint1(coords);
        setDrawStart(coords);
        setIsDrawing(true);
      } else {
        setDrawCurrent(coords);
        setIsDrawing(false);
        setShowCalibDialog(true);
      }
    } else if (mode === 'draw-room') {
      setDrawStart(coords);
      setDrawCurrent(coords);
      setIsDrawing(true);
    } else if (mode === 'add-door') {
      const newDoor = {
        x: coords.x,
        y: coords.y,
        type: 'internal',
        width_m: 0.8,
        height_m: 2.0,
        count: 1
      };
      setDoors(prev => [...prev, newDoor]);
    } else if (mode === 'add-window') {
      const newWindow = {
        x: coords.x,
        y: coords.y,
        type: 'standard',
        width_m: 1.2,
        height_m: 1.2,
        count: 1
      };
      setWindows(prev => [...prev, newWindow]);
    } else if (mode === 'select') {
      // Check if clicking on existing element
      const clickedRoom = rooms.findIndex(r => {
        if (!r.corners || r.corners.length < 3) return false;
        return pointInPolygon(coords, r.corners);
      });
      
      if (clickedRoom >= 0) {
        setSelectedElement({ type: 'room', index: clickedRoom });
      } else {
        setSelectedElement(null);
      }
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    setDrawCurrent(getCanvasCoords(e));
  };

  const handleMouseUp = (e) => {
    if (!isDrawing) return;
    const endCoords = getCanvasCoords(e);
    
    if (mode === 'draw-room' && drawStart) {
      const x1 = Math.min(drawStart.x, endCoords.x);
      const y1 = Math.min(drawStart.y, endCoords.y);
      const x2 = Math.max(drawStart.x, endCoords.x);
      const y2 = Math.max(drawStart.y, endCoords.y);
      
      const widthM = pixelsToMeters(x2 - x1);
      const heightM = pixelsToMeters(y2 - y1);
      
      if (widthM > 0.5 && heightM > 0.5) { // Minimum room size
        const corners = [
          { x: x1, y: y1 },
          { x: x2, y: y1 },
          { x: x2, y: y2 },
          { x: x1, y: y2 }
        ];
        setPendingRoom({ corners, area_sqm: widthM * heightM, width_m: widthM, height_m: heightM });
        setNewRoomName('');
        setShowRoomDialog(true);
      }
    }
    
    setIsDrawing(false);
    setDrawStart(null);
    setDrawCurrent(null);
  };

  const handleDoubleClick = (e) => {
    if (mode === 'draw-room' && isDrawing) {
      // Finish drawing room with double-click
      handleMouseUp(e);
    }
  };

  const confirmCalibration = () => {
    const dist = parseFloat(calibDistance);
    if (dist > 0 && drawStart && drawCurrent) {
      const pixelDist = distance(drawStart, drawCurrent);
      setCalibration({
        pointA: drawStart,
        pointB: drawCurrent,
        realDistance: dist,
        pixelsPerMeter: pixelDist / dist
      });
      setShowCalibDialog(false);
      setCalibPoint1(null);
      setCalibDistance('');
      onModeChange?.('draw-room');
    }
  };

  const confirmRoom = () => {
    if (pendingRoom) {
      const roomName = newRoomName.trim() || `Room ${rooms.length + 1}`;
      // AI-suggest name based on size
      let suggestedName = roomName;
      if (!newRoomName.trim() && pendingRoom.area_sqm) {
        if (pendingRoom.area_sqm > 20) suggestedName = 'Living Room';
        else if (pendingRoom.area_sqm > 12) suggestedName = `Bedroom ${rooms.filter(r => r.name?.includes('Bedroom')).length + 1}`;
        else if (pendingRoom.area_sqm > 8) suggestedName = `Bedroom ${rooms.filter(r => r.name?.includes('Bedroom')).length + 1}`;
        else if (pendingRoom.area_sqm > 5) suggestedName = 'Kitchen';
        else if (pendingRoom.area_sqm > 3) suggestedName = 'Bathroom';
        else suggestedName = 'Storage';
      }
      
      setRooms(prev => [...prev, {
        ...pendingRoom,
        name: suggestedName
      }]);
      setShowRoomDialog(false);
      setPendingRoom(null);
      setNewRoomName('');
    }
  };

  const deleteSelected = () => {
    if (selectedElement?.type === 'room') {
      setRooms(prev => prev.filter((_, i) => i !== selectedElement.index));
      setSelectedElement(null);
    }
  };

  const pointInPolygon = (point, polygon) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      const intersect = ((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  return (
    <div ref={containerRef} className="relative select-none" style={{ cursor: mode === 'calibrate' ? 'crosshair' : mode === 'draw-room' ? 'crosshair' : mode === 'add-door' || mode === 'add-window' ? 'crosshair' : 'default' }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        className="absolute inset-0 z-10"
        style={{ touchAction: 'none' }}
      />
      
      {/* Calibration Dialog */}
      {showCalibDialog && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 w-72">
          <h4 className="font-semibold text-foreground mb-2">Set Scale Distance</h4>
          <p className="text-xs text-foreground-secondary mb-3">Enter the real-world distance between the two points you clicked.</p>
          <div className="flex gap-2">
            <input
              type="number"
              value={calibDistance}
              onChange={(e) => setCalibDistance(e.target.value)}
              placeholder="Distance in meters"
              className="input text-sm flex-1"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && confirmCalibration()}
            />
            <button onClick={confirmCalibration} className="btn btn-primary text-sm">
              <FaCheck />
            </button>
            <button onClick={() => { setShowCalibDialog(false); setCalibPoint1(null); }} className="btn btn-outline text-sm">
              <FaTimes />
            </button>
          </div>
        </div>
      )}

      {/* Room Name Dialog */}
      {showRoomDialog && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 w-72">
          <h4 className="font-semibold text-foreground mb-2">Name This Room</h4>
          <p className="text-xs text-foreground-secondary mb-2">
            Area: {pendingRoom?.area_sqm?.toFixed(1)} m² ({pendingRoom?.width_m?.toFixed(1)}m × {pendingRoom?.height_m?.toFixed(1)}m)
          </p>
          <div className="flex gap-2 mb-2">
            {['Living Room', 'Bedroom', 'Kitchen', 'Bathroom'].map(name => (
              <button
                key={name}
                onClick={() => setNewRoomName(name)}
                className={`text-xs px-2 py-1 rounded ${newRoomName === name ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-foreground-secondary'}`}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Room name"
              className="input text-sm flex-1"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && confirmRoom()}
            />
            <button onClick={confirmRoom} className="btn btn-primary text-sm">
              <FaCheck />
            </button>
            <button onClick={() => { setShowRoomDialog(false); setPendingRoom(null); }} className="btn btn-outline text-sm">
              <FaTimes />
            </button>
          </div>
        </div>
      )}

      {/* Mode indicator */}
      <div className="absolute bottom-4 left-4 z-20 bg-black/70 text-white px-3 py-2 rounded-lg text-xs">
        {mode === 'calibrate' && '📏 Click two points to set scale'}
        {mode === 'draw-room' && '🏠 Click and drag to draw rooms'}
        {mode === 'add-door' && '🚪 Click to place doors'}
        {mode === 'add-window' && '🪟 Click to place windows'}
        {mode === 'select' && '👆 Click to select elements'}
        {calibration?.pixelsPerMeter && (
          <span className="ml-2 text-green-400">Scale: {calibration.pixelsPerMeter.toFixed(1)} px/m</span>
        )}
      </div>

      {/* Toolbar */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <button
          onClick={() => onModeChange?.('calibrate')}
          className={`p-2 rounded-lg shadow-lg ${mode === 'calibrate' ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 text-foreground'}`}
          title="Set Scale"
        >
          <FaRuler />
        </button>
        <button
          onClick={() => onModeChange?.('draw-room')}
          className={`p-2 rounded-lg shadow-lg ${mode === 'draw-room' ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 text-foreground'}`}
          title="Draw Room"
          disabled={!calibration?.pixelsPerMeter}
        >
          <FaPlus />
        </button>
        <button
          onClick={() => onModeChange?.('add-door')}
          className={`p-2 rounded-lg shadow-lg ${mode === 'add-door' ? 'bg-green-500 text-white' : 'bg-white dark:bg-gray-800 text-foreground'}`}
          title="Add Door"
          disabled={!calibration?.pixelsPerMeter}
        >
          <span className="text-sm">🚪</span>
        </button>
        <button
          onClick={() => onModeChange?.('add-window')}
          className={`p-2 rounded-lg shadow-lg ${mode === 'add-window' ? 'bg-purple-500 text-white' : 'bg-white dark:bg-gray-800 text-foreground'}`}
          title="Add Window"
          disabled={!calibration?.pixelsPerMeter}
        >
          <span className="text-sm">🪟</span>
        </button>
        <button
          onClick={() => onModeChange?.('select')}
          className={`p-2 rounded-lg shadow-lg ${mode === 'select' ? 'bg-gray-500 text-white' : 'bg-white dark:bg-gray-800 text-foreground'}`}
          title="Select"
        >
          <FaMousePointer />
        </button>
        {selectedElement && (
          <button
            onClick={deleteSelected}
            className="p-2 rounded-lg shadow-lg bg-red-500 text-white"
            title="Delete Selected"
          >
            <FaTrash />
          </button>
        )}
      </div>
    </div>
  );
}

export default CanvasOverlay;

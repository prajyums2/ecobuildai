import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useProject } from "../context/ProjectContext";
import { analyzeFloorPlanVision, fileToDataUrl, validateFloorPlanData } from "../services/floorplanVision";
import {
  FaUpload,
  FaImage,
  FaSpinner,
  FaArrowRight,
  FaCalculator,
  FaFilePdf,
  FaCheck,
  FaExclamationTriangle,
  FaTimes,
  FaCube,
  FaIndustry,
  FaRuler,
  FaBuilding,
  FaBrain,
  FaEye,
  FaPlus,
  FaTrash,
  FaEdit,
  FaSave,
} from "react-icons/fa";

function BIMIntegration() {
  const navigate = useNavigate();
  const { project, updateBuildingParams, updateBIMData } = useProject();
  const numFloors = project?.buildingParams?.numFloors || 2;
  
  // Floor tabs state
  const [activeFloor, setActiveFloor] = useState(1);
  const [floorData, setFloorData] = useState({});
  const [floorFiles, setFloorFiles] = useState({});
  const [floorUrls, setFloorUrls] = useState({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingFloor, setAnalyzingFloor] = useState(null);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState({});

  // Initialize floor data
  useEffect(() => {
    const initial = {};
    for (let i = 1; i <= numFloors; i++) {
      initial[i] = {
        rooms: [],
        doors: [],
        windows: [],
        walls: { external_thickness_mm: 230, internal_thickness_mm: 115, total_length_m: 0 },
        structure_type: project?.buildingParams?.structureType || 'load_bearing',
        total_built_up_sqm: 0,
        confidence: 0,
        notes: ''
      };
    }
    setFloorData(initial);
  }, [numFloors]);

  const handleFileUpload = async (floorNum, e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(uploadedFile.type)) {
      setError('Please upload a PNG or JPG file');
      return;
    }

    const url = URL.createObjectURL(uploadedFile);
    setFloorFiles(prev => ({ ...prev, [floorNum]: uploadedFile }));
    setFloorUrls(prev => ({ ...prev, [floorNum]: url }));
    setError(null);
    setIsAnalyzing(true);
    setAnalyzingFloor(floorNum);

    try {
      const dataUrl = await fileToDataUrl(uploadedFile);
      const result = await analyzeFloorPlanVision(dataUrl, floorNum);
      const validated = validateFloorPlanData(result);
      
      setFloorData(prev => ({ ...prev, [floorNum]: validated }));
      setEditMode(prev => ({ ...prev, [floorNum]: true }));
      
      // Auto-detect structure type from first floor
      if (floorNum === 1 && validated.structure_type) {
        updateBuildingParams({ structureType: validated.structure_type });
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError('AI analysis failed. You can enter data manually.');
    } finally {
      setIsAnalyzing(false);
      setAnalyzingFloor(null);
    }
  };

  const updateFloorData = (floorNum, field, value) => {
    setFloorData(prev => ({
      ...prev,
      [floorNum]: { ...prev[floorNum], [field]: value }
    }));
  };

  const updateRoom = (floorNum, index, field, value) => {
    setFloorData(prev => {
      const rooms = [...prev[floorNum].rooms];
      rooms[index] = { ...rooms[index], [field]: value };
      // Recalculate area
      rooms[index].area_sqm = parseFloat(rooms[index].length_m || 0) * parseFloat(rooms[index].width_m || 0);
      // Recalculate total
      const totalArea = rooms.reduce((sum, r) => sum + r.area_sqm, 0);
      return { ...prev, [floorNum]: { ...prev[floorNum], rooms, total_built_up_sqm: totalArea } };
    });
  };

  const addRoom = (floorNum) => {
    setFloorData(prev => ({
      ...prev,
      [floorNum]: {
        ...prev[floorNum],
        rooms: [...prev[floorNum].rooms, { name: 'New Room', length_m: 3.0, width_m: 3.0, area_sqm: 9.0 }]
      }
    }));
  };

  const removeRoom = (floorNum, index) => {
    setFloorData(prev => {
      const rooms = prev[floorNum].rooms.filter((_, i) => i !== index);
      const totalArea = rooms.reduce((sum, r) => sum + r.area_sqm, 0);
      return { ...prev, [floorNum]: { ...prev[floorNum], rooms, total_built_up_sqm: totalArea } };
    });
  };

  const handleSaveAll = () => {
    // Calculate totals across all floors
    let totalArea = 0;
    let totalRooms = 0;
    let totalDoors = 0;
    let totalWindows = 0;
    let structureType = 'load_bearing';

    Object.values(floorData).forEach(fd => {
      totalArea += fd.total_built_up_sqm || 0;
      totalRooms += fd.rooms?.length || 0;
      totalDoors += fd.doors?.reduce((sum, d) => sum + (d.count || 0), 0) || 0;
      totalWindows += fd.windows?.reduce((sum, w) => sum + (w.count || 0), 0) || 0;
      if (fd.structure_type === 'framed') structureType = 'framed';
    });

    // Update project with floor plan data
    updateBuildingParams({
      builtUpArea: Math.round(totalArea / numFloors) || project?.buildingParams?.builtUpArea || 150,
      structureType: structureType,
    });

    updateBIMData({
      floorPlanData: floorData,
      totalBuiltUpSqm: totalArea,
      totalRooms,
      totalDoors,
      totalWindows,
      analyzedAt: new Date().toISOString(),
      source: 'ai_vision'
    });

    navigate('/optimizer');
  };

  const currentFloor = floorData[activeFloor] || {};
  const isCurrentFloorAnalyzed = currentFloor.rooms?.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FaEye className="text-primary" />
            Floor Plan Analysis
          </h1>
          <p className="text-foreground-secondary mt-1">
            Upload floor plan PNGs for AI analysis • {numFloors} floor{numFloors > 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={handleSaveAll} className="btn btn-primary">
          <FaSave className="mr-2" /> Save & Continue
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
          <FaExclamationTriangle className="text-red-500 text-lg" />
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <FaTimes />
          </button>
        </div>
      )}

      {/* Floor Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        {Array.from({ length: numFloors }, (_, i) => i + 1).map(floor => (
          <button
            key={floor}
            onClick={() => setActiveFloor(floor)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeFloor === floor
                ? 'bg-primary text-white'
                : 'bg-background-tertiary text-foreground-secondary hover:bg-background-secondary'
            }`}
          >
            Floor {floor}
            {floorData[floor]?.rooms?.length > 0 && (
              <FaCheck className="inline ml-1 text-xs" />
            )}
          </button>
        ))}
      </div>

      {/* Floor Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Upload & Preview */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <FaUpload className="text-primary" />
              Floor {activeFloor} Plan
            </h3>
            
            {/* Upload Area */}
            <label className="block w-full p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-primary transition-colors text-center">
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={(e) => handleFileUpload(activeFloor, e)}
                className="hidden"
                disabled={isAnalyzing}
              />
              {floorUrls[activeFloor] ? (
                <img src={floorUrls[activeFloor]} alt={`Floor ${activeFloor}`} className="max-h-64 mx-auto rounded-lg" />
              ) : isAnalyzing && analyzingFloor === activeFloor ? (
                <div className="py-8">
                  <FaSpinner className="animate-spin text-3xl text-primary mx-auto mb-3" />
                  <p className="text-foreground-secondary">AI is analyzing floor plan...</p>
                </div>
              ) : (
                <div className="py-8">
                  <FaImage className="text-4xl text-foreground-muted mx-auto mb-3" />
                  <p className="text-foreground-secondary">Click or drag to upload floor plan PNG/JPG</p>
                  <p className="text-xs text-foreground-muted mt-1">AI will extract rooms, doors, windows, and structure type</p>
                </div>
              )}
            </label>
          </div>

          {/* AI Results Summary */}
          {isCurrentFloorAnalyzed && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <FaBrain className="text-purple-500" />
                AI Analysis Results
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-foreground-muted">Rooms</p>
                  <p className="text-lg font-bold">{currentFloor.rooms?.length || 0}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-foreground-muted">Area</p>
                  <p className="text-lg font-bold">{currentFloor.total_built_up_sqm?.toFixed(1) || 0} sqm</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-foreground-muted">Doors</p>
                  <p className="text-lg font-bold">{currentFloor.doors?.reduce((s, d) => s + (d.count || 0), 0) || 0}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-foreground-muted">Windows</p>
                  <p className="text-lg font-bold">{currentFloor.windows?.reduce((s, w) => s + (w.count || 0), 0) || 0}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-foreground-muted">Structure</p>
                  <p className="text-lg font-bold capitalize">{currentFloor.structure_type?.replace('_', ' ') || 'N/A'}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-foreground-muted">Confidence</p>
                  <p className="text-lg font-bold">{(currentFloor.confidence * 100)?.toFixed(0) || 0}%</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Editable Data */}
        <div className="space-y-4">
          {/* Rooms */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <FaRuler className="text-blue-500" />
                Rooms
              </h3>
              <button onClick={() => addRoom(activeFloor)} className="btn btn-outline text-xs">
                <FaPlus className="mr-1" /> Add Room
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(currentFloor.rooms || []).map((room, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <input
                    type="text"
                    value={room.name}
                    onChange={(e) => updateRoom(activeFloor, idx, 'name', e.target.value)}
                    className="input text-sm flex-1 min-w-0"
                    placeholder="Room name"
                  />
                  <input
                    type="number"
                    value={room.length_m}
                    onChange={(e) => updateRoom(activeFloor, idx, 'length_m', parseFloat(e.target.value))}
                    className="input text-sm w-16"
                    placeholder="L(m)"
                  />
                  <span className="text-foreground-muted">×</span>
                  <input
                    type="number"
                    value={room.width_m}
                    onChange={(e) => updateRoom(activeFloor, idx, 'width_m', parseFloat(e.target.value))}
                    className="input text-sm w-16"
                    placeholder="W(m)"
                  />
                  <span className="text-foreground-muted text-xs w-12 text-right">{room.area_sqm?.toFixed(1)}m²</span>
                  <button onClick={() => removeRoom(activeFloor, idx)} className="text-red-500 hover:text-red-700 p-1">
                    <FaTrash className="text-xs" />
                  </button>
                </div>
              ))}
              {(!currentFloor.rooms || currentFloor.rooms.length === 0) && (
                <p className="text-center text-foreground-secondary py-4 text-sm">No rooms detected. Add manually or upload a floor plan.</p>
              )}
            </div>
          </div>

          {/* Structure Type */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <FaBuilding className="text-green-500" />
              Structure Type
            </h3>
            <select
              value={currentFloor.structure_type || 'load_bearing'}
              onChange={(e) => updateFloorData(activeFloor, 'structure_type', e.target.value)}
              className="input"
            >
              <option value="load_bearing">Load-Bearing Masonry (Walls carry load)</option>
              <option value="framed">Framed Structure (Columns + Beams)</option>
              <option value="mixed">Mixed (Partial Framing)</option>
            </select>
            <p className="text-xs text-foreground-muted mt-2">
              {currentFloor.structure_type === 'load_bearing' 
                ? 'Typical for Kerala residential ≤2 floors. No columns/beams.'
                : currentFloor.structure_type === 'framed'
                ? 'Columns + beams + slab system. For larger buildings.'
                : 'Combination of both types.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BIMIntegration;

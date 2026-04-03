import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useProject } from "../context/ProjectContext";
import { analyzeFloorPlanVision, fileToDataUrl, validateFloorPlanData } from "../services/floorplanVision";
import CanvasOverlay from "../components/CanvasOverlay";
import {
  FaUpload,
  FaImage,
  FaSpinner,
  FaArrowRight,
  FaCheck,
  FaExclamationTriangle,
  FaTimes,
  FaRuler,
  FaBuilding,
  FaBrain,
  FaEye,
  FaPlus,
  FaTrash,
  FaSave,
  FaMagic,
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
  
  // Interactive canvas state
  const [calibration, setCalibration] = useState({});
  const [canvasMode, setCanvasMode] = useState('calibrate');
  const [imageDimensions, setImageDimensions] = useState(null);
  const imageRef = useRef(null);

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
    
    // Reset calibration for new image
    setCalibration({});
    setCanvasMode('calibrate');
    setImageDimensions(null);

    // Also run AI analysis in background
    setIsAnalyzing(true);
    setAnalyzingFloor(floorNum);

    try {
      const dataUrl = await fileToDataUrl(uploadedFile);
      const result = await analyzeFloorPlanVision(dataUrl, floorNum);
      const validated = validateFloorPlanData(result);
      
      // Merge AI results with existing floor data
      setFloorData(prev => {
        const existing = prev[floorNum] || {};
        return {
          ...prev,
          [floorNum]: {
            ...existing,
            rooms: validated.rooms?.length > 0 ? validated.rooms : existing.rooms,
            doors: validated.doors?.length > 0 ? validated.doors : existing.doors,
            windows: validated.windows?.length > 0 ? validated.windows : existing.windows,
            structure_type: validated.structure_type || existing.structure_type,
            total_built_up_sqm: validated.total_built_up_sqm || existing.total_built_up_sqm,
            confidence: validated.confidence || existing.confidence,
            notes: validated.notes || existing.notes
          }
        };
      });
      
      // Auto-detect structure type from first floor
      if (floorNum === 1 && validated.structure_type) {
        updateBuildingParams({ structureType: validated.structure_type });
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError('AI analysis failed. You can manually define rooms using the drawing tools.');
    } finally {
      setIsAnalyzing(false);
      setAnalyzingFloor(null);
    }
  };

  const handleImageLoad = () => {
    if (imageRef.current) {
      setImageDimensions({
        width: imageRef.current.clientWidth,
        height: imageRef.current.clientHeight
      });
    }
  };

  const updateFloorData = (floorNum, field, value) => {
    setFloorData(prev => ({
      ...prev,
      [floorNum]: { ...prev[floorNum], [field]: value }
    }));
  };

  const handleSaveAll = () => {
    // Calculate totals across all floors
    let totalArea = 0;
    let totalRooms = 0;
    let totalDoors = 0;
    let totalWindows = 0;
    let structureType = 'load_bearing';

    Object.values(floorData).forEach(fd => {
      // Use actual room areas if available, otherwise use total_built_up_sqm
      const floorArea = fd.total_built_up_sqm || 0;
      totalArea += floorArea;
      totalRooms += fd.rooms?.length || 0;
      totalDoors += fd.doors?.reduce((sum, d) => sum + (d.count || 0), 0) || 0;
      totalWindows += fd.windows?.reduce((sum, w) => sum + (w.count || 0), 0) || 0;
      if (fd.structure_type === 'framed') structureType = 'framed';
    });

    // Update project with floor plan data
    const avgAreaPerFloor = totalArea > 0 ? Math.round(totalArea / numFloors) : project?.buildingParams?.builtUpArea || 150;
    
    updateBuildingParams({
      builtUpArea: avgAreaPerFloor,
      structureType: structureType,
      totalDoors: totalDoors,
      totalWindows: totalWindows,
    });

    updateBIMData({
      floorPlanData: floorData,
      calibration: calibration,
      totalBuiltUpSqm: totalArea,
      totalRooms,
      totalDoors,
      totalWindows,
      analyzedAt: new Date().toISOString(),
      source: calibration?.pixelsPerMeter ? 'interactive' : 'ai_vision'
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
        <button 
          onClick={handleSaveAll} 
          className="btn btn-primary"
          disabled={!isCurrentFloorAnalyzed && !calibration?.pixelsPerMeter}
        >
          <FaSave className="mr-2" /> Save & Continue
        </button>
      </div>

      {error && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-3">
          <FaExclamationTriangle className="text-yellow-500 text-lg" />
          <p className="text-yellow-700 dark:text-yellow-300 text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-yellow-500 hover:text-yellow-700">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Image with Canvas Overlay */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="relative">
              {/* Upload Area / Image Display */}
              {floorUrls[activeFloor] ? (
                <div className="relative inline-block w-full">
                  <img 
                    ref={imageRef}
                    src={floorUrls[activeFloor]} 
                    alt={`Floor ${activeFloor}`} 
                    className="w-full rounded-lg block"
                    onLoad={handleImageLoad}
                  />
                  {/* Canvas Overlay for interactive drawing */}
                  {imageDimensions && (
                    <div className="absolute inset-0 z-10">
                      <CanvasOverlay
                      imageUrl={floorUrls[activeFloor]}
                      imageDimensions={imageDimensions}
                      calibration={calibration}
                      setCalibration={setCalibration}
                      rooms={currentFloor.rooms || []}
                      setRooms={(updater) => {
                        const newRooms = typeof updater === 'function' ? updater(currentFloor.rooms || []) : updater;
                        const totalArea = newRooms.reduce((sum, r) => sum + (r.area_sqm || 0), 0);
                        setFloorData(prev => ({
                          ...prev,
                          [activeFloor]: { ...prev[activeFloor], rooms: newRooms, total_built_up_sqm: totalArea }
                        }));
                      }}
                      doors={currentFloor.doors || []}
                      setDoors={(updater) => {
                        const newDoors = typeof updater === 'function' ? updater(currentFloor.doors || []) : updater;
                        setFloorData(prev => ({
                          ...prev,
                          [activeFloor]: { ...prev[activeFloor], doors: newDoors }
                        }));
                      }}
                      windows={currentFloor.windows || []}
                      setWindows={(updater) => {
                        const newWindows = typeof updater === 'function' ? updater(currentFloor.windows || []) : updater;
                        setFloorData(prev => ({
                          ...prev,
                          [activeFloor]: { ...prev[activeFloor], windows: newWindows }
                        }));
                      }}
                      walls={currentFloor.walls || {}}
                      setWalls={(updater) => {
                        const newWalls = typeof updater === 'function' ? updater(currentFloor.walls || {}) : updater;
                        setFloorData(prev => ({
                          ...prev,
                          [activeFloor]: { ...prev[activeFloor], walls: newWalls }
                        }));
                      }}
                      mode={canvasMode}
                      onModeChange={setCanvasMode}
                    />
                    </div>
                  )}
                </div>
              ) : isAnalyzing && analyzingFloor === activeFloor ? (
                <div className="py-16 text-center">
                  <FaSpinner className="animate-spin text-3xl text-primary mx-auto mb-3" />
                  <p className="text-foreground-secondary">AI is analyzing floor plan...</p>
                  <p className="text-xs text-foreground-muted mt-2">You can also manually define rooms after upload</p>
                </div>
              ) : (
                <label className="block w-full p-16 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-primary transition-colors text-center">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={(e) => handleFileUpload(activeFloor, e)}
                    className="hidden"
                    disabled={isAnalyzing}
                  />
                  <FaImage className="text-4xl text-foreground-muted mx-auto mb-3" />
                  <p className="text-foreground-secondary">Click or drag to upload floor plan PNG/JPG</p>
                  <p className="text-xs text-foreground-muted mt-1">AI will extract rooms, doors, windows, and structure type</p>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Right: Data Panel */}
        <div className="space-y-4">
          {/* AI Results Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
              <FaBrain className="text-purple-500" />
              Floor Plan Data
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xs text-foreground-muted">Rooms</p>
                <p className="text-lg font-bold">{currentFloor.rooms?.length || 0}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xs text-foreground-muted">Area</p>
                <p className="text-lg font-bold">{currentFloor.total_built_up_sqm?.toFixed(1) || 0} m²</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xs text-foreground-muted">Doors</p>
                <p className="text-lg font-bold">{currentFloor.doors?.length || 0}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xs text-foreground-muted">Windows</p>
                <p className="text-lg font-bold">{currentFloor.windows?.length || 0}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xs text-foreground-muted">Structure</p>
                <p className="text-sm font-bold capitalize">{currentFloor.structure_type?.replace('_', ' ') || 'N/A'}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xs text-foreground-muted">Scale</p>
                <p className="text-sm font-bold">{calibration?.pixelsPerMeter ? 'Set' : 'Not set'}</p>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
              <FaRuler className="text-blue-500" />
              How to Use
            </h3>
            <ol className="text-xs text-foreground-secondary space-y-1.5 list-decimal list-inside">
              <li>Upload floor plan image</li>
              <li>Click <strong>Set Scale</strong> ruler icon, then click two points on the image and enter real distance</li>
              <li>Click <strong>+ Draw Room</strong> and drag to define rooms</li>
              <li>Click <strong>🚪</strong> or <strong>🪟</strong> to add doors/windows</li>
              <li>Or use <strong>AI Auto-Detect</strong> by uploading a clear floor plan</li>
            </ol>
          </div>

          {/* Structure Type */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
              <FaBuilding className="text-green-500" />
              Structure Type
            </h3>
            <select
              value={currentFloor.structure_type || 'load_bearing'}
              onChange={(e) => updateFloorData(activeFloor, 'structure_type', e.target.value)}
              className="input text-sm"
            >
              <option value="load_bearing">Load-Bearing Masonry</option>
              <option value="framed">Framed Structure</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>

          {/* AI Auto-Detect Button */}
          {floorUrls[activeFloor] && !isCurrentFloorAnalyzed && (
            <button
              onClick={async () => {
                setIsAnalyzing(true);
                setAnalyzingFloor(activeFloor);
                try {
                  const dataUrl = await fileToDataUrl(floorFiles[activeFloor]);
                  const result = await analyzeFloorPlanVision(dataUrl, activeFloor);
                  const validated = validateFloorPlanData(result);
                  setFloorData(prev => ({
                    ...prev,
                    [activeFloor]: {
                      ...prev[activeFloor],
                      rooms: validated.rooms || [],
                      doors: validated.doors || [],
                      windows: validated.windows || [],
                      structure_type: validated.structure_type || prev[activeFloor]?.structure_type,
                      total_built_up_sqm: validated.total_built_up_sqm || 0,
                      confidence: validated.confidence || 0,
                    }
                  }));
                } catch (err) {
                  setError('AI detection failed. Use manual drawing tools.');
                } finally {
                  setIsAnalyzing(false);
                  setAnalyzingFloor(null);
                }
              }}
              className="w-full btn btn-outline text-sm"
            >
              <FaMagic className="mr-2" /> AI Auto-Detect Rooms
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default BIMIntegration;

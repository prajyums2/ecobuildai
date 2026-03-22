import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useProject } from "../context/ProjectContext";
import { ecoBuildAPI } from "../services/api";
import {
  FaUpload,
  FaCube,
  FaSpinner,
  FaArrowRight,
  FaCalculator,
  FaFileImport,
  FaRegWindowMaximize,
} from "react-icons/fa";

function IFCViewerWrapper() {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const initViewer = async () => {
      try {
        const { createIFCViewer } = await import('@ifc-viewer/core');
        await import('@ifc-viewer/core/styles');

        const viewer = createIFCViewer({
          container: containerRef.current,
          appearance: {
            world: {
              backgroundColor: '#1a1a2e',
              directionalLightColor: '#ffffff',
              directionalLightPosition: [20, 35, 10],
            },
            grid: {
              enabled: true,
              color: '#10b981',
              primarySize: 6,
              secondarySize: 1,
              distance: 250,
            },
          },
          features: {
            minimap: true,
            measurement: true,
            clipping: true,
            floorplans: true,
            aiVisualizer: false,
          },
          onModelLoaded: (meta) => {
            console.log('IFC Model loaded:', meta);
          },
          onError: (error) => {
            console.error('IFC Viewer error:', error);
          },
        });

        viewerRef.current = viewer;
      } catch (error) {
        console.error('Failed to initialize IFC viewer:', error);
      }
    };

    initViewer();

    return () => {
      if (viewerRef.current) {
        viewerRef.current.unmount();
      }
    };
  }, []);

  const handleFileLoad = async (file) => {
    if (viewerRef.current && file) {
      try {
        await viewerRef.current.loadModelFromFile(file);
      } catch (error) {
        console.error('Failed to load IFC file:', error);
      }
    }
  };

  return { containerRef, handleFileLoad, viewerRef };
}

function BIMIntegration() {
  const navigate = useNavigate();
  const { project, updateAnalysisResults, updateProject, saveMaterialSelection, completeMaterialsSelection, updateBIMData } = useProject();
  const [file, setFile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [results, setResults] = useState(null);
  const [viewerReady, setViewerReady] = useState(false);
  const [ifcFileUrl, setIfcFileUrl] = useState(null);
  const [error, setError] = useState(null);
  const viewerContainerRef = useRef(null);
  const ifcViewerRef = useRef(null);

  // Restore BIM data from project context on mount
  useEffect(() => {
    if (project?.bimData?.quantities) {
      setResults(project.bimData.quantities);
    }
  }, []);

  if (!project || !project.isConfigured) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="empty-state-icon mb-6">
            <FaCube className="text-3xl" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Configure Your Project First
          </h2>
          <p className="text-foreground-secondary mb-6">
            Set up your project to import BIM models and extract quantities.
          </p>
          <button
            onClick={() => navigate("/setup")}
            className="btn btn-primary"
          >
            <FaArrowRight className="mr-2" />
            Go to Project Setup
          </button>
        </div>
      </div>
    );
  }

  // Initialize IFC Viewer
  useEffect(() => {
    let viewer = null;
    
    const initViewer = async () => {
      if (!viewerContainerRef.current) return;
      
      try {
        const { createIFCViewer } = await import('@ifc-viewer/core');
        await import('@ifc-viewer/core/styles');
        
        viewer = createIFCViewer({
          container: viewerContainerRef.current,
          appearance: {
            world: {
              backgroundColor: '#1a1a2e',
              directionalLightColor: '#ffffff',
              directionalLightPosition: [20, 35, 10],
            },
            grid: {
              enabled: true,
              color: '#10b981',
              primarySize: 6,
              secondarySize: 1,
              distance: 250,
            },
          },
          features: {
            minimap: true,
            measurement: true,
            clipping: true,
            floorplans: true,
            aiVisualizer: false,
          },
          onModelLoaded: (meta) => {
            console.log('IFC Model loaded:', meta);
          },
          onError: (error) => {
            console.error('IFC Viewer error:', error);
          },
        });
        
        ifcViewerRef.current = viewer;
        setViewerReady(true);
      } catch (error) {
        console.error('Failed to initialize IFC viewer:', error);
      }
    };
    
    initViewer();
    
    return () => {
      if (ifcViewerRef.current) {
        ifcViewerRef.current.unmount();
      }
    };
  }, []);

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setIsParsing(true);
    setError(null);
    setResults(null);

    try {
      console.log("Uploading file:", uploadedFile.name);
      const response = await ecoBuildAPI.parseBIM(uploadedFile);
      console.log("Response received:", response.data);
      console.log("Parsed elements:", response.data?.parsed_elements?.length || 0);
      console.log("Sample element:", response.data?.parsed_elements?.[0]);
      console.log("Totals:", response.data?.totals);
      
      const bimData = response.data;
      setResults(bimData);
      updateAnalysisResults("bim", bimData);
      
      // Save BIM data to project context for persistence
      updateBIMData({
        ifcFileName: uploadedFile.name,
        ifcFileSize: uploadedFile.size,
        quantities: bimData,
        materials: bimData.parsed_elements?.filter(e => e.materials?.length > 0) || [],
        uploadedAt: new Date().toISOString(),
      });
      
      // Extract useful values from BIM and update project
      if (bimData?.parsed_elements && bimData.parsed_elements.length > 0) {
        // Extract building parameters from BIM
        const totals = bimData.totals || {};
        const quantities = bimData.quantities || {};
        
        // Calculate total volume and area from elements
        let totalVolume = 0;
        let totalArea = 0;
        let numFloors = 1;
        const stories = bimData.stories || [];
        if (stories.length > 0) {
          numFloors = stories.length;
        }
        
        bimData.parsed_elements.forEach(el => {
          totalVolume += el.volume || 0;
          totalArea += el.surface_area || 0;
        });
        
        // Estimate built-up area from total area
        const builtUpArea = Math.round(totalArea / numFloors);
        
        // Update project with BIM-derived values
        updateProject({
          buildingParams: {
            ...project.buildingParams,
            builtUpArea: builtUpArea > 0 ? builtUpArea : project.buildingParams?.builtUpArea || 150,
            numFloors: numFloors > 1 ? numFloors : project.buildingParams?.numFloors || 2,
          }
        });
        
        // Extract material quantities and save to project
        if (bimData.materials && bimData.materials.length > 0) {
          bimData.materials.forEach(mat => {
            const category = getMaterialCategory(mat.material_type);
            if (category) {
              saveMaterialSelection(category, {
                name: mat.matched_material_name || mat.material_type,
                quantity: mat.total_with_wastage || mat.quantity,
                unit: mat.unit,
                cost_per_unit: mat.unit_cost || 0,
                embodied_carbon: mat.total_carbon || 0,
                category: mat.category
              });
            }
          });
          completeMaterialsSelection();
        }
        
        console.log("[BIM] Extracted values:", {
          totalVolume,
          totalArea,
          builtUpArea,
          numFloors,
          totalCost: totals.cost_inr,
          totalCarbon: totals.carbon_kg
        });
      }
      
      // Check if elements were parsed
      if (!bimData?.parsed_elements || bimData.parsed_elements.length === 0) {
        console.warn("No elements were parsed from the file");
        setError("Warning: No 3D elements were extracted from the file. The viewer will show a placeholder.");
      }
      
      // Load IFC file into the viewer if viewer is ready
      if (ifcViewerRef.current && uploadedFile && viewerReady) {
        try {
          console.log("Loading IFC file into viewer...");
          await ifcViewerRef.current.loadModelFromFile(uploadedFile);
          console.log("IFC file loaded successfully!");
          // Create URL for persistence
          const fileUrl = URL.createObjectURL(uploadedFile);
          setIfcFileUrl(fileUrl);
        } catch (viewerError) {
          console.error("Failed to load IFC in viewer:", viewerError);
        }
      }
    } catch (err) {
      console.error("BIM parsing error:", err);
      setError(
        `Failed to parse BIM file: ${err.response?.data?.detail || err.message || "Unknown error"}`
      );
    } finally {
      setIsParsing(false);
    }
  };
  
  // Map BIM material types to project categories
  const getMaterialCategory = (materialType) => {
    const type = (materialType || '').toLowerCase();
    if (type.includes('concrete') || type.includes('cement')) return 'concrete';
    if (type.includes('steel') || type.includes('reinforcement') || type.includes('rebar')) return 'steel';
    if (type.includes('brick') || type.includes('block') || type.includes('masonry')) return 'masonry';
    if (type.includes('sand') || type.includes('aggregate')) return 'aggregates';
    if (type.includes('paint') || type.includes('finish') || type.includes('tile')) return 'finishing';
    if (type.includes('timber') || type.includes('wood')) return 'timber';
    if (type.includes('glass') || type.includes('window')) return 'glass';
    if (type.includes('roof') || type.includes('sheet')) return 'roofing';
    return null;
  };

  // Generate sample building for visualization
  const generateSampleBuilding = async () => {
    setIsParsing(true);
    setError(null);
    
    try {
      // Create sample building based on project parameters
      const { buildingParams } = project;
      const floors = buildingParams?.numFloors || 2;
      const area = buildingParams?.builtUpArea || 150;
      const floorArea = area / floors;
      const floorHeight = (buildingParams?.height || 6) / floors;
      
      // Calculate dimensions assuming rectangular building
      const aspectRatio = 1.5;
      const width = Math.sqrt(floorArea / aspectRatio);
      const depth = width * aspectRatio;
      
      // Generate structural elements
      const sampleElements = [];
      
      // Foundation
      sampleElements.push({
        element_id: "foundation_1",
        element_type: "foundation",
        name: "Foundation",
        volume_m3: width * depth * 0.3,
        surface_area_m2: width * depth,
        dimensions: { length: width, width: depth, height: 0.3 },
        location: { x: 0, y: 0, z: 0 }
      });
      
      // Columns per floor
      const columnsPerFloor = 4;
      for (let f = 0; f < floors; f++) {
        for (let c = 0; c < columnsPerFloor; c++) {
          const colX = (c % 2 === 0 ? -1 : 1) * (width / 2 - 0.3);
          const colY = (c < 2 ? -1 : 1) * (depth / 2 - 0.3);
          const colZ = f * floorHeight + floorHeight / 2;
          
          sampleElements.push({
            element_id: `column_${f}_${c}`,
            element_type: "column",
            name: `Column ${f + 1}-${c + 1}`,
            volume_m3: 0.27, // 0.3x0.3x3m
            surface_area_m2: 3.6,
            dimensions: { length: 0.3, width: 0.3, height: floorHeight },
            location: { x: colX, y: colY, z: colZ }
          });
        }
      }
      
      // Beams
      for (let f = 0; f < floors; f++) {
        const beamZ = f * floorHeight + floorHeight - 0.15;
        // X-direction beams
        sampleElements.push({
          element_id: `beam_x_${f}`,
          element_type: "beam",
          name: `Beam X${f + 1}`,
          volume_m3: width * 0.2 * 0.3,
          surface_area_m2: width * 2,
          dimensions: { length: width, width: 0.2, height: 0.3 },
          location: { x: 0, y: 0, z: beamZ }
        });
        // Y-direction beams
        sampleElements.push({
          element_id: `beam_y_${f}`,
          element_type: "beam",
          name: `Beam Y${f + 1}`,
          volume_m3: depth * 0.2 * 0.3,
          surface_area_m2: depth * 2,
          dimensions: { length: depth, width: 0.2, height: 0.3 },
          location: { x: 0, y: 0, z: beamZ }
        });
      }
      
      // Slabs
      for (let f = 0; f < floors; f++) {
        sampleElements.push({
          element_id: `slab_${f}`,
          element_type: "slab",
          name: `Floor Slab ${f + 1}`,
          volume_m3: width * depth * 0.15,
          surface_area_m2: width * depth,
          dimensions: { length: width, width: depth, height: 0.15 },
          location: { x: 0, y: 0, z: (f + 1) * floorHeight }
        });
      }
      
      // Walls
      const wallHeight = floorHeight - 0.3;
      const wallThickness = 0.15;
      // Front and back walls
      sampleElements.push({
        element_id: "wall_front",
        element_type: "wall",
        name: "Front Wall",
        volume_m3: depth * wallHeight * wallThickness,
        surface_area_m2: depth * wallHeight,
        dimensions: { length: depth, width: wallThickness, height: wallHeight },
        location: { x: width/2, y: 0, z: wallHeight/2 + 0.3 }
      });
      sampleElements.push({
        element_id: "wall_back",
        element_type: "wall",
        name: "Back Wall",
        volume_m3: depth * wallHeight * wallThickness,
        surface_area_m2: depth * wallHeight,
        dimensions: { length: depth, width: wallThickness, height: wallHeight },
        location: { x: -width/2, y: 0, z: wallHeight/2 + 0.3 }
      });
      // Side walls
      sampleElements.push({
        element_id: "wall_side1",
        element_type: "wall",
        name: "Side Wall 1",
        volume_m3: width * wallHeight * wallThickness,
        surface_area_m2: width * wallHeight,
        dimensions: { length: width, width: wallThickness, height: wallHeight },
        location: { x: 0, y: depth/2, z: wallHeight/2 + 0.3 }
      });
      sampleElements.push({
        element_id: "wall_side2",
        element_type: "wall",
        name: "Side Wall 2",
        volume_m3: width * wallHeight * wallThickness,
        surface_area_m2: width * wallHeight,
        dimensions: { length: width, width: wallThickness, height: wallHeight },
        location: { x: 0, y: -depth/2, z: wallHeight/2 + 0.3 }
      });
      
      // Calculate material quantities
      const materialQuantities = {
        concrete: {
          quantity: sampleElements.reduce((sum, el) => sum + (el.dimensions?.length || 1) * (el.dimensions?.width || 1) * (el.dimensions?.height || 1), 0),
          unit: 'm³'
        },
        steel: {
          quantity: sampleElements.reduce((sum, el) => sum + (el.volume_m3 || 1) * 0.08, 0),
          unit: 'tonnes'
        }
      };
      
      setResults({
        parsed_elements: sampleElements,
        elements: sampleElements,
        material_quantities: materialQuantities,
        project_summary: {
          total_elements: sampleElements.length,
          element_breakdown: {
            foundation: 1,
            column: floors * columnsPerFloor,
            beam: floors * 2,
            slab: floors,
            wall: 4
          }
        },
        is_sample: true
      });
      
    } catch (err) {
      console.error("Sample building generation error:", err);
      setError("Failed to generate sample building");
    } finally {
      setIsParsing(false);
    }
  };

  const getHeatMapColor = (carbon) => {
    if (carbon > 40) return "#ef4444";
    if (carbon > 20) return "#f59e0b";
    return "#10b981";
  };

  // Component to render parsed BIM elements
  const BIMElements = ({ elements }) => {
    if (!elements || elements.length === 0) {
      console.log("[BIM Render] No elements to render");
      return null;
    }

    console.log(`[BIM Render] Rendering ${elements.length} elements`);
    console.log("[BIM Render] First element sample:", elements[0]);

    return elements.map((element, index) => {
      // Handle both API response and sample data formats
      const location = element.location || {};
      const dimensions = element.dimensions || {};
      const volume = element.volume || element.volume_m3 || 0;
      const element_type = element.element_type || element.elementType || "unknown";
      
      // Default dimensions if not provided - estimate from volume if needed
      let width = dimensions?.width || dimensions?.length || 0.3;  // Default 30cm
      let height = dimensions?.height || dimensions?.thickness || 0.3;  // Default 30cm
      let depth = dimensions?.depth || dimensions?.width || 0.3;  // Default 30cm
      
      // If dimensions are missing but volume is available, estimate cubic dimensions
      if ((!width || !height || !depth) && volume > 0) {
        const cubeRoot = Math.pow(volume, 1/3);
        width = width || cubeRoot;
        height = height || cubeRoot;
        depth = depth || cubeRoot;
      }
      
      // Minimum size to ensure visibility
      width = Math.max(width, 0.1);
      height = Math.max(height, 0.1);
      depth = Math.max(depth, 0.1);
      
      // Position from location or default
      const x = location?.x ?? (index % 10) * 2;  // Spread out if no position
      const y = location?.y ?? Math.floor(index / 10) * 2;
      const z = location?.z ?? 0;
      
      // Adjust position to center the box (IFC coordinates to Three.js)
      // In IFC: X=right, Y=forward, Z=up
      // In Three.js: X=right, Y=up, Z=forward
      const posX = x;
      const posY = z + height / 2; // Z (up) becomes Y in Three.js
      const posZ = y; // Y (forward) becomes Z in Three.js
      
      // Calculate carbon intensity for coloring based on element type
      // Higher carbon = more red, lower carbon = more green
      let carbonIntensity = 30; // Default medium
      const typeStr = String(element_type).toLowerCase();
      if (typeStr.includes('slab')) carbonIntensity = 55;
      else if (typeStr.includes('column')) carbonIntensity = 45;
      else if (typeStr.includes('beam')) carbonIntensity = 40;
      else if (typeStr.includes('wall')) carbonIntensity = 25;
      else if (typeStr.includes('foundation') || typeStr.includes('footing')) carbonIntensity = 20;
      else if (typeStr.includes('roof')) carbonIntensity = 35;
      
      const color = getHeatMapColor(carbonIntensity);
      
      return (
        <Box
          key={`${element.element_id}-${index}`}
          position={[posX, posY, posZ]}
          args={[width, height, depth]}
        >
          <meshStandardMaterial 
            color={color} 
            transparent
            opacity={0.8}
            roughness={0.7}
            metalness={0.1}
          />
        </Box>
      );
    });
  };

  // Calculate camera position based on model bounds
  const getCameraSettings = () => {
    if (!results?.parsed_elements && !results?.elements) {
      console.log("[BIM Camera] No elements, using default camera");
      return { position: [20, 20, 20], target: [0, 5, 0], fov: 45 };
    }
    
    const elements = results?.parsed_elements || results?.elements || [];
    if (elements.length === 0) {
      console.log("[BIM Camera] Empty elements array, using default camera");
      return { position: [20, 20, 20], target: [0, 5, 0], fov: 45 };
    }
    
    console.log(`[BIM Camera] Calculating camera for ${elements.length} elements`);
    
    // Calculate bounding box
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    elements.forEach((el, idx) => {
      const location = el.location || {};
      const dimensions = el.dimensions || {};
      
      const x = location?.x ?? (idx % 10) * 2;
      const y = location?.y ?? Math.floor(idx / 10) * 2;
      const z = location?.z ?? 0;
      const width = dimensions?.width || dimensions?.length || 0.3;
      const height = dimensions?.height || dimensions?.thickness || 0.3;
      const depth = dimensions?.depth || dimensions?.width || 0.3;
      
      minX = Math.min(minX, x - width/2);
      maxX = Math.max(maxX, x + width/2);
      minY = Math.min(minY, y - depth/2);
      maxY = Math.max(maxY, y + depth/2);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z + height);
    });
    
    // Check if bounds are valid
    if (!isFinite(minX) || !isFinite(maxX) || minX === maxX) {
      console.log("[BIM Camera] Invalid bounds, using default camera");
      return { position: [20, 20, 20], target: [0, 5, 0], fov: 45 };
    }
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;
    
    const sizeX = Math.max(maxX - minX, 1);
    const sizeY = Math.max(maxY - minY, 1);
    const sizeZ = Math.max(maxZ - minZ, 1);
    const maxSize = Math.max(sizeX, sizeY, sizeZ);
    
    console.log(`[BIM Camera] Model bounds: ${sizeX.toFixed(2)} x ${sizeY.toFixed(2)} x ${sizeZ.toFixed(2)}`);
    console.log(`[BIM Camera] Center: (${centerX.toFixed(2)}, ${centerY.toFixed(2)}, ${centerZ.toFixed(2)})`);
    
    // Position camera to see entire model
    const distance = Math.max(maxSize * 2, 10);
    
    const cameraSettings = {
      position: [centerX + distance, centerZ + distance/2, centerY + distance],
      fov: 45,
      target: [centerX, centerZ/2, centerY]
    };
    
    console.log(`[BIM Camera] Position: [${cameraSettings.position.map(v => v.toFixed(2)).join(', ')}]`);
    console.log(`[BIM Camera] Target: [${cameraSettings.target.map(v => v.toFixed(2)).join(', ')}]`);
    
    return cameraSettings;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            BIM-to-Logic Integration
          </h1>
          <p className="text-foreground-secondary mt-1">
            IFC/JSON Parser | Automatic Quantity Extraction | 3D Visualization
          </p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <FaFileImport />
            Import BIM Model
          </h3>
        </div>
        <div className="card-body">
          <div
            className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary transition-colors cursor-pointer bg-background-tertiary"
            onClick={() => document.getElementById("bim-upload").click()}
          >
            <input
              id="bim-upload"
              type="file"
              accept=".ifc,.json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <FaUpload className="text-4xl text-foreground-muted mx-auto mb-4" />
            <p className="text-foreground font-medium mb-2">
              {file ? file.name : "Drop BIM file here or click to browse"}
            </p>
            <p className="text-sm text-foreground-secondary">
              Supports IFC (Revit, Tekla) and JSON formats
            </p>
          </div>

          <div className="mt-4 flex justify-center gap-4">
            <button
              onClick={generateSampleBuilding}
              disabled={isParsing}
              className="btn btn-secondary"
            >
              <FaCube className="mr-2" />
              Generate Sample Building
            </button>
          </div>

          {isParsing && (
            <div className="mt-6 text-center">
              <FaSpinner className="animate-spin text-4xl text-primary mx-auto mb-4" />
              <p className="text-foreground-secondary">
                Parsing BIM geometry...
              </p>
              <p className="text-sm text-foreground-muted">
                Extracting quantities for structural members
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-error-bg border border-error rounded-lg text-error text-sm">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="grid grid-cols-3 gap-6">
          {/* 3D Viewer */}
          <div className="col-span-2 card">
            <div className="card-header flex items-center justify-between">
              <h3 className="font-semibold text-foreground">3D Model Viewer</h3>
              <div className="flex items-center gap-2 text-xs">
                <span>Low</span>
                <div className="w-20 h-2 bg-gradient-to-r from-success via-warning to-error rounded"></div>
                <span>High Carbon</span>
              </div>
            </div>
            <div className="h-96 relative">
              {/* IFC Viewer Container */}
              <div 
                ref={viewerContainerRef}
                className="w-full h-full rounded-lg overflow-hidden"
                style={{ backgroundColor: '#1a1a2e' }}
              >
                {!viewerReady && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <FaSpinner className="animate-spin text-3xl text-primary mx-auto mb-2" />
                      <p className="text-foreground-secondary text-sm">Loading IFC Viewer...</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Debug overlay */}
              {results && (
                <div className="absolute top-2 left-2 bg-black/70 text-white text-xs p-2 rounded font-mono">
                  <div>Elements: {(results?.parsed_elements?.length || results?.elements?.length || 0)}</div>
                  <div>Stories: {(results?.stories?.length || 0)}</div>
                  <div>Volume: {(results?.totals?.volume_m3 || 0).toFixed(1)} m³</div>
                  <div>Cost: ₹{((results?.totals?.cost_inr || 0) / 100000).toFixed(1)}L</div>
                </div>
              )}
            </div>
          </div>

          {/* Element Summary */}
          <div className="space-y-4">
            {(results?.parsed_elements?.length > 0 || results?.elements?.length > 0) ? (
              <div className="card bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <div className="card-header">
                  <h3 className="font-semibold text-green-800 dark:text-green-400">
                    Elements ({(results?.parsed_elements?.length || results?.elements?.length || 0)} parsed)
                  </h3>
                </div>
                <div className="card-body">
                  <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                    3D model is displaying actual parsed geometry from your IFC file.
                  </p>
                  {results.project_summary?.element_breakdown &&
                    Object.entries(results.project_summary.element_breakdown).map(
                      ([type, count]) => (
                        <div
                          key={type}
                          className="flex justify-between items-center p-2 bg-white dark:bg-green-900/30 rounded mb-2"
                        >
                          <span className="capitalize text-foreground-secondary">
                            {type}
                          </span>
                          <span className="font-mono font-semibold">{count}</span>
                        </div>
                      ),
                    )}
                </div>
              </div>
            ) : (
              <div className="card bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                <div className="card-header">
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-400">
                    Elements (0 parsed)
                  </h3>
                </div>
                <div className="card-body">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    No 3D elements could be extracted from this IFC file. 
                    The viewer is showing a placeholder.
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                    The file may contain non-geometric data or use an unsupported schema.
                  </p>
                </div>
              </div>
            )}

            <div className="card bg-primary-bg border-primary">
              <div className="card-body">
                <p className="text-sm text-foreground-secondary">
                  Total Embodied Carbon
                </p>
                <p className="text-3xl font-mono font-bold text-primary">
                  {((results?.totals?.carbon_kg || 0) / 1000).toFixed(1)}{" "}
                  <span className="text-lg">tons</span>
                </p>
              </div>
            </div>
          </div>

          {/* Parsed Elements Detail */}
          {(results?.parsed_elements?.length > 0 || results?.elements?.length > 0) && (
            <div className="col-span-3 card">
              <div className="card-header">
                <h3 className="font-semibold text-foreground">Parsed Elements Detail</h3>
              </div>
              <div className="card-body p-0 overflow-x-auto">
                <table className="table text-sm">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Type</th>
                      <th>Name</th>
                      <th className="text-right">Volume (m³)</th>
                      <th className="text-right">Position (X,Y,Z)</th>
                      <th>Materials</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(results?.parsed_elements || results?.elements || []).slice(0, 10).map((el, idx) => (
                      <tr key={`${el.element_id}-${idx}`}>
                        <td className="font-mono text-xs">{el.element_id?.substring(0, 20)}...</td>
                        <td>
                          <span className="px-2 py-1 rounded bg-background-tertiary text-xs capitalize">
                            {String(el.element_type).replace('_', ' ')}
                          </span>
                        </td>
                        <td>{el.name}</td>
                        <td className="text-right font-mono">{el.volume?.toFixed(2)}</td>
                        <td className="text-right font-mono text-xs">
                          {el.location?.x?.toFixed(1)}, {el.location?.y?.toFixed(1)}, {el.location?.z?.toFixed(1)}
                        </td>
                        <td className="text-xs">
                          {el.materials?.join(', ') || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(results?.parsed_elements?.length > 10 || results?.elements?.length > 10) && (
                  <div className="p-3 text-center text-sm text-foreground-secondary">
                    Showing first 10 of {(results?.parsed_elements?.length || results?.elements?.length)} elements
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bill of Quantities */}
          <div className="col-span-3 card">
            <div className="card-header flex items-center justify-between">
              <h3 className="font-semibold text-foreground">
                Bill of Quantities
              </h3>
              <span className="text-sm text-foreground-secondary">
                Auto-generated from BIM model
              </span>
            </div>
            <div className="card-body p-0">
              <table className="table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="text-right">Quantity</th>
                    <th className="text-right">Unit</th>
                    <th className="text-right">Wastage</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {results.concrete && (
                    <tr>
                      <td className="text-primary font-medium">Concrete</td>
                      <td className="text-right font-mono">
                        {results.concrete.quantity?.toFixed(1)}
                      </td>
                      <td className="text-right">m³</td>
                      <td className="text-right font-mono">
                        {results.concrete.wastage_factor}x
                      </td>
                      <td className="text-right font-mono text-primary">
                        {results.concrete.total_quantity_with_wastage?.toFixed(
                          1,
                        )}
                      </td>
                    </tr>
                  )}
                  {results.steel && (
                    <tr>
                      <td className="text-primary font-medium">Steel</td>
                      <td className="text-right font-mono">
                        {results.steel.quantity?.toFixed(0)}
                      </td>
                      <td className="text-right">kg</td>
                      <td className="text-right font-mono">
                        {results.steel.wastage_factor}x
                      </td>
                      <td className="text-right font-mono text-primary">
                        {results.steel.total_quantity_with_wastage?.toFixed(0)}
                      </td>
                    </tr>
                  )}
                  {results.formwork && (
                    <tr>
                      <td className="text-primary font-medium">Formwork</td>
                      <td className="text-right font-mono">
                        {results.formwork.quantity?.toFixed(0)}
                      </td>
                      <td className="text-right">m²</td>
                      <td className="text-right font-mono">
                        {results.formwork.wastage_factor}x
                      </td>
                      <td className="text-right font-mono text-primary">
                        {results.formwork.total_quantity_with_wastage?.toFixed(
                          0,
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BIMIntegration;

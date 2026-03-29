import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useProject } from "../context/ProjectContext";
import { ecoBuildAPI } from "../services/api";
import * as THREE from "three";
import {
  FaUpload,
  FaCube,
  FaSpinner,
  FaArrowRight,
  FaCalculator,
  FaFileImport,
  FaRegWindowMaximize,
  FaExclamationTriangle,
  FaCheck,
} from "react-icons/fa";

// Render parsed elements from backend
function renderParsedElements(scene, camera, elements, onModelLoaded) {
  console.log('[3D Viewer] Rendering', elements.length, 'elements');
  
  // Clear previous
  const meshesToRemove = scene.children.filter(c => c.isMesh);
  meshesToRemove.forEach(m => scene.remove(m));
  
  // Type colors
  const colors = {
    column: 0x808080,
    beam: 0xa0a0a0,
    slab: 0x606060,
    wall: 0xc0c0c0,
    foundation: 0x404040,
    roof: 0x909090,
    staircase: 0xb0b0b0,
    door: 0x8B4513,
    window: 0x87CEEB,
  };
  
  let totalVolume = 0;
  let xOffset = 0;
  let zOffset = 0;
  let rowMax = 0;
  let maxY = 0;
  
  elements.forEach((element, idx) => {
    const type = (element.element_type || 'wall').toLowerCase();
    const color = colors[type] || 0x808080;
    const volume = element.volume_m3 || 0.01;
    
    // Calculate dimensions from volume
    let w, h, d;
    if (type === 'slab') {
      w = Math.sqrt(volume / 0.12) || 3;
      d = w;
      h = 0.12;
    } else if (type === 'column') {
      w = 0.3;
      d = 0.3;
      h = Math.max(volume / (w * d), 2.5);
    } else if (type === 'beam') {
      w = volume / (0.3 * 0.5) || 4;
      h = 0.5;
      d = 0.3;
    } else if (type === 'wall') {
      w = Math.sqrt(volume / (0.23 * 3)) || 3;
      h = 3;
      d = 0.23;
    } else if (type === 'foundation') {
      w = Math.sqrt(volume / 0.6) || 1.2;
      h = 0.6;
      d = w;
    } else {
      w = Math.cbrt(volume) || 1;
      h = w;
      d = w;
    }
    
    // Use parsed dimensions if available
    const dims = element.dimensions || {};
    if (dims.length > 0) w = dims.length;
    if (dims.height > 0) h = dims.height;
    if (dims.depth > 0) d = dims.depth;
    if (dims.width > 0) w = dims.width;
    
    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.7,
      metalness: 0.2,
    });
    
    const geometry = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position
    let y = h / 2;
    if (type === 'slab') y = h / 2;
    if (type === 'foundation') y = -h / 2;
    
    mesh.position.set(xOffset + w / 2, y, zOffset + d / 2);
    scene.add(mesh);
    
    // Track max height
    maxY = Math.max(maxY, y + h / 2);
    rowMax = Math.max(rowMax, d);
    
    // Grid layout
    xOffset += w + 1;
    if (xOffset > 30) {
      xOffset = 0;
      zOffset += rowMax + 1;
      rowMax = 0;
    }
    
    totalVolume += volume;
  });
  
  // Fit camera
  camera.position.set(20, maxY * 1.5, 30);
  camera.lookAt(xOffset / 2, maxY / 2, zOffset / 2);
  
  if (onModelLoaded) {
    onModelLoaded({
      elements: elements.length,
      volume: totalVolume,
      stories: Math.max(...elements.map(e => parseInt(e.story) || 1))
    });
  }
}

// Three.js IFC Viewer using Open BIM Components
function IFCViewer({ containerRef, file, onModelLoaded, parsedElements }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scene, setScene] = useState(null);
  const [camera, setCamera] = useState(null);
  const [renderer, setRenderer] = useState(null);
  const [model, setModel] = useState(null);

  useEffect(() => {
    if (!containerRef?.current) return;

    // Initialize Three.js scene
    const threeScene = new THREE.Scene();
    threeScene.background = new THREE.Color(0x1a1a2e);
    setScene(threeScene);

    // Camera
    const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
    const threeCamera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    threeCamera.position.set(30, 30, 30);
    threeCamera.lookAt(0, 0, 0);
    setCamera(threeCamera);

    // Renderer
    const threeRenderer = new THREE.WebGLRenderer({ antialias: true });
    threeRenderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    threeRenderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(threeRenderer.domElement);
    setRenderer(threeRenderer);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    threeScene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(20, 35, 10);
    threeScene.add(directionalLight);

    // Grid
    const grid = new THREE.GridHelper(100, 20, 0x10b981, 0x10b981);
    threeScene.add(grid);

    // Mouse controls
    let isDragging = false;
    let previousPos = { x: 0, y: 0 };

    const onMouseDown = (e) => {
      isDragging = true;
      previousPos = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;

      const dx = e.clientX - previousPos.x;
      const dy = e.clientY - previousPos.y;

      const radius = Math.sqrt(threeCamera.position.x ** 2 + threeCamera.position.z ** 2);
      const theta = Math.atan2(threeCamera.position.z, threeCamera.position.x);
      const phi = Math.atan2(threeCamera.position.y, radius);

      const newTheta = theta + dx * 0.01;
      const newPhi = Math.max(0.1, Math.min(Math.PI / 2, phi - dy * 0.01));

      threeCamera.position.x = radius * Math.cos(newTheta) * Math.cos(newPhi);
      threeCamera.position.z = radius * Math.sin(newTheta) * Math.cos(newPhi);
      threeCamera.position.y = radius * Math.sin(newPhi);
      threeCamera.lookAt(0, 0, 0);

      previousPos = { x: e.clientX, y: e.clientY };
    };

    containerRef.current.addEventListener('mousedown', onMouseDown);
    containerRef.current.addEventListener('mouseup', onMouseUp);
    containerRef.current.addEventListener('mousemove', onMouseMove);

    // Animation loop
    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      threeRenderer.render(threeScene, threeCamera);
    };
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      containerRef.current?.removeEventListener('mousedown', onMouseDown);
      containerRef.current?.removeEventListener('mouseup', onMouseUp);
      containerRef.current?.removeEventListener('mousemove', onMouseMove);
      if (threeRenderer && containerRef.current) {
        containerRef.current.removeChild(threeRenderer.domElement);
        threeRenderer.dispose();
      }
    };
  }, [containerRef]);

  // Load IFC file
  useEffect(() => {
    if (!file || !scene) return;

    const loadIFC = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Clear previous meshes
        const meshesToRemove = scene.children.filter(c => c.isMesh);
        meshesToRemove.forEach(m => scene.remove(m));

        // Wait for results from parse
        if (!parsedElements || parsedElements.length === 0) {
          // Show placeholder until data arrives
          const buildingHeight = 3;
          const buildingWidth = 10;
          const buildingDepth = 8;
          
          const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x808080, 
            roughness: 0.7 
          });
          
          // Single floor placeholder
          const floorGeometry = new THREE.BoxGeometry(buildingWidth, 0.15, buildingDepth);
          const floor = new THREE.Mesh(floorGeometry, floorMaterial);
          floor.position.y = 0.075;
          scene.add(floor);
          
          camera.position.set(20, 15, 20);
          camera.lookAt(0, 0, 0);
          
          if (onModelLoaded) {
            onModelLoaded({ stories: 1, area: buildingWidth * buildingDepth, volume: buildingWidth * buildingHeight * buildingDepth });
          }
        } else {
          // Render actual parsed elements
          renderParsedElements(scene, camera, parsedElements, onModelLoaded);
        }

      } catch (err) {
        console.error("IFC load error:", err);
        setError("Failed to load IFC file");
      } finally {
        setIsLoading(false);
      }
    };

    loadIFC();
  }, [file, scene, camera, onModelLoaded, parsedElements]);

  return (
    <div className="w-full h-full relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/70 z-10">
          <div className="text-center">
            <FaSpinner className="animate-spin text-4xl text-white mx-auto mb-2" />
            <p className="text-white text-sm">Loading IFC file...</p>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute top-4 left-4 right-4 bg-red-500/80 text-white p-3 rounded-lg z-10">
          <FaExclamationTriangle className="inline mr-2" />
          {error}
        </div>
      )}
    </div>
  );
}

function BIMIntegration() {
  const navigate = useNavigate();
  const { project, updateAnalysisResults, updateBIMData } = useProject();
  const [file, setFile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [viewerReady, setViewerReady] = useState(false);
  const viewerRef = useRef(null);
  const containerRef = useRef(null);

  // Restore BIM data
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
          <button onClick={() => navigate("/setup")} className="btn btn-primary">
            <FaArrowRight className="mr-2" />
            Go to Project Setup
          </button>
        </div>
      </div>
    );
  }

  // Handle file upload
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
      
      const bimData = response.data;
      setResults(bimData);
      updateAnalysisResults("bim", bimData);
      
      // Save BIM data to project context
      updateBIMData({
        ifcFileName: uploadedFile.name,
        ifcFileSize: uploadedFile.size,
        quantities: bimData,
        materials: bimData.parsed_elements?.filter(e => e.materials?.length > 0) || [],
        uploadedAt: new Date().toISOString(),
      });

      // Show success message
      if (bimData.parsed_elements && bimData.parsed_elements.length > 0) {
        console.log(`Successfully parsed ${bimData.parsed_elements.length} elements`);
      } else {
        console.warn("No elements were parsed from the file");
        setError("Warning: No 3D elements were extracted from the file.");
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

  const handleModelLoaded = (meta) => {
    console.log("3D model loaded:", meta);
    setViewerReady(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">BIM Integration</h1>
          <p className="text-foreground-secondary mt-1">
            Upload IFC files to extract quantities and visualize in 3D
          </p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-foreground">Upload IFC File</h3>
        </div>
        <div className="card-body">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center hover:border-primary transition-colors">
            <input
              type="file"
              accept=".ifc,.ifczip"
              onChange={handleFileUpload}
              className="hidden"
              id="ifc-upload"
              disabled={isParsing}
            />
            <label htmlFor="ifc-upload" className="cursor-pointer">
              <div className="flex flex-col items-center">
                {isParsing ? (
                  <>
                    <FaSpinner className="animate-spin text-4xl text-primary mb-4" />
                    <p className="text-foreground-secondary">Parsing IFC file...</p>
                  </>
                ) : (
                  <>
                    <FaUpload className="text-4xl text-gray-400 mb-4" />
                    <p className="text-foreground font-medium mb-2">
                      Click to upload IFC file
                    </p>
                    <p className="text-foreground-secondary text-sm">
                      Supports .ifc and .ifczip files
                    </p>
                  </>
                )}
              </div>
            </label>
          </div>

          {file && !isParsing && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center gap-3">
              <FaCheck className="text-green-500" />
              <div>
                <p className="font-medium text-foreground">{file.name}</p>
                <p className="text-sm text-foreground-secondary">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-3">
              <FaExclamationTriangle className="text-red-500" />
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* 3D Viewer */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-foreground">3D Model Viewer</h3>
        </div>
        <div className="p-0">
          <div className="h-96 relative" ref={containerRef}>
            <IFCViewer 
              containerRef={containerRef} 
              file={file} 
              onModelLoaded={handleModelLoaded}
              parsedElements={results?.parsed_elements || results?.elements || []}
            />
          </div>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-foreground">Extracted Data</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xs text-foreground-secondary">Elements</p>
                <p className="text-xl font-bold text-foreground">
                  {results.parsed_elements?.length || results.elements?.length || 0}
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xs text-foreground-secondary">Stories</p>
                <p className="text-xl font-bold text-foreground">
                  {results.stories?.length || 0}
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xs text-foreground-secondary">Volume</p>
                <p className="text-xl font-bold text-foreground">
                  {(results.totals?.volume_m3 || 0).toFixed(1)} m³
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xs text-foreground-secondary">Cost</p>
                <p className="text-xl font-bold text-foreground">
                  ₹{((results.totals?.cost_inr || 0) / 100000).toFixed(1)}L
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BIMIntegration;

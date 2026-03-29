import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useProject } from "../context/ProjectContext";
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
} from "react-icons/fa";

function BIMIntegration() {
  const navigate = useNavigate();
  const { project, updateAnalysisResults, updateBIMData } = useProject();
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [activeStep, setActiveStep] = useState('upload'); // upload, dimensions, quantities, results
  
  const [dimensions, setDimensions] = useState({
    length: project?.buildingParams?.builtUpArea ? Math.sqrt(project.buildingParams.builtUpArea).toFixed(1) : '',
    width: '',
    floors: project?.buildingParams?.numFloors || 2,
    floorHeight: 3.0,
    plotArea: project?.buildingParams?.plotArea || '',
    builtUpArea: project?.buildingParams?.builtUpArea || '',
  });

  const [manualInputs, setManualInputs] = useState({
    concrete: '',
    steel: '',
    blocks: '',
    aggregate: '',
    sand: '',
    cement: '',
  });

  // Restore BIM data from context
  useEffect(() => {
    if (project?.bimData?.quantities) {
      setExtractedData(project.bimData.quantities);
    }
  }, []);

  // Handle file upload
  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(uploadedFile.type)) {
      setError('Please upload a PNG, JPG, or PDF file');
      return;
    }

    const url = URL.createObjectURL(uploadedFile);
    setFile(uploadedFile);
    setFileUrl(url);
    setError(null);
    setActiveStep('dimensions');
  };

  // Calculate quantities from dimensions
  const calculateFromDimensions = () => {
    const area = parseFloat(dimensions.builtUpArea) || 
                 (parseFloat(dimensions.length) * parseFloat(dimensions.width)) || 
                 150;
    const floors = parseInt(dimensions.floors) || 2;
    const totalArea = area * floors;

    // Calibrated formulas
    const concrete = Math.round(totalArea * (totalArea <= 300 ? 0.112 : totalArea <= 800 ? 0.18 : 0.25));
    const steel = Math.round(totalArea * (totalArea <= 300 ? 10.3 : totalArea <= 800 ? 18 : 28));
    const blocks = Math.round(totalArea * (totalArea <= 300 ? 7 : totalArea <= 800 ? 12 : 11));
    const aggregate = Math.round(totalArea * 0.15);
    const sand = Math.round(concrete * 0.45 * 35.31);
    const cement = Math.round(concrete * 6.5);

    setManualInputs({
      concrete: concrete.toString(),
      steel: steel.toString(),
      blocks: blocks.toString(),
      aggregate: aggregate.toString(),
      sand: sand.toString(),
      cement: cement.toString(),
    });

    setActiveStep('quantities');
  };

  // Process and save
  const handleProcess = () => {
    setIsProcessing(true);
    
    const quantities = {
      floors: parseInt(dimensions.floors) || 2,
      area: parseFloat(dimensions.builtUpArea) || 150,
      concrete: parseFloat(manualInputs.concrete) || 0,
      steel: parseFloat(manualInputs.steel) || 0,
      blocks: parseFloat(manualInputs.blocks) || 0,
      aggregate: parseFloat(manualInputs.aggregate) || 0,
      sand: parseFloat(manualInputs.sand) || 0,
      cement: parseFloat(manualInputs.cement) || 0,
    };

    updateBIMData({
      ifcFileName: file?.name || 'Manual Entry',
      ifcFileSize: file?.size || 0,
      quantities: quantities,
      materials: [],
      uploadedAt: new Date().toISOString(),
    });

    setExtractedData(quantities);
    setIsProcessing(false);
    setActiveStep('results');
  };

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
            Set up your project to upload drawings and enter quantities.
          </p>
          <button onClick={() => navigate('/setup')} className="btn btn-primary">
            <FaArrowRight className="mr-2" />
            Go to Project Setup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Project Drawing & Estimation</h1>
          <p className="text-foreground-secondary mt-1">
            Upload drawing, enter dimensions, and generate material quantities
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-6">
        {['upload', 'dimensions', 'quantities', 'results'].map((step, idx) => (
          <div key={step} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              activeStep === step 
                ? 'bg-primary text-white' 
                : idx < ['upload', 'dimensions', 'quantities', 'results'].indexOf(activeStep)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500'
            }`}>
              {idx < ['upload', 'dimensions', 'quantities', 'results'].indexOf(activeStep) ? (
                <FaCheck />
              ) : (
                idx + 1
              )}
            </div>
            <span className="text-sm text-foreground-secondary capitalize">{step}</span>
            {idx < 3 && <div className="w-12 h-0.5 bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {activeStep === 'upload' && (
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-foreground">Step 1: Upload Drawing</h3>
          </div>
          <div className="card-body">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center hover:border-primary transition-colors">
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="flex flex-col items-center">
                  <FaImage className="text-5xl text-gray-400 mb-4" />
                  <p className="text-foreground font-medium text-lg mb-2">
                    Click to upload your floor plan
                  </p>
                  <p className="text-foreground-secondary text-sm">
                    Upload PNG, JPG, or PDF of your building drawing
                  </p>
                </div>
              </label>
            </div>
            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-3">
                <FaExclamationTriangle className="text-red-500" />
                <p className="text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Enter Dimensions */}
      {activeStep === 'dimensions' && file && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* File Preview */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-foreground">Uploaded Drawing</h3>
            </div>
            <div className="card-body">
              <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                {file.type === 'application/pdf' ? (
                  <div className="p-8 text-center">
                    <FaFilePdf className="text-6xl text-red-500 mx-auto mb-4" />
                    <p className="font-medium text-foreground">{file.name}</p>
                    <p className="text-sm text-foreground-secondary">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <img 
                    src={fileUrl} 
                    alt="Uploaded drawing" 
                    className="max-w-full h-auto max-h-96 mx-auto"
                  />
                )}
              </div>
              <div className="mt-4 flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <FaCheck className="text-green-500" />
                <div>
                  <p className="font-medium text-foreground">{file.name}</p>
                  <p className="text-sm text-foreground-secondary">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Dimensions Input */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-foreground">Step 2: Enter Dimensions</h3>
              <p className="text-sm text-foreground-secondary">Enter the dimensions shown in your drawing</p>
            </div>
            <div className="card-body space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1">
                    Length (m)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 12"
                    value={dimensions.length}
                    onChange={(e) => setDimensions({...dimensions, length: e.target.value})}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1">
                    Width (m)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 10"
                    value={dimensions.width}
                    onChange={(e) => setDimensions({...dimensions, width: e.target.value})}
                    className="input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-1">
                  Built-up Area (sq.m) - or will calculate from L×W
                </label>
                <input
                  type="number"
                  placeholder="e.g., 120"
                  value={dimensions.builtUpArea}
                  onChange={(e) => setDimensions({...dimensions, builtUpArea: e.target.value})}
                  className="input w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1">
                    Number of Floors
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={dimensions.floors}
                    onChange={(e) => setDimensions({...dimensions, floors: e.target.value})}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1">
                    Floor Height (m)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={dimensions.floorHeight}
                    onChange={(e) => setDimensions({...dimensions, floorHeight: e.target.value})}
                    className="input w-full"
                  />
                </div>
              </div>

              <button
                onClick={calculateFromDimensions}
                className="btn btn-primary w-full py-3"
              >
                <FaCalculator className="mr-2" />
                Calculate Quantities
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Review Quantities */}
      {activeStep === 'quantities' && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Step 3: Review & Adjust Quantities</h3>
            <button
              onClick={calculateFromDimensions}
              className="btn btn-secondary text-xs py-1 px-3"
            >
              Recalculate
            </button>
          </div>
          <div className="card-body">
            <p className="text-foreground-secondary text-sm mb-4">
              Review the calculated quantities and adjust if needed based on your drawing
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-1">
                  Concrete (cum)
                </label>
                <input
                  type="number"
                  value={manualInputs.concrete}
                  onChange={(e) => setManualInputs({...manualInputs, concrete: e.target.value})}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-1">
                  Steel (kg)
                </label>
                <input
                  type="number"
                  value={manualInputs.steel}
                  onChange={(e) => setManualInputs({...manualInputs, steel: e.target.value})}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-1">
                  Cement (bags)
                </label>
                <input
                  type="number"
                  value={manualInputs.cement}
                  onChange={(e) => setManualInputs({...manualInputs, cement: e.target.value})}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-1">
                  Sand (cft)
                </label>
                <input
                  type="number"
                  value={manualInputs.sand}
                  onChange={(e) => setManualInputs({...manualInputs, sand: e.target.value})}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-1">
                  Blocks (nos)
                </label>
                <input
                  type="number"
                  value={manualInputs.blocks}
                  onChange={(e) => setManualInputs({...manualInputs, blocks: e.target.value})}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-1">
                  Aggregate (cft)
                </label>
                <input
                  type="number"
                  value={manualInputs.aggregate}
                  onChange={(e) => setManualInputs({...manualInputs, aggregate: e.target.value})}
                  className="input w-full"
                />
              </div>
            </div>

            <button
              onClick={handleProcess}
              disabled={isProcessing}
              className="btn btn-primary w-full py-3 mt-4"
            >
              {isProcessing ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Generating Report...
                </>
              ) : (
                <>
                  <FaCalculator className="mr-2" />
                  Generate Report
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Results */}
      {activeStep === 'results' && extractedData && (
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-foreground">Material Quantities Summary</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                <FaBuilding className="text-2xl text-blue-500 mx-auto mb-2" />
                <p className="text-xs text-foreground-secondary">Built-up Area</p>
                <p className="text-xl font-bold text-foreground">{extractedData.area} sq.m</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                <FaCube className="text-2xl text-blue-500 mx-auto mb-2" />
                <p className="text-xs text-foreground-secondary">Floors</p>
                <p className="text-xl font-bold text-foreground">{extractedData.floors}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                <FaIndustry className="text-2xl text-gray-500 mx-auto mb-2" />
                <p className="text-xs text-foreground-secondary">Concrete</p>
                <p className="text-xl font-bold text-foreground">{extractedData.concrete} cum</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                <FaIndustry className="text-2xl text-red-500 mx-auto mb-2" />
                <p className="text-xs text-foreground-secondary">Steel</p>
                <p className="text-xl font-bold text-foreground">{extractedData.steel} kg</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                <FaIndustry className="text-2xl text-orange-500 mx-auto mb-2" />
                <p className="text-xs text-foreground-secondary">Blocks</p>
                <p className="text-xl font-bold text-foreground">{extractedData.blocks} nos</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                <FaRuler className="text-2xl text-yellow-500 mx-auto mb-2" />
                <p className="text-xs text-foreground-secondary">Sand</p>
                <p className="text-xl font-bold text-foreground">{extractedData.sand} cft</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                <FaIndustry className="text-2xl text-green-500 mx-auto mb-2" />
                <p className="text-xs text-foreground-secondary">Cement</p>
                <p className="text-xl font-bold text-foreground">{extractedData.cement} bags</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                <FaRuler className="text-2xl text-purple-500 mx-auto mb-2" />
                <p className="text-xs text-foreground-secondary">Aggregate</p>
                <p className="text-xl font-bold text-foreground">{extractedData.aggregate} cft</p>
              </div>
            </div>
            
            <div className="flex gap-4 mt-4">
              <button
                onClick={() => setActiveStep('quantities')}
                className="btn btn-secondary flex-1"
              >
                Edit Quantities
              </button>
              <button
                onClick={() => navigate('/reports')}
                className="btn btn-primary flex-1"
              >
                <FaArrowRight className="mr-2" />
                View Reports
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BIMIntegration;

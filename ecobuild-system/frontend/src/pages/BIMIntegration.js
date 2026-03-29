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
  FaMagic,
  FaHome,
  FaBriefcase,
  FaCity,
} from "react-icons/fa";

// Building type templates with calibrated ratios
const BUILDING_TEMPLATES = [
  {
    id: 'residential-2bhk',
    name: '2BHK House (100-150 sq.m)',
    icon: FaHome,
    ratios: { concrete: 0.112, steel: 10.3, blocks: 7.0, aggregate: 0.015, cement: 0.7, sand: 0.05 }
  },
  {
    id: 'residential-3bhk',
    name: '3BHK House (150-250 sq.m)',
    icon: FaHome,
    ratios: { concrete: 0.125, steel: 12, blocks: 7.5, aggregate: 0.017, cement: 0.75, sand: 0.055 }
  },
  {
    id: 'office-small',
    name: 'Small Office (200-400 sq.m)',
    icon: FaBriefcase,
    ratios: { concrete: 0.18, steel: 15, blocks: 10, aggregate: 0.022, cement: 0.85, sand: 0.06 }
  },
  {
    id: 'apartment',
    name: 'Apartment Building (500+ sq.m)',
    icon: FaCity,
    ratios: { concrete: 0.25, steel: 28, blocks: 11, aggregate: 0.035, cement: 1.2, sand: 0.09 }
  },
];

function BIMIntegration() {
  const navigate = useNavigate();
  const { project, updateAnalysisResults, updateBIMData } = useProject();
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [activeStep, setActiveStep] = useState('upload');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
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
    setActiveStep('template');
  };

  // Calculate quantities from template
  const calculateFromTemplate = (template) => {
    setSelectedTemplate(template);
    const area = parseFloat(dimensions.builtUpArea) || project?.buildingParams?.builtUpArea || 150;
    const floors = parseInt(dimensions.floors) || 2;
    const totalArea = area * floors;
    const r = template.ratios;

    setManualInputs({
      concrete: Math.round(totalArea * r.concrete).toString(),
      steel: Math.round(totalArea * r.steel).toString(),
      blocks: Math.round(totalArea * r.blocks).toString(),
      aggregate: Math.round(totalArea * r.aggregate * 1000).toString(),
      sand: Math.round(totalArea * r.cement * 5).toString(),
      cement: Math.round(totalArea * r.cement).toString(),
    });

    setActiveStep('quantities');
  };

  // Calculate quantities from dimensions
  const calculateFromDimensions = () => {
    const area = parseFloat(dimensions.builtUpArea) || 
                 (parseFloat(dimensions.length) * parseFloat(dimensions.width)) || 
                 150;
    const floors = parseInt(dimensions.floors) || 2;
    const totalArea = area * floors;

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
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FaMagic className="text-primary" />
            Smart Material Estimator
          </h1>
          <p className="text-foreground-secondary mt-1">
            Upload drawing, select building type, get instant estimates
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-6">
        {['upload', 'template', 'quantities', 'results'].map((step, idx) => (
          <div key={step} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              activeStep === step 
                ? 'bg-primary text-white' 
                : idx < ['upload', 'template', 'quantities', 'results'].indexOf(activeStep)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500'
            }`}>
              {idx < ['upload', 'template', 'quantities', 'results'].indexOf(activeStep) ? (
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
            <h3 className="font-semibold text-foreground">Step 1: Upload Your Floor Plan</h3>
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
                    PNG, JPG, or PDF
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

      {/* Step 2: Select Building Type */}
      {activeStep === 'template' && file && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* File Preview */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-foreground">Your Drawing</h3>
            </div>
            <div className="card-body">
              <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                {file.type === 'application/pdf' ? (
                  <div className="p-8 text-center">
                    <FaFilePdf className="text-6xl text-red-500 mx-auto mb-4" />
                    <p className="font-medium text-foreground">{file.name}</p>
                  </div>
                ) : (
                  <img 
                    src={fileUrl} 
                    alt="Uploaded drawing" 
                    className="max-w-full h-auto max-h-96 mx-auto"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Building Type Selection */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-foreground">Step 2: Select Building Type</h3>
              <p className="text-sm text-foreground-secondary">Choose the type that best matches your drawing</p>
            </div>
            <div className="card-body space-y-3">
              {BUILDING_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => calculateFromTemplate(template)}
                  className="w-full p-4 text-left rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-primary transition-all"
                >
                  <div className="flex items-center gap-3">
                    <template.icon className="text-2xl text-primary" />
                    <div>
                      <p className="font-medium text-foreground">{template.name}</p>
                      <p className="text-sm text-foreground-secondary">
                        Concrete: {template.ratios.concrete} cum/sq.m | Steel: {template.ratios.steel} kg/sq.m
                      </p>
                    </div>
                  </div>
                </button>
              ))}
              
              <button
                onClick={calculateFromDimensions}
                className="w-full p-4 text-left rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-primary transition-all"
              >
                <div className="flex items-center gap-3">
                  <FaCalculator className="text-2xl text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Enter Custom Dimensions</p>
                    <p className="text-sm text-foreground-secondary">
                      Calculate based on specific dimensions
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Review Quantities */}
      {activeStep === 'quantities' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* File Preview */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-foreground">Your Drawing</h3>
            </div>
            <div className="card-body">
              <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                {file?.type === 'application/pdf' ? (
                  <div className="p-4 text-center">
                    <FaFilePdf className="text-4xl text-red-500 mx-auto mb-2" />
                    <p className="text-sm text-foreground">{file.name}</p>
                  </div>
                ) : (
                  <img 
                    src={fileUrl} 
                    alt="Uploaded drawing" 
                    className="max-w-full h-auto max-h-64 mx-auto"
                  />
                )}
              </div>
              {selectedTemplate && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm font-medium text-foreground">Template: {selectedTemplate.name}</p>
                </div>
              )}
            </div>
          </div>

          {/* Quantities Input */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-foreground">Step 3: Review & Adjust Quantities</h3>
              <p className="text-sm text-foreground-secondary">Review the calculated quantities and adjust if needed</p>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1">
                    Built-up Area (sq.m)
                  </label>
                  <input
                    type="number"
                    value={dimensions.builtUpArea}
                    onChange={(e) => setDimensions({...dimensions, builtUpArea: e.target.value})}
                    className="input w-full"
                  />
                </div>
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
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                <p className="text-xs text-foreground-secondary">Area</p>
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

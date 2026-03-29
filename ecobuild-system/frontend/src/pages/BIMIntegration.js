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
  FaEye,
  FaBrain,
} from "react-icons/fa";

// Extract dimensions from OCR text
function extractDimensionsFromText(text) {
  const dimensions = {
    area: null,
    length: null,
    width: null,
    floors: null,
  };

  // Try to find area in sq.m
  const areaMatch = text.match(/(\d+\.?\d*)\s*(?:sq\.?\s*m|sqm|square\s*meter)/i);
  if (areaMatch) {
    dimensions.area = parseFloat(areaMatch[1]);
  }

  // Try to find length and width
  const lengthMatch = text.match(/(?:length|L|l)[:\s]*(\d+\.?\d*)\s*(?:m|meter)/i);
  if (lengthMatch) {
    dimensions.length = parseFloat(lengthMatch[1]);
  }

  const widthMatch = text.match(/(?:width|W|w)[:\s]*(\d+\.?\d*)\s*(?:m|meter)/i);
  if (widthMatch) {
    dimensions.width = parseFloat(widthMatch[1]);
  }

  // Try to find dimensions like 12m x 10m
  const dimMatch = text.match(/(\d+\.?\d*)\s*(?:m|meter)\s*[xX×]\s*(\d+\.?\d*)\s*(?:m|meter)/i);
  if (dimMatch) {
    dimensions.length = parseFloat(dimMatch[1]);
    dimensions.width = parseFloat(dimMatch[2]);
  }

  // Try to find number of floors
  const floorMatch = text.match(/(\d+)\s*(?:floor|story|storey|level)/i);
  if (floorMatch) {
    dimensions.floors = parseInt(floorMatch[1]);
  }

  return dimensions;
}

// Calculate quantities from extracted dimensions
function calculateQuantities(extracted, template) {
  const area = extracted.area || 150;
  const floors = extracted.floors || 2;
  const totalArea = area * floors;
  
  // Use template ratios if provided, otherwise use calibrated defaults
  const r = template?.ratios || {
    concrete: 0.112,
    steel: 10.3,
    blocks: 7.0,
    aggregate: 0.015,
    cement: 0.7,
    sand: 0.05
  };

  return {
    area: Math.round(area),
    floors: floors,
    concrete: Math.round(totalArea * r.concrete),
    steel: Math.round(totalArea * r.steel),
    blocks: Math.round(totalArea * r.blocks),
    aggregate: Math.round(totalArea * r.aggregate * 1000),
    sand: Math.round(totalArea * r.sand * 1000),
    cement: Math.round(totalArea * r.cement),
  };
}

// Building type templates
const BUILDING_TEMPLATES = [
  {
    id: 'residential-2bhk',
    name: '2BHK House (100-150 sq.m)',
    icon: FaBuilding,
    ratios: { concrete: 0.112, steel: 10.3, blocks: 7.0, aggregate: 0.015, cement: 0.7, sand: 0.05 }
  },
  {
    id: 'residential-3bhk',
    name: '3BHK House (150-250 sq.m)',
    icon: FaBuilding,
    ratios: { concrete: 0.125, steel: 12, blocks: 7.5, aggregate: 0.017, cement: 0.75, sand: 0.055 }
  },
  {
    id: 'office-small',
    name: 'Small Office (200-400 sq.m)',
    icon: FaBuilding,
    ratios: { concrete: 0.18, steel: 15, blocks: 10, aggregate: 0.022, cement: 0.85, sand: 0.06 }
  },
  {
    id: 'apartment',
    name: 'Apartment Building (500+ sq.m)',
    icon: FaBuilding,
    ratios: { concrete: 0.25, steel: 28, blocks: 11, aggregate: 0.035, cement: 1.2, sand: 0.09 }
  },
];

function BIMIntegration() {
  const navigate = useNavigate();
  const { project, updateAnalysisResults, updateBIMData } = useProject();
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [error, setError] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [activeStep, setActiveStep] = useState('upload');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [ocrText, setOcrText] = useState('');
  const [extractedDimensions, setExtractedDimensions] = useState({});
  
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
  const handleFileUpload = async (e) => {
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
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    try {
      // Import Tesseract.js dynamically
      const Tesseract = await import('tesseract.js');
      setAnalysisProgress(20);

      // Create worker and recognize text
      const worker = await Tesseract.createWorker('eng');
      setAnalysisProgress(40);

      const { data: { text } } = await worker.recognize(url);
      setAnalysisProgress(80);

      setOcrText(text);
      const dims = extractDimensionsFromText(text);
      setExtractedDimensions(dims);
      setAnalysisProgress(100);

      await worker.terminate();

      // Update dimensions with extracted data
      if (dims.area) {
        setDimensions(prev => ({ ...prev, builtUpArea: dims.area.toString() }));
      }
      if (dims.floors) {
        setDimensions(prev => ({ ...prev, floors: dims.floors }));
      }

    } catch (err) {
      console.error('OCR analysis error:', err);
      // Don't show error - just proceed with manual entry
    } finally {
      setIsAnalyzing(false);
      setActiveStep('template');
    }
  };

  // Calculate quantities from template
  const calculateFromTemplate = (template) => {
    setSelectedTemplate(template);
    const quantities = calculateQuantities(extractedDimensions, template);
    setManualInputs({
      concrete: quantities.concrete.toString(),
      steel: quantities.steel.toString(),
      blocks: quantities.blocks.toString(),
      aggregate: quantities.aggregate.toString(),
      sand: quantities.sand.toString(),
      cement: quantities.cement.toString(),
    });
    setDimensions(prev => ({
      ...prev,
      builtUpArea: quantities.area.toString(),
      floors: quantities.floors.toString(),
    }));
    setActiveStep('quantities');
  };

  // Process and save
  const handleProcess = () => {
    setIsAnalyzing(true);
    
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
    setIsAnalyzing(false);
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
            <FaBrain className="text-primary" />
            AI Material Estimator
          </h1>
          <p className="text-foreground-secondary mt-1">
            Upload floor plan, AI analyzes it, get instant estimates
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
            <p className="text-sm text-foreground-secondary">AI will analyze the image to extract dimensions</p>
          </div>
          <div className="card-body">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center hover:border-primary transition-colors">
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                disabled={isAnalyzing}
              />
              <label htmlFor="file-upload" className={`cursor-pointer ${isAnalyzing ? 'pointer-events-none' : ''}`}>
                <div className="flex flex-col items-center">
                  {isAnalyzing ? (
                    <>
                      <FaSpinner className="animate-spin text-5xl text-primary mb-4" />
                      <p className="text-foreground font-medium text-lg mb-2">
                        AI is analyzing your drawing...
                      </p>
                      <div className="w-64 bg-gray-200 rounded-full h-2.5 mb-4">
                        <div 
                          className="bg-primary h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${analysisProgress}%` }}
                        />
                      </div>
                      <p className="text-foreground-secondary text-sm">
                        {analysisProgress < 40 ? 'Initializing AI...' :
                         analysisProgress < 80 ? 'Reading dimensions...' :
                         'Processing complete!'}
                      </p>
                    </>
                  ) : (
                    <>
                      <FaEye className="text-5xl text-gray-400 mb-4" />
                      <p className="text-foreground font-medium text-lg mb-2">
                        Click to upload your floor plan
                      </p>
                      <p className="text-foreground-secondary text-sm">
                        AI will analyze and extract dimensions
                      </p>
                    </>
                  )}
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
              {ocrText && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <FaCheck /> AI extracted: {extractedDimensions.area || 'N/A'} sq.m
                </p>
              )}
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
              {extractedDimensions.area && (
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm font-medium text-foreground">AI Detected:</p>
                  <p className="text-xs text-foreground-secondary">
                    Area: {extractedDimensions.area} sq.m
                    {extractedDimensions.floors ? ` | Floors: ${extractedDimensions.floors}` : ''}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Building Type Selection */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-foreground">Step 2: Confirm Building Type</h3>
              <p className="text-sm text-foreground-secondary">Select the type that best matches your drawing</p>
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
            </div>
          </div>

          {/* Quantities Input */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-foreground">Step 3: Review & Adjust</h3>
              <p className="text-sm text-foreground-secondary">Review quantities and adjust if needed</p>
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
                {[
                  { key: 'concrete', label: 'Concrete (cum)', icon: FaIndustry },
                  { key: 'steel', label: 'Steel (kg)', icon: FaIndustry },
                  { key: 'cement', label: 'Cement (bags)', icon: FaIndustry },
                  { key: 'sand', label: 'Sand (cft)', icon: FaRuler },
                  { key: 'blocks', label: 'Blocks (nos)', icon: FaIndustry },
                  { key: 'aggregate', label: 'Aggregate (cft)', icon: FaRuler },
                ].map(({ key, label, icon: Icon }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-foreground-secondary mb-1 flex items-center gap-1">
                      <Icon className="text-xs" />
                      {label}
                    </label>
                    <input
                      type="number"
                      value={manualInputs[key]}
                      onChange={(e) => setManualInputs({...manualInputs, [key]: e.target.value})}
                      className="input w-full"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={handleProcess}
                disabled={isAnalyzing}
                className="btn btn-primary w-full py-3 mt-4"
              >
                {isAnalyzing ? (
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
              {[
                { label: 'Area', value: `${extractedData.area} sq.m`, icon: FaBuilding, color: 'blue' },
                { label: 'Floors', value: extractedData.floors, icon: FaCube, color: 'blue' },
                { label: 'Concrete', value: `${extractedData.concrete} cum`, icon: FaIndustry, color: 'gray' },
                { label: 'Steel', value: `${extractedData.steel} kg`, icon: FaIndustry, color: 'red' },
                { label: 'Blocks', value: `${extractedData.blocks} nos`, icon: FaIndustry, color: 'orange' },
                { label: 'Sand', value: `${extractedData.sand} cft`, icon: FaRuler, color: 'yellow' },
                { label: 'Cement', value: `${extractedData.cement} bags`, icon: FaIndustry, color: 'green' },
                { label: 'Aggregate', value: `${extractedData.aggregate} cft`, icon: FaRuler, color: 'purple' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                  <Icon className={`text-2xl text-${color}-500 mx-auto mb-2`} />
                  <p className="text-xs text-foreground-secondary">{label}</p>
                  <p className="text-xl font-bold text-foreground">{value}</p>
                </div>
              ))}
            </div>
            
            <div className="flex gap-4 mt-4">
              <button onClick={() => setActiveStep('quantities')} className="btn btn-secondary flex-1">
                Edit Quantities
              </button>
              <button onClick={() => navigate('/reports')} className="btn btn-primary flex-1">
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

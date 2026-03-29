import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useProject } from "../context/ProjectContext";
import { analyzeFloorplan } from "../services/floorplanAnalyzer";
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
} from "react-icons/fa";

function BIMIntegration() {
  const navigate = useNavigate();
  const { project, updateBIMData } = useProject();
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeStep, setActiveStep] = useState('upload');
  
  const [manualInputs, setManualInputs] = useState({
    concrete: '',
    steel: '',
    blocks: '',
    aggregate: '',
    sand: '',
    cement: '',
    floors: project?.buildingParams?.numFloors || 2,
    area: project?.buildingParams?.builtUpArea || 150,
  });

  // Handle file upload and analysis
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

    try {
      // Analyze the floorplan
      const result = await analyzeFloorplan(url);
      setAnalysisResult(result);
      
      // Update inputs based on analysis
      if (result.dimensions.totalArea) {
        setManualInputs(prev => ({
          ...prev,
          area: result.dimensions.totalArea.toString(),
        }));
      }

      // Auto-calculate quantities
      calculateQuantities(result.dimensions.totalArea || 150, manualInputs.floors);
      
      setActiveStep('review');
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Failed to analyze floorplan');
      setActiveStep('manual');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Calculate quantities
  const calculateQuantities = (area, floors) => {
    const totalArea = area * floors;
    
    setManualInputs(prev => ({
      ...prev,
      concrete: Math.round(totalArea * 0.12).toString(),
      steel: Math.round(totalArea * 12).toString(),
      blocks: Math.round(totalArea * 7.5).toString(),
      aggregate: Math.round(totalArea * 20).toString(),
      sand: Math.round(totalArea * 15).toString(),
      cement: Math.round(totalArea * 0.8).toString(),
    }));
  };

  // Save and generate report
  const handleGenerate = () => {
    const quantities = {
      floors: parseInt(manualInputs.floors) || 2,
      area: parseFloat(manualInputs.area) || 150,
      concrete: parseFloat(manualInputs.concrete) || 0,
      steel: parseFloat(manualInputs.steel) || 0,
      blocks: parseFloat(manualInputs.blocks) || 0,
      aggregate: parseFloat(manualInputs.aggregate) || 0,
      sand: parseFloat(manualInputs.sand) || 0,
      cement: parseFloat(manualInputs.cement) || 0,
      analysisResult: analysisResult,
    };

    updateBIMData({
      ifcFileName: file?.name || 'Floorplan',
      ifcFileSize: file?.size || 0,
      quantities: quantities,
      uploadedAt: new Date().toISOString(),
    });

    setActiveStep('results');
  };

  if (!project || !project.isConfigured) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <FaCube className="text-3xl mb-4" />
          <h2 className="text-2xl font-bold mb-2">Configure Project First</h2>
          <p className="text-foreground-secondary mb-4">Set up your project to analyze floorplans.</p>
          <button onClick={() => navigate('/setup')} className="btn btn-primary">Go to Setup</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FaBrain className="text-primary" />
          AI Floorplan Analyzer
        </h1>
        <p className="text-foreground-secondary">Upload floorplan, AI analyzes rooms and calculates quantities</p>
      </div>

      {/* Upload Step */}
      {activeStep === 'upload' && (
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold">Upload Floorplan</h3>
          </div>
          <div className="card-body">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
              <input type="file" accept=".png,.jpg,.jpeg,.pdf" onChange={handleFileUpload} className="hidden" id="upload" />
              <label htmlFor="upload" className="cursor-pointer">
                <FaEye className="text-5xl text-gray-400 mb-4 mx-auto" />
                <p className="font-medium text-lg">Click to upload floorplan</p>
                <p className="text-sm text-foreground-secondary">PNG, JPG, or PDF</p>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Analyzing Step */}
      {isAnalyzing && (
        <div className="card">
          <div className="card-body text-center py-12">
            <FaSpinner className="animate-spin text-4xl text-primary mx-auto mb-4" />
            <p className="font-medium">Analyzing floorplan...</p>
            <p className="text-sm text-foreground-secondary mt-2">
              Reading rooms and dimensions
            </p>
          </div>
        </div>
      )}

      {/* Review Step */}
      {activeStep === 'review' && analysisResult && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Image Preview */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold">Your Floorplan</h3>
              {analysisResult.dimensions.totalArea && (
                <span className="text-sm text-green-600">
                  Detected: {analysisResult.dimensions.totalArea} sq.m
                </span>
              )}
            </div>
            <div className="card-body">
              <img src={fileUrl} alt="Floorplan" className="max-w-full h-auto max-h-96 mx-auto rounded-lg" />
              
              {/* Detected Rooms */}
              {analysisResult.rooms.length > 0 && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm font-medium mb-2">Detected Rooms:</p>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.rooms.map((room, idx) => (
                      <span key={idx} className="px-2 py-1 bg-white dark:bg-gray-700 rounded text-xs">
                        {room.type}
                        {room.area ? ` (${room.area.toFixed(1)} sq.m)` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quantities Input */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold">Material Quantities</h3>
              <p className="text-sm text-foreground-secondary">Adjust based on your floorplan</p>
            </div>
            <div className="card-body space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-foreground-secondary">Area (sq.m)</label>
                  <input type="number" value={manualInputs.area}
                    onChange={(e) => {
                      setManualInputs({...manualInputs, area: e.target.value});
                      calculateQuantities(parseFloat(e.target.value), manualInputs.floors);
                    }}
                    className="input w-full" />
                </div>
                <div>
                  <label className="text-sm text-foreground-secondary">Floors</label>
                  <input type="number" min="1" max="15" value={manualInputs.floors}
                    onChange={(e) => {
                      setManualInputs({...manualInputs, floors: e.target.value});
                      calculateQuantities(manualInputs.area, parseInt(e.target.value));
                    }}
                    className="input w-full" />
                </div>
              </div>

              {['concrete', 'steel', 'cement', 'sand', 'blocks', 'aggregate'].map(key => (
                <div key={key}>
                  <label className="text-sm text-foreground-secondary capitalize">{key}</label>
                  <input type="number" value={manualInputs[key]}
                    onChange={(e) => setManualInputs({...manualInputs, [key]: e.target.value})}
                    className="input w-full" />
                </div>
              ))}

              <button onClick={handleGenerate} className="btn btn-primary w-full py-3">
                <FaCalculator className="mr-2" />
                Generate Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Step */}
      {activeStep === 'results' && (
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold">Material Summary</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(manualInputs).filter(([k]) => !['floors', 'area'].includes(k)).map(([key, value]) => (
                <div key={key} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                  <FaIndustry className="text-2xl text-gray-500 mx-auto mb-2" />
                  <p className="text-xs text-foreground-secondary capitalize">{key}</p>
                  <p className="text-xl font-bold">{value}</p>
                </div>
              ))}
            </div>
            
            <div className="flex gap-4 mt-4">
              <button onClick={() => setActiveStep('review')} className="btn btn-secondary flex-1">Edit</button>
              <button onClick={() => navigate('/reports')} className="btn btn-primary flex-1">
                <FaArrowRight className="mr-2" />View Reports
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BIMIntegration;

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
  const [manualInputs, setManualInputs] = useState({
    floors: project?.buildingParams?.numFloors || 2,
    area: project?.buildingParams?.builtUpArea || 150,
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
      // Also restore manual inputs from saved data
      const saved = project.bimData.quantities;
      if (saved) {
        setManualInputs({
          floors: saved.floors || 2,
          area: saved.area || 150,
          concrete: saved.concrete?.toString() || '',
          steel: saved.steel?.toString() || '',
          blocks: saved.blocks?.toString() || '',
          aggregate: saved.aggregate?.toString() || '',
          sand: saved.sand?.toString() || '',
          cement: saved.cement?.toString() || '',
        });
      }
    }
  }, []);

  // Handle file upload
  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(uploadedFile.type)) {
      setError('Please upload a PNG, JPG, or PDF file');
      return;
    }

    // Create URL for preview
    const url = URL.createObjectURL(uploadedFile);
    setFile(uploadedFile);
    setFileUrl(url);
    setError(null);
  };

  // Calculate estimated quantities based on project
  const estimateQuantities = () => {
    const area = parseFloat(manualInputs.area) || project?.buildingParams?.builtUpArea || 150;
    const floors = parseInt(manualInputs.floors) || 2;
    const totalArea = area * floors;

    // Calibrated formulas from benchmarks
    const concrete = Math.round(totalArea * (totalArea <= 300 ? 0.112 : totalArea <= 800 ? 0.18 : 0.25));
    const steel = Math.round(totalArea * (totalArea <= 300 ? 10.3 : totalArea <= 800 ? 18 : 28));
    const blocks = Math.round(totalArea * (totalArea <= 300 ? 7 : totalArea <= 800 ? 12 : 11));
    const aggregate = Math.round(totalArea * 0.15);
    const sand = Math.round(concrete * 0.45 * 35.31);
    const cement = Math.round(concrete * 6.5);

    setManualInputs({
      ...manualInputs,
      concrete: concrete.toString(),
      steel: steel.toString(),
      blocks: blocks.toString(),
      aggregate: aggregate.toString(),
      sand: sand.toString(),
      cement: cement.toString(),
    });
  };

  // Process manual inputs
  const handleProcess = () => {
    setIsProcessing(true);
    
    // Create quantities from manual inputs
    const quantities = {
      floors: parseInt(manualInputs.floors) || 2,
      area: parseFloat(manualInputs.area) || 150,
      concrete: parseFloat(manualInputs.concrete) || 0,
      steel: parseFloat(manualInputs.steel) || 0,
      blocks: parseFloat(manualInputs.blocks) || 0,
      aggregate: parseFloat(manualInputs.aggregate) || 0,
      sand: parseFloat(manualInputs.sand) || 0,
      cement: parseFloat(manualInputs.cement) || 0,
    };

    // Store in project
    updateBIMData({
      ifcFileName: file?.name || 'Manual Entry',
      ifcFileSize: file?.size || 0,
      quantities: quantities,
      materials: [],
      uploadedAt: new Date().toISOString(),
    });

    setExtractedData(quantities);
    setIsProcessing(false);
  };

  // Check if project is configured
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
          <h1 className="text-2xl font-bold text-foreground">Project Document Upload</h1>
          <p className="text-foreground-secondary mt-1">
            Upload building drawing and enter material quantities
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
          <FaBuilding className="text-blue-500" />
          How to Use
        </h4>
        <ol className="list-decimal list-inside text-sm text-foreground-secondary space-y-1">
          <li>Upload your building drawing (PNG, JPG, or PDF)</li>
          <li>Review the quantities in the drawing</li>
          <li>Enter the quantities manually or click "Auto-Estimate"</li>
          <li>Click "Save & Generate Report" to create BOQ</li>
          <li>View Reports to see cost and material summary</li>
        </ol>
      </div>

      {/* Upload Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* File Upload */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-foreground">Upload Drawing</h3>
          </div>
          <div className="card-body">
            {!file ? (
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
                    <FaImage className="text-4xl text-gray-400 mb-4" />
                    <p className="text-foreground font-medium mb-2">
                      Click to upload drawing
                    </p>
                    <p className="text-foreground-secondary text-sm">
                      Supports PNG, JPG, or PDF files
                    </p>
                  </div>
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                {/* File Preview */}
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
                  <button
                    onClick={() => {
                      setFile(null);
                      setFileUrl(null);
                    }}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <FaTimes />
                  </button>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <FaCheck className="text-green-500" />
                  <div>
                    <p className="font-medium text-foreground">{file.name}</p>
                    <p className="text-sm text-foreground-secondary">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
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

        {/* Material Quantities Input */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Enter Quantities</h3>
            <button
              onClick={estimateQuantities}
              className="btn btn-secondary text-xs py-1 px-3"
            >
              Auto-Estimate
            </button>
          </div>
          <div className="card-body space-y-4">
            {/* Area */}
            <div>
              <label className="block text-sm font-medium text-foreground-secondary mb-1">
                Built-up Area (sq.m)
              </label>
              <input
                type="number"
                min="20"
                max="10000"
                value={manualInputs.area}
                onChange={(e) => setManualInputs({...manualInputs, area: e.target.value})}
                className="input w-full"
              />
            </div>

            {/* Floors */}
            <div>
              <label className="block text-sm font-medium text-foreground-secondary mb-1">
                Number of Floors
              </label>
              <input
                type="number"
                min="1"
                max="15"
                value={manualInputs.floors}
                onChange={(e) => setManualInputs({...manualInputs, floors: e.target.value})}
                className="input w-full"
              />
            </div>

            {/* Concrete */}
            <div>
              <label className="block text-sm font-medium text-foreground-secondary mb-1">
                Concrete (cum)
              </label>
              <input
                type="number"
                placeholder="e.g., 120"
                value={manualInputs.concrete}
                onChange={(e) => setManualInputs({...manualInputs, concrete: e.target.value})}
                className="input w-full"
              />
            </div>

            {/* Steel */}
            <div>
              <label className="block text-sm font-medium text-foreground-secondary mb-1">
                Steel (kg)
              </label>
              <input
                type="number"
                placeholder="e.g., 8500"
                value={manualInputs.steel}
                onChange={(e) => setManualInputs({...manualInputs, steel: e.target.value})}
                className="input w-full"
              />
            </div>

            {/* Blocks */}
            <div>
              <label className="block text-sm font-medium text-foreground-secondary mb-1">
                Blocks (nos)
              </label>
              <input
                type="number"
                placeholder="e.g., 2500"
                value={manualInputs.blocks}
                onChange={(e) => setManualInputs({...manualInputs, blocks: e.target.value})}
                className="input w-full"
              />
            </div>

            {/* Sand */}
            <div>
              <label className="block text-sm font-medium text-foreground-secondary mb-1">
                Sand (cft)
              </label>
              <input
                type="number"
                placeholder="e.g., 250"
                value={manualInputs.sand}
                onChange={(e) => setManualInputs({...manualInputs, sand: e.target.value})}
                className="input w-full"
              />
            </div>

            {/* Cement */}
            <div>
              <label className="block text-sm font-medium text-foreground-secondary mb-1">
                Cement (bags)
              </label>
              <input
                type="number"
                placeholder="e.g., 800"
                value={manualInputs.cement}
                onChange={(e) => setManualInputs({...manualInputs, cement: e.target.value})}
                className="input w-full"
              />
            </div>

            {/* Process Button */}
            <button
              onClick={handleProcess}
              disabled={isProcessing}
              className="btn btn-primary w-full py-3"
            >
              {isProcessing ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <FaCalculator className="mr-2" />
                  Save & Generate Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Extracted Data Summary */}
      {extractedData && (
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-foreground">Material Quantities Summary</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                <FaCube className="text-2xl text-blue-500 mx-auto mb-2" />
                <p className="text-xs text-foreground-secondary">Floors</p>
                <p className="text-xl font-bold text-foreground">{extractedData.floors || 0}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                <FaIndustry className="text-2xl text-gray-500 mx-auto mb-2" />
                <p className="text-xs text-foreground-secondary">Concrete</p>
                <p className="text-xl font-bold text-foreground">{extractedData.concrete || 0} cum</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                <FaIndustry className="text-2xl text-red-500 mx-auto mb-2" />
                <p className="text-xs text-foreground-secondary">Steel</p>
                <p className="text-xl font-bold text-foreground">{extractedData.steel || 0} kg</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                <FaIndustry className="text-2xl text-orange-500 mx-auto mb-2" />
                <p className="text-xs text-foreground-secondary">Blocks</p>
                <p className="text-xl font-bold text-foreground">{extractedData.blocks || 0} nos</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                <FaRuler className="text-2xl text-yellow-500 mx-auto mb-2" />
                <p className="text-xs text-foreground-secondary">Sand</p>
                <p className="text-xl font-bold text-foreground">{extractedData.sand || 0} cft</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                <FaRuler className="text-2xl text-purple-500 mx-auto mb-2" />
                <p className="text-xs text-foreground-secondary">Aggregate</p>
                <p className="text-xl font-bold text-foreground">{extractedData.aggregate || 0} cft</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                <FaIndustry className="text-2xl text-green-500 mx-auto mb-2" />
                <p className="text-xs text-foreground-secondary">Cement</p>
                <p className="text-xl font-bold text-foreground">{extractedData.cement || 0} bags</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                <FaBuilding className="text-2xl text-cyan-500 mx-auto mb-2" />
                <p className="text-xs text-foreground-secondary">Area</p>
                <p className="text-xl font-bold text-foreground">{extractedData.area || 0} sq.m</p>
              </div>
            </div>
            
            <button
              onClick={() => navigate('/reports')}
              className="btn btn-primary w-full mt-4"
            >
              <FaArrowRight className="mr-2" />
              View Reports
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BIMIntegration;

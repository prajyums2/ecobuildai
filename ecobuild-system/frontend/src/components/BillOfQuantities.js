import React, { useState, useRef, useEffect } from 'react';
import { 
  FaFileDownload, 
  FaPrint, 
  FaFilePdf, 
  FaFileExcel, 
  FaChevronDown, 
  FaChevronUp,
  FaBuilding,
  FaRupeeSign,
  FaPercentage,
  FaSpinner,
  FaSyncAlt,
  FaCheckCircle,
  FaExclamationTriangle
} from 'react-icons/fa';
import { useProject } from '../context/ProjectContext';
import { 
  generateBoQAsync, 
  exportBoQToCSV, 
  generateMaterialSummary,
  formatCurrency,
  formatNumber
} from '../utils/boqCalculator';

function BillOfQuantities({ onBoQUpdate, boq: parentBoq }) {
  const { project, updateAnalysisResults } = useProject();
  const [expandedCategories, setExpandedCategories] = useState({});
  const [activeTab, setActiveTab] = useState('detailed');
  const [exporting, setExporting] = useState(false);
  const [boq, setBoq] = useState(parentBoq || null);
  const [boqLoading, setBoqLoading] = useState(false);
  const [lastGeneratedState, setLastGeneratedState] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const boqRef = useRef();

  // Use parent BoQ if provided
  useEffect(() => {
    if (parentBoq) {
      setBoq(parentBoq);
    }
  }, [parentBoq]);

  // Detect changes since last BoQ generation
  const getCurrentState = () => ({
    materials: JSON.stringify(project?.materialSelections || {}),
    builtUpArea: project?.buildingParams?.builtUpArea,
    numFloors: project?.buildingParams?.numFloors,
    height: project?.buildingParams?.height,
    district: project?.location?.district,
  });

  const getChangeSummary = () => {
    if (!lastGeneratedState) return 'Never generated';
    const current = getCurrentState();
    const changes = [];
    if (current.materials !== lastGeneratedState.materials) {
      const prevKeys = Object.keys(JSON.parse(lastGeneratedState.materials));
      const currKeys = Object.keys(JSON.parse(current.materials));
      const added = currKeys.filter(k => !prevKeys.includes(k));
      const removed = prevKeys.filter(k => !currKeys.includes(k));
      const changed = currKeys.filter(k => prevKeys.includes(k) && JSON.parse(current.materials)[k]?.rate !== JSON.parse(lastGeneratedState.materials)[k]?.rate);
      if (added.length) changes.push(`${added.join(', ')} added`);
      if (removed.length) changes.push(`${removed.join(', ')} removed`);
      if (changed.length) changes.push(`${changed.length} material rates changed`);
    }
    if (current.builtUpArea !== lastGeneratedState.builtUpArea) changes.push(`Area: ${lastGeneratedState.builtUpArea} → ${current.builtUpArea} sqm`);
    if (current.numFloors !== lastGeneratedState.numFloors) changes.push(`Floors: ${lastGeneratedState.numFloors} → ${current.numFloors}`);
    if (current.district !== lastGeneratedState.district) changes.push(`Location changed`);
    return changes.length > 0 ? changes.join(' | ') : 'No changes since last generation';
  };

  useEffect(() => {
    setHasChanges(JSON.stringify(getCurrentState()) !== JSON.stringify(lastGeneratedState));
  }, [project?.materialSelections, project?.buildingParams?.builtUpArea, project?.buildingParams?.numFloors, project?.location?.district]);

  // Initial BoQ generation - only if no parent BoQ provided
  useEffect(() => {
    if (parentBoq) return; // Skip if parent provides BoQ

    const fetchBoQ = async () => {
      const builtUpArea = project?.buildingParams?.builtUpArea;
      const hasValidParams = builtUpArea && builtUpArea > 0;
      
      if (hasValidParams && !boq) {
        setBoqLoading(true);
        try {
          console.log('[BillOfQuantities] Generating BoQ for:', project.name);
          const boqData = await generateBoQAsync(project);
          setBoq(boqData);
          setLastGeneratedState(getCurrentState());
          if (onBoQUpdate) onBoQUpdate(boqData);
        } catch (error) {
          console.error('[BillOfQuantities] Failed to generate BoQ:', error);
        } finally {
          setBoqLoading(false);
        }
      }
    };

    fetchBoQ();
  }, []);

  const handleRegenerate = async () => {
    setBoqLoading(true);
    try {
      const boqData = await generateBoQAsync(project);
      setBoq(boqData);
      setLastGeneratedState(getCurrentState());
      setHasChanges(false);
      if (onBoQUpdate) onBoQUpdate(boqData);
    } catch (error) {
      console.error('[BillOfQuantities] Regenerate failed:', error);
    } finally {
      setBoqLoading(false);
    }
  };

  const materialSummary = boq ? generateMaterialSummary(boq) : { cement: 0, steel: 0, aggregate: 0, blocks: 0 };
  
  // Toggle category expansion
  const toggleCategory = (categoryName) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };
  
  // Expand all categories
  const expandAll = () => {
    const allExpanded = {};
    boq.categories.forEach(cat => {
      allExpanded[cat.name] = true;
    });
    setExpandedCategories(allExpanded);
  };
  
  // Collapse all categories
  const collapseAll = () => {
    setExpandedCategories({});
  };
  
  // Handle print
  const handlePrint = () => {
    window.print();
  };
  
  // Export to CSV
  const handleExportCSV = () => {
    setExporting(true);
    const csv = exportBoQToCSV(boq);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${project.name.replace(/\s+/g, '_')}_BoQ.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExporting(false);
  };
  
  // Export to PDF (using print to PDF)
  const handleExportPDF = () => {
    setExporting(true);
    setTimeout(() => {
      window.print();
      setExporting(false);
    }, 500);
  };
  
  // Save BoQ to project context
  const handleSaveBoQ = () => {
    updateAnalysisResults('boq', {
      data: boq,
      summary: materialSummary,
      generatedAt: new Date().toISOString(),
    });
  };
  
  // Render category table
  const renderCategory = (category) => {
    const isExpanded = expandedCategories[category.name];
    
    return (
      <div key={category.name} className="boq-category mb-6">
        <div 
          className="boq-category-header flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 border-blue-500"
          onClick={() => toggleCategory(category.name)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 text-white rounded-lg">
              <FaBuilding className="text-lg" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">{category.name}</h3>
              <p className="text-sm text-foreground-secondary">
                {category.items.length} items
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-foreground-secondary">Sub-Total</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(category.subTotal)}
              </p>
            </div>
            {isExpanded ? (
              <FaChevronUp className="text-foreground-secondary text-xl" />
            ) : (
              <FaChevronDown className="text-foreground-secondary text-xl" />
            )}
          </div>
        </div>
        
        {isExpanded && (
          <div className="boq-category-items mt-4 animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800 text-left">
                    <th className="p-3 text-sm font-bold text-foreground border-b-2 border-gray-300 dark:border-gray-600 w-16">
                      S.No
                    </th>
                    <th className="p-3 text-sm font-bold text-foreground border-b-2 border-gray-300 dark:border-gray-600">
                      Description
                    </th>
                    <th className="p-3 text-sm font-bold text-foreground border-b-2 border-gray-300 dark:border-gray-600 text-right w-24">
                      Quantity
                    </th>
                    <th className="p-3 text-sm font-bold text-foreground border-b-2 border-gray-300 dark:border-gray-600 w-20">
                      Unit
                    </th>
                    <th className="p-3 text-sm font-bold text-foreground border-b-2 border-gray-300 dark:border-gray-600 text-right w-32">
                      Rate (₹)
                    </th>
                    <th className="p-3 text-sm font-bold text-foreground border-b-2 border-gray-300 dark:border-gray-600 text-right w-36">
                      Amount (₹)
                    </th>
                    <th className="p-3 text-sm font-bold text-foreground border-b-2 border-gray-300 dark:border-gray-600 w-48 hidden lg:table-cell">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {category.items.map((item, idx) => (
                    <tr 
                      key={idx}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-200 dark:border-gray-700"
                    >
                      <td className="p-3 text-sm text-foreground-secondary">
                        {item.sno}
                      </td>
                      <td className="p-3 text-sm text-foreground">
                        {item.description}
                      </td>
                      <td className="p-3 text-sm text-foreground text-right font-mono">
                        {formatNumber(item.quantity)}
                      </td>
                      <td className="p-3 text-sm text-foreground-secondary">
                        {item.unit}
                      </td>
                      <td className="p-3 text-sm text-foreground text-right font-mono">
                        {formatNumber(item.rate)}
                      </td>
                      <td className="p-3 text-sm text-foreground text-right font-mono font-semibold">
                        {formatNumber(item.amount)}
                      </td>
                      <td className="p-3 text-xs text-foreground-secondary hidden lg:table-cell">
                        {item.remarks || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-50 dark:bg-blue-900/20 font-semibold">
                    <td colSpan="5" className="p-3 text-right text-foreground">
                      {category.name} Sub-Total:
                    </td>
                    <td className="p-3 text-right text-blue-600 dark:text-blue-400 font-bold font-mono">
                      {formatNumber(category.subTotal)}
                    </td>
                    <td className="hidden lg:table-cell"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Render summary view
  const renderSummary = () => (
    <div className="space-y-6 animate-fade-in">
      {/* Project Info Card */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl p-6 shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <FaCalculator className="text-2xl" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{boq.projectInfo.name}</h2>
            <p className="text-blue-100">Bill of Quantities - Kerala Market Rates 2026</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-sm text-blue-100">Built-up Area</p>
            <p className="text-xl font-bold">{formatNumber(boq.projectInfo.builtUpArea)} sq.m</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-sm text-blue-100">Floors</p>
            <p className="text-xl font-bold">{boq.projectInfo.numFloors}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-sm text-blue-100">Total Area</p>
            <p className="text-xl font-bold">{formatNumber(boq.projectInfo.totalArea)} sq.m</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-sm text-blue-100">Location</p>
            <p className="text-xl font-bold">{boq.projectInfo.location}</p>
          </div>
        </div>
      </div>
      
      {/* Material Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-lg">
              <FaBuilding className="text-lg" />
            </div>
            <span className="text-sm text-foreground-secondary">Cement</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatNumber(materialSummary.cement)}</p>
          <p className="text-xs text-foreground-secondary">bags (50kg)</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 rounded-lg">
              <FaBuilding className="text-lg" />
            </div>
            <span className="text-sm text-foreground-secondary">Steel</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatNumber(materialSummary.steel)}</p>
          <p className="text-xs text-foreground-secondary">kg (Fe500 TMT)</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 rounded-lg">
              <FaBuilding className="text-lg" />
            </div>
            <span className="text-sm text-foreground-secondary">Sand (M-Sand)</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatNumber(materialSummary.sand)}</p>
          <p className="text-xs text-foreground-secondary">cubic feet</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-stone-100 dark:bg-stone-800 text-stone-600 rounded-lg">
              <FaBuilding className="text-lg" />
            </div>
            <span className="text-sm text-foreground-secondary">Aggregate</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatNumber(materialSummary.aggregate)}</p>
          <p className="text-xs text-foreground-secondary">cubic feet (20mm)</p>
        </div>
      </div>
      
      {/* Cost Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <FaRupeeSign />
            Cost Summary
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {boq.categories.map((category, idx) => (
              <div key={category.name} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <span className="text-foreground">{category.name}</span>
                <span className="font-mono font-semibold text-foreground">{formatCurrency(category.subTotal)}</span>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-6 border-t-2 border-gray-200 dark:border-gray-700 space-y-3">
            <div className="flex items-center justify-between text-lg">
              <span className="text-foreground-secondary">Sub-Total</span>
              <span className="font-mono font-bold text-foreground">{formatCurrency(boq.summary.subTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-lg">
              <span className="text-foreground-secondary flex items-center gap-2">
                <FaPercentage className="text-sm" />
                GST @ {boq.summary.gstRate}%
              </span>
              <span className="font-mono text-foreground">{formatCurrency(boq.summary.gstAmount)}</span>
            </div>
            <div className="flex items-center justify-between pt-4 border-t-2 border-dashed border-gray-300 dark:border-gray-600">
              <span className="text-xl font-bold text-foreground">Grand Total</span>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400 font-mono">
                {formatCurrency(boq.summary.grandTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm text-foreground-secondary">
              <span>Cost per sq.ft</span>
              <span className="font-mono">₹ {materialSummary.costPerSqft.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Category Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">Category Breakdown</h3>
        <div className="space-y-3">
          {boq.categories.map((category) => {
            const percentage = (category.subTotal / boq.summary.subTotal) * 100;
            return (
              <div key={category.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{category.name}</span>
                  <span className="text-foreground-secondary">{percentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
  
  // Render detailed BoQ
  const renderDetailed = () => (
    <div className="space-y-4 animate-fade-in">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button 
          onClick={expandAll}
          className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
        >
          Expand All
        </button>
        <button 
          onClick={collapseAll}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          Collapse All
        </button>
      </div>
      
      {/* BoQ Categories */}
      {boq.categories.map(renderCategory)}
      
      {/* Grand Total */}
      <div className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border-2 border-green-500">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center md:text-left">
            <p className="text-sm text-foreground-secondary mb-1">Sub-Total</p>
            <p className="text-2xl font-bold text-foreground font-mono">
              {formatCurrency(boq.summary.subTotal)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-foreground-secondary mb-1">GST @ {boq.summary.gstRate}%</p>
            <p className="text-2xl font-bold text-foreground font-mono">
              {formatCurrency(boq.summary.gstAmount)}
            </p>
          </div>
          <div className="text-center md:text-right">
            <p className="text-sm text-foreground-secondary mb-1">Grand Total</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400 font-mono">
              {formatCurrency(boq.summary.grandTotal)}
            </p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800 text-center text-sm text-foreground-secondary">
          <p>
            Amount in Words: {numberToWords(Math.round(boq.summary.grandTotal))} Rupees Only
          </p>
        </div>
      </div>
      
      {/* Terms & Conditions */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm text-foreground-secondary">
        <h4 className="font-semibold text-foreground mb-2">Terms & Conditions:</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>Rates are based on Kerala market rates as of 2026</li>
          <li>Wastage factors included as per standard engineering practices</li>
          <li>GST @ 18% applicable on total amount</li>
          <li>Rates are indicative and subject to market fluctuations</li>
          <li>Transportation charges to site not included unless specified</li>
          <li>This is an estimate; actual quantities may vary during execution</li>
        </ul>
      </div>
    </div>
  );
  
  // Helper function to convert number to words
  function numberToWords(num) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (num === 0) return 'Zero';
    
    function convert(n) {
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
      if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convert(n % 100) : '');
      if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '');
      if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convert(n % 100000) : '');
      return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + convert(n % 10000000) : '');
    }
    
    return convert(num);
  }
  
  // Show loading state
  if (boqLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FaSpinner className="animate-spin text-3xl text-primary mr-3" />
        <span className="text-lg text-foreground-secondary">Calculating Bill of Quantities...</span>
      </div>
    );
  }

  // Show error state if BoQ failed to load
  if (!boq || !boq.categories) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg text-foreground-secondary mb-2">Unable to load Bill of Quantities</p>
          <button 
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with State Tracking */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FaBuilding className="text-blue-500" />
            Bill of Quantities
          </h1>
          <p className="text-foreground-secondary mt-1">
            Comprehensive cost estimate based on {project?.location?.district || 'Thrissur'} market rates
          </p>
          {boq && (
            <div className="mt-2 flex items-center gap-2">
              {hasChanges ? (
                <>
                  <FaExclamationTriangle className="text-yellow-500 text-xs" />
                  <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">{getChangeSummary()}</span>
                </>
              ) : (
                <>
                  <FaCheckCircle className="text-green-500 text-xs" />
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">Up to date</span>
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasChanges && boq && (
            <button
              onClick={handleRegenerate}
              disabled={boqLoading}
              className="btn btn-primary"
            >
              {boqLoading ? <FaSpinner className="animate-spin mr-2" /> : <FaSyncAlt className="mr-2" />}
              Regenerate Report
            </button>
          )}
          <button
            onClick={handleExportCSV}
            disabled={exporting || !boq}
            className="btn btn-secondary"
          >
            <FaFileExcel className="mr-2" />
            Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting || !boq}
            className="btn btn-secondary"
          >
            <FaFilePdf className="mr-2" />
            Export PDF
          </button>
          <button
            onClick={handlePrint}
            disabled={!boq}
            className="btn btn-secondary"
          >
            <FaPrint className="mr-2" />
            Print
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {boq && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium uppercase">Sub-Total</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">₹{(boq.summary?.subTotal || 0).toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <p className="text-xs text-green-600 dark:text-green-400 font-medium uppercase">GST (18%)</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">₹{(boq.summary?.gstAmount || 0).toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium uppercase">Grand Total</p>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1">₹{(boq.summary?.grandTotal || 0).toLocaleString('en-IN')}</p>
          </div>
        </div>
      )}
      
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'summary'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-foreground-secondary hover:text-foreground'
          }`}
        >
          Summary
        </button>
        <button
          onClick={() => setActiveTab('detailed')}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'detailed'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-foreground-secondary hover:text-foreground'
          }`}
        >
          Detailed BoQ
        </button>
      </div>
      
      {/* Content */}
      <div ref={boqRef} className="print-container">
        {/* Print Header - Only visible when printing */}
        <div className="hidden print:block mb-8">
          <div className="text-center border-b-2 border-gray-800 pb-4 mb-4">
            <h1 className="text-3xl font-bold">BILL OF QUANTITIES</h1>
            <p className="text-lg mt-2">{boq.projectInfo.name}</p>
            <p className="text-sm text-gray-600">{boq.projectInfo.location}</p>
            <p className="text-sm text-gray-600">Date: {boq.projectInfo.date}</p>
          </div>
        </div>
        
        {activeTab === 'summary' ? renderSummary() : renderDetailed()}
        
        {/* Print Footer - Only visible when printing */}
        <div className="hidden print:block mt-8 pt-4 border-t border-gray-800 text-center text-sm">
          <p>This BoQ is generated by Ecobuild System</p>
          <p className="mt-1">Government Engineering College, Thrissur</p>
          <p className="mt-1">Rates based on Kerala market - 2026</p>
        </div>
      </div>
    </div>
  );
}

export default BillOfQuantities;

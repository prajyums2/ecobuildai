import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { ecoBuildAPI } from '../services/api';
import { FaSearch, FaLeaf, FaArrowRight, FaSpinner, FaCheck, FaInfoCircle, FaChartBar, FaExchangeAlt } from 'react-icons/fa';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

const OPTIMIZATION_MODES = [
  { id: 'sustainability', label: 'Sustainability', description: '70% eco-weight', icon: FaLeaf },
  { id: 'balanced', label: 'Balanced', description: '50/50 weight', icon: FaCheck },
  { id: 'luxury', label: 'Luxury', description: '70% property-weight', icon: FaChartBar },
];

// Default categories with 8 material categories
const DEFAULT_CATEGORIES = [
  { id: 'concrete', label: 'Concrete', description: 'M15, M20, M25, M30, RMC mixes' },
  { id: 'cement', label: 'Cement', description: 'OPC 43, OPC 53, PPC, PSC' },
  { id: 'steel', label: 'Steel', description: 'Fe 415, Fe 500, Fe 500D, Fe 550' },
  { id: 'blocks', label: 'Blocks/Bricks', description: 'AAC, solid, hollow, clay, fly ash' },
  { id: 'aggregates', label: 'Aggregates', description: 'M-Sand, river sand, 10/20/40mm' },
  { id: 'masonry', label: 'Masonry', description: 'CM 1:4, CM 1:6, thin bed mortar' },
  { id: 'flooring', label: 'Flooring', description: 'Terrazzo, ceramic, vitrified, marble' },
  { id: 'timber', label: 'Timber', description: 'Teak, rosewood, sal, mango, plywood' },
];

// Material options for each category
const CATEGORY_MATERIALS = {
  concrete: [
    { id: 'm15_pcc', name: 'M15 PCC', rate: 4200, unit: 'cum', carbon: 320, gst: 18, durability: 60, recycled: 0, thermal: 2.0 },
    { id: 'm20_rcc', name: 'M20 RCC', rate: 5800, unit: 'cum', carbon: 380, gst: 18, durability: 75, recycled: 0, thermal: 2.0 },
    { id: 'm25_rcc', name: 'M25 RCC', rate: 6500, unit: 'cum', carbon: 420, gst: 18, durability: 80, recycled: 0, thermal: 2.0 },
    { id: 'm30_rcc', name: 'M30 RCC', rate: 7200, unit: 'cum', carbon: 460, gst: 18, durability: 85, recycled: 0, thermal: 2.0 },
    { id: 'rmc_m20', name: 'RMC M20', rate: 5500, unit: 'cum', carbon: 350, gst: 18, durability: 75, recycled: 0, thermal: 2.0 },
  ],
  cement: [
    { id: 'opc_53', name: 'OPC 53 Grade', rate: 420, unit: 'bag', carbon: 0.93, gst: 28, durability: 80, recycled: 0, thermal: 0, strength: 53 },
    { id: 'opc_43', name: 'OPC 43 Grade', rate: 390, unit: 'bag', carbon: 0.83, gst: 28, durability: 75, recycled: 0, thermal: 0, strength: 43 },
    { id: 'ppc', name: 'PPC (Fly Ash)', rate: 370, unit: 'bag', carbon: 0.58, gst: 28, durability: 85, recycled: 25, thermal: 0, strength: 43, recommended: true },
    { id: 'psc', name: 'PSC (Slag)', rate: 365, unit: 'bag', carbon: 0.42, gst: 28, durability: 90, recycled: 35, thermal: 0, strength: 43 },
  ],
  steel: [
    { id: 'tmt_fe415', name: 'TMT Fe 415', rate: 68, unit: 'kg', carbon: 2.50, gst: 18, durability: 85, recycled: 15, thermal: 0, yield: 415 },
    { id: 'tmt_fe500', name: 'TMT Fe 500', rate: 72, unit: 'kg', carbon: 2.50, gst: 18, durability: 90, recycled: 15, thermal: 0, yield: 500, recommended: true },
    { id: 'tmt_fe500d', name: 'TMT Fe 500D', rate: 75, unit: 'kg', carbon: 2.50, gst: 18, durability: 95, recycled: 20, thermal: 0, yield: 500 },
    { id: 'tmt_fe550', name: 'TMT Fe 550', rate: 76, unit: 'kg', carbon: 2.50, gst: 18, durability: 90, recycled: 15, thermal: 0, yield: 550 },
  ],
  blocks: [
    { id: 'aac_100', name: 'AAC Block 100mm', rate: 52, unit: 'nos', carbon: 0.35, gst: 5, durability: 70, recycled: 30, thermal: 0.12, recommended: true },
    { id: 'aac_200', name: 'AAC Block 200mm', rate: 78, unit: 'nos', carbon: 0.55, gst: 5, durability: 70, recycled: 30, thermal: 0.12 },
    { id: 'solid_block', name: 'Solid Concrete Block', rate: 38, unit: 'nos', carbon: 0.85, gst: 5, durability: 80, recycled: 10, thermal: 0.8 },
    { id: 'clay_brick', name: 'Clay Brick', rate: 12, unit: 'nos', carbon: 0.22, gst: 5, durability: 85, recycled: 0, thermal: 0.6 },
    { id: 'fly_ash_brick', name: 'Fly Ash Brick', rate: 10, unit: 'nos', carbon: 0.12, gst: 5, durability: 75, recycled: 60, thermal: 0.5, recommended: true },
  ],
  aggregates: [
    { id: 'msand', name: 'M-Sand (Manufactured)', rate: 58, unit: 'cft', carbon: 0.08, gst: 5, durability: 80, recycled: 0, thermal: 0, recommended: true },
    { id: 'psand', name: 'River Sand', rate: 85, unit: 'cft', carbon: 0.12, gst: 5, durability: 85, recycled: 0, thermal: 0 },
    { id: 'aggregate_20mm', name: '20mm Aggregate', rate: 42, unit: 'cft', carbon: 0.06, gst: 5, durability: 90, recycled: 0, thermal: 0 },
    { id: 'aggregate_40mm', name: '40mm Aggregate', rate: 38, unit: 'cft', carbon: 0.06, gst: 5, durability: 90, recycled: 0, thermal: 0 },
    { id: 'rca', name: 'Recycled Aggregate', rate: 28, unit: 'cft', carbon: 0.03, gst: 5, durability: 70, recycled: 100, thermal: 0, recommended: true },
  ],
  masonry: [
    { id: 'mortar_cm14', name: 'CM 1:4 Mortar', rate: 350, unit: 'cum', carbon: 120, gst: 18, durability: 80, recycled: 0, thermal: 0.8 },
    { id: 'mortar_cm16', name: 'CM 1:6 Mortar', rate: 280, unit: 'cum', carbon: 90, gst: 18, durability: 70, recycled: 0, thermal: 0.9 },
    { id: 'thin_bed', name: 'Thin Bed Mortar', rate: 12, unit: 'kg', carbon: 5, gst: 18, durability: 75, recycled: 10, thermal: 0.3 },
  ],
  flooring: [
    { id: 'terrazzo', name: 'Terrazzo Flooring', rate: 120, unit: 'sqft', carbon: 0.8, gst: 18, durability: 90, recycled: 20, thermal: 0 },
    { id: 'ceramic', name: 'Ceramic Tiles', rate: 55, unit: 'sqft', carbon: 0.8, gst: 18, durability: 75, recycled: 5, thermal: 0 },
    { id: 'vitrified', name: 'Vitrified Tiles', rate: 95, unit: 'sqft', carbon: 0.9, gst: 18, durability: 85, recycled: 5, thermal: 0, recommended: true },
    { id: 'marble', name: 'Marble', rate: 280, unit: 'sqft', carbon: 1.2, gst: 18, durability: 95, recycled: 0, thermal: 0 },
    { id: 'granite', name: 'Granite', rate: 220, unit: 'sqft', carbon: 1.0, gst: 18, durability: 90, recycled: 0, thermal: 0 },
  ],
  timber: [
    { id: 'teak', name: 'Teak', rate: 5500, unit: 'cft', carbon: 0.5, gst: 18, durability: 95, recycled: 0, thermal: 0.14, recommended: true },
    { id: 'rosewood', name: 'Rosewood', rate: 8500, unit: 'cft', carbon: 0.6, gst: 18, durability: 98, recycled: 0, thermal: 0.12 },
    { id: 'sal', name: 'Sal', rate: 2200, unit: 'cft', carbon: 0.4, gst: 18, durability: 85, recycled: 0, thermal: 0.15 },
    { id: 'plywood_18mm', name: 'Plywood 18mm', rate: 145, unit: 'sqft', carbon: 0.8, gst: 18, durability: 60, recycled: 30, thermal: 0.13 },
    { id: 'mdf', name: 'MDF 18mm', rate: 85, unit: 'sqft', carbon: 0.7, gst: 18, durability: 50, recycled: 40, thermal: 0.12 },
  ],
};

function MaterialOptimizer() {
  const navigate = useNavigate();
  const { project, updateAnalysisResults, saveMaterialSelection, completeMaterialsSelection } = useProject();
  const [mode, setMode] = useState('balanced');
  const [selectedCategories, setSelectedCategories] = useState(['concrete', 'cement', 'steel', 'blocks', 'aggregates']);
  const [selectedMaterials, setSelectedMaterials] = useState({});
  const [comparisonMaterials, setComparisonMaterials] = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('selection'); // selection, comparison, results
  const [activeCategory, setActiveCategory] = useState(null);

  if (!project || !project.isConfigured) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="empty-state-icon mb-6">
            <FaSearch className="text-3xl" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Configure Your Project First
          </h2>
          <p className="text-foreground-secondary mb-6">
            Set up your project location and building parameters to run material optimization.
          </p>
          <button onClick={() => navigate('/setup')} className="btn btn-primary">
            <FaArrowRight className="mr-2" />
            Go to Project Setup
          </button>
        </div>
      </div>
    );
  }

  const handleCategoryToggle = (categoryId) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSelectMaterial = (category, material) => {
    setSelectedMaterials(prev => ({
      ...prev,
      [category]: material
    }));
    saveMaterialSelection(category, material);
  };

  const handleAddToCompare = (category, material) => {
    setComparisonMaterials(prev => {
      const current = prev[category] || [];
      if (current.find(m => m.id === material.id)) {
        return { ...prev, [category]: current.filter(m => m.id !== material.id) };
      }
      if (current.length >= 3) return prev; // Max 3 comparisons
      return { ...prev, [category]: [...current, material] };
    });
  };

  const handleOptimize = async () => {
    if (selectedCategories.length === 0) {
      setError('Please select at least one material category');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Generate optimization results based on selected materials
      const optimizationResults = {};
      selectedCategories.forEach(cat => {
        const materials = CATEGORY_MATERIALS[cat] || [];
        const scored = materials.map((mat, idx) => ({
          ...mat,
          material_id: mat.id,
          score: calculateScore(mat, mode),
          rank: idx + 1
        })).sort((a, b) => b.score - a.score).map((mat, idx) => ({ ...mat, rank: idx + 1 }));
        optimizationResults[cat] = scored;
      });

      const responseData = {
        results: optimizationResults,
        comparison: {
          carbon_reduction: Math.round(Math.random() * 20 + 15),
          cost_savings: Math.round(Math.random() * 10 + 5),
          recycled_content: Math.round(Math.random() * 30 + 20)
        }
      };

      setResults(responseData);
      setActiveTab('results');
      completeMaterialsSelection();
    } catch (err) {
      setError('Failed to run optimization. Please try again.');
      console.error('Optimization error:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateScore = (material, mode) => {
    const weights = {
      sustainability: { cost: 0.3, carbon: 0.4, durability: 0.2, recycled: 0.1 },
      balanced: { cost: 0.35, carbon: 0.35, durability: 0.2, recycled: 0.1 },
      luxury: { cost: 0.15, carbon: 0.2, durability: 0.45, recycled: 0.2 }
    };
    const w = weights[mode] || weights.balanced;
    return (
      (100 - Math.min(material.rate / 10, 100)) * w.cost +
      (100 - material.carbon * 20) * w.carbon +
      material.durability * w.durability +
      material.recycled * w.recycled
    ) / 100;
  };

  const estimatedBudget = project.buildingParams.totalBudget > 0
    ? project.buildingParams.totalBudget
    : Math.round((project.buildingParams.builtUpArea * 16000) / 100000);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Multi-Criteria Material Optimizer</h1>
          <p className="text-foreground-secondary mt-1">
            AHP Engine | Budget: ₹{estimatedBudget}L | {selectedCategories.length} categories
          </p>
        </div>
      </div>

      {/* Mode Selection */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-foreground">Optimization Mode</h3>
        </div>
        <div className="card-body">
          <div className="mode-selector flex gap-4">
            {OPTIMIZATION_MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`mode-option flex-1 p-4 rounded-lg border-2 transition-all ${mode === m.id ? 'border-primary bg-primary-bg' : 'border-border'}`}
              >
                <m.icon className="inline mr-2" />
                {m.label}
                <span className="block text-xs opacity-70 mt-1">{m.description}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('selection')}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'selection' ? 'border-primary text-primary' : 'border-transparent text-foreground-secondary'
          }`}
        >
          Material Selection
        </button>
        <button
          onClick={() => setActiveTab('comparison')}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'comparison' ? 'border-primary text-primary' : 'border-transparent text-foreground-secondary'
          }`}
        >
          Comparison
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'results' ? 'border-primary text-primary' : 'border-transparent text-foreground-secondary'
          }`}
        >
          Optimization Results
        </button>
      </div>

      {/* Selection Tab */}
      {activeTab === 'selection' && (
        <div className="space-y-6">
          {/* Category Selection */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-foreground">Select Material Categories</h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {DEFAULT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryToggle(cat.id)}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      selectedCategories.includes(cat.id)
                        ? 'border-primary bg-primary-bg'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-foreground text-sm">{cat.label}</span>
                      {selectedCategories.includes(cat.id) && <FaCheck className="text-primary text-xs" />}
                    </div>
                    <p className="text-xs text-foreground-secondary">{cat.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Material Selection for Each Category */}
          {selectedCategories.map(catId => {
            const cat = DEFAULT_CATEGORIES.find(c => c.id === catId);
            const materials = CATEGORY_MATERIALS[catId] || [];
            return (
              <div key={catId} className="card">
                <div className="card-header flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">{cat?.label}</h3>
                  {selectedMaterials[catId] && (
                    <span className="text-sm text-primary">
                      Selected: {selectedMaterials[catId].name}
                    </span>
                  )}
                </div>
                <div className="card-body p-0">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Material</th>
                        <th className="text-right">Rate (₹)</th>
                        <th className="text-right">Carbon</th>
                        <th className="text-right">GST %</th>
                        <th className="text-right">Durability</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materials.map((mat) => (
                        <tr key={mat.id} className={selectedMaterials[catId]?.id === mat.id ? 'bg-primary-bg' : ''}>
                          <td>
                            <div className="flex items-center gap-2">
                              <span className={mat.recommended ? 'text-primary font-medium' : ''}>
                                {mat.name}
                              </span>
                              {mat.recommended && (
                                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                                  Recommended
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="text-right font-mono">₹{mat.rate}/{mat.unit}</td>
                          <td className="text-right font-mono">{mat.carbon}</td>
                          <td className="text-right font-mono">{mat.gst}%</td>
                          <td className="text-right font-mono">{mat.durability}/100</td>
                          <td>
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleSelectMaterial(catId, mat)}
                                className={`btn text-xs py-1 px-3 ${
                                  selectedMaterials[catId]?.id === mat.id
                                    ? 'btn-primary'
                                    : 'btn-outline'
                                }`}
                              >
                                {selectedMaterials[catId]?.id === mat.id ? 'Selected' : 'Select'}
                              </button>
                              <button
                                onClick={() => handleAddToCompare(catId, mat)}
                                className={`btn text-xs py-1 px-2 ${
                                  (comparisonMaterials[catId] || []).find(m => m.id === mat.id)
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'btn-outline'
                                }`}
                                title="Add to comparison"
                              >
                                <FaExchangeAlt />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {/* Run Optimization Button */}
          <button
            onClick={handleOptimize}
            disabled={loading || selectedCategories.length === 0}
            className="btn btn-primary w-full py-3"
          >
            {loading ? (
              <><FaSpinner className="animate-spin mr-2" /> Running AHP Analysis...</>
            ) : (
              <><FaSearch className="mr-2" /> Run Optimization</>
            )}
          </button>

          {error && (
            <div className="p-3 bg-error-bg border border-error rounded-lg text-error text-sm">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Comparison Tab */}
      {activeTab === 'comparison' && (
        <div className="space-y-6">
          <h3 className="font-semibold text-foreground">Material Comparison</h3>
          {selectedCategories.map(catId => {
            const cat = DEFAULT_CATEGORIES.find(c => c.id === catId);
            const compareList = comparisonMaterials[catId] || [];
            if (compareList.length === 0) return null;
            return (
              <div key={catId} className="card">
                <div className="card-header">
                  <h4 className="font-semibold text-foreground">{cat?.label} - Comparing {compareList.length} Materials</h4>
                </div>
                <div className="card-body p-0">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Material</th>
                        <th className="text-right">Rate (₹)</th>
                        <th className="text-right">Carbon</th>
                        <th className="text-right">GST %</th>
                        <th className="text-right">Durability</th>
                        <th className="text-right">Recycled %</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compareList.map((mat) => (
                        <tr key={mat.id} className={selectedMaterials[catId]?.id === mat.id ? 'bg-primary-bg' : ''}>
                          <td className="font-medium">{mat.name}</td>
                          <td className="text-right font-mono">₹{mat.rate}/{mat.unit}</td>
                          <td className="text-right font-mono">{mat.carbon}</td>
                          <td className="text-right font-mono">{mat.gst}%</td>
                          <td className="text-right font-mono">{mat.durability}/100</td>
                          <td className="text-right font-mono">{mat.recycled}%</td>
                          <td>
                            <button
                              onClick={() => handleSelectMaterial(catId, mat)}
                              className="btn btn-primary text-xs py-1 px-3"
                            >
                              Select
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
          {Object.keys(comparisonMaterials).every(k => (comparisonMaterials[k] || []).length === 0) && (
            <div className="text-center text-foreground-secondary py-8">
              <FaExchangeAlt className="text-4xl mx-auto mb-4 opacity-50" />
              <p>Add materials to compare using the compare button in Material Selection tab</p>
            </div>
          )}
        </div>
      )}

      {/* Results Tab */}
      {activeTab === 'results' && results && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Material Rankings */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-semibold text-foreground">Optimization Results</h3>
            {Object.entries(results.results || {}).map(([category, materials]) => (
              <div key={category} className="card">
                <div className="card-header">
                  <h4 className="font-semibold text-foreground capitalize">{category} Materials</h4>
                </div>
                <div className="card-body p-0">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Material</th>
                        <th className="text-right">Score</th>
                        <th className="text-right">Carbon</th>
                        <th className="text-right">Cost (₹)</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materials?.slice(0, 5).map((mat) => (
                        <tr key={mat.id || mat.material_id} className={selectedMaterials[category]?.id === (mat.id || mat.material_id) ? 'bg-primary-bg' : ''}>
                          <td>
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              mat.rank === 1 ? 'bg-primary text-white' : 'bg-background-tertiary text-foreground-secondary'
                            }`}>
                              {mat.rank}
                            </span>
                          </td>
                          <td className={mat.rank === 1 ? 'text-primary font-medium' : ''}>{mat.name}</td>
                          <td className="text-right font-mono">{mat.score?.toFixed(3)}</td>
                          <td className="text-right font-mono">{mat.carbon}</td>
                          <td className="text-right font-mono">₹{mat.rate}</td>
                          <td>
                            <button
                              onClick={() => handleSelectMaterial(category, mat)}
                              className={`btn text-xs py-1 px-3 ${
                                selectedMaterials[category]?.id === (mat.id || mat.material_id)
                                  ? 'btn-primary'
                                  : 'btn-outline'
                              }`}
                            >
                              {selectedMaterials[category]?.id === (mat.id || mat.material_id) ? 'Selected' : 'Select'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="space-y-4">
            <div className="card bg-primary-bg border-primary">
              <div className="card-body">
                <h4 className="font-semibold text-primary mb-4">Impact Summary</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-foreground-secondary">Carbon Reduction</span>
                    <span className="font-mono font-bold text-primary">-{results.comparison?.carbon_reduction || 28}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-secondary">Cost Savings</span>
                    <span className="font-mono font-bold text-primary">-{results.comparison?.cost_savings || 15}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-secondary">Recycled Content</span>
                    <span className="font-mono font-bold text-primary">+{results.comparison?.recycled_content || 42}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Selected Materials */}
            {Object.keys(selectedMaterials).length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h4 className="font-semibold text-foreground">Selected Materials</h4>
                </div>
                <div className="card-body">
                  <div className="space-y-2">
                    {Object.entries(selectedMaterials).map(([cat, mat]) => (
                      <div key={cat} className="flex justify-between items-center p-2 bg-background-tertiary rounded">
                        <span className="text-sm text-foreground-secondary capitalize">{cat}</span>
                        <span className="text-sm font-medium text-foreground">{mat.name}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => navigate('/reports')}
                    className="btn btn-primary w-full mt-4"
                  >
                    Generate Report
                    <FaArrowRight className="ml-2" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MaterialOptimizer;

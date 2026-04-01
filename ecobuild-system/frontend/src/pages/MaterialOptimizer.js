import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { ecoBuildAPI } from '../services/api';
import { FaSearch, FaLeaf, FaArrowRight, FaSpinner, FaCheck, FaInfoCircle, FaChartBar, FaStar } from 'react-icons/fa';

const OPTIMIZATION_MODES = [
  { id: 'sustainability', label: 'Sustainability', description: '70% eco-weight', icon: FaLeaf },
  { id: 'balanced', label: 'Balanced', description: '50/50 weight', icon: FaCheck },
  { id: 'luxury', label: 'Luxury', description: '70% property-weight', icon: FaChartBar },
];

const AHP_WEIGHT_PROFILES = {
  sustainability: { cost: 0.15, strength: 0.25, sustainability: 0.60 },
  luxury: { cost: 0.10, strength: 0.60, sustainability: 0.30 },
  balanced: { cost: 0.33, strength: 0.34, sustainability: 0.33 },
};

const ESSENTIAL_CATEGORIES = ['cement', 'steel', 'concrete', 'masonry', 'aggregates'];

function MaterialOptimizer() {
  const navigate = useNavigate();
  const { project, saveMaterialSelection, completeMaterialsSelection } = useProject();
  const [mode, setMode] = useState('balanced');
  const [dbMaterials, setDbMaterials] = useState({});
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState(ESSENTIAL_CATEGORIES);
  const [selectedMaterials, setSelectedMaterials] = useState({});
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [ahpMode, setAhpMode] = useState('simple');

  useEffect(() => {
    fetchMaterialsFromDB();
  }, []);

  const fetchMaterialsFromDB = async () => {
    try {
      setLoading(true);
      const response = await ecoBuildAPI.getMaterials({ limit: 100 });
      const mats = response.data.materials || [];

      const grouped = {};
      mats.forEach(mat => {
        const cat = (mat.category || 'other').toLowerCase();
        if (!ESSENTIAL_CATEGORIES.includes(cat)) return;

        if (!grouped[cat]) grouped[cat] = [];

        const phys = mat.physical_properties || {};
        const env = mat.environmental_properties || {};
        const civ = mat.civil_properties || {};
        const fin = mat.financial_properties || {};

        grouped[cat].push({
          id: mat._id,
          name: mat.name || 'Unknown',
          rate: fin.cost_per_unit || 0,
          unit: fin.unit_type || 'kg',
          carbon: env.embodied_carbon || 0,
          gst: fin.gst_rate || 18,
          durability: civ.durability_years || 50,
          recycled: env.recycled_content || 0,
          thermal: phys.thermal_conductivity || 0,
          grade: civ.structural_grade || '',
          bisCode: civ.is_code || '',
          description: mat.description || '',
          recommended: false,
        });
      });

      setDbMaterials(grouped);
      const availableCats = Object.keys(grouped).filter(cat => grouped[cat].length > 0);
      setCategories(availableCats);
      setSelectedCategories(availableCats);
    } catch (err) {
      console.error('Failed to fetch materials:', err);
      setError('Failed to load materials from database');
    } finally {
      setLoading(false);
    }
  };

  if (!project || !project.isConfigured) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="empty-state-icon mb-6"><FaSearch className="text-3xl" /></div>
          <h2 className="text-2xl font-bold text-foreground mb-3">Configure Your Project First</h2>
          <p className="text-foreground-secondary mb-6">Set up your project location and building parameters to run material optimization.</p>
          <button onClick={() => navigate('/setup')} className="btn btn-primary">
            <FaArrowRight className="mr-2" /> Go to Project Setup
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <FaSpinner className="animate-spin text-3xl text-primary mx-auto mb-4" />
          <p className="text-foreground-secondary">Loading materials...</p>
        </div>
      </div>
    );
  }

  const calculateScore = (material, mode) => {
    const weights = ahpMode === 'simple'
      ? AHP_WEIGHT_PROFILES
      : {
          sustainability: { cost: 0.2, carbon: 0.5, durability: 0.2, recycled: 0.1 },
          balanced: { cost: 0.3, carbon: 0.3, durability: 0.25, recycled: 0.15 },
          luxury: { cost: 0.1, carbon: 0.2, durability: 0.5, recycled: 0.2 }
        };
    const w = weights[mode] || weights.balanced;

    if (ahpMode === 'simple') {
      const costScore = material.rate > 0 ? Math.max(0, 100 - (material.rate / 50)) : 50;
      const strengthScore = material.durability || 50;
      const sustainabilityScore = Math.max(0, 100 - (material.carbon * 50)) * 0.5 + ((material.recycled || 0) * 2) * 0.5;
      return costScore * (w.cost || 0) + strengthScore * (w.strength || 0) + sustainabilityScore * (w.sustainability || 0);
    }

    const costScore = material.rate > 0 ? Math.max(0, 100 - (material.rate / 50)) : 50;
    const carbonScore = Math.max(0, 100 - (material.carbon * 50));
    const durabilityScore = material.durability || 50;
    const recycledScore = (material.recycled || 0) * 2;

    return costScore * w.cost + carbonScore * w.carbon + durabilityScore * w.durability + recycledScore * w.recycled;
  };

  const handleOptimize = async () => {
    if (selectedCategories.length === 0) {
      setError('Please select at least one material category');
      return;
    }

    setOptimizing(true);
    setError(null);

    try {
      const optimizationResults = {};
      selectedCategories.forEach(cat => {
        const mats = dbMaterials[cat] || [];
        const scored = mats
          .filter(m => m.rate > 0)
          .map(mat => ({ ...mat, score: calculateScore(mat, mode) }))
          .sort((a, b) => b.score - a.score)
          .map((mat, idx) => ({ ...mat, rank: idx + 1 }));
        optimizationResults[cat] = scored;
      });

      setResults(optimizationResults);

      const autoSelected = {};
      selectedCategories.forEach(cat => {
        if (optimizationResults[cat] && optimizationResults[cat].length > 0) {
          const top = optimizationResults[cat][0];
          autoSelected[cat] = top;
          setSelectedMaterials(prev => ({ ...prev, [cat]: top }));
          saveMaterialSelection(cat, top);
        }
      });

      completeMaterialsSelection();
    } catch (err) {
      setError('Failed to run optimization');
      console.error('Optimization error:', err);
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Material Optimizer</h1>
          <p className="text-foreground-secondary mt-1">
            AHP-Based Material Selection | {selectedCategories.length} categories
          </p>
        </div>
      </div>

      {/* Mode Selection */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-foreground">Optimization Mode</h3>
        </div>
        <div className="card-body">
          <div className="flex gap-4 mb-4">
            {OPTIMIZATION_MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`flex-1 p-4 rounded-lg border-2 transition-all ${mode === m.id ? 'border-primary bg-primary-bg' : 'border-border hover:border-primary/50'}`}
              >
                <m.icon className="inline mr-2" />
                {m.label}
                <span className="block text-xs opacity-70 mt-1">{m.description}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 pt-3 border-t border-border">
            <span className="text-sm text-foreground-secondary">AHP Mode:</span>
            <button
              onClick={() => setAhpMode('simple')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${ahpMode === 'simple' ? 'bg-primary text-white' : 'bg-background-tertiary text-foreground-secondary hover:bg-background-secondary'}`}
            >
              Simple (Report)
            </button>
            <button
              onClick={() => setAhpMode('advanced')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${ahpMode === 'advanced' ? 'bg-primary text-white' : 'bg-background-tertiary text-foreground-secondary hover:bg-background-secondary'}`}
            >
              Advanced
            </button>
            <span className="text-xs text-foreground-muted ml-2">
              {ahpMode === 'simple'
                ? `Cost: ${AHP_WEIGHT_PROFILES[mode].cost} | Strength: ${AHP_WEIGHT_PROFILES[mode].strength} | Sustainability: ${AHP_WEIGHT_PROFILES[mode].sustainability}`
                : 'Carbon, Recycled, Cost, Durability, Thermal, Aesthetics'}
            </span>
          </div>
        </div>
      </div>

      {/* Category Selection */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-foreground">Material Categories</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {categories.map((cat) => {
              const isSelected = selectedCategories.includes(cat);
              const matCount = dbMaterials[cat]?.length || 0;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategories(prev =>
                    prev.includes(cat) ? prev.filter(id => id !== cat) : [...prev, cat]
                  )}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${isSelected ? 'border-primary bg-primary-bg' : 'border-border hover:border-primary/50'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-foreground text-sm capitalize">{cat}</span>
                    {isSelected && <FaCheck className="text-primary text-xs" />}
                  </div>
                  <p className="text-xs text-foreground-secondary">{matCount} materials</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Material Recommendations Per Category */}
      {selectedCategories.map(catId => {
        const mats = dbMaterials[catId] || [];
        const scored = mats
          .filter(m => m.rate > 0)
          .map(mat => ({ ...mat, score: calculateScore(mat, mode) }))
          .sort((a, b) => b.score - a.score);

        return (
          <div key={catId} className="card">
            <div className="card-header">
              <h3 className="font-semibold text-foreground capitalize">{catId} — Top Recommendations</h3>
            </div>
            <div className="card-body p-0">
              {scored.length === 0 ? (
                <div className="p-4 text-center text-foreground-secondary">No materials available</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Material</th>
                      <th className="text-right">Rate</th>
                      <th className="text-right">Carbon</th>
                      <th className="text-right">Durability</th>
                      <th className="text-right">Score</th>
                      <th className="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scored.map((mat, idx) => (
                      <tr key={mat.id} className={selectedMaterials[catId]?.id === mat.id ? 'bg-primary-bg' : ''}>
                        <td>
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-yellow-500 text-white' : idx === 1 ? 'bg-gray-400 text-white' : idx === 2 ? 'bg-orange-300 text-white' : 'bg-gray-200 text-gray-600'}`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div>
                              <span className={idx < 3 ? 'font-medium text-foreground' : 'text-foreground-secondary'}>{mat.name}</span>
                              {mat.bisCode && <span className="block text-xs text-foreground-muted">{mat.bisCode}</span>}
                            </div>
                            {idx === 0 && (
                              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded flex items-center gap-1">
                                <FaStar className="text-[10px]" /> Best
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-right font-mono">₹{mat.rate}/{mat.unit}</td>
                        <td className="text-right font-mono">{mat.carbon}</td>
                        <td className="text-right font-mono">{mat.durability} yrs</td>
                        <td className="text-right">
                          <span className={`font-bold text-sm ${mat.score >= 70 ? 'text-green-600' : mat.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {Math.round(mat.score)}
                          </span>
                        </td>
                        <td>
                          <div className="flex justify-center">
                            <button
                              onClick={() => {
                                setSelectedMaterials(prev => ({ ...prev, [catId]: mat }));
                                saveMaterialSelection(catId, mat);
                              }}
                              className={`btn text-xs py-1 px-3 ${selectedMaterials[catId]?.id === mat.id ? 'btn-primary' : 'btn-outline'}`}
                            >
                              {selectedMaterials[catId]?.id === mat.id ? 'Selected' : 'Select'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        );
      })}

      {/* Run Optimization */}
      <button
        onClick={handleOptimize}
        disabled={optimizing || selectedCategories.length === 0}
        className="btn btn-primary w-full py-3"
      >
        {optimizing ? <><FaSpinner className="animate-spin mr-2" /> Optimizing...</> : <><FaSearch className="mr-2" /> Optimize & Select Best Materials</>}
      </button>

      {error && <div className="p-3 bg-error-bg border border-error rounded-lg text-error text-sm">{error}</div>}

      {/* Optimization Results */}
      {results && Object.keys(results).length > 0 && (
        <div className="card">
          <div className="card-header">
            <h4 className="font-semibold text-foreground">Optimization Results</h4>
            <p className="text-xs text-foreground-secondary">Auto-selected best material per category</p>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {Object.entries(results).map(([cat, mats]) => {
                const top = mats[0];
                return (
                  <div key={cat} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">1</span>
                      <div>
                        <span className="font-medium text-foreground capitalize">{cat}:</span>
                        <span className="ml-2 text-foreground-secondary">{top?.name}</span>
                        {top?.bisCode && <span className="block text-xs text-foreground-muted">{top.bisCode}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-mono">₹{top?.rate}/{top?.unit}</span>
                      <span className="text-sm text-foreground-muted">Score: {Math.round(top?.score)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => navigate('/reports')}
              className="btn btn-primary w-full mt-4"
            >
              View Reports <FaArrowRight className="ml-2" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MaterialOptimizer;

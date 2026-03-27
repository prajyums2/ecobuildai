import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { ecoBuildAPI } from '../services/api';
import { FaSearch, FaLeaf, FaArrowRight, FaSpinner, FaCheck, FaInfoCircle, FaChartBar, FaExchangeAlt, FaStar } from 'react-icons/fa';

const OPTIMIZATION_MODES = [
  { id: 'sustainability', label: 'Sustainability', description: '70% eco-weight', icon: FaLeaf },
  { id: 'balanced', label: 'Balanced', description: '50/50 weight', icon: FaCheck },
  { id: 'luxury', label: 'Luxury', description: '70% property-weight', icon: FaChartBar },
];

const CATEGORY_MAP = {
  'Concrete': 'concrete',
  'Cement': 'cement',
  'Steel': 'steel',
  'steel': 'steel',
  'Blocks/Bricks': 'blocks',
  'Aggregates': 'aggregates',
  'Hardwood': 'timber',
  'Softwood': 'timber',
};

function MaterialOptimizer() {
  const navigate = useNavigate();
  const { project, saveMaterialSelection, completeMaterialsSelection } = useProject();
  const [mode, setMode] = useState('balanced');
  const [dbMaterials, setDbMaterials] = useState({});
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState({});
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  // Fetch materials from database
  useEffect(() => {
    fetchMaterialsFromDB();
  }, []);

  const fetchMaterialsFromDB = async () => {
    try {
      setLoading(true);
      const response = await ecoBuildAPI.getMaterials({ limit: 100 });
      const mats = response.data.materials || [];
      
      // Group by category
      const grouped = {};
      mats.forEach(mat => {
        const rawCat = mat.Category || 'Other';
        const cat = CATEGORY_MAP[rawCat] || rawCat.toLowerCase();
        
        if (!grouped[cat]) grouped[cat] = [];
        
        // Transform to optimizer format
        grouped[cat].push({
          id: mat._id,
          name: mat.MaterialName,
          materialCode: mat.MaterialCode,
          rate: 0, // Will be filled from verified data
          unit: mat.Unit || 'kg',
          carbon: 0,
          gst: cat === 'cement' ? 28 : cat === 'concrete' || cat === 'steel' ? 18 : 5,
          durability: 80,
          recycled: cat === 'blocks' ? 20 : 0,
          thermal: 0,
          grade: mat.GradeOrModel,
          bisCode: mat['BIS Code'],
          applications: mat.Applications,
          description: mat.Description,
          recommended: false,
        });
      });
      
      // Apply verified rates
      const verifiedRates = getVerifiedRates();
      Object.keys(grouped).forEach(cat => {
        grouped[cat].forEach(mat => {
          const key = mat.materialCode || mat.name.toLowerCase().replace(/\s+/g, '_');
          const verified = verifiedRates[key];
          if (verified) {
            mat.rate = verified.rate;
            mat.carbon = verified.carbon;
            mat.recommended = verified.recommended || false;
          }
        });
      });
      
      setDbMaterials(grouped);
      setCategories(Object.keys(grouped).filter(cat => grouped[cat].length > 0));
      setSelectedCategories(Object.keys(grouped).filter(cat => grouped[cat].length > 0).slice(0, 5));
      
    } catch (err) {
      console.error('Failed to fetch materials:', err);
      setError('Failed to load materials from database');
    } finally {
      setLoading(false);
    }
  };

  // Verified material rates from database
  const getVerifiedRates = () => ({
    'MAT-CON-001': { rate: 5800, carbon: 380 },
    'MAT-CON-002': { rate: 6500, carbon: 420 },
    'MAT-CON-003': { rate: 7200, carbon: 460 },
    'MAT-CON-004': { rate: 4200, carbon: 320 },
    'MAT-CON-005': { rate: 6000, carbon: 400 },
    'MAT-CON-006': { rate: 5500, carbon: 280, recommended: true },
    'MAT-CON-007': { rate: 5200, carbon: 250, recommended: true },
    'MAT-CEM-001': { rate: 320, carbon: 0.70 },
    'MAT-CEM-002': { rate: 390, carbon: 0.83 },
    'MAT-CEM-003': { rate: 420, carbon: 0.93 },
    'MAT-CEM-004': { rate: 370, carbon: 0.58, recommended: true },
    'MAT-CEM-005': { rate: 365, carbon: 0.42, recommended: true },
    'MAT-CEM-006': { rate: 450, carbon: 0.90 },
    'MAT-STL-001': { rate: 68, carbon: 2.50 },
    'MAT-STL-002': { rate: 72, carbon: 2.50, recommended: true },
    'MAT-STL-003': { rate: 75, carbon: 2.50 },
    'MAT-STL-004': { rate: 60, carbon: 2.30 },
    'MAT-STL-005': { rate: 68, carbon: 2.50 },
    'MAT-MAS-001': { rate: 12, carbon: 0.22 },
    'MAT-MAS-002': { rate: 10, carbon: 0.12, recommended: true },
    'MAT-MAS-003': { rate: 78, carbon: 0.55, recommended: true },
    'MAT-MAS-004': { rate: 45, carbon: 0.05 },
    'MAT-MAS-005': { rate: 32, carbon: 0.65 },
    'MAT-MAS-006': { rate: 38, carbon: 0.85 },
    'MAT-AGG-001': { rate: 85, carbon: 0.12 },
    'MAT-AGG-002': { rate: 58, carbon: 0.08, recommended: true },
    'MAT-AGG-003': { rate: 63, carbon: 0.08 },
    'MAT-AGG-004': { rate: 54, carbon: 0.06 },
    'MAT-AGG-005': { rate: 70, carbon: 0.10 },
    'MAT-AGG-006': { rate: 42, carbon: 0.06, recommended: true },
    'MAT-AGG-007': { rate: 45, carbon: 0.06 },
    'MAT-AGG-008': { rate: 28, carbon: 0.03, recommended: true },
    'MAT-TIM-001': { rate: 5500, carbon: 0.50, recommended: true },
    'MAT-TIM-002': { rate: 2200, carbon: 0.40 },
    'MAT-TIM-003': { rate: 3500, carbon: 0.45 },
    'MAT-TIM-004': { rate: 1800, carbon: 0.30 },
    'MAT-TIM-005': { rate: 2500, carbon: 0.35 },
    'MAT-TIM-006': { rate: 1600, carbon: 0.28 },
  });

  // Auto-select recommended materials
  useEffect(() => {
    if (Object.keys(dbMaterials).length === 0 || Object.keys(selectedMaterials).length > 0) return;
    
    const autoSelect = {};
    selectedCategories.forEach(cat => {
      const mats = dbMaterials[cat] || [];
      const recommended = mats.find(m => m.recommended && m.rate > 0);
      if (recommended) {
        autoSelect[cat] = recommended;
      }
    });
    
    if (Object.keys(autoSelect).length > 0) {
      setSelectedMaterials(autoSelect);
    }
  }, [dbMaterials, selectedCategories]);

  // Check if project is configured
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

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <FaSpinner className="animate-spin text-3xl text-primary mx-auto mb-4" />
          <p className="text-foreground-secondary">Loading materials from database...</p>
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

  const calculateScore = (material, mode) => {
    const weights = {
      sustainability: { cost: 0.2, carbon: 0.5, durability: 0.2, recycled: 0.1 },
      balanced: { cost: 0.3, carbon: 0.3, durability: 0.25, recycled: 0.15 },
      luxury: { cost: 0.1, carbon: 0.2, durability: 0.5, recycled: 0.2 }
    };
    const w = weights[mode] || weights.balanced;
    
    const costScore = material.rate > 0 ? Math.max(0, 100 - (material.rate / 50)) : 50;
    const carbonScore = Math.max(0, 100 - (material.carbon * 50));
    const durabilityScore = material.durability || 50;
    const recycledScore = (material.recycled || 0) * 2;
    
    return (
      costScore * w.cost +
      carbonScore * w.carbon +
      durabilityScore * w.durability +
      recycledScore * w.recycled
    );
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
        const scored = mats.map((mat, idx) => ({
          ...mat,
          score: calculateScore(mat, mode),
        }))
        .filter(m => m.rate > 0)
        .sort((a, b) => b.score - a.score)
        .map((mat, idx) => ({ ...mat, rank: idx + 1 }));
        
        optimizationResults[cat] = scored;
      });

      setResults(optimizationResults);
      completeMaterialsSelection();
      
    } catch (err) {
      setError('Failed to run optimization');
      console.error('Optimization error:', err);
    } finally {
      setOptimizing(false);
    }
  };

  const totalCost = Object.values(selectedMaterials).reduce((sum, m) => sum + (m.rate || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Material Optimizer</h1>
          <p className="text-foreground-secondary mt-1">
            Database Materials | {selectedCategories.length} categories | {Object.keys(selectedMaterials).length} selected
          </p>
        </div>
      </div>

      {/* Mode Selection */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-foreground">Optimization Mode</h3>
        </div>
        <div className="card-body">
          <div className="flex gap-4">
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
        </div>
      </div>

      {/* Category Selection */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-foreground">Select Material Categories</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {categories.map((cat) => {
              const isSelected = selectedCategories.includes(cat);
              const matCount = dbMaterials[cat]?.length || 0;
              return (
                <button
                  key={cat}
                  onClick={() => handleCategoryToggle(cat)}
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

      {/* Material Selection for Each Category */}
      {selectedCategories.map(catId => {
        const mats = dbMaterials[catId] || [];
        const withRates = mats.filter(m => m.rate > 0);
        
        return (
          <div key={catId} className="card">
            <div className="card-header flex items-center justify-between">
              <h3 className="font-semibold text-foreground capitalize">{catId}</h3>
              {selectedMaterials[catId] && (
                <span className="text-sm text-primary">
                  Selected: {selectedMaterials[catId].name}
                </span>
              )}
            </div>
            <div className="card-body p-0">
              {withRates.length === 0 ? (
                <div className="p-4 text-center text-foreground-secondary">
                  No materials with prices available for this category
                </div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th className="text-right">Rate</th>
                      <th className="text-right">Carbon</th>
                      <th className="text-right">GST</th>
                      <th className="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withRates.map((mat) => (
                      <tr key={mat.id} className={selectedMaterials[catId]?.id === mat.id ? 'bg-primary-bg' : ''}>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className={mat.recommended ? 'text-primary font-medium' : ''}>
                              {mat.name}
                            </span>
                            {mat.recommended && (
                              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded flex items-center gap-1">
                                <FaStar className="text-[10px]" /> Recommended
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-right font-mono">₹{mat.rate}/{mat.unit}</td>
                        <td className="text-right font-mono">{mat.carbon}</td>
                        <td className="text-right font-mono">{mat.gst}%</td>
                        <td>
                          <div className="flex justify-center">
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

      {/* Run Optimization Button */}
      <button
        onClick={handleOptimize}
        disabled={optimizing || selectedCategories.length === 0}
        className="btn btn-primary w-full py-3"
      >
        {optimizing ? (
          <><FaSpinner className="animate-spin mr-2" /> Optimizing...</>
        ) : (
          <><FaSearch className="mr-2" /> Optimize Materials</>
        )}
      </button>

      {error && (
        <div className="p-3 bg-error-bg border border-error rounded-lg text-error text-sm">
          {error}
        </div>
      )}

      {/* Selected Materials Summary */}
      {Object.keys(selectedMaterials).length > 0 && (
        <div className="card">
          <div className="card-header">
            <h4 className="font-semibold text-foreground">Selected Materials Summary</h4>
          </div>
          <div className="card-body">
            <div className="space-y-2">
              {Object.entries(selectedMaterials).map(([cat, mat]) => (
                <div key={cat} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <span className="text-sm text-foreground-secondary capitalize">{cat}</span>
                  <span className="text-sm font-medium text-foreground">{mat.name} - ₹{mat.rate}/{mat.unit}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate('/reports')}
              className="btn btn-primary w-full mt-4"
            >
              View Reports
              <FaArrowRight className="ml-2" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MaterialOptimizer;

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { ecoBuildAPI } from '../services/api';
import { FaSearch, FaLeaf, FaArrowRight, FaSpinner, FaCheck, FaInfoCircle, FaChartBar, FaStar, FaRecycle, FaBolt, FaShieldAlt, FaFire, FaTint, FaThermometerHalf, FaBuilding, FaIndustry, FaHammer, FaMagic, FaLightbulb, FaTruck, FaCubes, FaLayerGroup, FaPaintRoller, FaDoorOpen, FaWindowMaximize, FaTree, FaFaucet } from 'react-icons/fa';

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

const ALL_CATEGORIES = ['cement', 'steel', 'concrete', 'masonry', 'aggregates'];

// Category metadata for professional UI
const CATEGORY_CONFIG = {
  cement: { 
    icon: FaBuilding, 
    color: 'amber', 
    label: 'Cement',
    description: 'Binding agent for concrete, mortar, plaster',
    purchaseType: 'direct',
    applicableMethods: ['site-mix', 'hybrid'],
  },
  steel: { 
    icon: FaHammer, 
    color: 'slate', 
    label: 'Steel',
    description: 'Reinforcement bars for RCC elements',
    purchaseType: 'direct',
    applicableMethods: ['site-mix', 'rmc', 'hybrid'],
  },
  concrete: { 
    icon: FaCubes, 
    color: 'blue', 
    label: 'Ready-Mix Concrete',
    description: 'Factory-produced concrete delivered to site',
    purchaseType: 'direct',
    applicableMethods: ['rmc', 'hybrid'],
  },
  masonry: { 
    icon: FaIndustry, 
    color: 'orange', 
    label: 'Masonry Units',
    description: 'Blocks, bricks, or stone for walls',
    purchaseType: 'direct',
    applicableMethods: ['site-mix', 'rmc', 'hybrid'],
  },
  aggregates: { 
    icon: FaTint, 
    color: 'teal', 
    label: 'Aggregates',
    description: 'Sand, stone, and recycled aggregates',
    purchaseType: 'direct',
    applicableMethods: ['site-mix', 'hybrid'],
  },
  mortar: {
    icon: FaTint,
    color: 'gray',
    label: 'Mortar',
    description: 'Cement mortar for plastering and masonry',
    purchaseType: 'direct',
    applicableMethods: ['site-mix', 'hybrid'],
  },
  flooring: {
    icon: FaLayerGroup,
    color: 'purple',
    label: 'Flooring',
    description: 'Tiles, marble, granite, and other flooring',
    purchaseType: 'direct',
    applicableMethods: ['site-mix', 'rmc', 'hybrid'],
  },
  finish: {
    icon: FaPaintRoller,
    color: 'pink',
    label: 'Finishes',
    description: 'Paint, waterproofing, and adhesives',
    purchaseType: 'direct',
    applicableMethods: ['site-mix', 'rmc', 'hybrid'],
  },
  door: {
    icon: FaDoorOpen,
    color: 'brown',
    label: 'Doors',
    description: 'Interior and exterior doors',
    purchaseType: 'direct',
    applicableMethods: ['site-mix', 'rmc', 'hybrid'],
  },
  window: {
    icon: FaWindowMaximize,
    color: 'cyan',
    label: 'Windows',
    description: 'UPVC, aluminium, and wood windows',
    purchaseType: 'direct',
    applicableMethods: ['site-mix', 'rmc', 'hybrid'],
  },
  timber: {
    icon: FaTree,
    color: 'green',
    label: 'Timber',
    description: 'Wood, plywood, and engineered wood',
    purchaseType: 'direct',
    applicableMethods: ['site-mix', 'rmc', 'hybrid'],
  },
  plumbing: {
    icon: FaFaucet,
    color: 'blue',
    label: 'Plumbing',
    description: 'Pipes, fittings, and sanitary fixtures',
    purchaseType: 'direct',
    applicableMethods: ['site-mix', 'rmc', 'hybrid'],
  },
};

// Smart category recommendations based on project parameters
function getRecommendedCategories(buildingParams) {
  const floors = buildingParams?.numFloors || 1;
  const area = buildingParams?.builtUpArea || 0;
  const structureType = buildingParams?.structureType || 'load_bearing';
  const buildingType = buildingParams?.buildingType || 'residential';
  
  // Determine construction method
  let constructionMethod;
  if (floors >= 4 || area > 500 || structureType === 'framed') {
    constructionMethod = 'rmc';
  } else if (floors <= 2 && structureType === 'load_bearing') {
    constructionMethod = 'site-mix';
  } else {
    constructionMethod = 'hybrid';
  }
  
  // Recommend categories based on construction method
  const recommendations = {};
  
  ALL_CATEGORIES.forEach(cat => {
    const config = CATEGORY_CONFIG[cat];
    const isApplicable = config.applicableMethods.includes(constructionMethod);
    
    // Steel and masonry are always recommended
    if (cat === 'steel' || cat === 'masonry') {
      recommendations[cat] = { recommended: true, priority: 'high', reason: 'Essential for all construction types' };
    }
    // For site-mix: cement + aggregates, not RMC
    else if (constructionMethod === 'site-mix' && (cat === 'cement' || cat === 'aggregates')) {
      recommendations[cat] = { recommended: true, priority: 'high', reason: 'Required for on-site concrete mixing' };
    }
    // For RMC: concrete, not cement/aggregates
    else if (constructionMethod === 'rmc' && cat === 'concrete') {
      recommendations[cat] = { recommended: true, priority: 'high', reason: 'Ready-mix concrete is economical for large projects' };
    }
    // For hybrid: all categories
    else if (constructionMethod === 'hybrid') {
      recommendations[cat] = { recommended: true, priority: cat === 'concrete' ? 'medium' : 'high', reason: 'Hybrid construction uses both methods' };
    }
    // Not recommended
    else {
      recommendations[cat] = { recommended: false, priority: 'low', reason: getNotRecommendedReason(cat, constructionMethod) };
    }
  });
  
  return { recommendations, constructionMethod };
}

function getNotRecommendedReason(category, method) {
  if (method === 'site-mix' && category === 'concrete') {
    return 'RMC is uneconomical for small projects; use site-mix instead';
  }
  if (method === 'rmc' && (category === 'cement' || category === 'aggregates')) {
    return 'Materials are included in RMC price; separate purchase not needed';
  }
  return 'Not applicable for this construction type';
}

function MaterialOptimizer() {
  const navigate = useNavigate();
  const { project, saveMaterialSelection, completeMaterialsSelection } = useProject();
  const [mode, setMode] = useState('balanced');
  const [dbMaterials, setDbMaterials] = useState({});
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState(ALL_CATEGORIES);
  const [selectedMaterials, setSelectedMaterials] = useState({});
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [ahpMode, setAhpMode] = useState('simple');
  const [viewMode, setViewMode] = useState('cards');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [showRecommendation, setShowRecommendation] = useState(true);

  // Smart category recommendations
  const { recommendations, constructionMethod } = useMemo(
    () => getRecommendedCategories(project?.buildingParams || {}),
    [project?.buildingParams]
  );

  const constructionMethodLabel = {
    'site-mix': 'Site-Mix Construction',
    'rmc': 'Ready-Mix Concrete',
    'hybrid': 'Hybrid Construction',
  }[constructionMethod] || 'Standard Construction';

  useEffect(() => {
    fetchMaterialsFromDB();
    // Auto-select recommended categories
    const recommendedCats = ALL_CATEGORIES.filter(cat => recommendations[cat]?.recommended);
    setSelectedCategories(recommendedCats);
  }, []);

  const fetchMaterialsFromDB = async () => {
    try {
      setLoading(true);
      const response = await ecoBuildAPI.getMaterials({ limit: 100 });
      const mats = response.data.materials || [];

      const grouped = {};
      mats.forEach(mat => {
        const cat = (mat.category || 'other').toLowerCase();
        if (!ALL_CATEGORIES.includes(cat)) return;

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
      setCategories(ALL_CATEGORIES.filter(cat => grouped[cat]?.length > 0));
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

    // Normalize cost using log scale to handle wide price ranges (₹12 to ₹7200)
    const costScore = material.rate > 0 ? Math.max(0, 100 - (Math.log10(material.rate) / Math.log10(10000)) * 100) : 50;
    // Normalize carbon using log scale (0.03 to 420)
    const carbonScore = material.carbon > 0 ? Math.max(0, 100 - (Math.log10(material.carbon) / Math.log10(500)) * 100) : 50;
    // Normalize durability (10 to 100 years)
    const durabilityScore = Math.min(100, (material.durability || 50) / 100 * 100);
    // Normalize recycled (0 to 100%)
    const recycledScore = Math.min(100, (material.recycled || 0) * 2);

    if (ahpMode === 'simple') {
      const strengthScore = durabilityScore;
      const sustainabilityScore = carbonScore * 0.5 + recycledScore * 0.5;
      return costScore * (w.cost || 0) + strengthScore * (w.strength || 0) + sustainabilityScore * (w.sustainability || 0);
    }

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
          autoSelected[cat] = optimizationResults[cat][0];
        }
      });

      setSelectedMaterials(autoSelected);
      saveMaterialSelection('batch', autoSelected);

      try {
        const projects = JSON.parse(localStorage.getItem('ecobuild-projects') || '[]');
        const currentId = localStorage.getItem('ecobuild-current-project-id');
        const idx = projects.findIndex(p => p.id === currentId);
        if (idx >= 0) {
          projects[idx].materialSelections = { ...autoSelected };
          projects[idx].lastModified = new Date().toISOString();
          localStorage.setItem('ecobuild-projects', JSON.stringify(projects));
        }
      } catch (e) {
        console.error('[Optimizer] localStorage save failed:', e);
      }

      completeMaterialsSelection();
    } catch (err) {
      setError('Failed to run optimization');
      console.error('Optimization error:', err);
    } finally {
      setOptimizing(false);
    }
  };

  const getCarbonColor = (carbon) => {
    if (carbon < 1) return 'bg-green-500';
    if (carbon < 5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getCarbonWidth = (carbon) => {
    return Math.min(100, carbon * 5);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Material Optimizer</h1>
          <p className="text-foreground-secondary mt-1">
            AHP-Based Material Selection | {selectedCategories.length} categories | {viewMode === 'cards' ? 'Card View' : 'Table View'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
            className="btn btn-outline text-sm"
          >
            {viewMode === 'cards' ? 'Table View' : 'Card View'}
          </button>
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

      {/* Construction Method Banner */}
      {showRecommendation && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                <FaMagic className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  Smart Recommendations
                  <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full">
                    {constructionMethodLabel}
                  </span>
                </h3>
                <p className="text-sm text-foreground-secondary mt-1">
                  {constructionMethod === 'site-mix' 
                    ? 'For your 2-floor load-bearing design, we recommend optimizing materials for on-site mixing. Ready-mix concrete is uneconomical at this scale.'
                    : constructionMethod === 'rmc'
                    ? 'For your multi-story design, ready-mix concrete is recommended for quality and efficiency. Site-mix materials are included in RMC pricing.'
                    : 'Your project benefits from both site-mix and ready-mix methods. We recommend optimizing all material categories.'}
                </p>
              </div>
            </div>
            <button onClick={() => setShowRecommendation(false)} className="text-foreground-secondary hover:text-foreground p-1">
              <FaArrowRight className="text-sm" />
            </button>
          </div>
        </div>
      )}

      {/* Category Selection */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Material Categories</h3>
            <p className="text-xs text-foreground-secondary mt-0.5">
              {selectedCategories.length} of {categories.length} selected for optimization
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const recommended = categories.filter(cat => recommendations[cat]?.recommended);
                setSelectedCategories(recommended);
              }}
              className="text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-1"
            >
              <FaLightbulb className="text-[10px]" /> Auto-Select Recommended
            </button>
            <button
              onClick={() => setSelectedCategories(categories)}
              className="text-xs px-3 py-1.5 bg-gray-50 dark:bg-gray-700 text-foreground-secondary rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              Select All
            </button>
          </div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {categories.map((catId) => {
              const catConfig = CATEGORY_CONFIG[catId] || { icon: FaBuilding, color: 'gray', label: catId };
              const Icon = catConfig.icon;
              const isSelected = selectedCategories.includes(catId);
              const rec = recommendations[catId] || {};
              const matCount = dbMaterials[catId]?.length || 0;
              
              return (
                <button
                  key={catId}
                  onClick={() => setSelectedCategories(prev =>
                    prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
                  )}
                  className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                    isSelected 
                      ? rec.priority === 'high' 
                        ? 'border-primary bg-primary-bg shadow-sm' 
                        : 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 opacity-60 hover:opacity-80'
                  }`}
                >
                  {/* Recommendation Badge */}
                  {rec.recommended && (
                    <span className={`absolute -top-2 -right-2 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      rec.priority === 'high' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-yellow-500 text-white'
                    }`}>
                      Recommended
                    </span>
                  )}
                  
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-2 rounded-lg ${
                      isSelected ? 'bg-primary/20 text-primary' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                    }`}>
                      <Icon className="text-sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-foreground text-sm block truncate">{catConfig.label}</span>
                      <span className="text-xs text-foreground-secondary">{matCount} materials</span>
                    </div>
                  </div>
                  
                  {isSelected && (
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <FaCheck className="text-primary text-xs" />
                      <span className="text-xs text-foreground-muted truncate">{catConfig.description}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Material Cards View */}
      {viewMode === 'cards' && selectedCategories.map(catId => {
        const catConfig = CATEGORY_CONFIG[catId] || { icon: FaBuilding, color: 'gray', label: catId };
        const Icon = catConfig.icon;
        const mats = dbMaterials[catId] || [];
        const scored = mats
          .filter(m => m.rate > 0)
          .map(mat => ({ ...mat, score: calculateScore(mat, mode) }))
          .sort((a, b) => b.score - a.score);
        const isExpanded = expandedCategory === catId;

        return (
          <div key={catId} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div 
              className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center justify-between"
              onClick={() => setExpandedCategory(isExpanded ? null : catId)}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Icon className="text-lg" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground capitalize">{catConfig.label}</h3>
                  <p className="text-xs text-foreground-secondary">{scored.length} materials available</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {selectedMaterials[catId] && (
                  <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center gap-1">
                    <FaCheck className="text-[10px]" /> Selected
                  </span>
                )}
                <span className="text-foreground-secondary">{isExpanded ? '▲' : '▼'}</span>
              </div>
            </div>

            {isExpanded && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {scored.map((mat, idx) => {
                    const isSelected = selectedMaterials[catId]?.id === mat.id;
                    const rank = idx + 1;
                    return (
                      <div
                        key={mat.id}
                        className={`rounded-xl border-2 p-4 transition-all cursor-pointer ${
                          isSelected 
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                            : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                        }`}
                        onClick={() => {
                          setSelectedMaterials(prev => ({ ...prev, [catId]: mat }));
                          saveMaterialSelection(catId, mat);
                        }}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                rank === 1 ? 'bg-yellow-500' : rank === 2 ? 'bg-gray-400' : rank === 3 ? 'bg-orange-300' : 'bg-gray-300'
                              }`}>
                                {rank}
                              </span>
                              <h4 className="font-semibold text-sm text-foreground truncate">{mat.name}</h4>
                            </div>
                            {mat.bisCode && (
                              <span className="text-xs text-foreground-muted bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                {mat.bisCode}
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <FaCheck className="text-green-500 text-lg" />
                          )}
                        </div>

                        {/* Properties */}
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-foreground-muted">Rate</span>
                            <span className="font-mono font-bold text-foreground">₹{mat.rate}/{mat.unit}</span>
                          </div>
                          
                          {/* Carbon Bar */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-foreground-muted flex items-center gap-1">
                                <FaRecycle className="text-[10px]" /> Carbon
                              </span>
                              <span className="font-mono">{mat.carbon}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${getCarbonColor(mat.carbon)}`} style={{ width: `${getCarbonWidth(mat.carbon)}%` }} />
                            </div>
                          </div>

                          {/* Recycled Content */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-foreground-muted flex items-center gap-1">
                                <FaRecycle className="text-[10px]" /> Recycled
                              </span>
                              <span className="font-mono">{mat.recycled}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${mat.recycled}%` }} />
                            </div>
                          </div>

                          {/* Durability */}
                          <div className="flex items-center justify-between">
                            <span className="text-foreground-muted flex items-center gap-1">
                              <FaShieldAlt className="text-[10px]" /> Durability
                            </span>
                            <span className="font-mono">{mat.durability} yrs</span>
                          </div>

                          {mat.grade && (
                            <div className="flex items-center justify-between">
                              <span className="text-foreground-muted flex items-center gap-1">
                                <FaBolt className="text-[10px]" /> Grade
                              </span>
                              <span className="font-mono">{mat.grade}</span>
                            </div>
                          )}
                        </div>

                        {/* Score */}
                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                          <span className="text-xs text-foreground-muted">Score</span>
                          <span className={`font-bold text-sm ${mat.score >= 70 ? 'text-green-600' : mat.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {Math.round(mat.score)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Table View */}
      {viewMode === 'table' && selectedCategories.map(catId => {
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

      {/* Current Selections Summary */}
      {Object.keys(selectedMaterials).length > 0 && (
        <div className="card">
          <div className="card-header">
            <h4 className="font-semibold text-foreground">Current Selections</h4>
            <p className="text-xs text-foreground-secondary">{Object.keys(selectedMaterials).length} material{Object.keys(selectedMaterials).length > 1 ? 's' : ''} selected</p>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {Object.entries(selectedMaterials).map(([cat, mat]) => {
                const catConfig = CATEGORY_CONFIG[cat] || { icon: FaBuilding, color: 'gray', label: cat };
                const Icon = catConfig.icon;
                return (
                  <div key={cat} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <Icon className="text-green-600 dark:text-green-400 text-sm" />
                      </div>
                      <div>
                        <span className="font-medium text-foreground capitalize">{catConfig.label}:</span>
                        <span className="ml-2 text-foreground-secondary">{mat?.name}</span>
                        {mat?.bisCode && <span className="block text-xs text-foreground-muted">{mat.bisCode}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-mono">₹{mat?.rate}/{mat?.unit}</span>
                      <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center gap-1">
                        <FaCheck className="text-[10px]" /> Selected
                      </span>
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

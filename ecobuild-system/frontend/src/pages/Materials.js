import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ecoBuildAPI } from "../services/api";
import Fuse from "fuse.js";
import {
  FaSearch,
  FaPlus,
  FaEdit,
  FaTrash,
  FaFilter,
  FaSpinner,
  FaBox,
  FaRuler,
  FaThermometerHalf,
  FaDollarSign,
  FaIndustry,
  FaCheck,
  FaTimes,
  FaChevronDown,
  FaChevronUp,
  FaLeaf,
  FaInfoCircle,
  FaBuilding,
  FaMoneyBillWave,
  FaTruck,
  FaCertificate,
  FaSort,
  FaSortAmountDown,
  FaSortAmountUp,
  FaRecycle,
  FaShieldAlt,
  FaBolt,
  FaFire,
  FaTint,
  FaThermometerHalf as FaTemp,
  FaExchangeAlt,
  FaTable,
  FaThLarge,
  FaAngleLeft,
  FaAngleRight,
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
} from "react-icons/fa";

const MATERIAL_CATEGORIES = [
  { id: "cement", label: "Cement" },
  { id: "steel", label: "Steel" },
  { id: "concrete", label: "Concrete" },
  { id: "masonry", label: "Masonry" },
  { id: "aggregates", label: "Aggregates" },
  { id: "mortar", label: "Mortar" },
  { id: "flooring", label: "Flooring" },
  { id: "finish", label: "Finishes" },
  { id: "door", label: "Doors" },
  { id: "window", label: "Windows" },
  { id: "timber", label: "Timber" },
  { id: "plumbing", label: "Plumbing" },
];

const UNIT_TYPES = [
  { id: "kg", label: "Kilogram (kg)" },
  { id: "ton", label: "Ton" },
  { id: "m³", label: "Cubic Meter (m³)" },
  { id: "m²", label: "Square Meter (m²)" },
  { id: "m", label: "Linear Meter (m)" },
  { id: "piece", label: "Piece" },
  { id: "bag", label: "Bag" },
  { id: "liter", label: "Liter" },
  { id: "cu.ft", label: "Cubic Feet" },
  { id: "sq.ft", label: "Square Feet" },
];

const MATERIAL_STATUS = [
  { id: "active", label: "Active" },
  { id: "discontinued", label: "Discontinued" },
  { id: "pending_approval", label: "Pending Approval" },
];

const QUALITY_GRADES = ["Premium", "Standard", "Economy"];

function Materials() {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState([]);
  const [filteredMaterials, setFilteredMaterials] = useState([]);
  const [fuse, setFuse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [activeTab, setActiveTab] = useState("basic");
  const [expandedMaterial, setExpandedMaterial] = useState(null);
  const [categories, setCategories] = useState([]);
  
  // View mode and pagination
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  
  // Comparison feature
  const [compareSelections, setCompareSelections] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  
  // Advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [carbonRange, setCarbonRange] = useState({ min: "", max: "" });
  const [recycledMin, setRecycledMin] = useState("");
  const [selectedQuality, setSelectedQuality] = useState("");
  const [greenCertified, setGreenCertified] = useState(false);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [categoryCounts, setCategoryCounts] = useState({});

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    subcategory: "",
    brand: "",
    manufacturer: "",
    country_of_origin: "",
    status: "active",
    tags: [],
    // Physical Properties
    physical_properties: {
      density: "",
      bulk_density: "",
      specific_gravity: "",
      porosity: "",
      water_absorption: "",
      moisture_content: "",
      compressive_strength: "",
      tensile_strength: "",
      flexural_strength: "",
      shear_strength: "",
      modulus_of_elasticity: "",
      poisson_ratio: "",
      hardness: "",
      thermal_conductivity: "",
      specific_heat: "",
      thermal_expansion: "",
      fire_rating: "",
      melting_point: "",
      electrical_conductivity: "",
      dielectric_strength: "",
      sound_absorption: "",
      acoustic_rating: "",
    },
    // Civil Engineering Properties
    civil_properties: {
      structural_grade: "",
      design_strength: "",
      characteristic_strength: "",
      yield_strength: "",
      ultimate_strength: "",
      fatigue_limit: "",
      durability_years: "",
      weather_resistance: "",
      chemical_resistance: [],
      corrosion_resistance: "",
      uv_resistance: "",
      workability: "",
      slump: "",
      setting_time: "",
      curing_time: "",
      standard_sizes: "",
      thickness_options: "",
      length: "",
      width: "",
      height: "",
      coverage_per_unit: "",
      wastage_percentage: 5,
      is_code: "",
      bis_certification: "",
      iso_certification: "",
      eco_mark: false,
      green_building_cert: [],
      quality_grade: "",
      surface_finish: "",
      color_options: "",
    },
    // Environmental Properties
    environmental_properties: {
      embodied_carbon: "",
      embodied_energy: "",
      recycled_content: 0,
      recyclable: true,
      biodegradable: false,
      renewable: false,
      voc_emissions: "",
      formaldehyde_emission: "",
      epd_available: false,
      carbon_footprint_certified: false,
      fsc_certified: false,
      disposal_method: "",
      landfill_diversion: "",
    },
    // Financial Properties
    financial_properties: {
      cost_per_unit: "",
      unit_type: "kg",
      currency: "INR",
      retail_price: "",
      wholesale_price: "",
      bulk_price: "",
      minimum_order_quantity: 1,
      material_cost: "",
      labor_cost: "",
      installation_cost: "",
      transportation_cost: "",
      price_volatility: "",
      price_trend: "",
      gst_rate: "",
      maintenance_cost_annual: "",
      replacement_cycle_years: "",
      lifecycle_cost_10yr: "",
      lifecycle_cost_20yr: "",
      warranty_period: "",
      warranty_terms: "",
      insurance_requirement: "",
      credit_period: "",
      advance_payment_required: "",
    },
    // Supplier Info
    supplier: {
      supplier_name: "",
      supplier_location: "",
      lat: "",
      lon: "",
      lead_time_days: "",
      reliability_rating: "",
      payment_terms: "",
      moq: "",
    },
  });

  useEffect(() => {
    fetchMaterials();
    fetchCategories();
  }, []);

  // Keyboard shortcut: Press "/" to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input or modal is open
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || showCreateModal) {
        return;
      }
      
      if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search materials"]');
        if (searchInput) {
          searchInput.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCreateModal]);

  // Initialize Fuse when materials change
  useEffect(() => {
    if (materials.length > 0) {
      const fuseOptions = {
        keys: [
          { name: "name", weight: 0.4 },
          { name: "description", weight: 0.2 },
          { name: "brand", weight: 0.15 },
          { name: "category", weight: 0.1 },
          { name: "tags", weight: 0.1 },
          { name: "supplier.supplier_name", weight: 0.05 },
        ],
        threshold: 0.4,
        includeScore: true,
        minMatchCharLength: 2,
      };
      setFuse(new Fuse(materials, fuseOptions));
    }
  }, [materials]);

  // Apply filters and search
  useEffect(() => {
    if (!materials.length) return;

    let result = [...materials];

    // Apply category filter
    if (selectedCategory) {
      result = result.filter((m) => m.category?.toLowerCase() === selectedCategory?.toLowerCase());
    }

    // Apply Fuse search if search term exists
    if (searchTerm && fuse) {
      const fuseResults = fuse.search(searchTerm);
      result = fuseResults.map((r) => r.item);
    }

    // Apply price range filter
    if (priceRange.min !== "" || priceRange.max !== "") {
      result = result.filter((m) => {
        const price = m.financial_properties?.cost_per_unit || 0;
        const min = priceRange.min === "" ? 0 : parseFloat(priceRange.min);
        const max = priceRange.max === "" ? Infinity : parseFloat(priceRange.max);
        return price >= min && price <= max;
      });
    }

    // Apply carbon range filter
    if (carbonRange.min !== "" || carbonRange.max !== "") {
      result = result.filter((m) => {
        const carbon = m.environmental_properties?.embodied_carbon || 0;
        const min = carbonRange.min === "" ? 0 : parseFloat(carbonRange.min);
        const max = carbonRange.max === "" ? Infinity : parseFloat(carbonRange.max);
        return carbon >= min && carbon <= max;
      });
    }

    // Apply recycled content filter
    if (recycledMin !== "") {
      result = result.filter((m) => {
        const recycled = m.environmental_properties?.recycled_content || 0;
        return recycled >= parseFloat(recycledMin);
      });
    }

    // Apply quality grade filter
    if (selectedQuality) {
      result = result.filter((m) => m.civil_properties?.quality_grade === selectedQuality);
    }

    // Apply green certified filter
    if (greenCertified) {
      result = result.filter(
        (m) =>
          m.civil_properties?.green_building_cert?.length > 0 ||
          m.environmental_properties?.epd_available
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case "price":
          aVal = a.financial_properties?.cost_per_unit || 0;
          bVal = b.financial_properties?.cost_per_unit || 0;
          break;
        case "carbon":
          aVal = a.environmental_properties?.embodied_carbon || 0;
          bVal = b.environmental_properties?.embodied_carbon || 0;
          break;
        case "recycled":
          aVal = a.environmental_properties?.recycled_content || 0;
          bVal = b.environmental_properties?.recycled_content || 0;
          break;
        case "durability":
          aVal = a.civil_properties?.durability_years || 0;
          bVal = b.civil_properties?.durability_years || 0;
          break;
        case "name":
        default:
          aVal = a.name?.toLowerCase() || "";
          bVal = b.name?.toLowerCase() || "";
          return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });

    setFilteredMaterials(result);
  }, [
    materials,
    fuse,
    searchTerm,
    selectedCategory,
    priceRange,
    carbonRange,
    recycledMin,
    selectedQuality,
    greenCertified,
    sortBy,
    sortOrder,
  ]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      
      // Fetch from backend
      const response = await ecoBuildAPI.getMaterials({
        limit: 200,
      });
      const dbMaterials = response.data.materials || [];
      
      // Verified material data from IS codes and industry sources
      const verifiedData = {
        // Concrete
        'MAT-CON-001': { rate: 5800, carbon: 380, unit: 'm³' },
        'MAT-CON-002': { rate: 6500, carbon: 420, unit: 'm³' },
        'MAT-CON-003': { rate: 7200, carbon: 460, unit: 'm³' },
        'MAT-CON-004': { rate: 4200, carbon: 320, unit: 'm³' },
        'MAT-CON-005': { rate: 6000, carbon: 400, unit: 'm³' },
        'MAT-CON-006': { rate: 5500, carbon: 280, unit: 'm³' },
        'MAT-CON-007': { rate: 5200, carbon: 250, unit: 'm³' },
        
        // Cement (kg CO2/kg)
        'MAT-CEM-001': { rate: 320, carbon: 0.70, unit: 'kg' },  // OPC 33
        'MAT-CEM-002': { rate: 390, carbon: 0.83, unit: 'kg' },  // OPC 43
        'MAT-CEM-003': { rate: 420, carbon: 0.93, unit: 'kg' },  // OPC 53
        'MAT-CEM-004': { rate: 370, carbon: 0.58, unit: 'kg' },  // PPC
        'MAT-CEM-005': { rate: 365, carbon: 0.42, unit: 'kg' },  // PSC
        'MAT-CEM-006': { rate: 450, carbon: 0.90, unit: 'kg' },  // White
        
        // Steel (kg CO2/kg)
        'MAT-STL-001': { rate: 68, carbon: 2.50, unit: 'kg' },   // Fe415
        'MAT-STL-002': { rate: 72, carbon: 2.50, unit: 'kg' },   // Fe500
        'MAT-STL-003': { rate: 75, carbon: 2.50, unit: 'kg' },   // Fe500D
        'MAT-STL-004': { rate: 60, carbon: 2.30, unit: 'kg' },   // Structural
        'MAT-STL-005': { rate: 68, carbon: 2.50, unit: 'kg' },   // HYSD
        
        // Blocks/Bricks
        'MAT-MAS-001': { rate: 12, carbon: 0.22, unit: 'nos' },  // Burnt clay
        'MAT-MAS-002': { rate: 10, carbon: 0.12, unit: 'nos' },  // Fly ash
        'MAT-MAS-003': { rate: 78, carbon: 0.55, unit: 'nos' },  // AAC 200mm
        'MAT-MAS-004': { rate: 45, carbon: 0.05, unit: 'nos' },  // Laterite
        'MAT-MAS-005': { rate: 32, carbon: 0.65, unit: 'nos' },  // Hollow block
        'MAT-MAS-006': { rate: 38, carbon: 0.85, unit: 'nos' },  // Solid block
        'MAT-MAS-007': { rate: 8, carbon: 0.10, unit: 'nos' },   // CEB
        'MAT-MAS-008': { rate: 45, carbon: 0.40, unit: 'nos' },  // Hourdi
        'MAT-MAS-009': { rate: 12, carbon: 0.25, unit: 'nos' },  // Surkhi
        'MAT-MAS-010': { rate: 35, carbon: 0.35, unit: 'nos' },  // Calcium silicate
        'MAT-MAS-011': { rate: 14, carbon: 0.28, unit: 'nos' },  // Wire cut
        'MAT-MAS-012': { rate: 46, carbon: 0.80, unit: 'nos' },  // Cement brick
        'MAT-MAS-013': { rate: 30, carbon: 0.30, unit: 'nos' },  // Jali
        'MAT-MAS-014': { rate: 95, carbon: 0.05, unit: 'nos' },  // Rubble
        
        // Aggregates
        'MAT-AGG-001': { rate: 85, carbon: 0.12, unit: 'cft' },  // River sand
        'MAT-AGG-002': { rate: 58, carbon: 0.08, unit: 'cft' },  // M-sand
        'MAT-AGG-003': { rate: 63, carbon: 0.08, unit: 'cft' },  // P-sand
        'MAT-AGG-004': { rate: 54, carbon: 0.06, unit: 'cft' },  // Quarry dust
        'MAT-AGG-005': { rate: 70, carbon: 0.10, unit: 'cft' },  // Plastering sand
        'MAT-AGG-006': { rate: 42, carbon: 0.06, unit: 'cft' },  // 20mm aggregate
        'MAT-AGG-007': { rate: 45, carbon: 0.06, unit: 'cft' },  // 10mm aggregate
        'MAT-AGG-008': { rate: 28, carbon: 0.03, unit: 'cft' },  // Recycled
        
        // Timber (kg CO2/cft)
        'MAT-TIM-001': { rate: 5500, carbon: 0.50, unit: 'cft' }, // Teak
        'MAT-TIM-002': { rate: 2200, carbon: 0.40, unit: 'cft' }, // Sal
        'MAT-TIM-003': { rate: 3500, carbon: 0.45, unit: 'cft' }, // Mahogany
        'MAT-TIM-004': { rate: 1800, carbon: 0.30, unit: 'cft' }, // Pine
        'MAT-TIM-005': { rate: 2500, carbon: 0.35, unit: 'cft' }, // Cedar
        'MAT-TIM-006': { rate: 1600, carbon: 0.28, unit: 'cft' }, // Fir
      };
      
      // Transform database materials to include required fields
      const transformedDbMaterials = dbMaterials.map((mat) => {
        const verified = verifiedData[mat._id] || {};
        
        // Support both old schema (MaterialName, Category) and new schema (name, category)
        const name = mat.name || mat.MaterialName || 'Unnamed Material';
        const category = mat.category || mat.Category || 'other';
        const description = mat.description || mat.Description || mat.Applications || '';
        const isCode = mat.civil_properties?.is_code || mat['BIS Code'] || '';
        const grade = mat.civil_properties?.structural_grade || mat.GradeOrModel || '';
        const unit = mat.financial_properties?.unit_type || mat.Unit || verified.unit || 'kg';
        const costPerUnit = mat.financial_properties?.cost_per_unit || verified.rate || 0;
        const carbon = mat.environmental_properties?.embodied_carbon || verified.carbon || 0;
        const recycled = mat.environmental_properties?.recycled_content || 0;
        const durability = mat.civil_properties?.durability_years || 0;
        const compressiveStrength = mat.physical_properties?.compressive_strength || 0;
        const thermalConductivity = mat.physical_properties?.thermal_conductivity || 0;
        const qualityGrade = mat.civil_properties?.quality_grade || '';
        const gstRate = mat.financial_properties?.gst_rate || (
          category === 'cement' ? 28 : 
          category === 'steel' ? 18 : 
          category === 'concrete' ? 18 : 5
        );
        
        return {
          _id: mat._id,
          materialCode: mat.material_code || mat.MaterialCode || '',
          name: name,
          category: category.toLowerCase(),
          description: description,
          brand: isCode || grade || '',
          manufacturer: mat.supplier?.supplier_name || '',
          unit: unit,
          status: 'active',
          isDatabase: true,
          
          financial_properties: {
            cost_per_unit: costPerUnit,
            currency: 'INR',
            unit_type: unit,
            gst_rate: gstRate,
            retail_price: mat.financial_properties?.retail_price || 0,
            wholesale_price: mat.financial_properties?.wholesale_price || 0,
            bulk_price: mat.financial_properties?.bulk_price || 0,
          },
          environmental_properties: {
            embodied_carbon: carbon,
            recycled_content: recycled,
            recyclable: mat.environmental_properties?.recyclable || true,
          },
          physical_properties: {
            compressive_strength: compressiveStrength,
            thermal_conductivity: thermalConductivity,
            density: mat.physical_properties?.density || 0,
            water_absorption: mat.physical_properties?.water_absorption || 0,
          },
          civil_properties: {
            is_code: isCode,
            structural_grade: grade,
            quality_grade: qualityGrade,
            durability_years: durability,
            green_building_cert: mat.civil_properties?.green_building_cert || [],
          },
          supplier: mat.supplier || {},
        };
      });
      
      // Load local custom materials from localStorage
      const localMaterials = JSON.parse(localStorage.getItem('ecobuild_custom_materials') || '[]');
      
      // Combine both
      const allMaterials = [...transformedDbMaterials, ...localMaterials];
      
      setMaterials(allMaterials);
      setFilteredMaterials(allMaterials);
      
      // Calculate category counts
      const counts = {};
      allMaterials.forEach(mat => {
        const cat = mat.category || 'other';
        counts[cat] = (counts[cat] || 0) + 1;
      });
      setCategoryCounts(counts);
    } catch (err) {
      console.error("Error fetching materials:", err);
      // Load from localStorage only
      const localMaterials = JSON.parse(localStorage.getItem('ecobuild_custom_materials') || '[]');
      setMaterials(localMaterials);
      setFilteredMaterials(localMaterials);
      
      // Calculate category counts for local materials too
      const counts = {};
      localMaterials.forEach(mat => {
        const cat = mat.category || 'other';
        counts[cat] = (counts[cat] || 0) + 1;
      });
      setCategoryCounts(counts);
      setError("Using local materials (could not connect to database)");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await ecoBuildAPI.getMaterialCategoriesDetailed();
      setCategories(response.data.categories || []);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const handleCreateMaterial = async () => {
    try {
      // Process form data
      const processedData = {
        ...formData,
        _id: formData._id || 'local_' + Date.now(),
        name: formData.name,
        category: formData.category,
        description: formData.description,
        brand: formData.brand,
        manufacturer: formData.manufacturer,
        unit: formData.financial_properties.unit_type,
        status: 'active',
        isDatabase: false,
        tags: formData.tags
          ? formData.tags.split(",").map((t) => t.trim())
          : [],
        civil_properties: {
          ...formData.civil_properties,
          standard_sizes: formData.civil_properties.standard_sizes
            ? formData.civil_properties.standard_sizes
                .split(",")
                .map((s) => s.trim())
            : [],
          thickness_options: formData.civil_properties.thickness_options
            ? formData.civil_properties.thickness_options
                .split(",")
                .map((t) => parseFloat(t.trim()))
                .filter((t) => !isNaN(t))
            : [],
          color_options: formData.civil_properties.color_options
            ? formData.civil_properties.color_options
                .split(",")
                .map((c) => c.trim())
            : [],
          chemical_resistance: formData.civil_properties.chemical_resistance
            ? formData.civil_properties.chemical_resistance
                .split(",")
                .map((c) => c.trim())
            : [],
          green_building_cert: formData.civil_properties.green_building_cert
            ? formData.civil_properties.green_building_cert
                .split(",")
                .map((c) => c.trim())
            : [],
        },
        environmental_properties: {
          ...formData.environmental_properties,
        },
        physical_properties: {
          ...formData.physical_properties,
        },
        financial_properties: {
          ...formData.financial_properties,
        },
      };

      // Load existing local materials
      const localMaterials = JSON.parse(localStorage.getItem('ecobuild_custom_materials') || '[]');
      
      if (editingMaterial && !editingMaterial.isDatabase) {
        // Update existing local material
        const index = localMaterials.findIndex(m => m._id === editingMaterial._id);
        if (index !== -1) {
          localMaterials[index] = processedData;
        }
      } else if (!editingMaterial) {
        // Add new local material
        localMaterials.push(processedData);
      }
      
      // Save to localStorage
      localStorage.setItem('ecobuild_custom_materials', JSON.stringify(localMaterials));

      setShowCreateModal(false);
      setEditingMaterial(null);
      resetForm();
      fetchMaterials();
    } catch (err) {
      console.error("Error saving material:", err);
      alert("Failed to save material. Please check all required fields.");
    }
  };

  const handleDeleteMaterial = async (id) => {
    if (!window.confirm("Are you sure you want to delete this material?"))
      return;

    try {
      // Check if it's a local material
      if (id.startsWith('local_')) {
        const localMaterials = JSON.parse(localStorage.getItem('ecobuild_custom_materials') || '[]');
        const updated = localMaterials.filter(m => m._id !== id);
        localStorage.setItem('ecobuild_custom_materials', JSON.stringify(updated));
      } else {
        await ecoBuildAPI.deleteMaterial(id);
      }
      
      fetchMaterials();
    } catch (err) {
      console.error("Error deleting material:", err);
      alert("Failed to delete material");
    }
  };

  const handleEditMaterial = (material) => {
    setEditingMaterial(material);
    setFormData({
      ...material,
      tags: material.tags ? material.tags.join(", ") : "",
      civil_properties: {
        ...material.civil_properties,
        standard_sizes:
          material.civil_properties?.standard_sizes?.join(", ") || "",
        thickness_options:
          material.civil_properties?.thickness_options?.join(", ") || "",
        color_options:
          material.civil_properties?.color_options?.join(", ") || "",
        chemical_resistance:
          material.civil_properties?.chemical_resistance?.join(", ") || "",
        green_building_cert:
          material.civil_properties?.green_building_cert?.join(", ") || "",
      },
    });
    setShowCreateModal(true);
    setActiveTab("basic");
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: "",
      subcategory: "",
      brand: "",
      manufacturer: "",
      country_of_origin: "",
      status: "active",
      tags: [],
      physical_properties: {},
      civil_properties: { wastage_percentage: 5 },
      environmental_properties: {
        recycled_content: 0,
        recyclable: true,
        biodegradable: false,
        renewable: false,
      },
      financial_properties: {
        unit_type: "kg",
        currency: "INR",
        minimum_order_quantity: 1,
      },
      supplier: {},
    });
  };

  const renderFormField = (
    label,
    name,
    type = "text",
    value,
    onChange,
    placeholder = "",
    options = null,
  ) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-foreground mb-1">
        {label}
      </label>
      {options ? (
        <select
          name={name}
          value={value || ""}
          onChange={onChange}
          className="input w-full"
        >
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={opt.id || opt} value={opt.id || opt}>
              {opt.label || opt}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea
          name={name}
          value={value || ""}
          onChange={onChange}
          placeholder={placeholder}
          rows={3}
          className="input w-full"
        />
      ) : type === "checkbox" ? (
        <input
          type="checkbox"
          name={name}
          checked={value || false}
          onChange={onChange}
          className="w-5 h-5 rounded border-border"
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value || ""}
          onChange={onChange}
          placeholder={placeholder}
          className="input w-full"
        />
      )}
    </div>
  );

  const renderBasicInfoTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {renderFormField(
          "Material Name *",
          "name",
          "text",
          formData.name,
          (e) => setFormData({ ...formData, name: e.target.value }),
          "e.g., OPC 53 Grade Cement",
        )}

        {renderFormField(
          "Category *",
          "category",
          "select",
          formData.category,
          (e) => setFormData({ ...formData, category: e.target.value }),
          "",
          MATERIAL_CATEGORIES,
        )}
      </div>

      {renderFormField(
        "Description",
        "description",
        "textarea",
        formData.description,
        (e) => setFormData({ ...formData, description: e.target.value }),
        "Detailed description of the material",
      )}

      <div className="grid grid-cols-2 gap-4">
        {renderFormField(
          "Subcategory",
          "subcategory",
          "text",
          formData.subcategory,
          (e) => setFormData({ ...formData, subcategory: e.target.value }),
        )}

        {renderFormField("Brand", "brand", "text", formData.brand, (e) =>
          setFormData({ ...formData, brand: e.target.value }),
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {renderFormField(
          "Manufacturer",
          "manufacturer",
          "text",
          formData.manufacturer,
          (e) => setFormData({ ...formData, manufacturer: e.target.value }),
        )}

        {renderFormField(
          "Country of Origin",
          "country_of_origin",
          "text",
          formData.country_of_origin,
          (e) =>
            setFormData({ ...formData, country_of_origin: e.target.value }),
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {renderFormField(
          "Status",
          "status",
          "select",
          formData.status,
          (e) => setFormData({ ...formData, status: e.target.value }),
          "",
          MATERIAL_STATUS,
        )}

        {renderFormField(
          "Tags (comma-separated)",
          "tags",
          "text",
          formData.tags,
          (e) => setFormData({ ...formData, tags: e.target.value }),
          "e.g., cement, high-strength, structural",
        )}
      </div>
    </div>
  );

  const renderPhysicalPropertiesTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center">
        <FaRuler className="mr-2 text-primary" />
        Density & Physical
      </h3>
      <div className="grid grid-cols-3 gap-4">
        {renderFormField(
          "Density (kg/m³)",
          "physical_properties.density",
          "number",
          formData.physical_properties?.density,
          (e) =>
            setFormData({
              ...formData,
              physical_properties: {
                ...formData.physical_properties,
                density: parseFloat(e.target.value),
              },
            }),
        )}

        {renderFormField(
          "Bulk Density (kg/m³)",
          "physical_properties.bulk_density",
          "number",
          formData.physical_properties?.bulk_density,
          (e) =>
            setFormData({
              ...formData,
              physical_properties: {
                ...formData.physical_properties,
                bulk_density: parseFloat(e.target.value),
              },
            }),
        )}

        {renderFormField(
          "Specific Gravity",
          "physical_properties.specific_gravity",
          "number",
          formData.physical_properties?.specific_gravity,
          (e) =>
            setFormData({
              ...formData,
              physical_properties: {
                ...formData.physical_properties,
                specific_gravity: parseFloat(e.target.value),
              },
            }),
        )}
      </div>

      <h3 className="text-lg font-semibold flex items-center mt-6">
        <FaBuilding className="mr-2 text-primary" />
        Mechanical Properties
      </h3>
      <div className="grid grid-cols-3 gap-4">
        {renderFormField(
          "Compressive Strength (MPa)",
          "physical_properties.compressive_strength",
          "number",
          formData.physical_properties?.compressive_strength,
          (e) =>
            setFormData({
              ...formData,
              physical_properties: {
                ...formData.physical_properties,
                compressive_strength: parseFloat(e.target.value),
              },
            }),
        )}

        {renderFormField(
          "Tensile Strength (MPa)",
          "physical_properties.tensile_strength",
          "number",
          formData.physical_properties?.tensile_strength,
          (e) =>
            setFormData({
              ...formData,
              physical_properties: {
                ...formData.physical_properties,
                tensile_strength: parseFloat(e.target.value),
              },
            }),
        )}

        {renderFormField(
          "Flexural Strength (MPa)",
          "physical_properties.flexural_strength",
          "number",
          formData.physical_properties?.flexural_strength,
          (e) =>
            setFormData({
              ...formData,
              physical_properties: {
                ...formData.physical_properties,
                flexural_strength: parseFloat(e.target.value),
              },
            }),
        )}

        {renderFormField(
          "Shear Strength (MPa)",
          "physical_properties.shear_strength",
          "number",
          formData.physical_properties?.shear_strength,
          (e) =>
            setFormData({
              ...formData,
              physical_properties: {
                ...formData.physical_properties,
                shear_strength: parseFloat(e.target.value),
              },
            }),
        )}

        {renderFormField(
          "Modulus of Elasticity (GPa)",
          "physical_properties.modulus_of_elasticity",
          "number",
          formData.physical_properties?.modulus_of_elasticity,
          (e) =>
            setFormData({
              ...formData,
              physical_properties: {
                ...formData.physical_properties,
                modulus_of_elasticity: parseFloat(e.target.value),
              },
            }),
        )}

        {renderFormField(
          "Poisson's Ratio",
          "physical_properties.poisson_ratio",
          "number",
          formData.physical_properties?.poisson_ratio,
          (e) =>
            setFormData({
              ...formData,
              physical_properties: {
                ...formData.physical_properties,
                poisson_ratio: parseFloat(e.target.value),
              },
            }),
        )}
      </div>

      <h3 className="text-lg font-semibold flex items-center mt-6">
        <FaThermometerHalf className="mr-2 text-primary" />
        Thermal & Other Properties
      </h3>
      <div className="grid grid-cols-3 gap-4">
        {renderFormField(
          "Thermal Conductivity (W/m·K)",
          "physical_properties.thermal_conductivity",
          "number",
          formData.physical_properties?.thermal_conductivity,
          (e) =>
            setFormData({
              ...formData,
              physical_properties: {
                ...formData.physical_properties,
                thermal_conductivity: parseFloat(e.target.value),
              },
            }),
        )}

        {renderFormField(
          "Specific Heat (J/kg·K)",
          "physical_properties.specific_heat",
          "number",
          formData.physical_properties?.specific_heat,
          (e) =>
            setFormData({
              ...formData,
              physical_properties: {
                ...formData.physical_properties,
                specific_heat: parseFloat(e.target.value),
              },
            }),
        )}

        {renderFormField(
          "Fire Rating",
          "physical_properties.fire_rating",
          "text",
          formData.physical_properties?.fire_rating,
          (e) =>
            setFormData({
              ...formData,
              physical_properties: {
                ...formData.physical_properties,
                fire_rating: e.target.value,
              },
            }),
        )}
      </div>
    </div>
  );

  const renderCivilPropertiesTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center">
        <FaBuilding className="mr-2 text-primary" />
        Structural Properties
      </h3>
      <div className="grid grid-cols-3 gap-4">
        {renderFormField(
          "Structural Grade",
          "civil_properties.structural_grade",
          "text",
          formData.civil_properties?.structural_grade,
          (e) =>
            setFormData({
              ...formData,
              civil_properties: {
                ...formData.civil_properties,
                structural_grade: e.target.value,
              },
            }),
        )}

        {renderFormField(
          "Design Strength (MPa)",
          "civil_properties.design_strength",
          "number",
          formData.civil_properties?.design_strength,
          (e) =>
            setFormData({
              ...formData,
              civil_properties: {
                ...formData.civil_properties,
                design_strength: parseFloat(e.target.value),
              },
            }),
        )}

        {renderFormField(
          "Yield Strength (MPa)",
          "civil_properties.yield_strength",
          "number",
          formData.civil_properties?.yield_strength,
          (e) =>
            setFormData({
              ...formData,
              civil_properties: {
                ...formData.civil_properties,
                yield_strength: parseFloat(e.target.value),
              },
            }),
        )}

        {renderFormField(
          "Durability (Years)",
          "civil_properties.durability_years",
          "number",
          formData.civil_properties?.durability_years,
          (e) =>
            setFormData({
              ...formData,
              civil_properties: {
                ...formData.civil_properties,
                durability_years: parseInt(e.target.value),
              },
            }),
        )}
      </div>

      <h3 className="text-lg font-semibold flex items-center mt-6">
        <FaRuler className="mr-2 text-primary" />
        Dimensions & Coverage
      </h3>
      <div className="grid grid-cols-3 gap-4">
        {renderFormField(
          "Standard Sizes (comma-separated)",
          "civil_properties.standard_sizes",
          "text",
          formData.civil_properties?.standard_sizes,
          (e) =>
            setFormData({
              ...formData,
              civil_properties: {
                ...formData.civil_properties,
                standard_sizes: e.target.value,
              },
            }),
          "e.g., 600x200x300mm, 600x200x200mm",
        )}

        {renderFormField(
          "Coverage per Unit (m²)",
          "civil_properties.coverage_per_unit",
          "number",
          formData.civil_properties?.coverage_per_unit,
          (e) =>
            setFormData({
              ...formData,
              civil_properties: {
                ...formData.civil_properties,
                coverage_per_unit: parseFloat(e.target.value),
              },
            }),
        )}

        {renderFormField(
          "Wastage (%)",
          "civil_properties.wastage_percentage",
          "number",
          formData.civil_properties?.wastage_percentage,
          (e) =>
            setFormData({
              ...formData,
              civil_properties: {
                ...formData.civil_properties,
                wastage_percentage: parseFloat(e.target.value),
              },
            }),
        )}
      </div>

      <h3 className="text-lg font-semibold flex items-center mt-6">
        <FaCertificate className="mr-2 text-primary" />
        Standards & Certifications
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {renderFormField(
          "IS Code Reference",
          "civil_properties.is_code",
          "text",
          formData.civil_properties?.is_code,
          (e) =>
            setFormData({
              ...formData,
              civil_properties: {
                ...formData.civil_properties,
                is_code: e.target.value,
              },
            }),
          "e.g., IS 269:2015",
        )}

        {renderFormField(
          "Quality Grade",
          "civil_properties.quality_grade",
          "select",
          formData.civil_properties?.quality_grade,
          (e) =>
            setFormData({
              ...formData,
              civil_properties: {
                ...formData.civil_properties,
                quality_grade: e.target.value,
              },
            }),
          "",
          QUALITY_GRADES,
        )}
      </div>
    </div>
  );

  const renderEnvironmentalTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center">
        <FaLeaf className="mr-2 text-green-600" />
        Carbon & Sustainability
      </h3>
      <div className="grid grid-cols-3 gap-4">
        {renderFormField(
          "Embodied Carbon (kg CO2/unit)",
          "environmental_properties.embodied_carbon",
          "number",
          formData.environmental_properties?.embodied_carbon,
          (e) =>
            setFormData({
              ...formData,
              environmental_properties: {
                ...formData.environmental_properties,
                embodied_carbon: parseFloat(e.target.value),
              },
            }),
        )}

        {renderFormField(
          "Recycled Content (%)",
          "environmental_properties.recycled_content",
          "number",
          formData.environmental_properties?.recycled_content,
          (e) =>
            setFormData({
              ...formData,
              environmental_properties: {
                ...formData.environmental_properties,
                recycled_content: parseFloat(e.target.value),
              },
            }),
        )}

        {renderFormField(
          "Recyclable",
          "environmental_properties.recyclable",
          "checkbox",
          formData.environmental_properties?.recyclable,
          (e) =>
            setFormData({
              ...formData,
              environmental_properties: {
                ...formData.environmental_properties,
                recyclable: e.target.checked,
              },
            }),
        )}

        {renderFormField(
          "Biodegradable",
          "environmental_properties.biodegradable",
          "checkbox",
          formData.environmental_properties?.biodegradable,
          (e) =>
            setFormData({
              ...formData,
              environmental_properties: {
                ...formData.environmental_properties,
                biodegradable: e.target.checked,
              },
            }),
        )}

        {renderFormField(
          "Renewable",
          "environmental_properties.renewable",
          "checkbox",
          formData.environmental_properties?.renewable,
          (e) =>
            setFormData({
              ...formData,
              environmental_properties: {
                ...formData.environmental_properties,
                renewable: e.target.checked,
              },
            }),
        )}
      </div>
    </div>
  );

  const renderFinancialTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center">
        <FaMoneyBillWave className="mr-2 text-green-600" />
        Pricing Information
      </h3>
      <div className="grid grid-cols-3 gap-4">
        {renderFormField(
          "Cost per Unit *",
          "financial_properties.cost_per_unit",
          "number",
          formData.financial_properties?.cost_per_unit,
          (e) =>
            setFormData({
              ...formData,
              financial_properties: {
                ...formData.financial_properties,
                cost_per_unit: parseFloat(e.target.value),
              },
            }),
        )}

        {renderFormField(
          "Unit Type *",
          "financial_properties.unit_type",
          "select",
          formData.financial_properties?.unit_type,
          (e) =>
            setFormData({
              ...formData,
              financial_properties: {
                ...formData.financial_properties,
                unit_type: e.target.value,
              },
            }),
          "",
          UNIT_TYPES,
        )}

        {renderFormField(
          "GST Rate (%)",
          "financial_properties.gst_rate",
          "number",
          formData.financial_properties?.gst_rate,
          (e) =>
            setFormData({
              ...formData,
              financial_properties: {
                ...formData.financial_properties,
                gst_rate: parseFloat(e.target.value),
              },
            }),
        )}
      </div>

      <h3 className="text-lg font-semibold flex items-center mt-6">
        <FaMoneyBillWave className="mr-2 text-green-600" />
        Pricing Tiers
      </h3>
      <div className="grid grid-cols-3 gap-4">
        {renderFormField(
          "Retail Price",
          "financial_properties.retail_price",
          "number",
          formData.financial_properties?.retail_price,
          (e) =>
            setFormData({
              ...formData,
              financial_properties: {
                ...formData.financial_properties,
                retail_price: parseFloat(e.target.value),
              },
            }),
        )}

        {renderFormField(
          "Wholesale Price",
          "financial_properties.wholesale_price",
          "number",
          formData.financial_properties?.wholesale_price,
          (e) =>
            setFormData({
              ...formData,
              financial_properties: {
                ...formData.financial_properties,
                wholesale_price: parseFloat(e.target.value),
              },
            }),
        )}

        {renderFormField(
          "Bulk Price",
          "financial_properties.bulk_price",
          "number",
          formData.financial_properties?.bulk_price,
          (e) =>
            setFormData({
              ...formData,
              financial_properties: {
                ...formData.financial_properties,
                bulk_price: parseFloat(e.target.value),
              },
            }),
        )}

        {renderFormField(
          "Minimum Order Quantity",
          "financial_properties.minimum_order_quantity",
          "number",
          formData.financial_properties?.minimum_order_quantity,
          (e) =>
            setFormData({
              ...formData,
              financial_properties: {
                ...formData.financial_properties,
                minimum_order_quantity: parseFloat(e.target.value),
              },
            }),
        )}
      </div>

      <h3 className="text-lg font-semibold flex items-center mt-6">
        <FaInfoCircle className="mr-2 text-green-600" />
        Warranty & Terms
      </h3>
      <div className="grid grid-cols-3 gap-4">
        {renderFormField(
          "Warranty Period (Years)",
          "financial_properties.warranty_period",
          "number",
          formData.financial_properties?.warranty_period,
          (e) =>
            setFormData({
              ...formData,
              financial_properties: {
                ...formData.financial_properties,
                warranty_period: parseInt(e.target.value),
              },
            }),
        )}

        {renderFormField(
          "Credit Period (Days)",
          "financial_properties.credit_period",
          "number",
          formData.financial_properties?.credit_period,
          (e) =>
            setFormData({
              ...formData,
              financial_properties: {
                ...formData.financial_properties,
                credit_period: parseInt(e.target.value),
              },
            }),
        )}
      </div>
    </div>
  );

  const renderSupplierTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center">
        <FaTruck className="mr-2 text-primary" />
        Supplier Information
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {renderFormField(
          "Supplier Name",
          "supplier.supplier_name",
          "text",
          formData.supplier?.supplier_name,
          (e) =>
            setFormData({
              ...formData,
              supplier: { ...formData.supplier, supplier_name: e.target.value },
            }),
        )}

        {renderFormField(
          "Location",
          "supplier.supplier_location",
          "text",
          formData.supplier?.supplier_location,
          (e) =>
            setFormData({
              ...formData,
              supplier: {
                ...formData.supplier,
                supplier_location: e.target.value,
              },
            }),
        )}

        {renderFormField(
          "Lead Time (Days)",
          "supplier.lead_time_days",
          "number",
          formData.supplier?.lead_time_days,
          (e) =>
            setFormData({
              ...formData,
              supplier: {
                ...formData.supplier,
                lead_time_days: parseInt(e.target.value),
              },
            }),
        )}

        {renderFormField(
          "Reliability Rating (1-10)",
          "supplier.reliability_rating",
          "number",
          formData.supplier?.reliability_rating,
          (e) =>
            setFormData({
              ...formData,
              supplier: {
                ...formData.supplier,
                reliability_rating: parseFloat(e.target.value),
              },
            }),
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Stats */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FaBox className="text-blue-200" />
              Materials Database
            </h1>
            <p className="text-blue-100 text-sm mt-1">
              Search, filter, and compare construction materials
            </p>
          </div>
          <button
            onClick={() => {
              setEditingMaterial(null);
              resetForm();
              setShowCreateModal(true);
              setActiveTab("basic");
            }}
            className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium text-sm hover:bg-blue-50 transition-colors flex items-center gap-2"
          >
            <FaPlus /> Add Material
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-2xl font-bold">{materials.length}</p>
            <p className="text-xs text-blue-100">Total Materials</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-2xl font-bold">{categories.length}</p>
            <p className="text-xs text-blue-100">Categories</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-2xl font-bold">{materials.filter(m => m.environmental_properties?.embodied_carbon > 0).length}</p>
            <p className="text-xs text-blue-100">With Carbon Data</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-2xl font-bold">{materials.filter(m => m.civil_properties?.is_code).length}</p>
            <p className="text-xs text-blue-100">IS Code Certified</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <FaSearch />
            </div>
            <input
              type="text"
              placeholder="Search materials by name, category, IS code..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {MATERIAL_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="name">Name</option>
              <option value="price">Price ↑</option>
              <option value="carbon">Carbon ↑</option>
              <option value="recycled">Recycled ↓</option>
              <option value="durability">Durability ↓</option>
            </select>

            {/* Advanced Filters Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                showFilters 
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                  : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              <FaFilter /> Filters
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Price Range (₹)</label>
              <div className="flex gap-2">
                <input type="number" placeholder="Min" value={priceRange.min} onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))} className="w-full px-2 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-sm" />
                <input type="number" placeholder="Max" value={priceRange.max} onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))} className="w-full px-2 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Carbon (kg CO2)</label>
              <div className="flex gap-2">
                <input type="number" placeholder="Min" value={carbonRange.min} onChange={(e) => setCarbonRange(prev => ({ ...prev, min: e.target.value }))} className="w-full px-2 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-sm" />
                <input type="number" placeholder="Max" value={carbonRange.max} onChange={(e) => setCarbonRange(prev => ({ ...prev, max: e.target.value }))} className="w-full px-2 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Min Recycled (%)</label>
              <input type="number" placeholder="0" value={recycledMin} onChange={(e) => setRecycledMin(e.target.value)} className="w-full px-2 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Quality Grade</label>
              <select value={selectedQuality} onChange={(e) => setSelectedQuality(e.target.value)} className="w-full px-2 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-sm">
                <option value="">All Grades</option>
                {QUALITY_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={greenCertified} onChange={(e) => setGreenCertified(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Green Certified Only</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Category Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.category;
          return (
            <button
              key={cat.category}
              onClick={() => { setSelectedCategory(isSelected ? '' : cat.category); setCurrentPage(1); }}
              className={`p-4 rounded-xl border-2 transition-all text-center ${
                isSelected 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 bg-white dark:bg-gray-800'
              }`}
            >
              <p className={`text-2xl font-bold ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-foreground'}`}>{cat.count}</p>
              <p className="text-xs text-foreground-secondary capitalize mt-1">{cat.category}</p>
            </button>
          );
        })}
      </div>

      {/* Materials List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <FaSpinner className="animate-spin text-4xl text-primary" />
        </div>
      ) : error ? (
        <div className="card text-center py-12">
          <p className="text-red-600">{error}</p>
        </div>
      ) : materials.length === 0 ? (
        <div className="card text-center py-12">
          <FaBox className="text-6xl text-foreground-secondary mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No materials found</h3>
          <p className="text-foreground-secondary mb-4">
            Start by adding materials to your database
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            <FaPlus className="mr-2" />
            Add Material
          </button>
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="card text-center py-12">
          <FaSearch className="text-6xl text-foreground-secondary mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No matching materials</h3>
          <p className="text-foreground-secondary mb-4">
            Try adjusting your search or filters
          </p>
          <button
            onClick={() => {
              setSearchTerm("");
              setSelectedCategory("");
              setPriceRange({ min: "", max: "" });
              setCarbonRange({ min: "", max: "" });
              setRecycledMin("");
              setSelectedQuality("");
              setGreenCertified(false);
            }}
            className="btn btn-secondary"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* View Toggle & Compare Bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setViewMode('cards'); setCurrentPage(1); }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  viewMode === 'cards' 
                    ? 'bg-primary text-white' 
                    : 'bg-background-tertiary text-foreground-secondary hover:bg-background-secondary'
                }`}
              >
                <FaThLarge /> Cards
              </button>
              <button
                onClick={() => { setViewMode('table'); setCurrentPage(1); }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  viewMode === 'table' 
                    ? 'bg-primary text-white' 
                    : 'bg-background-tertiary text-foreground-secondary hover:bg-background-secondary'
                }`}
              >
                <FaTable /> Table
              </button>
            </div>
            <div className="flex items-center gap-3">
              {compareSelections.length > 0 && (
                <button
                  onClick={() => setShowComparison(true)}
                  className="btn btn-primary text-sm flex items-center gap-2"
                >
                  <FaExchangeAlt /> Compare ({compareSelections.length})
                </button>
              )}
              <span className="text-sm text-foreground-secondary">
                {filteredMaterials.length} materials found
              </span>
            </div>
          </div>

          {/* Card View */}
          {viewMode === 'cards' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredMaterials
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((material) => {
                    const isComparing = compareSelections.some(m => m._id === material._id);
                    const isExpanded = expandedMaterial === material._id;
                    const carbon = material.environmental_properties?.embodied_carbon || 0;
                    const recycled = material.environmental_properties?.recycled_content || 0;
                    const durability = material.civil_properties?.durability_years || 0;
                    const rate = material.financial_properties?.cost_per_unit || 0;
                    const unit = material.financial_properties?.unit_type || '';
                    const isCode = material.civil_properties?.is_code || '';
                    const quality = material.civil_properties?.quality_grade || '';
                    
                    const carbonColor = carbon < 1 ? 'bg-green-500' : carbon < 5 ? 'bg-yellow-500' : 'bg-red-500';
                    const carbonWidth = Math.min(100, carbon * 5);

                    return (
                      <div
                        key={material._id}
                        className={`bg-white dark:bg-gray-800 rounded-xl border-2 p-4 transition-all ${
                          isComparing 
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                            : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                        }`}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm text-foreground truncate">{material.name}</h4>
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {isCode && (
                                <span className="text-xs text-foreground-muted bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                  {isCode}
                                </span>
                              )}
                              {quality && (
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  quality === 'Premium' ? 'bg-yellow-100 text-yellow-700' :
                                  quality === 'Standard' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {quality}
                                </span>
                              )}
                            </div>
                          </div>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isComparing}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setCompareSelections(prev => [...prev, material]);
                                } else {
                                  setCompareSelections(prev => prev.filter(m => m._id !== material._id));
                                }
                              }}
                              className="w-4 h-4 rounded border-border text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-xs text-foreground-muted">Compare</span>
                          </label>
                        </div>

                        {/* Properties */}
                        <div className="space-y-2 text-xs mb-3">
                          <div className="flex items-center justify-between">
                            <span className="text-foreground-muted">Rate</span>
                            <span className="font-mono font-bold text-foreground">₹{rate}/{unit}</span>
                          </div>
                          
                          {/* Carbon Bar */}
                          {carbon > 0 && (
                            <div>
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-foreground-muted flex items-center gap-1">
                                  <FaRecycle className="text-[10px]" /> Carbon
                                </span>
                                <span className="font-mono">{carbon}</span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                <div className={`h-1.5 rounded-full ${carbonColor}`} style={{ width: `${carbonWidth}%` }} />
                              </div>
                            </div>
                          )}

                          {/* Recycled Content */}
                          {recycled > 0 && (
                            <div>
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-foreground-muted flex items-center gap-1">
                                  <FaRecycle className="text-[10px]" /> Recycled
                                </span>
                                <span className="font-mono">{recycled}%</span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${recycled}%` }} />
                              </div>
                            </div>
                          )}

                          {durability > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-foreground-muted flex items-center gap-1">
                                <FaShieldAlt className="text-[10px]" /> Durability
                              </span>
                              <span className="font-mono">{durability} yrs</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                          <button
                            onClick={() => setExpandedMaterial(isExpanded ? null : material._id)}
                            className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                          >
                            {isExpanded ? 'Hide Details' : 'View Details'}
                            {isExpanded ? <FaChevronUp className="text-[10px]" /> : <FaChevronDown className="text-[10px]" />}
                          </button>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditMaterial(material)}
                              className="p-1.5 text-foreground-secondary hover:text-primary rounded"
                            >
                              <FaEdit className="text-xs" />
                            </button>
                            <button
                              onClick={() => handleDeleteMaterial(material._id)}
                              className="p-1.5 text-foreground-secondary hover:text-red-500 rounded"
                            >
                              <FaTrash className="text-xs" />
                            </button>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-3 text-xs">
                            {/* Physical */}
                            <div>
                              <h5 className="font-semibold text-foreground mb-1 flex items-center gap-1">
                                <FaRuler className="text-[10px] text-primary" /> Physical
                              </h5>
                              <div className="grid grid-cols-2 gap-1 text-foreground-secondary">
                                {material.physical_properties?.density && <li className="list-none">Density: {material.physical_properties.density} kg/m³</li>}
                                {material.physical_properties?.compressive_strength && <li className="list-none">Strength: {material.physical_properties.compressive_strength} MPa</li>}
                                {material.physical_properties?.thermal_conductivity && <li className="list-none">Thermal: {material.physical_properties.thermal_conductivity} W/m·K</li>}
                                {material.physical_properties?.water_absorption && <li className="list-none">Water Abs: {material.physical_properties.water_absorption}%</li>}
                              </div>
                            </div>
                            {/* Civil */}
                            <div>
                              <h5 className="font-semibold text-foreground mb-1 flex items-center gap-1">
                                <FaBuilding className="text-[10px] text-primary" /> Engineering
                              </h5>
                              <div className="grid grid-cols-2 gap-1 text-foreground-secondary">
                                {material.civil_properties?.structural_grade && <li className="list-none">Grade: {material.civil_properties.structural_grade}</li>}
                                {material.civil_properties?.design_strength && <li className="list-none">Design: {material.civil_properties.design_strength} MPa</li>}
                                {material.civil_properties?.wastage_percentage && <li className="list-none">Wastage: {material.civil_properties.wastage_percentage}%</li>}
                                {material.civil_properties?.green_building_cert?.length > 0 && <li className="list-none">Green: {material.civil_properties.green_building_cert.join(', ')}</li>}
                              </div>
                            </div>
                            {/* Environmental */}
                            <div>
                              <h5 className="font-semibold text-foreground mb-1 flex items-center gap-1">
                                <FaLeaf className="text-[10px] text-green-500" /> Environmental
                              </h5>
                              <div className="grid grid-cols-2 gap-1 text-foreground-secondary">
                                {carbon > 0 && <li className="list-none">Carbon: {carbon} kg CO2</li>}
                                {recycled > 0 && <li className="list-none">Recycled: {recycled}%</li>}
                                <li className="list-none">Recyclable: {material.environmental_properties?.recyclable ? 'Yes' : 'No'}</li>
                                <li className="list-none">Renewable: {material.environmental_properties?.renewable ? 'Yes' : 'No'}</li>
                              </div>
                            </div>
                            {/* Financial */}
                            <div>
                              <h5 className="font-semibold text-foreground mb-1 flex items-center gap-1">
                                <FaMoneyBillWave className="text-[10px] text-green-500" /> Financial
                              </h5>
                              <div className="grid grid-cols-2 gap-1 text-foreground-secondary">
                                {rate > 0 && <li className="list-none">Cost: ₹{rate}/{unit}</li>}
                                {material.financial_properties?.retail_price && <li className="list-none">Retail: ₹{material.financial_properties.retail_price}</li>}
                                {material.financial_properties?.wholesale_price && <li className="list-none">Wholesale: ₹{material.financial_properties.wholesale_price}</li>}
                                {material.financial_properties?.gst_rate && <li className="list-none">GST: {material.financial_properties.gst_rate}%</li>}
                              </div>
                            </div>
                            {/* Supplier */}
                            {material.supplier?.supplier_name && (
                              <div>
                                <h5 className="font-semibold text-foreground mb-1 flex items-center gap-1">
                                  <FaTruck className="text-[10px] text-primary" /> Supplier
                                </h5>
                                <div className="grid grid-cols-2 gap-1 text-foreground-secondary">
                                  <li className="list-none">{material.supplier.supplier_name}</li>
                                  {material.supplier.supplier_location && <li className="list-none">{material.supplier.supplier_location}</li>}
                                  {material.supplier.lead_time_days && <li className="list-none">Lead: {material.supplier.lead_time_days} days</li>}
                                  {material.supplier.reliability_rating && <li className="list-none">Rating: {material.supplier.reliability_rating}/10</li>}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <span className="text-sm text-foreground-secondary">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredMaterials.length)} of {filteredMaterials.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <FaAngleDoubleLeft className="text-xs" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <FaAngleLeft className="text-xs" />
                  </button>
                  {Array.from({ length: Math.min(5, Math.ceil(filteredMaterials.length / itemsPerPage)) }, (_, i) => {
                    let page;
                    const totalPages = Math.ceil(filteredMaterials.length / itemsPerPage);
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium ${
                          currentPage === page
                            ? 'bg-primary text-white'
                            : 'border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredMaterials.length / itemsPerPage), p + 1))}
                    disabled={currentPage >= Math.ceil(filteredMaterials.length / itemsPerPage)}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <FaAngleRight className="text-xs" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.ceil(filteredMaterials.length / itemsPerPage))}
                    disabled={currentPage >= Math.ceil(filteredMaterials.length / itemsPerPage)}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <FaAngleDoubleRight className="text-xs" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="p-3 text-left font-medium text-foreground-secondary">
                          <input
                            type="checkbox"
                            checked={compareSelections.length === filteredMaterials.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).length && filteredMaterials.length > 0}
                            onChange={(e) => {
                              const pageItems = filteredMaterials.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                              if (e.target.checked) {
                                setCompareSelections(prev => {
                                  const existingIds = new Set(prev.map(m => m._id));
                                  const newItems = pageItems.filter(m => !existingIds.has(m._id));
                                  return [...prev, ...newItems];
                                });
                              } else {
                                const pageIds = new Set(pageItems.map(m => m._id));
                                setCompareSelections(prev => prev.filter(m => !pageIds.has(m._id)));
                              }
                            }}
                            className="w-4 h-4 rounded border-border"
                          />
                        </th>
                        <th className="p-3 text-left font-medium text-foreground-secondary">Material</th>
                        <th className="p-3 text-left font-medium text-foreground-secondary">Category</th>
                        <th className="p-3 text-right font-medium text-foreground-secondary">Rate</th>
                        <th className="p-3 text-right font-medium text-foreground-secondary">Carbon</th>
                        <th className="p-3 text-right font-medium text-foreground-secondary">Recycled</th>
                        <th className="p-3 text-right font-medium text-foreground-secondary">Durability</th>
                        <th className="p-3 text-left font-medium text-foreground-secondary">IS Code</th>
                        <th className="p-3 text-center font-medium text-foreground-secondary">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMaterials
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        .map((material) => {
                          const isComparing = compareSelections.some(m => m._id === material._id);
                          const carbon = material.environmental_properties?.embodied_carbon || 0;
                          const recycled = material.environmental_properties?.recycled_content || 0;
                          const durability = material.civil_properties?.durability_years || 0;
                          const rate = material.financial_properties?.cost_per_unit || 0;
                          const unit = material.financial_properties?.unit_type || '';
                          const isCode = material.civil_properties?.is_code || '';
                          const carbonColor = carbon < 1 ? 'text-green-600' : carbon < 5 ? 'text-yellow-600' : 'text-red-600';

                          return (
                            <tr key={material._id} className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50 ${isComparing ? 'bg-purple-50 dark:bg-purple-900/20' : ''}`}>
                              <td className="p-3">
                                <input
                                  type="checkbox"
                                  checked={isComparing}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setCompareSelections(prev => [...prev, material]);
                                    } else {
                                      setCompareSelections(prev => prev.filter(m => m._id !== material._id));
                                    }
                                  }}
                                  className="w-4 h-4 rounded border-border text-purple-600"
                                />
                              </td>
                              <td className="p-3">
                                <div>
                                  <span className="font-medium text-foreground">{material.name}</span>
                                  {material.description && (
                                    <p className="text-xs text-foreground-secondary mt-0.5 truncate max-w-xs">{material.description}</p>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 text-foreground-secondary capitalize">{material.category}</td>
                              <td className="p-3 text-right font-mono">₹{rate}/{unit}</td>
                              <td className={`p-3 text-right font-mono ${carbonColor}`}>{carbon > 0 ? carbon : '-'}</td>
                              <td className="p-3 text-right font-mono text-blue-600">{recycled > 0 ? `${recycled}%` : '-'}</td>
                              <td className="p-3 text-right font-mono">{durability > 0 ? `${durability} yrs` : '-'}</td>
                              <td className="p-3 text-foreground-secondary text-xs">{isCode || '-'}</td>
                              <td className="p-3">
                                <div className="flex items-center justify-center gap-1">
                                  <button onClick={() => handleEditMaterial(material)} className="p-1.5 text-foreground-secondary hover:text-primary rounded">
                                    <FaEdit className="text-xs" />
                                  </button>
                                  <button onClick={() => handleDeleteMaterial(material._id)} className="p-1.5 text-foreground-secondary hover:text-red-500 rounded">
                                    <FaTrash className="text-xs" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <span className="text-sm text-foreground-secondary">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredMaterials.length)} of {filteredMaterials.length}
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <FaAngleDoubleLeft className="text-xs" />
                  </button>
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <FaAngleLeft className="text-xs" />
                  </button>
                  {Array.from({ length: Math.min(5, Math.ceil(filteredMaterials.length / itemsPerPage)) }, (_, i) => {
                    let page;
                    const totalPages = Math.ceil(filteredMaterials.length / itemsPerPage);
                    if (totalPages <= 5) page = i + 1;
                    else if (currentPage <= 3) page = i + 1;
                    else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                    else page = currentPage - 2 + i;
                    return (
                      <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 rounded-lg text-sm font-medium ${currentPage === page ? 'bg-primary text-white' : 'border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                        {page}
                      </button>
                    );
                  })}
                  <button onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredMaterials.length / itemsPerPage), p + 1))} disabled={currentPage >= Math.ceil(filteredMaterials.length / itemsPerPage)} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <FaAngleRight className="text-xs" />
                  </button>
                  <button onClick={() => setCurrentPage(Math.ceil(filteredMaterials.length / itemsPerPage))} disabled={currentPage >= Math.ceil(filteredMaterials.length / itemsPerPage)} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <FaAngleDoubleRight className="text-xs" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Comparison Modal */}
      {showComparison && compareSelections.length >= 2 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <FaExchangeAlt className="text-primary" />
                Material Comparison ({compareSelections.length} materials)
              </h2>
              <button onClick={() => setShowComparison(false)} className="text-foreground-secondary hover:text-foreground">
                <FaTimes className="text-xl" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="p-3 text-left font-medium text-foreground-secondary w-40">Property</th>
                      {compareSelections.map(mat => (
                        <th key={mat._id} className="p-3 text-left font-medium text-foreground">
                          <div className="font-bold">{mat.name}</div>
                          <div className="text-xs text-foreground-secondary font-normal">{mat.category}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Rate', key: 'rate', format: (m) => `₹${m.financial_properties?.cost_per_unit || 0}/${m.financial_properties?.unit_type || ''}`, lowerBetter: true },
                      { label: 'Embodied Carbon', key: 'carbon', format: (m) => `${m.environmental_properties?.embodied_carbon || 0} kg CO2`, lowerBetter: true },
                      { label: 'Recycled Content', key: 'recycled', format: (m) => `${m.environmental_properties?.recycled_content || 0}%`, lowerBetter: false },
                      { label: 'Durability', key: 'durability', format: (m) => `${m.civil_properties?.durability_years || 0} years`, lowerBetter: false },
                      { label: 'Compressive Strength', key: 'strength', format: (m) => `${m.physical_properties?.compressive_strength || 0} MPa`, lowerBetter: false },
                      { label: 'Thermal Conductivity', key: 'thermal', format: (m) => `${m.physical_properties?.thermal_conductivity || 0} W/m·K`, lowerBetter: true },
                      { label: 'IS Code', key: 'isCode', format: (m) => m.civil_properties?.is_code || '-', lowerBetter: null },
                      { label: 'Quality Grade', key: 'quality', format: (m) => m.civil_properties?.quality_grade || '-', lowerBetter: null },
                      { label: 'Water Absorption', key: 'waterAbs', format: (m) => `${m.physical_properties?.water_absorption || 0}%`, lowerBetter: true },
                      { label: 'Supplier', key: 'supplier', format: (m) => m.supplier?.supplier_name || '-', lowerBetter: null },
                      { label: 'Lead Time', key: 'leadTime', format: (m) => `${m.supplier?.lead_time_days || 0} days`, lowerBetter: true },
                    ].map(row => {
                      const values = compareSelections.map(m => {
                        const val = row.format(m);
                        const numMatch = val.match(/[\d.]+/);
                        return numMatch ? parseFloat(numMatch[0]) : null;
                      });
                      
                      let bestIdx = null;
                      if (row.lowerBetter !== null && values.some(v => v !== null)) {
                        const validValues = values.map((v, i) => v !== null ? { val: v, idx: i } : null).filter(Boolean);
                        if (validValues.length > 0) {
                          bestIdx = row.lowerBetter 
                            ? validValues.reduce((a, b) => a.val < b.val ? a : b).idx
                            : validValues.reduce((a, b) => a.val > b.val ? a : b).idx;
                        }
                      }

                      return (
                        <tr key={row.key} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="p-3 font-medium text-foreground-secondary">{row.label}</td>
                          {compareSelections.map((mat, idx) => (
                            <td key={mat._id} className={`p-3 ${idx === bestIdx ? 'text-green-600 dark:text-green-400 font-bold' : 'text-foreground'}`}>
                              {row.format(mat)}
                              {idx === bestIdx && <FaCheck className="inline ml-1 text-xs" />}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Recommendation Section */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                  <FaInfoCircle className="text-blue-500" />
                  AI Recommendation
                </h3>
                <div className="space-y-2 text-sm text-foreground-secondary">
                  {(() => {
                    const mats = compareSelections;
                    const recommendations = [];
                    
                    // Find best for each criterion
                    const bestCarbon = mats.reduce((a, b) => (a.environmental_properties?.embodied_carbon || 999) < (b.environmental_properties?.embodied_carbon || 999) ? a : b);
                    const bestCost = mats.reduce((a, b) => (a.financial_properties?.cost_per_unit || 999999) < (b.financial_properties?.cost_per_unit || 999999) ? a : b);
                    const bestStrength = mats.reduce((a, b) => (a.physical_properties?.compressive_strength || 0) > (b.physical_properties?.compressive_strength || 0) ? a : b);
                    const bestDurability = mats.reduce((a, b) => (a.civil_properties?.durability_years || 0) > (b.civil_properties?.durability_years || 0) ? a : b);
                    const bestRecycled = mats.reduce((a, b) => (a.environmental_properties?.recycled_content || 0) > (b.environmental_properties?.recycled_content || 0) ? a : b);
                    
                    if (bestCarbon._id !== bestCost._id) {
                      recommendations.push(`🌿 For sustainability: ${bestCarbon.name} has the lowest carbon footprint (${bestCarbon.environmental_properties?.embodied_carbon || 0} kg CO2)`);
                    }
                    if (bestCost._id !== bestStrength._id) {
                      recommendations.push(`💰 For cost savings: ${bestCost.name} is the most economical (₹${bestCost.financial_properties?.cost_per_unit || 0}/${bestCost.financial_properties?.unit_type || ''})`);
                    }
                    if (bestStrength._id !== bestCost._id) {
                      recommendations.push(`💪 For strength: ${bestStrength.name} has the highest compressive strength (${bestStrength.physical_properties?.compressive_strength || 0} MPa)`);
                    }
                    if (bestDurability._id !== bestCost._id) {
                      recommendations.push(`🛡️ For longevity: ${bestDurability.name} offers the best durability (${bestDurability.civil_properties?.durability_years || 0} years)`);
                    }
                    if (bestRecycled.environmental_properties?.recycled_content > 0) {
                      recommendations.push(`♻️ For eco-friendliness: ${bestRecycled.name} has the highest recycled content (${bestRecycled.environmental_properties?.recycled_content}%)`);
                    }
                    
                    // Overall recommendation
                    const scores = mats.map(m => {
                      const carbonScore = m.environmental_properties?.embodied_carbon > 0 ? Math.max(0, 100 - m.environmental_properties.embodied_carbon * 5) : 50;
                      const costScore = m.financial_properties?.cost_per_unit > 0 ? Math.max(0, 100 - m.financial_properties.cost_per_unit / 50) : 50;
                      const strengthScore = (m.physical_properties?.compressive_strength || 0) * 2;
                      const recycledScore = (m.environmental_properties?.recycled_content || 0) * 2;
                      return { name: m.name, score: carbonScore * 0.3 + costScore * 0.2 + Math.min(100, strengthScore) * 0.3 + Math.min(100, recycledScore) * 0.2 };
                    });
                    const bestOverall = scores.reduce((a, b) => a.score > b.score ? a : b);
                    recommendations.push(`🏆 Overall best: ${bestOverall.name} (score: ${Math.round(bestOverall.score)}/100)`);
                    
                    return recommendations.map((rec, i) => <p key={i}>{rec}</p>);
                  })()}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button onClick={() => { setCompareSelections([]); setShowComparison(false); }} className="btn btn-outline">
                Clear Selection
              </button>
              <button onClick={() => setShowComparison(false)} className="btn btn-primary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h2 className="text-2xl font-bold">
                {editingMaterial ? "Edit Material" : "Create New Material"}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-foreground-secondary hover:text-foreground"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-border">
              <div className="flex">
                {[
                  { id: "basic", label: "Basic Info", icon: FaInfoCircle },
                  { id: "physical", label: "Physical", icon: FaRuler },
                  { id: "civil", label: "Engineering", icon: FaBuilding },
                  { id: "environmental", label: "Environmental", icon: FaLeaf },
                  {
                    id: "financial",
                    label: "Financial",
                    icon: FaMoneyBillWave,
                  },
                  { id: "supplier", label: "Supplier", icon: FaTruck },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-6 py-3 border-b-2 font-medium transition-colors ${
                      activeTab === tab.id
                        ? "border-primary text-primary"
                        : "border-transparent text-foreground-secondary hover:text-foreground"
                    }`}
                  >
                    <tab.icon className="mr-2" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === "basic" && renderBasicInfoTab()}
              {activeTab === "physical" && renderPhysicalPropertiesTab()}
              {activeTab === "civil" && renderCivilPropertiesTab()}
              {activeTab === "environmental" && renderEnvironmentalTab()}
              {activeTab === "financial" && renderFinancialTab()}
              {activeTab === "supplier" && renderSupplierTab()}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-border flex justify-end gap-4">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMaterial}
                className="btn btn-primary"
              >
                <FaCheck className="mr-2" />
                {editingMaterial ? "Update Material" : "Create Material"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Missing FaClock import handler
const FaClock = () => <span className="inline-block w-4 h-4">⏱</span>;

export default Materials;

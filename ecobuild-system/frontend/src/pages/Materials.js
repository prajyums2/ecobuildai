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
} from "react-icons/fa";

const MATERIAL_CATEGORIES = [
  { id: "Concrete", label: "Concrete & RCC" },
  { id: "Cement", label: "Cement & Binders" },
  { id: "Steel", label: "Steel & Reinforcement" },
  { id: "Blocks/Bricks", label: "Blocks & Bricks" },
  { id: "Aggregates", label: "Aggregates & Sand" },
  { id: "Masonry", label: "Masonry Systems" },
  { id: "Flooring", label: "Flooring & Tiles" },
  { id: "Timber", label: "Timber & Wood" },
  { id: "Hardwood", label: "Hardwood" },
  { id: "Softwood", label: "Softwood" },
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
  
  // Advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [carbonRange, setCarbonRange] = useState({ min: "", max: "" });
  const [recycledMin, setRecycledMin] = useState("");
  const [selectedQuality, setSelectedQuality] = useState("");
  const [greenCertified, setGreenCertified] = useState(false);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

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
        const gstRate = mat.Category === 'Cement' ? 28 : 
                       (mat.Category === 'Steel' || mat.Category === 'steel') ? 18 : 
                       (mat.Category === 'Concrete') ? 18 : 5;
        
        return {
          _id: mat._id,
          materialCode: mat.MaterialCode,
          name: mat.MaterialName || 'Unnamed Material',
          category: mat.Category || 'other',
          description: mat.Description || mat.Applications || '',
          brand: mat['BIS Code'] || mat.GradeOrModel || '',
          manufacturer: '',
          unit: verified.unit || mat.Unit || 'kg',
          status: 'active',
          isDatabase: true,
          
          financial_properties: {
            cost_per_unit: verified.rate || 0,
            currency: 'INR',
            unit_type: verified.unit || mat.Unit || 'kg',
            gst_rate: gstRate,
          },
          environmental_properties: {
            embodied_carbon: verified.carbon || 0,
            recycled_content: mat.Category === 'Blocks/Bricks' ? 20 : 0,
          },
          physical_properties: {},
          civil_properties: {
            is_code: mat['BIS Code'] || '',
            grade: mat.GradeOrModel || '',
          },
        };
      });
      
      // Load local custom materials from localStorage
      const localMaterials = JSON.parse(localStorage.getItem('ecobuild_custom_materials') || '[]');
      
      // Combine both
      const allMaterials = [...transformedDbMaterials, ...localMaterials];
      
      setMaterials(allMaterials);
      setFilteredMaterials(allMaterials);
    } catch (err) {
      console.error("Error fetching materials:", err);
      // Load from localStorage only
      const localMaterials = JSON.parse(localStorage.getItem('ecobuild_custom_materials') || '[]');
      setMaterials(localMaterials);
      setFilteredMaterials(localMaterials);
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
    <div className="max-w-7xl mx-auto p-6">
      {/* Header with Stats */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Materials Database
        </h1>
        <div className="flex items-center gap-6 text-sm text-foreground-secondary">
          <span className="flex items-center gap-1">
            <FaBox className="text-primary" />
            {materials.length} materials
          </span>
          <span className="flex items-center gap-1">
            <FaIndustry className="text-primary" />
            {categories.length} categories
          </span>
          <span className="flex items-center gap-1">
            <FaLeaf className="text-green-500" />
            {materials.filter(m => m.environmental_properties?.embodied_carbon > 0).length} with carbon data
          </span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 mb-6">
        {/* Search */}
        <div className="flex-1 relative">
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
            <FaSearch className="text-foreground-secondary" />
          </div>
          <input
            type="text"
            placeholder="Search materials by name, category, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input w-full pl-12 pr-12 py-3"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-foreground-secondary hover:text-foreground"
            >
              <FaTimes />
            </button>
          )}
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="input py-3 min-w-[180px]"
        >
          <option value="">All Categories</option>
          {MATERIAL_CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label} ({dbMaterials[cat.id] || 0})
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="input py-3 min-w-[140px]"
        >
          <option value="name">Sort: Name</option>
          <option value="price">Sort: Price</option>
          <option value="carbon">Sort: Carbon</option>
        </select>

        {/* Add Button */}
        <button
          onClick={() => {
            setEditingMaterial(null);
            resetForm();
            setShowCreateModal(true);
            setActiveTab("basic");
          }}
          className="btn btn-primary flex items-center"
        >
          <FaPlus className="mr-2" />
          Add Material
        </button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[300px] relative">
            <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-foreground-secondary" />
            <input
              type="text"
              placeholder="Search materials..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input w-full pl-12 pr-10 py-3"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-foreground-secondary"
              >
                <FaTimes />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input py-3 min-w-[180px]"
          >
            <option value="">All Categories</option>
            {MATERIAL_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input py-3 min-w-[140px]"
          >
            <option value="name">Sort: Name</option>
            <option value="price">Sort: Price</option>
            <option value="carbon">Sort: Carbon</option>
          </select>
        </div>
      </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="border-t border-border pt-4 mt-4">
            <div className="grid grid-cols-4 gap-4">
              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Price Range (₹)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceRange.min}
                    onChange={(e) =>
                      setPriceRange({ ...priceRange, min: e.target.value })
                    }
                    className="input w-full"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceRange.max}
                    onChange={(e) =>
                      setPriceRange({ ...priceRange, max: e.target.value })
                    }
                    className="input w-full"
                  />
                </div>
              </div>

              {/* Carbon Range */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Carbon (kg CO₂/unit)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={carbonRange.min}
                    onChange={(e) =>
                      setCarbonRange({ ...carbonRange, min: e.target.value })
                    }
                    className="input w-full"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={carbonRange.max}
                    onChange={(e) =>
                      setCarbonRange({ ...carbonRange, max: e.target.value })
                    }
                    className="input w-full"
                  />
                </div>
              </div>

              {/* Recycled Content */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Min Recycled Content (%)
                </label>
                <input
                  type="number"
                  placeholder="e.g., 30"
                  value={recycledMin}
                  onChange={(e) => setRecycledMin(e.target.value)}
                  className="input w-full"
                />
              </div>

              {/* Quality Grade */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Quality Grade
                </label>
                <select
                  value={selectedQuality}
                  onChange={(e) => setSelectedQuality(e.target.value)}
                  className="input w-full"
                >
                  <option value="">All Grades</option>
                  {QUALITY_GRADES.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Green Certified Toggle */}
            <div className="mt-4 flex items-center gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={greenCertified}
                  onChange={(e) => setGreenCertified(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="ml-2 text-sm text-foreground flex items-center">
                  <FaLeaf className="mr-1 text-green-600" />
                  Green Certified Only (GRIHA/IGBC/LEED/EPD)
                </span>
              </label>

              <button
                onClick={() => {
                  setPriceRange({ min: "", max: "" });
                  setCarbonRange({ min: "", max: "" });
                  setRecycledMin("");
                  setSelectedQuality("");
                  setGreenCertified(false);
                  setSearchTerm("");
                  setSelectedCategory("");
                }}
                className="text-sm text-primary hover:underline ml-auto"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}

        {/* Results count and Active Filters */}
        <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-foreground">
              {filteredMaterials.length}
            </span>
            <span className="text-foreground-secondary">
              of {materials.length} materials
            </span>
            {searchTerm && (
              <span className="text-primary font-medium">
                matching "{searchTerm}"
              </span>
            )}
          </div>
          
          {/* Active Filters Pills */}
          {(selectedCategory || priceRange.min || priceRange.max || carbonRange.min || carbonRange.max || recycledMin || selectedQuality || greenCertified) && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-foreground-secondary">Active filters:</span>
              {selectedCategory && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                  Category: {MATERIAL_CATEGORIES.find(c => c.id === selectedCategory)?.label}
                  <button onClick={() => setSelectedCategory('')} className="hover:text-primary-dark">×</button>
                </span>
              )}
              {(priceRange.min || priceRange.max) && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                  Price: ₹{priceRange.min || '0'} - ₹{priceRange.max || '∞'}
                  <button onClick={() => setPriceRange({ min: '', max: '' })} className="hover:text-primary-dark">×</button>
                </span>
              )}
              {(carbonRange.min || carbonRange.max) && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                  Carbon: {carbonRange.min || '0'} - {carbonRange.max || '∞'}
                  <button onClick={() => setCarbonRange({ min: '', max: '' })} className="hover:text-primary-dark">×</button>
                </span>
              )}
              {recycledMin && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                  Recycled: {recycledMin}%
                  <button onClick={() => setRecycledMin('')} className="hover:text-primary-dark">×</button>
                </span>
              )}
              {selectedQuality && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                  Quality: {selectedQuality}
                  <button onClick={() => setSelectedQuality('')} className="hover:text-primary-dark">×</button>
                </span>
              )}
              {greenCertified && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                  <FaLeaf className="text-xs" />
                  Green Certified
                  <button onClick={() => setGreenCertified(false)} className="hover:text-green-800">×</button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Category Summary */}
      <div className="grid grid-cols-6 gap-4 mb-6">
        {categories.map((cat) => (
          <div
            key={cat.category}
            onClick={() => {
              setSelectedCategory(cat.category);
              fetchMaterials();
            }}
            className={`card cursor-pointer hover:shadow-lg transition-shadow ${
              selectedCategory === cat.category ? "ring-2 ring-primary" : ""
            }`}
          >
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{cat.count}</div>
              <div className="text-sm text-foreground-secondary capitalize">
                {cat.category}
              </div>
            </div>
          </div>
        ))}
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
          {filteredMaterials.map((material) => (
            <div
              key={material._id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all p-5"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">{material.name}</h3>
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary capitalize">
                      {material.category}
                    </span>
                    {material.financial_properties?.cost_per_unit > 0 && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                        ₹{material.financial_properties.cost_per_unit}/{material.financial_properties.unit_type}
                      </span>
                    )}
                    {material.civil_properties?.is_code && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                        {material.civil_properties.is_code}
                      </span>
                    )}
                  </div>
                  <p className="text-foreground-secondary text-sm mb-3">
                    {material.description || material.applications || 'No description available'}
                  </p>

                  <div className="flex gap-6 text-sm">
                    {material.environmental_properties?.embodied_carbon > 0 && (
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <FaLeaf />
                        {material.environmental_properties.embodied_carbon} kg CO2/unit
                      </span>
                    )}
                    {material.financial_properties?.gst_rate && (
                      <span className="text-foreground-secondary">
                        GST: {material.financial_properties.gst_rate}%
                      </span>
                    )}
                    {material.GradeOrModel && (
                      <span className="text-foreground-secondary">
                        Grade: {material.GradeOrModel}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setExpandedMaterial(
                        expandedMaterial === material._id ? null : material._id,
                      )
                    }
                    className="btn btn-secondary btn-sm"
                  >
                    {expandedMaterial === material._id ? (
                      <FaChevronUp />
                    ) : (
                      <FaChevronDown />
                    )}
                  </button>
                  <button
                    onClick={() => handleEditMaterial(material)}
                    className="btn btn-primary btn-sm"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDeleteMaterial(material._id)}
                    className="btn btn-danger btn-sm"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedMaterial === material._id && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    {/* Physical Properties */}
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center">
                        <FaRuler className="mr-1 text-primary" /> Physical
                      </h4>
                      <ul className="space-y-1 text-foreground-secondary">
                        {material.physical_properties?.density && (
                          <li>
                            Density: {material.physical_properties.density}{" "}
                            kg/m³
                          </li>
                        )}
                        {material.physical_properties?.compressive_strength && (
                          <li>
                            Comp. Strength:{" "}
                            {material.physical_properties.compressive_strength}{" "}
                            MPa
                          </li>
                        )}
                        {material.physical_properties?.thermal_conductivity && (
                          <li>
                            Thermal Cond.:{" "}
                            {material.physical_properties.thermal_conductivity}{" "}
                            W/m·K
                          </li>
                        )}
                      </ul>
                    </div>

                    {/* Civil Properties */}
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center">
                        <FaBuilding className="mr-1 text-primary" /> Engineering
                      </h4>
                      <ul className="space-y-1 text-foreground-secondary">
                        {material.civil_properties?.structural_grade && (
                          <li>
                            Grade: {material.civil_properties.structural_grade}
                          </li>
                        )}
                        {material.civil_properties?.is_code && (
                          <li>IS Code: {material.civil_properties.is_code}</li>
                        )}
                        {material.civil_properties?.wastage_percentage && (
                          <li>
                            Wastage:{" "}
                            {material.civil_properties.wastage_percentage}%
                          </li>
                        )}
                      </ul>
                    </div>

                    {/* Environmental */}
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center">
                        <FaLeaf className="mr-1 text-green-600" /> Environmental
                      </h4>
                      <ul className="space-y-1 text-foreground-secondary">
                        {material.environmental_properties?.recycled_content !==
                          undefined && (
                          <li>
                            Recycled:{" "}
                            {material.environmental_properties.recycled_content}
                            %
                          </li>
                        )}
                        <li>
                          Recyclable:{" "}
                          {material.environmental_properties?.recyclable
                            ? "Yes"
                            : "No"}
                        </li>
                        <li>
                          Renewable:{" "}
                          {material.environmental_properties?.renewable
                            ? "Yes"
                            : "No"}
                        </li>
                      </ul>
                    </div>

                    {/* Supplier */}
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center">
                        <FaTruck className="mr-1 text-primary" /> Supplier
                      </h4>
                      <ul className="space-y-1 text-foreground-secondary">
                        {material.supplier?.supplier_name && (
                          <li>{material.supplier.supplier_name}</li>
                        )}
                        {material.supplier?.supplier_location && (
                          <li>
                            Location: {material.supplier.supplier_location}
                          </li>
                        )}
                        {material.supplier?.lead_time_days && (
                          <li>
                            Lead time: {material.supplier.lead_time_days} days
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
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

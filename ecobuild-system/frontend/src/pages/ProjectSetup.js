import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useProject } from "../context/ProjectContext";
import LocationPicker from "../components/LocationPicker";
import { ecoBuildAPI } from "../services/api";
import {
  FaArrowRight,
  FaArrowLeft,
  FaCheck,
  FaSpinner,
  FaCog,
  FaDollarSign,
  FaBuilding,
  FaMapMarkerAlt,
  FaCar,
  FaTree,
  FaWater,
  FaFire,
  FaArrowUp,
  FaHardHat,
  FaChartLine,
  FaExclamationTriangle,
  FaInfoCircle,
  FaClipboardCheck,
  FaMountain,
  FaLeaf,
} from "react-icons/fa";

// Building Classification
const MAIN_USE_CATEGORIES = [
  {
    code: "A",
    label: "Residential",
    description: "IS 875 Part 2 - Occupancy Group A",
    subTypes: [
      {
        value: "individual",
        label: "Individual House (A-1)",
        parkingFactor: 1,
      },
      {
        value: "apartment",
        label: "Apartment Building (A-2)",
        parkingFactor: 0.01,
      },
      {
        value: "group_housing",
        label: "Group Housing (A-3)",
        parkingFactor: 0.015,
      },
      { value: "hostel", label: "Hostel (A-4)", parkingFactor: 0.005 },
      { value: "dormitory", label: "Dormitory (A-5)", parkingFactor: 0.005 },
    ],
  },
  {
    code: "B",
    label: "Educational",
    description: "IS 875 Part 2 - Occupancy Group B",
    subTypes: [
      { value: "school", label: "School (B-1)", parkingFactor: 0.02 },
      {
        value: "college",
        label: "College/University (B-2)",
        parkingFactor: 0.015,
      },
      {
        value: "training",
        label: "Training Center (B-3)",
        parkingFactor: 0.02,
      },
    ],
  },
  {
    code: "C",
    label: "Institutional (Medical)",
    description: "IS 875 Part 2 - Occupancy Group C",
    subTypes: [
      {
        value: "hospital",
        label: "Hospital (>50 beds) (C-1)",
        parkingFactor: 0.03,
      },
      {
        value: "clinic",
        label: "Clinic/Dispensary (C-2)",
        parkingFactor: 0.04,
      },
      {
        value: "nursing_home",
        label: "Nursing Home (C-3)",
        parkingFactor: 0.025,
      },
    ],
  },
  {
    code: "D",
    label: "Institutional (Other)",
    description: "IS 875 Part 2 - Occupancy Group D",
    subTypes: [
      { value: "assembly", label: "Assembly Hall (D-1)", parkingFactor: 0.025 },
      { value: "library", label: "Library (D-2)", parkingFactor: 0.02 },
      { value: "museum", label: "Museum/Gallery (D-3)", parkingFactor: 0.02 },
      {
        value: "religious",
        label: "Religious Building (D-4)",
        parkingFactor: 0.015,
      },
      {
        value: "prison",
        label: "Correctional Facility (D-5)",
        parkingFactor: 0.01,
      },
    ],
  },
  {
    code: "E",
    label: "Commercial (Business)",
    description: "IS 875 Part 2 - Occupancy Group E",
    subTypes: [
      { value: "office", label: "Office Building (E-1)", parkingFactor: 0.02 },
      { value: "bank", label: "Bank/Financial (E-2)", parkingFactor: 0.025 },
      { value: "it_park", label: "IT Park/SEZ (E-3)", parkingFactor: 0.015 },
    ],
  },
  {
    code: "F",
    label: "Commercial (Mercantile)",
    description: "IS 875 Part 2 - Occupancy Group F",
    subTypes: [
      { value: "retail", label: "Retail Shop (F-1)", parkingFactor: 0.025 },
      { value: "mall", label: "Shopping Mall (F-2)", parkingFactor: 0.03 },
      { value: "market", label: "Market Place (F-3)", parkingFactor: 0.02 },
      { value: "hotel", label: "Hotel/Restaurant (F-4)", parkingFactor: 0.035 },
    ],
  },
  {
    code: "G",
    label: "Industrial",
    description: "IS 875 Part 2 - Occupancy Group G",
    subTypes: [
      { value: "light", label: "Light Industry (G-1)", parkingFactor: 0.005 },
      { value: "medium", label: "Medium Industry (G-2)", parkingFactor: 0.004 },
      { value: "heavy", label: "Heavy Industry (G-3)", parkingFactor: 0.003 },
      { value: "warehouse", label: "Warehouse (G-4)", parkingFactor: 0.002 },
      { value: "workshop", label: "Workshop (G-5)", parkingFactor: 0.005 },
    ],
  },
  {
    code: "H",
    label: "Storage",
    description: "IS 875 Part 2 - Occupancy Group H",
    subTypes: [
      {
        value: "cold_storage",
        label: "Cold Storage (H-1)",
        parkingFactor: 0.003,
      },
      {
        value: "godown",
        label: "Godown/Warehouse (H-2)",
        parkingFactor: 0.002,
      },
      {
        value: "bulk_storage",
        label: "Bulk Storage (H-3)",
        parkingFactor: 0.001,
      },
    ],
  },
  {
    code: "J",
    label: "Hazardous",
    description: "IS 875 Part 2 - Occupancy Group J",
    subTypes: [
      {
        value: "flammable",
        label: "Flammable Materials (J-1)",
        parkingFactor: 0.005,
      },
      { value: "explosive", label: "Explosives (J-2)", parkingFactor: 0.005 },
      { value: "toxic", label: "Toxic/Hazardous (J-3)", parkingFactor: 0.005 },
    ],
  },
];

// Soil Types with typical parameters
const SOIL_TYPES = [
  {
    value: "laterite",
    label: "Laterite Soil",
    typicalSBC: 150,
    typicalCBR: 10,
    description: "Common in Kerala, good bearing capacity",
  },
  {
    value: "alluvial",
    label: "Alluvial Soil",
    typicalSBC: 100,
    typicalCBR: 8,
    description: "River deposits, moderate bearing",
  },
  {
    value: "clay",
    label: "Clay (Soft)",
    typicalSBC: 50,
    typicalCBR: 3,
    description: "Low permeability, needs special foundation",
  },
  {
    value: "sandy",
    label: "Sandy Soil",
    typicalSBC: 120,
    typicalCBR: 15,
    description: "Good drainage, moderate bearing",
  },
  {
    value: "rocky",
    label: "Rocky/Weathered Rock",
    typicalSBC: 300,
    typicalCBR: 20,
    description: "Excellent bearing capacity",
  },
  {
    value: "marshy",
    label: "Marshy/Peat",
    typicalSBC: 30,
    typicalCBR: 2,
    description: "Poor bearing, requires pile foundation",
  },
];

// Foundation Types
const FOUNDATION_TYPES = [
  { value: "isolated", label: "Isolated Footing", minSBC: 100, maxSBC: 9999 },
  { value: "combined", label: "Combined Footing", minSBC: 80, maxSBC: 200 },
  { value: "raft", label: "Raft/Mat Foundation", minSBC: 50, maxSBC: 150 },
  { value: "pile", label: "Pile Foundation", minSBC: 0, maxSBC: 9999 },
  { value: "well", label: "Well Foundation", minSBC: 0, maxSBC: 9999 },
];

function ProjectSetup() {
  const navigate = useNavigate();
  const {
    project,
    updateProject,
    updateLocation,
    updateBuildingParams,
    updateBuildingClassification,
    updateGeotechnical,
    completeProjectSetup,
  } = useProject();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errors, setErrors] = useState({});
  const [calculatedParking, setCalculatedParking] = useState(0);

  // Get selected category and subtype - with null safety
  const selectedCategory = project ? MAIN_USE_CATEGORIES.find(
    (cat) => cat.code === project.buildingClassification?.mainUse,
  ) : null;
  const selectedSubType = selectedCategory?.subTypes.find(
    (sub) => sub.value === project?.buildingClassification?.subType,
  );

  // FIXED: Added missing calculateParking function
  const calculateParking = useCallback(() => {
    if (!selectedSubType || !project?.buildingParams?.builtUpArea) {
      setCalculatedParking(0);
      return;
    }

    const parking = Math.ceil(
      project.buildingParams.builtUpArea * selectedSubType.parkingFactor,
    );
    setCalculatedParking(parking);
  }, [selectedSubType, project?.buildingParams?.builtUpArea]);

  // Auto-calculate parking when building params change
  useEffect(() => {
    calculateParking();
  }, [calculateParking]);

  // Auto-recommend foundation based on SBC
  useEffect(() => {
    recommendFoundation();
  }, [project.geotechnical.safeBearingCapacity]);

  const recommendFoundation = useCallback(() => {
    const sbc = project.geotechnical.safeBearingCapacity;
    if (!sbc) return;

    let recommended = "isolated";
    if (sbc < 50) {
      recommended = "pile";
    } else if (sbc < 80) {
      recommended = "raft";
    } else if (sbc < 100) {
      recommended = "combined";
    } else {
      recommended = "isolated";
    }

    updateGeotechnical({ recommendedFoundationType: recommended });
  }, [project.geotechnical.safeBearingCapacity, updateGeotechnical]);

  const validateStep = useCallback(
    (stepNum) => {
      const newErrors = {};

      if (stepNum === 1) {
        if (!project.name?.trim()) {
          newErrors.name = "Project name is required";
        }
        if (!project.location.lat || !project.location.lon) {
          newErrors.location = "Please select a location on the map";
        }
      }

      if (stepNum === 2) {
        if (!project.buildingClassification.mainUse) {
          newErrors.mainUse = "Please select a building use category";
        }
        if (
          !project.buildingParams.plotArea ||
          project.buildingParams.plotArea <= 0
        ) {
          newErrors.plotArea = "Plot area must be greater than 0";
        }
        if (
          !project.buildingParams.builtUpArea ||
          project.buildingParams.builtUpArea <= 0
        ) {
          newErrors.builtUpArea = "Built-up area must be greater than 0";
        }
        // Built-up area CAN exceed plot area in multi-story buildings (via FAR/FSI)
        // Only validate against MAX_FAR, not plot area
        const maxAllowedBuiltUpArea = project.buildingParams.plotArea * 3.0; // Max FAR 3.0
        if (
          project.buildingParams.builtUpArea > maxAllowedBuiltUpArea
        ) {
          newErrors.builtUpArea = `Built-up area cannot exceed ${maxAllowedBuiltUpArea} sqm (FAR 3.0 max)`;
        }
        if (
          !project.buildingParams.numFloors ||
          project.buildingParams.numFloors < 1
        ) {
          newErrors.numFloors = "Number of floors must be at least 1";
        }
        if (
          !project.buildingParams.height ||
          project.buildingParams.height <= 0
        ) {
          newErrors.height = "Building height is required";
        }
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [project],
  );

  const handleLocationSelect = useCallback(
    (lat, lon) => {
      updateLocation({ lat, lon });
      if (errors.location) {
        setErrors((prev) => ({ ...prev, location: null }));
      }
    },
    [updateLocation, errors.location],
  );

  const handleLocationSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(1)) return;

    setLoading(true);
    try {
      const response = await ecoBuildAPI.getEnvironmentalData(
        project.location.lat,
        project.location.lon,
      );
      updateProject({ environmentalData: response.data });
      setStep(2);
    } catch (error) {
      console.error("Failed to fetch environmental data:", error);
      setErrors({
        submit: "Failed to fetch environmental data. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBuildingParamsSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (!validateStep(2)) return;
      setStep(3);
    },
    [validateStep],
  );

  const handleComplete = useCallback(() => {
    updateProject({ isConfigured: true });
    completeProjectSetup();
    navigate("/");
  }, [updateProject, navigate, completeProjectSetup]);

  const COST_PER_SQM = 16000; // Base construction cost: ₹16000 per sqm (≈₹1500 per sqft)

  const calculateFAR = useCallback(() => {
    const plotArea = project.buildingParams.plotArea || 0;
    const builtUpArea = project.buildingParams.builtUpArea || 0;
    if (plotArea === 0) return 0;
    return (builtUpArea / plotArea).toFixed(2);
  }, [project.buildingParams.plotArea, project.buildingParams.builtUpArea]);

  // Auto-calculate budget from built-up area if not manually set
  const calculateEstimatedBudget = useCallback(() => {
    const builtUpArea = project.buildingParams.builtUpArea || 0;
    const manualBudget = project.buildingParams.totalBudget || 0;
    
    // Only auto-calculate if no manual budget override
    if (manualBudget === 0 && builtUpArea > 0) {
      const estimated = Math.round((builtUpArea * COST_PER_SQM) / 100000); // Convert to Lakhs
      return estimated;
    }
    return manualBudget;
  }, [project.buildingParams.builtUpArea, project.buildingParams.totalBudget]);

  const getSoilRecommendation = useCallback(() => {
    const soil = SOIL_TYPES.find(
      (s) => s.value === project.geotechnical.soilType,
    );
    if (!soil) return null;

    return {
      sbc: soil.typicalSBC,
      cbr: soil.typicalCBR,
      foundation:
        soil.typicalSBC < 50
          ? "Pile Foundation Recommended"
          : soil.typicalSBC < 100
            ? "Raft Foundation Recommended"
            : "Isolated Footing Suitable",
    };
  }, [project.geotechnical.soilType]);

  const handleSoilTypeChange = useCallback(
    (soilType) => {
      const soil = SOIL_TYPES.find((s) => s.value === soilType);
      if (soil) {
        updateGeotechnical({
          soilType,
          safeBearingCapacity: soil.typicalSBC,
          cbrSubgrade: soil.typicalCBR,
        });
      }
    },
    [updateGeotechnical],
  );

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          <FaBuilding className="inline mr-3" />
          Project Setup Wizard
        </h1>
        <p className="text-foreground-secondary">
          Configure your project for quantity survey, BoQ, and sustainability
          assessment
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        {[
          { num: 1, label: "Location" },
          { num: 2, label: "Building & Geotech" },
          { num: 3, label: "Review" },
        ].map((s, idx) => (
          <React.Fragment key={s.num}>
            <div className="flex flex-col items-center">
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg transition-all ${
                  step >= s.num
                    ? "bg-primary text-white shadow-lg"
                    : "bg-background-tertiary text-foreground-muted"
                }`}
              >
                {step > s.num ? <FaCheck /> : s.num}
              </div>
              <span
                className={`mt-2 text-xs font-medium ${
                  step >= s.num ? "text-primary" : "text-foreground-muted"
                }`}
              >
                {s.label}
              </span>
            </div>
            {idx < 2 && (
              <div
                className={`w-32 h-1 mx-4 transition-all ${
                  step > s.num ? "bg-primary" : "bg-background-tertiary"
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Location */}
      {step === 1 && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <FaMapMarkerAlt className="text-primary" />
              Step 1: Project Location
            </h2>
            <p className="text-foreground-secondary mt-1">
              Select your project location to fetch environmental data and local
              regulations
            </p>
          </div>
          <div className="card-body">
            <form onSubmit={handleLocationSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="project-name"
                    className="block text-sm font-medium text-foreground-secondary mb-2"
                  >
                    Project Name <span className="text-error">*</span>
                  </label>
                  <input
                    id="project-name"
                    type="text"
                    value={project.name}
                    onChange={(e) => {
                      updateProject({ name: e.target.value });
                      if (errors.name)
                        setErrors((prev) => ({ ...prev, name: null }));
                    }}
                    placeholder="e.g., Green Valley Residency"
                    className={`input ${errors.name ? "border-error" : ""}`}
                    aria-invalid={errors.name ? "true" : "false"}
                  />
                  {errors.name && (
                    <p className="text-error text-xs mt-1" role="alert">
                      {errors.name}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="project-desc"
                    className="block text-sm font-medium text-foreground-secondary mb-2"
                  >
                    Project Description
                  </label>
                  <input
                    id="project-desc"
                    type="text"
                    value={project.description || ""}
                    onChange={(e) =>
                      updateProject({ description: e.target.value })
                    }
                    placeholder="Brief description of the project"
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="site-address"
                  className="block text-sm font-medium text-foreground-secondary mb-2"
                >
                  Site Address
                </label>
                <input
                  id="site-address"
                  type="text"
                  value={project.location.address || ""}
                  onChange={(e) => updateLocation({ address: e.target.value })}
                  placeholder="Full postal address"
                  className="input"
                />
              </div>

              <LocationPicker
                onLocationSelect={handleLocationSelect}
                initialPosition={[project.location.lat, project.location.lon]}
              />
              {errors.location && (
                <p
                  className="text-error text-sm flex items-center gap-1"
                  role="alert"
                >
                  <FaExclamationTriangle /> {errors.location}
                </p>
              )}

              {errors.submit && (
                <div
                  className="p-3 bg-error-bg border border-error rounded-lg"
                  role="alert"
                >
                  <p className="text-error text-sm">{errors.submit}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full"
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <FaSpinner
                      className="animate-spin mr-2"
                      aria-hidden="true"
                    />
                    Fetching Environmental Data...
                  </>
                ) : (
                  <>
                    <FaArrowRight className="mr-2" aria-hidden="true" />
                    Continue to Building Parameters
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Step 2: Building & Geotechnical */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Building Classification Section */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <FaBuilding className="text-primary" />
                Building Classification
              </h2>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="main-use"
                    className="block text-sm font-medium text-foreground-secondary mb-2"
                  >
                    Main Use Category <span className="text-error">*</span>
                  </label>
                  <select
                    id="main-use"
                    value={project.buildingClassification.mainUse}
                    onChange={(e) => {
                      const newCategory = MAIN_USE_CATEGORIES.find(
                        (cat) => cat.code === e.target.value,
                      );
                      updateBuildingClassification({
                        mainUse: e.target.value,
                        subType: newCategory?.subTypes[0]?.value || "",
                      });
                      if (errors.mainUse)
                        setErrors((prev) => ({ ...prev, mainUse: null }));
                    }}
                    className={`input ${errors.mainUse ? "border-error" : ""}`}
                    aria-invalid={errors.mainUse ? "true" : "false"}
                  >
                    <option value="">Select a category...</option>
                    {MAIN_USE_CATEGORIES.map((cat) => (
                      <option key={cat.code} value={cat.code}>
                        {cat.code} - {cat.label}
                      </option>
                    ))}
                  </select>
                  {selectedCategory && (
                    <p className="text-xs text-foreground-tertiary mt-1">
                      {selectedCategory.description}
                    </p>
                  )}
                  {errors.mainUse && (
                    <p className="text-error text-xs mt-1" role="alert">
                      {errors.mainUse}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="sub-type"
                    className="block text-sm font-medium text-foreground-secondary mb-2"
                  >
                    Sub-Type
                  </label>
                  <select
                    id="sub-type"
                    value={project.buildingClassification.subType}
                    onChange={(e) =>
                      updateBuildingClassification({ subType: e.target.value })
                    }
                    className="input"
                    disabled={!selectedCategory}
                  >
                    {selectedCategory?.subTypes.map((sub) => (
                      <option key={sub.value} value={sub.value}>
                        {sub.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Building Parameters */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <FaChartLine className="text-primary" />
                Building Parameters
              </h2>
            </div>
            <div className="card-body">
              <form onSubmit={handleBuildingParamsSubmit} className="space-y-6">
                {/* Area Parameters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="plot-area"
                      className="block text-xs font-medium text-foreground-secondary mb-1"
                    >
                      Plot Area (sqm) <span className="text-error">*</span>
                    </label>
                    <input
                      id="plot-area"
                      type="number"
                      value={project.buildingParams.plotArea || ""}
                      onChange={(e) => {
                        updateBuildingParams({
                          plotArea: parseFloat(e.target.value) || 0,
                        });
                        if (errors.plotArea)
                          setErrors((prev) => ({ ...prev, plotArea: null }));
                      }}
                      className={`input ${errors.plotArea ? "border-error" : ""}`}
                      min="0"
                      step="0.01"
                      aria-invalid={errors.plotArea ? "true" : "false"}
                    />
                    {errors.plotArea && (
                      <p className="text-error text-xs mt-1" role="alert">
                        {errors.plotArea}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="built-up-area"
                      className="block text-xs font-medium text-foreground-secondary mb-1"
                    >
                      Built-up Area (sqm) <span className="text-error">*</span>
                    </label>
                    <input
                      id="built-up-area"
                      type="number"
                      value={project.buildingParams.builtUpArea || ""}
                      onChange={(e) => {
                        updateBuildingParams({
                          builtUpArea: parseFloat(e.target.value) || 0,
                        });
                        if (errors.builtUpArea)
                          setErrors((prev) => ({ ...prev, builtUpArea: null }));
                      }}
                      className={`input ${errors.builtUpArea ? "border-error" : ""}`}
                      min="0"
                      step="0.01"
                      aria-invalid={errors.builtUpArea ? "true" : "false"}
                    />
                    {errors.builtUpArea && (
                      <p className="text-error text-xs mt-1" role="alert">
                        {errors.builtUpArea}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-secondary mb-1">
                      FAR (Floor Area Ratio)
                    </label>
                    <div className="input bg-background-tertiary flex items-center">
                      <span className="font-mono">{calculateFAR()}</span>
                    </div>
                  </div>
                </div>

                {/* Floor & Height */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label
                      htmlFor="num-floors"
                      className="block text-xs font-medium text-foreground-secondary mb-1"
                    >
                      Number of Floors <span className="text-error">*</span>
                    </label>
                    <input
                      id="num-floors"
                      type="number"
                      min="1"
                      value={project.buildingParams.numFloors || ""}
                      onChange={(e) => {
                        const floors = parseInt(e.target.value) || 1;
                        updateBuildingParams({
                          numFloors: floors,
                          height: floors * (project.buildingParams.floorHeight || 3.2)
                        });
                        if (errors.numFloors)
                          setErrors((prev) => ({ ...prev, numFloors: null }));
                      }}
                      className={`input ${errors.numFloors ? "border-error" : ""}`}
                      aria-invalid={errors.numFloors ? "true" : "false"}
                    />
                    {errors.numFloors && (
                      <p className="text-error text-xs mt-1" role="alert">
                        {errors.numFloors}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="basement-floors"
                      className="block text-xs font-medium text-foreground-secondary mb-1"
                    >
                      Basement Floors
                    </label>
                    <input
                      id="basement-floors"
                      type="number"
                      min="0"
                      value={project.buildingParams.basementFloors || ""}
                      onChange={(e) =>
                        updateBuildingParams({
                          basementFloors: parseInt(e.target.value) || 0,
                        })
                      }
                      className="input"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="building-height"
                      className="block text-xs font-medium text-foreground-secondary mb-1"
                    >
                      Building Height (m) <span className="text-error">*</span>
                    </label>
                    <input
                      id="building-height"
                      type="number"
                      step="0.1"
                      value={project.buildingParams.height || ""}
                      onChange={(e) => {
                        updateBuildingParams({
                          height: parseFloat(e.target.value) || 0,
                        });
                        if (errors.height)
                          setErrors((prev) => ({ ...prev, height: null }));
                      }}
                      className={`input ${errors.height ? "border-error" : ""}`}
                      aria-invalid={errors.height ? "true" : "false"}
                    />
                    {errors.height && (
                      <p className="text-error text-xs mt-1" role="alert">
                        {errors.height}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="calculated-parking"
                      className="block text-xs font-medium text-foreground-secondary mb-1"
                    >
                      Required Parking Spaces
                    </label>
                    <div className="input bg-background-tertiary flex items-center font-mono">
                      {calculatedParking}
                    </div>
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8 pt-6 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn btn-secondary"
                  >
                    <FaArrowLeft className="mr-2" aria-hidden="true" />
                    Previous
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Next
                    <FaArrowRight className="ml-2" aria-hidden="true" />
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Structural Assumptions */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <FaBuilding className="text-primary" />
                Structural Assumptions
              </h2>
              <p className="text-xs text-foreground-secondary mt-1">
                Per IS 456 & IS 875 | Default values for typical residential buildings
              </p>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground-secondary mb-1">
                    Structure Type
                  </label>
                  <select
                    value={project.buildingParams.structureType || 'load_bearing'}
                    onChange={(e) => updateBuildingParams({ structureType: e.target.value })}
                    className="input"
                  >
                    <option value="load_bearing">Load-Bearing Masonry</option>
                    <option value="framed">Framed Structure (Columns + Beams)</option>
                    <option value="mixed">Mixed (Partial Framing)</option>
                  </select>
                  <p className="text-xs text-foreground-muted mt-1">
                    {project.buildingParams.structureType === 'load_bearing' 
                      ? 'Walls carry loads. No columns/beams. Common in Kerala residential.'
                      : project.buildingParams.structureType === 'framed'
                      ? 'Columns + beams + slab. For larger/commercial buildings.'
                      : 'Combination of both. Some walls load-bearing, some framed.'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-secondary mb-1">
                    Slab Thickness (mm)
                  </label>
                  <select
                    value={project.buildingParams.slabThickness || 150}
                    onChange={(e) => updateBuildingParams({ slabThickness: parseInt(e.target.value) })}
                    className="input"
                  >
                    <option value={120}>120 mm (Roof)</option>
                    <option value={150}>150 mm (Typical)</option>
                    <option value={180}>180 mm (Heavy)</option>
                    <option value={200}>200 mm (Special)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-secondary mb-1">
                    Steel Ratio (kg/m³)
                  </label>
                  <select
                    value={project.buildingParams.steelRatio || 100}
                    onChange={(e) => updateBuildingParams({ steelRatio: parseInt(e.target.value) })}
                    className="input"
                  >
                    <option value={60}>60 kg/m³ (Light)</option>
                    <option value={80}>80 kg/m³ (Normal)</option>
                    <option value={100}>100 kg/m³ (Typical)</option>
                    <option value={120}>120 kg/m³ (Heavy)</option>
                    <option value={150}>150 kg/m³ (Special)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-secondary mb-1">
                    Wall Thickness (mm)
                  </label>
                  <select
                    value={project.buildingParams.wallThickness || 230}
                    onChange={(e) => updateBuildingParams({ wallThickness: parseInt(e.target.value) })}
                    className="input"
                  >
                    <option value={115}>115 mm (Half brick)</option>
                    <option value={230}>230 mm (Full brick)</option>
                    <option value={200}>200 mm (AAC Block)</option>
                    <option value={250}>250 mm (Concrete Block)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-secondary mb-1">
                    Floor Height (m)
                  </label>
                  <input
                    type="number"
                    value={project.buildingParams.floorHeight || 3.2}
                    onChange={(e) => updateBuildingParams({ 
                      floorHeight: parseFloat(e.target.value),
                      height: parseFloat(e.target.value) * project.buildingParams.numFloors
                    })}
                    className="input"
                    step="0.1"
                    min="2.4"
                    max="5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-secondary mb-1">
                    Exposure Condition (IS 456)
                  </label>
                  <select
                    value={project.buildingParams.exposureCondition || 'moderate'}
                    onChange={(e) => updateBuildingParams({ exposureCondition: e.target.value })}
                    className="input"
                  >
                    <option value="mild">Mild (Interior)</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                    <option value="verySevere">Very Severe</option>
                    <option value="extreme">Extreme</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-secondary mb-1">
                    Sustainability Priority
                  </label>
                  <select
                    value={project.buildingParams.sustainabilityPriority || 'high'}
                    onChange={(e) => updateBuildingParams({ sustainabilityPriority: e.target.value })}
                    className="input"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              
              {/* New Section: Design Standards */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Design Standards</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground-secondary mb-1">
                      Concrete Grade (IS 456)
                    </label>
                    <select
                      value={project.buildingParams.concreteGrade || 'm20'}
                      onChange={(e) => updateBuildingParams({ concreteGrade: e.target.value })}
                      className="input"
                    >
                      <option value="m15">M15 (1:2:4) - PCC</option>
                      <option value="m20">M20 (1:1.5:3) - General RCC</option>
                      <option value="m25">M25 (1:1:2) - Columns & Beams</option>
                      <option value="m30">M30 - High Strength</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-secondary mb-1">
                      Steel Grade (IS 456)
                    </label>
                    <select
                      value={project.buildingParams.steelGrade || 'fe500'}
                      onChange={(e) => updateBuildingParams({ steelGrade: e.target.value })}
                      className="input"
                    >
                      <option value="fe250">Fe 250 (Mild Steel)</option>
                      <option value="fe415">Fe 415 (HYSD)</option>
                      <option value="fe500">Fe 500 TMT - Recommended</option>
                      <option value="fe500d">Fe 500D (Ductile)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-secondary mb-1">
                      Foundation Type (IS 1905)
                    </label>
                    <select
                      value={project.buildingParams.foundationType || 'isolated'}
                      onChange={(e) => updateBuildingParams({ foundationType: e.target.value })}
                      className="input"
                    >
                      <option value="isolated">Isolated Footing</option>
                      <option value="combined">Combined Footing</option>
                      <option value="raft">Raft Foundation</option>
                      <option value="pile">Pile Foundation</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {/* New Section: Seismic & Wind */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Seismic & Wind Design</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground-secondary mb-1">
                      Seismic Zone (IS 1893)
                    </label>
                    <select
                      value={project.buildingParams.seismicZone || 'III'}
                      onChange={(e) => updateBuildingParams({ seismicZone: e.target.value })}
                      className="input"
                    >
                      <option value="II">Zone II - Low Risk</option>
                      <option value="III">Zone III - Moderate Risk (Kerala)</option>
                      <option value="IV">Zone IV - High Risk</option>
                      <option value="V">Zone V - Very High Risk</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-secondary mb-1">
                      Wind Speed (m/s) - IS 875 Part 3
                    </label>
                    <select
                      value={project.buildingParams.windSpeed || 39}
                      onChange={(e) => updateBuildingParams({ windSpeed: parseInt(e.target.value) })}
                      className="input"
                    >
                      <option value={33}>33 m/s - Inland Kerala</option>
                      <option value={39}>39 m/s - Coastal Kerala</option>
                      <option value={44}>44 m/s - Hilly Region</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {/* New Section: Live Loads */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Load Design</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground-secondary mb-1">
                      Live Load (kN/m²) - IS 875 Part 2
                    </label>
                    <select
                      value={project.buildingParams.liveLoad || 2}
                      onChange={(e) => updateBuildingParams({ liveLoad: parseFloat(e.target.value) })}
                      className="input"
                    >
                      <option value={2}>2 kN/m² - Residential</option>
                      <option value={3}>3 kN/m² - Office</option>
                      <option value={4}>4 kN/m² - Assembly</option>
                      <option value={5}>5 kN/m² - Library</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-secondary mb-1">
                      Dead Load Factor (IS 456)
                    </label>
                    <input
                      type="number"
                      value={project.buildingParams.deadLoadFactor || 1.5}
                      onChange={(e) => updateBuildingParams({ deadLoadFactor: parseFloat(e.target.value) })}
                      className="input"
                      step="0.1"
                      min="1.2"
                      max="2.0"
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-primary-bg rounded-lg border border-primary">
                <p className="text-sm text-primary">
                  <strong>Note:</strong> These defaults are based on IS 456 (Plain & Reinforced Concrete) and IS 875 (Dead, Imposed & Wind Loads). 
                  Adjust based on structural design requirements.
                </p>
              </div>
            </div>
          </div>

          {/* Geotechnical Parameters */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <FaMountain className="text-primary" />
                Geotechnical Parameters
              </h2>
            </div>
            <div className="card-body space-y-6">
              {/* Soil Type Selection */}
              <div>
                <label
                  htmlFor="soil-type"
                  className="block text-sm font-medium text-foreground-secondary mb-2"
                >
                  Soil Type
                </label>
                <select
                  id="soil-type"
                  value={project.geotechnical.soilType}
                  onChange={(e) => handleSoilTypeChange(e.target.value)}
                  className="input"
                >
                  <option value="">Select soil type...</option>
                  {SOIL_TYPES.map((soil) => (
                    <option key={soil.value} value={soil.value}>
                      {soil.label}
                    </option>
                  ))}
                </select>
                {project.geotechnical.soilType && (
                  <p className="text-xs text-foreground-tertiary mt-1">
                    {
                      SOIL_TYPES.find(
                        (s) => s.value === project.geotechnical.soilType,
                      )?.description
                    }
                  </p>
                )}
              </div>

              {/* CBR Values */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="cbr-subgrade"
                    className="block text-xs font-medium text-foreground-secondary mb-1"
                  >
                    CBR - Subgrade (%)
                  </label>
                  <input
                    id="cbr-subgrade"
                    type="number"
                    step="0.1"
                    value={project.geotechnical.cbrSubgrade || ""}
                    onChange={(e) =>
                      updateGeotechnical({
                        cbrSubgrade: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="input"
                    placeholder="IS 2720 Part 16"
                  />
                </div>
                <div>
                  <label
                    htmlFor="cbr-subbase"
                    className="block text-xs font-medium text-foreground-secondary mb-1"
                  >
                    CBR - Sub-base (%)
                  </label>
                  <input
                    id="cbr-subbase"
                    type="number"
                    step="0.1"
                    value={project.geotechnical.cbrSubBase || ""}
                    onChange={(e) =>
                      updateGeotechnical({
                        cbrSubBase: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="input"
                  />
                </div>
                <div>
                  <label
                    htmlFor="cbr-base"
                    className="block text-xs font-medium text-foreground-secondary mb-1"
                  >
                    CBR - Base (%)
                  </label>
                  <input
                    id="cbr-base"
                    type="number"
                    step="0.1"
                    value={project.geotechnical.cbrBase || ""}
                    onChange={(e) =>
                      updateGeotechnical({
                        cbrBase: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="input"
                  />
                </div>
              </div>

              {/* SBC and Groundwater */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="sbc"
                    className="block text-xs font-medium text-foreground-secondary mb-1"
                  >
                    Safe Bearing Capacity (kN/m²)
                  </label>
                  <input
                    id="sbc"
                    type="number"
                    value={project.geotechnical.safeBearingCapacity || ""}
                    onChange={(e) =>
                      updateGeotechnical({
                        safeBearingCapacity: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="input"
                    placeholder="IS 6403"
                  />
                </div>
                <div>
                  <label
                    htmlFor="groundwater"
                    className="block text-xs font-medium text-foreground-secondary mb-1"
                  >
                    Groundwater Level (m below GL)
                  </label>
                  <input
                    id="groundwater"
                    type="number"
                    step="0.1"
                    value={project.geotechnical.groundwaterLevel || ""}
                    onChange={(e) =>
                      updateGeotechnical({
                        groundwaterLevel: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="input"
                  />
                </div>
                <div>
                  <label
                    htmlFor="spt-n"
                    className="block text-xs font-medium text-foreground-secondary mb-1"
                  >
                    SPT N-value at Foundation Level
                  </label>
                  <input
                    id="spt-n"
                    type="number"
                    value={project.geotechnical.sptNAtFoundation || ""}
                    onChange={(e) =>
                      updateGeotechnical({
                        sptNAtFoundation: parseInt(e.target.value) || 0,
                      })
                    }
                    className="input"
                    placeholder="IS 2131"
                  />
                </div>
              </div>

              {/* Atterberg Limits */}
              <div>
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <FaInfoCircle className="text-primary" aria-hidden="true" />
                  Atterberg Limits (IS 2720 Part 5)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="liquid-limit"
                      className="block text-xs font-medium text-foreground-secondary mb-1"
                    >
                      Liquid Limit (LL) %
                    </label>
                    <input
                      id="liquid-limit"
                      type="number"
                      value={project.geotechnical.liquidLimit || ""}
                      onChange={(e) =>
                        updateGeotechnical({
                          liquidLimit: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="input"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="plastic-limit"
                      className="block text-xs font-medium text-foreground-secondary mb-1"
                    >
                      Plastic Limit (PL) %
                    </label>
                    <input
                      id="plastic-limit"
                      type="number"
                      value={project.geotechnical.plasticLimit || ""}
                      onChange={(e) =>
                        updateGeotechnical({
                          plasticLimit: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-secondary mb-1">
                      Plasticity Index (PI) %
                    </label>
                    <div className="input bg-background-tertiary">
                      {(project.geotechnical.liquidLimit || 0) -
                        (project.geotechnical.plasticLimit || 0)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Foundation Recommendation */}
              <div className="p-4 bg-primary-bg border border-primary rounded-lg">
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <FaHardHat className="text-primary" aria-hidden="true" />
                  Foundation Recommendation
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="foundation-type"
                      className="block text-xs font-medium text-foreground-secondary mb-1"
                    >
                      Recommended Foundation Type
                    </label>
                    <select
                      id="foundation-type"
                      value={
                        project.geotechnical.recommendedFoundationType || ""
                      }
                      onChange={(e) =>
                        updateGeotechnical({
                          recommendedFoundationType: e.target.value,
                        })
                      }
                      className="input"
                    >
                      {FOUNDATION_TYPES.map((ft) => (
                        <option key={ft.value} value={ft.value}>
                          {ft.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="foundation-depth"
                      className="block text-xs font-medium text-foreground-secondary mb-1"
                    >
                      Foundation Depth (m)
                    </label>
                    <input
                      id="foundation-depth"
                      type="number"
                      step="0.1"
                      value={project.geotechnical.foundationDepth || ""}
                      onChange={(e) =>
                        updateGeotechnical({
                          foundationDepth: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="input"
                      placeholder="IS 1904"
                    />
                  </div>
                </div>
                {project.geotechnical.safeBearingCapacity > 0 && (
                  <p className="mt-3 text-sm text-foreground-secondary">
                    <FaInfoCircle className="inline mr-1" aria-hidden="true" />
                    Based on SBC of {
                      project.geotechnical.safeBearingCapacity
                    }{" "}
                    kN/m²,{" "}
                    {
                      FOUNDATION_TYPES.find(
                        (ft) =>
                          ft.value ===
                          project.geotechnical.recommendedFoundationType,
                      )?.label
                    }{" "}
                    is recommended.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Advanced Settings Toggle */}
          <div className="card">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-background-tertiary transition-colors rounded-lg"
              aria-expanded={showAdvanced}
            >
              <div className="flex items-center gap-2">
                <FaCog className="text-primary" aria-hidden="true" />
                <span className="font-semibold">
                  Advanced Settings & Manual Overrides
                </span>
              </div>
              <span className="text-primary" aria-hidden="true">
                {showAdvanced ? "−" : "+"}
              </span>
            </button>

            {showAdvanced && (
              <div className="p-4 border-t border-border space-y-4">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <FaDollarSign className="text-primary" aria-hidden="true" />
                  Budget & Sustainability Overrides
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="total-budget"
                      className="block text-xs font-medium text-foreground-secondary mb-1"
                    >
                      Total Budget (₹ Lakhs)
                    </label>
                    <input
                      id="total-budget"
                      type="number"
                      value={project.buildingParams.totalBudget || ""}
                      onChange={(e) =>
                        updateBuildingParams({
                          totalBudget: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="input"
                      placeholder="Override auto-calculation"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="max-material-cost"
                      className="block text-xs font-medium text-foreground-secondary mb-1"
                    >
                      Max Material Cost (₹/sqm)
                    </label>
                    <input
                      id="max-material-cost"
                      type="number"
                      value={project.buildingParams.maxMaterialCost || ""}
                      onChange={(e) =>
                        updateBuildingParams({
                          maxMaterialCost: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="input"
                      placeholder="Override auto-calculation"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="target-carbon"
                      className="block text-xs font-medium text-foreground-secondary mb-1"
                    >
                      Target Carbon (kg CO₂/sqm)
                    </label>
                    <input
                      id="target-carbon"
                      type="number"
                      value={project.buildingParams.targetCarbon || ""}
                      onChange={(e) =>
                        updateBuildingParams({
                          targetCarbon: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="input"
                      placeholder="e.g., 250"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="min-recycled"
                      className="block text-xs font-medium text-foreground-secondary mb-1"
                    >
                      Min Recycled Content (%)
                    </label>
                    <input
                      id="min-recycled"
                      type="number"
                      min="0"
                      max="100"
                      value={project.buildingParams.minRecycledContent || ""}
                      onChange={(e) =>
                        updateBuildingParams({
                          minRecycledContent: parseInt(e.target.value) || 0,
                        })
                      }
                      className="input"
                      placeholder="e.g., 30"
                    />
                  </div>
                </div>

                <div className="p-3 bg-warning-bg border border-warning rounded-lg">
                  <p className="text-sm text-warning">
                    <FaInfoCircle className="inline mr-1" aria-hidden="true" />
                    <strong>Note:</strong> Manual overrides will be used in
                    optimization calculations. Leave blank to use automatic
                    recommendations based on Kerala standards.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sustainable Features */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <FaClipboardCheck className="text-primary" aria-hidden="true" />
                Sustainable Features
              </h2>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  {
                    key: "hasRainwaterHarvesting",
                    label: "Rainwater Harvesting",
                    icon: FaWater,
                    description: "Water conservation",
                  },
                  {
                    key: "hasSolarWaterHeater",
                    label: "Solar Water Heater",
                    icon: FaTree,
                    description: "Renewable energy",
                  },
                  {
                    key: "hasSTP",
                    label: "Sewage Treatment Plant",
                    icon: FaWater,
                    description: "Water recycling",
                  },
                  {
                    key: "hasFireFighting",
                    label: "Fire Fighting System",
                    icon: FaFire,
                    description: "NBC Part 4",
                  },
                  {
                    key: "hasLift",
                    label: "Lift/Elevator",
                    icon: FaArrowUp,
                    description: "For tall buildings",
                  },
                ].map((feature) => {
                  const Icon = feature.icon;
                  const isChecked = project.buildingParams[feature.key];
                  const id = `feature-${feature.key}`;

                  return (
                    <label
                      key={feature.key}
                      htmlFor={id}
                      className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-background-tertiary transition-colors"
                    >
                      <input
                        id={id}
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) =>
                          updateBuildingParams({
                            [feature.key]: e.target.checked,
                          })
                        }
                        className="w-5 h-5 accent-primary"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <Icon className="text-primary" aria-hidden="true" />
                          <span className="font-medium">{feature.label}</span>
                        </div>
                        <p className="text-xs text-foreground-tertiary">
                          {feature.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {project.buildingParams.height > 15 &&
                !project.buildingParams.hasLift && (
                  <div
                    className="mt-4 p-3 bg-warning-bg border border-warning rounded-lg"
                    role="alert"
                  >
                    <p className="text-warning text-sm flex items-center gap-2">
                      <FaExclamationTriangle aria-hidden="true" />
                      Recommended for buildings over 15m height
                    </p>
                  </div>
                )}

              {project.buildingParams.builtUpArea > 100 &&
                !project.buildingParams.hasRainwaterHarvesting && (
                  <div
                    className="mt-4 p-3 bg-info-bg border border-info rounded-lg"
                    role="alert"
                  >
                    <p className="text-info text-sm flex items-center gap-2">
                      <FaInfoCircle aria-hidden="true" />
                      Recommended for water conservation
                    </p>
                  </div>
                )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn btn-secondary flex-1"
            >
              <FaArrowLeft className="mr-2" aria-hidden="true" /> Back
            </button>
            <button
              type="button"
              onClick={handleBuildingParamsSubmit}
              className="btn btn-primary flex-1"
            >
              <FaArrowRight className="mr-2" aria-hidden="true" /> Review
              Configuration
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <FaCheck className="text-success" aria-hidden="true" />
                Project Configuration Review
              </h2>
            </div>
            <div className="card-body">
              {/* Project Summary */}
              <div className="bg-background-tertiary rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <FaBuilding className="text-primary" aria-hidden="true" />
                  Project Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-foreground-secondary block">
                      Project Name:
                    </span>
                    <p className="font-medium">{project.name}</p>
                  </div>
                  <div>
                    <span className="text-foreground-secondary block">
                      Location:
                    </span>
                    <p className="font-mono text-xs">
                      {project.location.lat?.toFixed(4)},{" "}
                      {project.location.lon?.toFixed(4)}
                    </p>
                  </div>
                  <div>
                    <span className="text-foreground-secondary block">
                      Building Type:
                    </span>
                    <p className="font-medium">
                      {selectedCategory?.label || "Not selected"}
                    </p>
                  </div>
                  <div>
                    <span className="text-foreground-secondary block">
                      Sub-Type:
                    </span>
                    <p className="font-medium">
                      {selectedSubType?.label || "Not selected"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Building Parameters Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-background-tertiary rounded-lg p-4">
                  <h4 className="font-semibold text-foreground mb-3">
                    Building Parameters
                  </h4>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-foreground-secondary">Plot Area:</dt>
                      <dd>{project.buildingParams.plotArea} sqm</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-foreground-secondary">
                        Built-up Area:
                      </dt>
                      <dd>{project.buildingParams.builtUpArea} sqm</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-foreground-secondary">FAR:</dt>
                      <dd>{calculateFAR()}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-foreground-secondary">Floors:</dt>
                      <dd>
                        {project.buildingParams.numFloors} +{" "}
                        {project.buildingParams.basementFloors || 0} basement
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-foreground-secondary">Height:</dt>
                      <dd>{project.buildingParams.height} m</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-foreground-secondary">Road Width:</dt>
                      <dd>{project.buildingParams.roadWidth} m</dd>
                    </div>
                  </dl>
                </div>

                <div className="bg-background-tertiary rounded-lg p-4">
                  <h4 className="font-semibold text-foreground mb-3">
                    Setbacks (m)
                  </h4>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-foreground-secondary">Front:</dt>
                      <dd>{project.buildingParams.setbacks?.front || 0} m</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-foreground-secondary">Rear:</dt>
                      <dd>{project.buildingParams.setbacks?.rear || 0} m</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-foreground-secondary">Side 1:</dt>
                      <dd>{project.buildingParams.setbacks?.side1 || 0} m</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-foreground-secondary">Side 2:</dt>
                      <dd>{project.buildingParams.setbacks?.side2 || 0} m</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Sustainable Features Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-background-tertiary rounded-lg p-4">
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <FaLeaf className="text-primary" aria-hidden="true" />
                    Sustainable Features
                  </h4>
                  <dl className="space-y-2 text-sm">
                    {[
                      {
                        key: "hasRainwaterHarvesting",
                        label: "Rainwater Harvesting",
                      },
                      {
                        key: "hasSolarWaterHeater",
                        label: "Solar Water Heater",
                      },
                      { key: "hasSTP", label: "Sewage Treatment" },
                      { key: "hasFireFighting", label: "Fire Fighting" },
                      { key: "hasLift", label: "Lift/Elevator" },
                    ].map((feature) => (
                      <div key={feature.key} className="flex justify-between">
                        <dt className="text-foreground-secondary">
                          {feature.label}:
                        </dt>
                        <dd
                          className={
                            project.buildingParams[feature.key]
                              ? "text-success"
                              : "text-foreground-secondary"
                          }
                        >
                          {project.buildingParams[feature.key]
                            ? "Installed"
                            : "Not installed"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div className="bg-background-tertiary rounded-lg p-4">
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <FaMountain className="text-primary" aria-hidden="true" />
                    Geotechnical Summary
                  </h4>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-foreground-secondary">Soil Type:</dt>
                      <dd>
                        {SOIL_TYPES.find(
                          (s) => s.value === project.geotechnical.soilType,
                        )?.label || "Not selected"}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-foreground-secondary">SBC:</dt>
                      <dd>{project.geotechnical.safeBearingCapacity} kN/m²</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-foreground-secondary">CBR:</dt>
                      <dd>{project.geotechnical.cbrSubgrade}%</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-foreground-secondary">Foundation:</dt>
                      <dd className="font-semibold text-primary">
                        {FOUNDATION_TYPES.find(
                          (ft) =>
                            ft.value ===
                            project.geotechnical.recommendedFoundationType,
                        )?.label || "Not selected"}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Budget Summary */}
              {project.buildingParams.totalBudget > 0 && (
                <div className="bg-background-tertiary rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <FaDollarSign className="text-primary" aria-hidden="true" />
                    Budget Configuration
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-foreground-secondary block">
                        Total Budget:
                      </span>
                      <p className="font-semibold text-primary">
                        ₹{project.buildingParams.totalBudget} Lakhs
                        {project.buildingParams.isManualBudget && <span className="text-xs text-foreground-secondary ml-1">(Manual)</span>}
                      </p>
                    </div>
                    <div>
                      <span className="text-foreground-secondary block">
                        Max Material Cost:
                      </span>
                      <p>
                        {project.buildingParams.maxMaterialCost
                          ? `₹${project.buildingParams.maxMaterialCost}/sqm`
                          : "Auto"}
                      </p>
                    </div>
                    <div>
                      <span className="text-foreground-secondary block">
                        Target Carbon:
                      </span>
                      <p>
                        {project.buildingParams.targetCarbon
                          ? `${project.buildingParams.targetCarbon} kg/m²`
                          : "Auto"}
                      </p>
                    </div>
                    <div>
                      <span className="text-foreground-secondary block">
                        Min Recycled:
                      </span>
                      <p>
                        {project.buildingParams.minRecycledContent
                          ? `${project.buildingParams.minRecycledContent}%`
                          : "Auto"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn btn-secondary flex-1"
                >
                  <FaArrowLeft className="mr-2" aria-hidden="true" /> Edit
                  Configuration
                </button>
                <button
                  onClick={handleComplete}
                  className="btn btn-primary flex-1"
                >
                  <FaCheck className="mr-2" aria-hidden="true" /> Complete Setup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectSetup;

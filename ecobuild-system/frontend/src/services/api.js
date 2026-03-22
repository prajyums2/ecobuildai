import axios from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("ecobuild-token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem("ecobuild-token");
      delete api.defaults.headers.common["Authorization"];
      // Redirect to login
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

// API Service Functions
export const ecoBuildAPI = {
  // Material Optimization
  optimizeMaterials: (mode, materials, lat, lon) =>
    api.post("/optimize", {
      mode,
      required_materials: materials,
      site_lat: lat,
      site_lon: lon,
    }),

  // Environmental Data
  getEnvironmentalData: (lat, lon) =>
    api.post("/environmental-data", { lat, lon }),

  // Mix Design
  designMix: (grade, exposure, slump, flyAshPercent, recycledPercent) =>
    api.post("/mix-design", {
      grade,
      exposure,
      slump,
      fly_ash_percent: flyAshPercent,
      recycled_aggregate_percent: recycledPercent,
    }),

  // Compliance Check
  checkCompliance: (params) => api.post("/compliance-check", params),

  // Operational Carbon
  calculateOperationalCarbon: (
    buildingArea,
    wallUValue,
    roofUValue,
    lat,
    lon,
  ) =>
    api.post("/operational-carbon", {
      building_area: buildingArea,
      wall_u_value: wallUValue,
      roof_u_value: roofUValue,
      lat,
      lon,
    }),

  // Suppliers
  getSuppliers: (lat, lon, radius = 50) =>
    api.get(`/suppliers?lat=${lat}&lon=${lon}&radius_km=${radius}`),

  // BIM Parse
  parseBIM: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/bim/parse", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // Material Categories
  getMaterialCategories: () => api.get("/materials/categories"),

  // Material Management
  getMaterials: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/materials?${queryString}`);
  },

  getMaterialCategoriesDetailed: () =>
    api.get("/materials/categories-detailed"),

  getMaterial: (id) => api.get(`/materials/${id}`),

  createMaterial: (data) => api.post("/materials", data),

  updateMaterial: (id, data) => api.put(`/materials/${id}`, data),

  deleteMaterial: (id) => api.delete(`/materials/${id}`),

  searchMaterialsAdvanced: (params) =>
    api.post("/materials/search-advanced", params),

  getMaterialsByCategory: (category) =>
    api.get(`/materials/category/${category}`),

  // Cost Tracking
  initCostTracking: (projectId, totalBudget) =>
    api.post("/cost-tracking/init", {
      project_id: projectId,
      total_budget: totalBudget,
    }),

  getCostTracking: (projectId) => api.get(`/cost-tracking/${projectId}`),

  recordPayment: (
    projectId,
    milestoneId,
    amount,
    date,
    method,
    reference,
    notes,
  ) =>
    api.post("/cost-tracking/payment", {
      project_id: projectId,
      milestone_id: milestoneId,
      amount,
      payment_date: date,
      payment_method: method,
      reference,
      notes,
    }),

  addActualCost: (
    projectId,
    date,
    category,
    description,
    vendor,
    invoice,
    estimated,
    actual,
    quantity,
    unit,
    notes,
  ) =>
    api.post("/cost-tracking/actual-cost", {
      project_id: projectId,
      date,
      category,
      description,
      vendor,
      invoice_number: invoice,
      estimated_cost: estimated,
      actual_cost: actual,
      quantity,
      unit,
      notes,
    }),

  // QC Checklists
  initQCChecklists: (projectId) =>
    api.post("/qc-checklists/init", { project_id: projectId }),

  getQCChecklists: (projectId) => api.get(`/qc-checklists/${projectId}`),

  updateQCItem: (projectId, checklistId, itemId, status, notes, checkedBy) =>
    api.post("/qc-checklists/update-item", {
      project_id: projectId,
      checklist_id: checklistId,
      item_id: itemId,
      status,
      notes,
      checked_by: checkedBy,
    }),

  addQCPhoto: (
    projectId,
    checklistId,
    itemId,
    photoUrl,
    caption,
    takenBy,
    location,
  ) =>
    api.post("/qc-checklists/add-photo", {
      project_id: projectId,
      checklist_id: checklistId,
      item_id: itemId,
      photo_url: photoUrl,
      caption,
      taken_by: takenBy,
      location,
    }),

  createNonConformance: (
    projectId,
    checklistId,
    itemId,
    description,
    severity,
    correctiveAction,
  ) =>
    api.post("/qc-checklists/non-conformance", {
      project_id: projectId,
      checklist_id: checklistId,
      item_id: itemId,
      description,
      severity,
      corrective_action: correctiveAction,
    }),

  // Green Building Standards
  assessMaterialsGreenPoints: (materials) =>
    api.post("/green-building/assess-materials", materials),

  calculateGreenRating: (grihaScore, igbcScore, leedScore) =>
    api.post("/green-building/calculate-rating", {
      griha_score: grihaScore,
      igbc_score: igbcScore,
      leed_score: leedScore,
    }),

  // Material Rates for BoQ
  getMaterialRates: (category) =>
    api.get(`/material-rates${category ? `?category=${category}` : ""}`),

  // Structural Engineering
  calculateLoads: (params) => api.post("/structural/loads", params),

  calculateSeismic: (params) => api.post("/structural/seismic", params),

  calculateWind: (params) => api.post("/structural/wind", params),

  designMember: (params) => api.post("/structural/design", params),

  fullStructuralAnalysis: (params) =>
    api.post("/structural/full-analysis", params),

  getISCodes: () => api.get("/is-codes"),

  getCitations: (code = null) =>
    api.get("/citations", { params: { code } }),

  getBibliography: () => api.get("/citations/bibliography"),

  // Green Building Assessment
  getGreenBuildingAssessment: (data) =>
    api.post("/green-building/full-assessment", data),

  getGreenBuildingCriteria: (ratingSystem = null) =>
    api.get("/green-building/criteria", {
      params: { rating_system: ratingSystem },
    }),
};

export default api;

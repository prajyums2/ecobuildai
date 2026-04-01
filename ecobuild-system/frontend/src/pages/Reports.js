import React, { useState, useRef, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import { useProject } from "../context/ProjectContext";
import { useEngineer } from "../context/EngineerContext";
import { ecoBuildAPI } from "../services/api";
import { generateAIResponse, generateAIRecommendations, generateExecutiveSummary } from "../services/aiService";
import {
  FaFilePdf,
  FaFileExcel,
  FaPrint,
  FaArrowLeft,
  FaCalculator,
  FaClipboardList,
  FaChartBar,
  FaCheckCircle,
  FaMoneyBillWave,
  FaUser,
  FaIdCard,
  FaSpinner,
  FaExclamationTriangle,
  FaBook,
  FaLeaf,
  FaSun,
  FaWater,
  FaRecycle,
  FaIndustry,
  FaTruck,
  FaHardHat,
  FaRobot,
  FaPaperPlane,
  FaSyncAlt,
  FaTimes,
} from "react-icons/fa";
import BillOfQuantities from "../components/BillOfQuantities";
import {
  generateBoQAsync,
  exportBoQToCSV,
  formatCurrency,
  formatNumber,
  calculateBoQCarbon,
} from "../utils/boqCalculator";
import {
  validateBuildingDimensions,
  validateSteelRatio,
  calculateCarbonReduction,
  hasPlaceholderData,
  filterStructuralCategories,
} from "../utils/validation";

// ============================================
// HELPER FUNCTIONS FOR ACCURATE CALCULATIONS
// ============================================

// Calculate GRIHA score based on project parameters
function calculateGRIHAScore(project, boqCarbon) {
  let score = 0;

  // Site & Planning (max 15 points)
  const hasRWH = project.buildingParams?.hasRainwaterHarvesting;
  const plotArea = project.buildingParams?.plotArea || 200;
  const builtUpArea = project.buildingParams?.builtUpArea || 150;
  const far = builtUpArea / plotArea;

  if (hasRWH) score += 5;
  if (far <= 1.5) score += 5;
  if (project.location?.district) score += 5;

  // Water Efficiency (max 10 points)
  if (hasRWH) score += 5;
  if (project.buildingParams?.hasSTP) score += 5;

  // Energy Performance (max 20 points)
  if (project.buildingParams?.hasSolarWaterHeater) score += 10;
  score += 10; // Assume energy efficient design

  // Materials & Resources (max 15 points)
  const sustainabilityPriority = project.buildingParams?.sustainabilityPriority;
  if (sustainabilityPriority === "high") score += 8;
  else if (sustainabilityPriority === "medium") score += 5;
  else score += 2;

  // Low embodied carbon bonus
  if (boqCarbon > 0 && boqCarbon < 50000) score += 7;
  else if (boqCarbon > 0 && boqCarbon < 100000) score += 4;

  return Math.min(100, score);
}

// Calculate IGBC score based on project parameters
function calculateIGBCScore(project, boqCarbon) {
  let score = 0;

  // Sustainable Sites
  if (project.buildingParams?.hasRainwaterHarvesting) score += 5;
  score += 8; // Site selection

  // Water Efficiency
  if (project.buildingParams?.hasRainwaterHarvesting) score += 5;
  if (project.buildingParams?.hasSTP) score += 5;

  // Energy & Atmosphere
  if (project.buildingParams?.hasSolarWaterHeater) score += 8;
  score += 7; // Energy optimization

  // Materials & Resources
  const sustainabilityPriority = project.buildingParams?.sustainabilityPriority;
  if (sustainabilityPriority === "high") score += 6;
  else if (sustainabilityPriority === "medium") score += 4;

  // Indoor Environment Quality
  score += 6; // Ventilation consideration

  return Math.min(100, score);
}

// Calculate LEED score based on project parameters
function calculateLEEDScore(project, boqCarbon) {
  let score = 0;

  // Integrative Process
  score += 2;

  // Location and Transportation
  score += 8; // Urban location

  // Sustainable Sites
  if (project.buildingParams?.hasRainwaterHarvesting) score += 2;
  score += 3; // Site development

  // Water Efficiency
  if (project.buildingParams?.hasRainwaterHarvesting) score += 3;
  if (project.buildingParams?.hasSTP) score += 2;

  // Energy and Atmosphere
  if (project.buildingParams?.hasSolarWaterHeater) score += 10;
  score += 8; // Energy performance

  // Materials and Resources
  const sustainabilityPriority = project.buildingParams?.sustainabilityPriority;
  if (sustainabilityPriority === "high") score += 5;
  else if (sustainabilityPriority === "medium") score += 3;

  // Indoor Environmental Quality
  score += 4;

  return Math.min(110, score);
}

// Get rating label for GRIHA
function getGRIHARating(score) {
  if (score >= 80) return "5-Star (Excellent)";
  if (score >= 65) return "4-Star (Very Good)";
  if (score >= 50) return "3-Star (Good)";
  if (score >= 35) return "2-Star (Average)";
  return "1-Star (Below Average)";
}

// Get rating label for IGBC
function getIGBCRating(score) {
  if (score >= 80) return "Platinum";
  if (score >= 60) return "Gold";
  if (score >= 40) return "Silver";
  if (score >= 20) return "Certified";
  return "Not Certified";
}

// Get rating label for LEED
function getLEEDRating(score) {
  if (score >= 80) return "Platinum";
  if (score >= 60) return "Gold";
  if (score >= 40) return "Silver";
  if (score >= 20) return "Certified";
  return "Not Certified";
}

// Extract material quantities from BoQ properly
function extractMaterialQuantities(boq) {
  const result = {
    cementBags: 0,
    steelKg: 0,
    sandCft: 0,
    aggregateCft: 0,
    blocksNos: 0,
    bricksNos: 0,
    concreteVolume: 0,
  };

  if (!boq?.categories) return result;

  boq.categories.forEach((cat) => {
    const catName = cat.name?.toLowerCase() || "";

    cat.items?.forEach((item) => {
      const desc = item.description?.toLowerCase() || "";
      const qty = parseFloat(item.quantity) || 0;
      const unit = item.unit?.toLowerCase() || "";

      // Concrete work
      if (
        catName.includes("concrete") ||
        desc.includes("concrete") ||
        desc.includes("pcc") ||
        desc.includes("rcc")
      ) {
        if (unit === "cum" || unit === "m³") {
          result.concreteVolume += qty;
          // Estimate cement bags: ~6 bags per cum for M20-M25
          result.cementBags += qty * 6;
          // Estimate sand: ~0.5 cum per cum concrete
          result.sandCft += qty * 0.5 * 35.31;
          // Estimate aggregate: ~0.8 cum per cum concrete
          result.aggregateCft += qty * 0.8 * 35.31;
        }
      }

      // Steel
      if (
        catName.includes("steel") ||
        catName.includes("reinforcement") ||
        desc.includes("steel") ||
        desc.includes("tmt") ||
        desc.includes("reinforcement")
      ) {
        if (unit === "kg" || unit === "quintal") {
          result.steelKg += unit === "quintal" ? qty * 100 : qty;
        }
      }

      // Masonry - blocks
      if (
        catName.includes("masonry") ||
        catName.includes("block") ||
        desc.includes("aac") ||
        desc.includes("block")
      ) {
        if (unit === "nos" || unit === "piece") {
          result.blocksNos += qty;
        }
      }

      // Masonry - bricks
      if (catName.includes("masonry") || desc.includes("brick")) {
        if (unit === "nos" || unit === "piece") {
          result.bricksNos += qty;
        }
      }
    });
  });

  return result;
}

// Calculate carbon footprint in kg CO2
function calculateEmbodiedCarbon(boq, project) {
  const materials = extractMaterialQuantities(boq);

  // Carbon coefficients (kg CO2 per unit) per IS 1179, IPCC
  const carbon = {
    cement: materials.cementBags * 50 * 0.93, // kg cement * carbon per kg
    steel: materials.steelKg * 2.5,
    sand: (materials.sandCft * 0.04 * 1600) / 35.31, // per tonne
    aggregate: (materials.aggregateCft * 0.04 * 1450) / 35.31,
    blocks: materials.blocksNos * 0.35, // AAC block carbon
    bricks: materials.bricksNos * 0.22, // brick carbon
  };

  return {
    total: Object.values(carbon).reduce((a, b) => a + b, 0),
    breakdown: carbon,
    materials,
  };
}

// ============================================
// AI RECOMMENDATIONS COMPONENT
// ============================================

function AIRecommendationsTab({
  project,
  boq,
  embodiedCarbon,
  sustainabilityScore,
}) {
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState(null);

  // Load AI recommendations
  useEffect(() => {
    let mounted = true;
    setIsLoadingAI(true);
    setAiError(null);

    generateAIRecommendations(project, boq, embodiedCarbon, Object.values(project?.materialSelections || {}))
      .then((result) => {
        if (mounted) {
          setAiRecommendations(result);
          setIsLoadingAI(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setAiError(err.message);
          setIsLoadingAI(false);
        }
      });

    return () => { mounted = false; };
  }, [project?.name, project?.buildingParams?.builtUpArea, boq?.summary?.grandTotal]);

  const fallbackRecommendations = useMemo(
    () => generateRecommendationsFallback(project, boq, embodiedCarbon),
    [project, boq, embodiedCarbon],
  );

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800 border-red-300";
      case "Medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "Low":
        return "bg-green-100 text-green-800 border-green-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "Materials":
        return FaIndustry;
      case "Sustainability":
        return FaLeaf;
      case "Cost":
        return FaMoneyBillWave;
      case "Carbon":
        return FaRecycle;
      case "Structural":
        return FaHardHat;
      default:
        return FaChartBar;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-red-500 text-white">
              <FaIndustry className="text-xl" />
            </div>
            <span className="text-sm text-foreground-secondary">
              Carbon Footprint
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {((embodiedCarbon?.total || 0) / 1000).toFixed(1)} tonnes
          </p>
          <p className="text-xs text-foreground-secondary mt-1">
            Total embodied carbon
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-green-500 text-white">
              <FaLeaf className="text-xl" />
            </div>
            <span className="text-sm text-foreground-secondary">
              GRIHA Score
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {sustainabilityScore || 0}/100
          </p>
          <p className="text-xs text-foreground-secondary mt-1">
            {sustainabilityScore >= 64
              ? "4-Star"
              : sustainabilityScore >= 50
                ? "3-Star"
                : "Needs improvement"}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-500 text-white">
              <FaMoneyBillWave className="text-xl" />
            </div>
            <span className="text-sm text-foreground-secondary">
              Project Cost
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(boq?.summary?.grandTotal || 0)}
          </p>
          <p className="text-xs text-foreground-secondary mt-1">
            Total with GST
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-purple-500 text-white">
              <FaRecycle className="text-xl" />
            </div>
            <span className="text-sm text-foreground-secondary">
              Recommendations
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {(aiRecommendations || fallbackRecommendations).length}
          </p>
          <p className="text-xs text-foreground-secondary mt-1">
            Optimization opportunities
          </p>
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <FaLeaf className="text-green-500" />
          AI-Powered Recommendations
        </h3>

        {isLoadingAI ? (
          <div className="flex items-center justify-center py-12">
            <FaSpinner className="animate-spin text-primary text-2xl mr-3" />
            <span className="text-foreground-secondary">Generating AI recommendations...</span>
          </div>
        ) : aiError ? (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">AI unavailable, showing local recommendations</p>
            </div>
            <div className="space-y-4">
              {fallbackRecommendations.map((rec, idx) => {
                const Icon = getCategoryIcon(rec.category);
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-foreground">
                          <Icon className="text-lg" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">{rec.title}</h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityColor(rec.priority)}`}>
                            {rec.priority} Priority
                          </span>
                        </div>
                      </div>
                      <span className="text-sm text-foreground-secondary">{rec.category}</span>
                    </div>
                    <p className="text-sm text-foreground-secondary mb-3">{rec.description}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground-muted">Impact: {rec.impact}</span>
                      {rec.carbonReduction > 0 && (
                        <span className="text-green-600 dark:text-green-400">-{rec.carbonReduction} kg CO2</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : aiRecommendations ? (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>{aiRecommendations}</ReactMarkdown>
          </div>
        ) : (
          <div className="space-y-4">
            {fallbackRecommendations.map((rec, idx) => {
              const Icon = getCategoryIcon(rec.category);
              return (
                <div
                  key={idx}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-foreground">
                        <Icon className="text-lg" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{rec.title}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityColor(rec.priority)}`}>
                          {rec.priority} Priority
                        </span>
                      </div>
                    </div>
                    <span className="text-sm text-foreground-secondary">{rec.category}</span>
                  </div>
                  <p className="text-sm text-foreground-secondary mb-3">{rec.description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground-muted">Impact: {rec.impact}</span>
                    {rec.carbonReduction > 0 && (
                      <span className="text-green-600 dark:text-green-400">-{rec.carbonReduction} kg CO2</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h4 className="font-semibold text-foreground mb-4">Quick Actions</h4>
        <div className="flex flex-wrap gap-3">
          {[
            {
              label: "View Material Optimizer",
              action: () => (window.location.href = "/optimizer"),
            },
            { label: "Export Report", action: () => window.print() },
          ].map((action, idx) => (
            <button
              key={idx}
              onClick={action.action}
              className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-foreground transition-colors"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Generate AI recommendations based on project data
 */
function generateRecommendationsFallback(project, boq, carbon) {
  const bp = project?.buildingParams || {};
  const materials = project?.materialSelections || {};
  const recommendations = [];

  const builtUpArea = bp.builtUpArea || 0;
  const plotArea = bp.plotArea || 1;
  const numFloors = bp.numFloors || 1;
  const totalArea = builtUpArea * numFloors;
  const far = plotArea > 0 ? builtUpArea / plotArea : 0;
  const baseCost = totalArea * 16000;
  const carbonTotal = carbon?.total || 0;

  // Material recommendations
  if (!Object.keys(materials).some((k) => k.includes("cement"))) {
    recommendations.push({
      category: "Materials",
      priority: "High",
      title: "Switch to PPC Cement",
      description:
        "Using PPC (Fly Ash) cement instead of OPC reduces carbon by 35% and costs 5-10% less.",
      impact: "Save Rs " + Math.round(baseCost * 0.03).toLocaleString(),
      carbonReduction: Math.round(totalArea * 0.5),
      pointValue: 5,
    });
  }

  if (!Object.keys(materials).some((k) => k.includes("block"))) {
    recommendations.push({
      category: "Materials",
      priority: "Medium",
      title: "Use AAC Blocks",
      description:
        "AAC blocks are 50% lighter than traditional bricks, reducing transport costs and carbon footprint.",
      impact: "Save Rs " + Math.round(totalArea * 50).toLocaleString(),
      carbonReduction: Math.round(totalArea * 0.3),
      pointValue: 5,
    });
  }

  // Sustainability recommendations
  if (!bp.hasSolarWaterHeater) {
    recommendations.push({
      category: "Sustainability",
      priority: "High",
      title: "Install Solar Water Heater",
      description:
        "Solar water heaters save electricity and contribute to GRIHA certification.",
      impact: "Save Rs 25,000-50,000 annually",
      carbonReduction: 0,
      pointValue: 10,
    });
  }

  if (!bp.hasSTP) {
    recommendations.push({
      category: "Sustainability",
      priority: "Medium",
      title: "Install Sewage Treatment Plant",
      description:
        "STP is recommended for buildings with more than 20 units and contributes to IGBC points.",
      impact: "IGBC certification support",
      carbonReduction: 0,
      pointValue: 8,
    });
  }

  // Cost optimization
  if (baseCost > 10000000) {
    recommendations.push({
      category: "Cost",
      priority: "High",
      title: "Bulk Material Purchase",
      description:
        "For projects above Rs 1 Crore, negotiate bulk discounts with suppliers.",
      impact: "Save 5-8% on material costs",
      carbonReduction: 0,
      pointValue: 0,
    });
  }

  // Structural recommendations
  if (numFloors > 2) {
    recommendations.push({
      category: "Structural",
      priority: "Medium",
      title: "Consider Pre-cast Elements",
      description:
        "For multi-story buildings, pre-cast lintels and sunshades can save construction time.",
      impact: "Save 10-15% construction time",
      carbonReduction: 0,
      pointValue: 0,
    });
  }

  // Sustainability score
  if (!bp.hasRainwaterHarvesting) {
    recommendations.push({
      category: "Sustainability",
      priority: "High",
      title: "Add Rainwater Harvesting",
      description:
        "Rainwater harvesting is mandatory in Kerala and provides 10 GRIHA points.",
      impact: "10 GRIHA points",
      carbonReduction: 0,
      pointValue: 10,
    });
  }

  // Carbon reduction
  if (carbonTotal > 30000) {
    recommendations.push({
      category: "Carbon",
      priority: "High",
      title: "Reduce Carbon Footprint",
      description:
        "Your embodied carbon is high. Use recycled aggregate and optimize structural design.",
      impact: "Reduce carbon by 20-30%",
      carbonReduction: Math.round(carbonTotal * 0.25),
      pointValue: 10,
    });
  }

  // Default recommendations if none generated
  if (recommendations.length === 0) {
    recommendations.push({
      category: "General",
      priority: "Low",
      title: "Good Project Setup",
      description:
        "Your project has a good configuration. Continue monitoring for optimization opportunities.",
      impact: "N/A",
      carbonReduction: 0,
      pointValue: 0,
    });
  }

  return recommendations;
}

// ============================================
// MATERIAL SUMMARY TAB COMPONENT
// Shows material quantities with supplier details
// ============================================

function MaterialSummaryTab({ boq, project }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  const API_URL = "https://ecobuildai-production-1f9d.up.railway.app";
  const projectLat = project?.location?.lat || 10.5167;
  const projectLon = project?.location?.lon || 76.2167;

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/material-suppliers`);
      const data = await res.json();
      setSuppliers(data.suppliers || []);
      setLoadingSuppliers(false);
    } catch (err) {
      console.error("Failed to fetch suppliers:", err);
      setLoadingSuppliers(false);
    }
  };

  // Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const districtCoords = {
    Thrissur: { lat: 10.5167, lon: 76.2167 },
    Ernakulam: { lat: 9.9312, lon: 76.2673 },
    Palakkad: { lat: 10.7867, lon: 76.6548 },
    Kozhikode: { lat: 11.2588, lon: 75.7804 },
    Thiruvananthapuram: { lat: 8.5241, lon: 76.9366 },
    Kollam: { lat: 8.8932, lon: 76.6141 },
    Kottayam: { lat: 9.5916, lon: 76.5222 },
    Kannur: { lat: 11.8745, lon: 75.3704 },
  };

  // Find best supplier for a material type
  const findSupplier = (keywords) => {
    const matching = suppliers.filter((s) => {
      const supplied = (s["Materials Supplied"] || "").toLowerCase();
      return keywords.some((kw) => supplied.includes(kw));
    });

    if (matching.length === 0) return null;

    // Calculate distances from project location
    const withDistance = matching.map((s) => {
      // Use real coordinates from database
      const lat = s.latitude || null;
      const lon = s.longitude || null;
      
      let distance;
      if (lat && lon) {
        // Use real coordinates
        distance = calculateDistance(projectLat, projectLon, lat, lon);
      } else {
        // Fallback to calculated_distance_km from database
        distance = s.calculated_distance_km || 0;
      }
      
      return { 
        ...s, 
        distance: Math.round(distance * 10) / 10,
        latitude: lat,
        longitude: lon
      };
    });

    return withDistance.sort((a, b) => a.distance - b.distance)[0];
  };

  // Clean rate display
  const cleanRate = (rate) => {
    if (!rate) return "Contact";
    return rate
      .replace(/â‚¹/g, "₹")
      .replace(/â€"/g, "–")
      .replace(/Ã—/g, "×")
      .replace(/Â/g, "");
  };

  if (!boq || !boq.categories) {
    return (
      <div className="p-8 text-center text-foreground-secondary">
        <FaSpinner className="animate-spin text-2xl mx-auto mb-4" />
        <p>Loading material quantities...</p>
      </div>
    );
  }

  // Helper to get material selections with fallback
  const getMaterialSelections = () => {
    if (project && project.materialSelections && Object.keys(project.materialSelections).length > 0) {
      return project.materialSelections;
    }
    // Fallback to localStorage
    try {
      const stored = localStorage.getItem('ecobuild-projects');
      if (stored) {
        const projects = JSON.parse(stored);
        const currentId = localStorage.getItem('ecobuild-current-project-id');
        const current = projects.find(p => p.id === currentId);
        if (current?.materialSelections && Object.keys(current.materialSelections).length > 0) {
          return current.materialSelections;
        }
      }
    } catch (e) { console.error('Error:', e); }
    return {};
  };

  // Extract material quantities from BoQ - 8 categories from database
  const extractMaterials = () => {
    // Get selected materials from project (from Material Optimizer)
    const selectedMats = getMaterialSelections();
    
    console.log('=== EXTRACTING MATERIALS ===');
    console.log('selectedMats keys:', Object.keys(selectedMats));
    
    // Get rate from selected material or use default
    const getRate = (key, defaultRate) => {
      const selected = selectedMats[key];
      console.log(`getRate(${key}):`, selected ? selected.name : 'NOT FOUND', 'rate:', selected?.rate, 'defaultRate:', defaultRate);
      if (selected && selected.rate) {
        console.log(`Using selected rate for ${key}:`, selected.rate);
        return selected.rate;
      }
      if (selected && selected.cost_per_unit) return selected.cost_per_unit;
      return defaultRate;
    };

    const materials = {
      cement: {
        name: selectedMats.cement?.name || "Cement",
        unit: selectedMats.cement?.unit || "bags",
        qty: 0,
        rate: selectedMats.cement?.rate || 370,
        supplier: findSupplier(["cement", "ppc", "opc", "ultratech", "acc", "ramco"]),
        category: "Cement",
      },
      steel: {
        name: selectedMats.steel?.name || "Steel (TMT Bars)",
        unit: selectedMats.steel?.unit || "kg",
        qty: 0,
        rate: selectedMats.steel?.rate || 72,
        supplier: findSupplier(["steel", "tmt", "tata", "jsw", "kalliyath"]),
        category: "Steel",
      },
      sand: {
        name: selectedMats.aggregates?.name || "Sand (M-Sand)",
        unit: selectedMats.aggregates?.unit || "cft",
        qty: 0,
        rate: selectedMats.aggregates?.rate || 58,
        supplier: findSupplier(["sand", "m-sand"]),
        category: "Aggregates",
      },
      aggregate: {
        name: selectedMats.aggregates?.name || "Aggregate (20mm)",
        unit: "cft",
        qty: 0,
        rate: selectedMats.aggregates?.rate || 42,
        supplier: findSupplier(["aggregate", "blue metal", "20mm"]),
        category: "Aggregates",
      },
      blocks: {
        name: selectedMats.blocks?.name || "AAC Blocks",
        unit: selectedMats.blocks?.unit || "nos",
        qty: 0,
        rate: selectedMats.blocks?.rate || 78,
        supplier: findSupplier(["aac", "block"]),
        category: "Blocks",
      },
      masonry: {
        name: selectedMats.masonry?.name || "Masonry",
        unit: selectedMats.masonry?.unit || "cum",
        qty: 0,
        rate: selectedMats.masonry?.rate || 350,
        supplier: findSupplier(["mortar", "cm 1:4", "masonry"]),
        category: "Masonry",
      },
      flooring: {
        name: selectedMats.flooring?.name || "Flooring Tiles",
        unit: selectedMats.flooring?.unit || "sqft",
        qty: 0,
        rate: selectedMats.flooring?.rate || 95,
        supplier: findSupplier(["tiles", "vitrified", "ceramic", "granite", "marble"]),
        category: "Flooring",
      },
      timber: {
        name: selectedMats.timber?.name || "Timber",
        unit: selectedMats.timber?.unit || "cft",
        qty: 0,
        rate: selectedMats.timber?.rate || 2500,
        supplier: findSupplier(["teak", "timber", "wood", "plywood", "sal", "mahogany"]),
        category: "Timber",
      },
    };

    // Extract quantities from BoQ categories
    boq.categories.forEach((category) => {
      const catName = category.name?.toLowerCase() || "";
      
      category.items.forEach((item) => {
        const desc = item.description?.toLowerCase() || "";
        const remarks = item.remarks?.toLowerCase() || "";
        
        // Extract cement bags from remarks
        const cementMatch = remarks.match(/cement:\s*([\d,.]+)\s*bags/i);
        if (cementMatch) {
          materials.cement.qty += parseFloat(cementMatch[1].replace(/,/g, "")) || 0;
        }
        
        // Extract sand from remarks
        const sandMatch = remarks.match(/sand:\s*([\d,.]+)\s*cft/i);
        if (sandMatch) {
          materials.sand.qty += parseFloat(sandMatch[1].replace(/,/g, "")) || 0;
        }
        
        // Extract aggregate from remarks
        const aggMatch = remarks.match(/aggregate:\s*([\d,.]+)\s*cft/i);
        if (aggMatch) {
          materials.aggregate.qty += parseFloat(aggMatch[1].replace(/,/g, "")) || 0;
        }
        
        // Steel from reinforcement category
        if (catName.includes("steel") && item.unit === "kg") {
          materials.steel.qty += parseFloat(item.quantity) || 0;
        }
        
        // Blocks from masonry
        if (catName.includes("masonry") && desc.includes("block") && item.unit === "nos") {
          materials.blocks.qty += parseFloat(item.quantity) || 0;
        }
        
        // Masonry volume
        if (catName.includes("masonry") && (item.unit === "cum" || item.unit === "bags")) {
          materials.masonry.qty += parseFloat(item.quantity) || 0;
        }
        
        // Flooring tiles
        if (catName.includes("floor") && item.unit === "sqft") {
          materials.flooring.qty += parseFloat(item.quantity) || 0;
        }
        
        // Timber
        if (catName.includes("timber") && item.unit === "cft") {
          materials.timber.qty += parseFloat(item.quantity) || 0;
        }
      });
    });

    // Round quantities
    Object.keys(materials).forEach((key) => {
      materials[key].qty = Math.round(materials[key].qty * 10) / 10;
    });

    return materials;
  };

  const materials = extractMaterials();
  const materialList = Object.values(materials).filter((m) => m.qty > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FaIndustry className="text-blue-500" />
            Material Quantities & Suppliers
          </h3>
          <span className="text-sm text-foreground-secondary">
            {materialList.length} materials
          </span>
        </div>
        <p className="text-foreground-secondary text-sm">
          Quantities extracted from BoQ with recommended suppliers
        </p>
      </div>

      {/* Materials with Suppliers */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-0">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-foreground-secondary border-b border-gray-200 dark:border-gray-700">
                <th className="p-3 font-medium">Material</th>
                <th className="p-3 font-medium text-right">Quantity</th>
                <th className="p-3 font-medium">Unit</th>
                <th className="p-3 font-medium text-right">Rate (₹)</th>
                <th className="p-3 font-medium text-right">Amount (₹)</th>
                <th className="p-3 font-medium">Best Supplier</th>
                <th className="p-3 font-medium text-right">Distance</th>
              </tr>
            </thead>
            <tbody>
              {materialList.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-8 text-center text-foreground-secondary"
                  >
                    No materials found. Generate BoQ first.
                  </td>
                </tr>
              ) : (
                materialList.map((mat, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                  >
                    <td className="p-3 text-foreground font-medium">
                      {mat.name}
                    </td>
                    <td className="p-3 text-right font-mono text-foreground font-bold">
                      {mat.qty.toLocaleString()}
                    </td>
                    <td className="p-3 text-foreground-secondary">
                      {mat.unit}
                    </td>
                    <td className="p-3 text-right font-mono text-foreground-secondary">
                      ₹{mat.rate}
                    </td>
                    <td className="p-3 text-right font-mono text-foreground font-semibold">
                      ₹{(mat.qty * mat.rate).toLocaleString()}
                    </td>
                    <td className="p-3 text-foreground-secondary text-sm">
                      {mat.supplier ? (
                        <div>
                          <div className="font-medium">
                            {mat.supplier["Supplier Name"]}
                          </div>
                          <div className="text-xs text-foreground-muted">
                            {cleanRate(
                              mat.supplier["Indicative Rate Range (Academic)"],
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-foreground-muted">
                          No supplier found
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono text-foreground-secondary">
                      {mat.supplier
                        ? `${mat.supplier.distance || 0} km`
                        : "N/A"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {materialList.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-900">
                  <td
                    colSpan={4}
                    className="p-3 text-right font-semibold text-foreground"
                  >
                    Total Material Cost
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-foreground">
                    ₹
                    {materialList
                      .reduce((sum, m) => sum + m.qty * m.rate, 0)
                      .toLocaleString()}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Procurement Notes */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h4 className="font-semibold text-foreground mb-4">
          Procurement Notes
        </h4>
        <ul className="space-y-2 text-sm text-foreground-secondary">
          <li>• Quantities include wastage as per IS 3861:1966 standards</li>
          <li>• Rates based on Kerala market 2026 prices</li>
          <li>
            • Suppliers auto-selected based on distance from project location
          </li>
          <li>
            • GST will be applied separately (Cement: 28%, Steel: 18%, Blocks:
            5%)
          </li>
        </ul>
      </div>
    </div>
  );
}

// ============================================
// SUPPLIERS TAB COMPONENT
// Shows raw materials with supplier details
// ============================================

function SuppliersTab({ boq, project }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState("Thrissur");

  const API_URL = "https://ecobuildai-production-1f9d.up.railway.app";

  // Project coordinates
  const projectLat = project?.location?.lat || 10.5167;
  const projectLon = project?.location?.lon || 76.2167;

  useEffect(() => {
    fetchSuppliers();
  }, [selectedDistrict]);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_URL}/api/material-suppliers?district=${selectedDistrict}`,
      );
      const data = await res.json();
      setSuppliers(data.suppliers || []);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch suppliers:", err);
      setLoading(false);
    }
  };

  // Haversine formula to calculate distance between two coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // District coordinates (approximate centers)
  const districtCoords = {
    Thrissur: { lat: 10.5167, lon: 76.2167 },
    Ernakulam: { lat: 9.9312, lon: 76.2673 },
    Palakkad: { lat: 10.7867, lon: 76.6548 },
    Kozhikode: { lat: 11.2588, lon: 75.7804 },
    Thiruvananthapuram: { lat: 8.5241, lon: 76.9366 },
    Kollam: { lat: 8.8932, lon: 76.6141 },
    Kottayam: { lat: 9.5916, lon: 76.5222 },
    Kannur: { lat: 11.8745, lon: 75.3704 },
  };

  // Calculate distance from project to supplier location
  const getDistance = (supplier) => {
    // Use real coordinates from database if available
    const lat = supplier.latitude;
    const lon = supplier.longitude;
    
    if (lat && lon) {
      const distance = calculateDistance(projectLat, projectLon, lat, lon);
      return Math.round(distance * 10) / 10;
    }
    
    // Fallback to district coordinates
    const supplierLocation = supplier["City / Area"] || "";

    // Try to match district from supplier location
    let supplierCoord = null;
    for (const [district, coord] of Object.entries(districtCoords)) {
      if (supplierLocation.toLowerCase().includes(district.toLowerCase())) {
        supplierCoord = coord;
        break;
      }
    }

    // Default to district center if not found
    if (!supplierCoord) {
      supplierCoord = districtCoords[selectedDistrict] || {
        lat: 10.5167,
        lon: 76.2167,
      };
    }

    // Calculate distance from project location
    const distance = calculateDistance(projectLat, projectLon, supplierCoord.lat, supplierCoord.lon);
    return Math.round(distance * 10) / 10;
  };

  // Clean rate display
  const cleanRate = (rate) => {
    if (!rate) return "Contact supplier";
    return rate
      .replace(/â‚¹/g, "₹")
      .replace(/â€"/g, "–")
      .replace(/Ã—/g, "×")
      .replace(/Â/g, "");
  };

  // Define material categories to match with suppliers
  const materialCategories = [
    {
      name: "Cement",
      keywords: ["cement", "ultratech", "acc", "ramco", "ppc", "opc"],
      materials: [],
    },
    {
      name: "Steel",
      keywords: ["steel", "tmt", "tata", "jsw", "kalliyath"],
      materials: [],
    },
    {
      name: "Sand",
      keywords: ["sand", "m-sand", "river", "p-sand"],
      materials: [],
    },
    {
      name: "Aggregate",
      keywords: ["aggregate", "blue metal", "gravel", "crusher"],
      materials: [],
    },
    {
      name: "Blocks & Bricks",
      keywords: ["block", "brick", "aac", "clay", "cement brick"],
      materials: [],
    },
    {
      name: "Timber & Wood",
      keywords: ["teak", "timber", "wood", "plywood", "mahogany", "sal", "rosewood"],
      materials: [],
    },
    {
      name: "Tiles & Flooring",
      keywords: ["tile", "vitrified", "ceramic", "granite", "marble", "flooring"],
      materials: [],
    },
    {
      name: "Paint",
      keywords: ["paint", "asian", "berger", "nerolac", "dulux", "putty"],
      materials: [],
    },
  ];

  // Categorize suppliers
  const categorizeSuppliers = () => {
    const categorized = {};
    materialCategories.forEach((cat) => {
      categorized[cat.name] = suppliers
        .filter((s) => {
          const supplied = (s["Materials Supplied"] || "").toLowerCase();
          return cat.keywords.some((kw) => supplied.includes(kw));
        })
        .slice(0, 5);
    });
    return categorized;
  };

  const categorizedSuppliers = categorizeSuppliers();
  const districts = [
    "Thrissur",
    "Ernakulam",
    "Palakkad",
    "Kozhikode",
    "Thiruvananthapuram",
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <FaSpinner className="animate-spin text-2xl text-primary mr-3" />
        <span>Loading suppliers...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FaIndustry className="text-blue-500" />
            Material Suppliers
          </h3>
          <span className="text-sm text-foreground-secondary">
            {suppliers.length} suppliers in {selectedDistrict}
          </span>
        </div>

        {/* District Selection */}
        <div className="flex gap-4">
          <label className="text-sm text-foreground-secondary">
            Select District:
          </label>
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="input text-sm w-48"
          >
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Material Categories with Suppliers */}
      {materialCategories.map((category, catIdx) => {
        const categorySuppliers = categorizedSuppliers[category.name];
        if (categorySuppliers.length === 0) return null;

        return (
          <div
            key={catIdx}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-foreground">
                {category.name} Suppliers
              </h4>
            </div>
            <div className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-foreground-secondary border-b border-gray-200 dark:border-gray-700">
                    <th className="p-3 font-medium">Supplier Name</th>
                    <th className="p-3 font-medium">Location</th>
                    <th className="p-3 font-medium">Materials</th>
                    <th className="p-3 font-medium">Rate</th>
                    <th className="p-3 font-medium text-right">Distance</th>
                  </tr>
                </thead>
                <tbody>
                  {categorySuppliers.map((supplier, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                    >
                      <td className="p-3 text-foreground font-medium">
                        {supplier["Supplier Name"]}
                      </td>
                      <td className="p-3 text-foreground-secondary">
                        {supplier["City / Area"] || "N/A"}
                      </td>
                      <td className="p-3 text-foreground-secondary text-sm">
                        {supplier["Materials Supplied"] || "N/A"}
                        {supplier["Material Grade"] && (
                          <span className="text-foreground-muted ml-1">
                            ({supplier["Material Grade"]})
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-foreground text-sm">
                        {cleanRate(
                          supplier["Indicative Rate Range (Academic)"],
                        )}
                      </td>
                      <td className="p-3 text-right font-mono text-foreground-secondary">
                        {getDistance(supplier)} km
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {Object.values(categorizedSuppliers).every((arr) => arr.length === 0) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
          <p className="text-foreground-secondary">
            No suppliers found in {selectedDistrict}
          </p>
        </div>
      )}
    </div>
  );
}

function Reports() {
  const { project, completeBOQGeneration } = useProject();
  const { engineer, isConfigured: isEngineerConfigured } = useEngineer();
  const navigate = useNavigate();
  const reportRef = useRef();
  const [activeTab, setActiveTab] = useState("boq");
  const [exporting, setExporting] = useState(false);
  const [boq, setBoq] = useState(null);
  const [boqLoading, setBoqLoading] = useState(true);
  const [citations, setCitations] = useState(null);
  
  // Fallback: Try to get material selections from localStorage directly
  const getMaterialSelectionsFromStorage = () => {
    try {
      const stored = localStorage.getItem('ecobuild-projects');
      if (stored) {
        const projects = JSON.parse(stored);
        const currentId = localStorage.getItem('ecobuild-current-project-id');
        const current = projects.find(p => p.id === currentId);
        if (current?.materialSelections) {
          console.log('=== FOUND MATERIALS IN LOCALSTORAGE ===');
          console.log('materialSelections:', current.materialSelections);
          return current.materialSelections;
        }
      }
    } catch (e) {
      console.error('Error reading from localStorage:', e);
    }
    return {};
  };
  
  // Use material selections from project context OR localStorage fallback
  const materialSelections = project?.materialSelections || getMaterialSelectionsFromStorage();

  // ============================================
  // CALCULATED VALUES (ACCURATE)
  // ============================================

  // Extract material quantities from BoQ
  const materialQuantities = useMemo(
    () => extractMaterialQuantities(boq),
    [boq],
  );

  // Calculate embodied carbon from BoQ
  const embodiedCarbon = useMemo(
    () => calculateEmbodiedCarbon(boq, project),
    [boq, project],
  );

  // Calculate GRIHA/IGBC/LEED scores
  const grihaScore = useMemo(
    () => calculateGRIHAScore(project, embodiedCarbon.total),
    [project, embodiedCarbon.total],
  );
  const igbcScore = useMemo(
    () => calculateIGBCScore(project, embodiedCarbon.total),
    [project, embodiedCarbon.total],
  );
  const leedScore = useMemo(
    () => calculateLEEDScore(project, embodiedCarbon.total),
    [project, embodiedCarbon.total],
  );

  const grihaRating = getGRIHARating(grihaScore);
  const igbcRating = getIGBCRating(igbcScore);
  const leedRating = getLEEDRating(leedScore);

  // Calculate carbon reduction based on conventional vs optimized
  // Conventional concrete: ~450 kg CO2/m³, Optimized: ~350 kg CO2/m³
  const conventionalCarbon =
    materialQuantities.concreteVolume * 450 + materialQuantities.steelKg * 3.0;
  const optimizedCarbon = embodiedCarbon.total || 0;
  const carbonReductionPercent =
    conventionalCarbon > 0
      ? ((conventionalCarbon - optimizedCarbon) / conventionalCarbon) * 100
      : 0;

  // Sustainability score based on carbon reduction and project parameters
  const sustainabilityScore = Math.min(
    100,
    Math.round(
      (carbonReductionPercent > 20 ? 30 : carbonReductionPercent) +
        (project.buildingParams?.sustainabilityPriority === "high"
          ? 25
          : project.buildingParams?.sustainabilityPriority === "medium"
            ? 15
            : 5) +
        (project.buildingParams?.hasSolarWaterHeater ? 15 : 0) +
        (project.buildingParams?.hasRainwaterHarvesting ? 15 : 0) +
        (project.buildingParams?.hasSTP ? 10 : 0),
    ),
  );

  // Calculate development control scores
  const siteScore =
    (project.buildingParams?.hasRainwaterHarvesting ? 5 : 0) + 5;
  const waterScore =
    (project.buildingParams?.hasRainwaterHarvesting ? 5 : 0) +
    (project.buildingParams?.hasSTP ? 5 : 0);
  const energyScore =
    (project.buildingParams?.hasSolarWaterHeater ? 10 : 0) + 10;
  const materialsScore =
    project.buildingParams?.sustainabilityPriority === "high"
      ? 8
      : project.buildingParams?.sustainabilityPriority === "medium"
        ? 5
        : 2;
  const iqScore = 5; // Indoor quality assumed good

  // Validation state
  const [validationResults, setValidationResults] = useState({
    dimensions: { warnings: [], errors: [], isValid: true },
    steelRatio: { isValid: true, status: "unknown", message: "" },
    placeholders: { hasPlaceholders: false, issues: [], isDraft: false },
  });

  // Calculate carbon reduction correctly
  // Carbon calculations - use embodied carbon from materials
  const boqCarbonData = boq?.categories
    ? calculateBoQCarbon(boq.categories, {})
    : null;
  const boqCarbon = boqCarbonData?.totalCarbon || 0;

  // Calculate carbon in tonnes for display
  const baselineCarbonTonnes = (conventionalCarbon / 1000).toFixed(1);
  const optimizedCarbonTonnes = (optimizedCarbon / 1000).toFixed(1);

  // Run validation on mount
  useEffect(() => {
    if (project && project.isConfigured) {
      const dimValidation = validateBuildingDimensions(project.buildingParams);

      // Get steel quantity from BoQ if available
      const steelCategory = boq?.categories?.find(
        (c) =>
          c.id?.toLowerCase().includes("steel") ||
          c.name?.toLowerCase().includes("steel"),
      );
      const steelQuantity =
        steelCategory?.items?.reduce((sum, item) => {
          const qty = parseFloat(item.quantity) || 0;
          return sum + qty;
        }, 0) || 0;

      const steelValidation = validateSteelRatio(
        steelQuantity,
        project.buildingParams?.builtUpArea,
      );
      const placeholderCheck = hasPlaceholderData(project);

      setValidationResults({
        dimensions: dimValidation,
        steelRatio: steelValidation,
        placeholders: placeholderCheck,
      });
    }
  }, [project?.isConfigured]);

  // Track if BoQ has been generated for this session
  const [boqGenerated, setBoqGenerated] = useState(false);
  const [lastGeneratedKey, setLastGeneratedKey] = useState(null);

  // Fetch BoQ data asynchronously - runs whenever project changes
  useEffect(() => {
    const fetchBoQ = async () => {
      // Generate BoQ if we have a valid project with building params
      const builtUpArea = project?.buildingParams?.builtUpArea;
      const hasValidParams = builtUpArea && builtUpArea > 0;
      
      // Create a unique key based on project parameters
      const currentKey = JSON.stringify({
        id: project?.id,
        builtUpArea: project?.buildingParams?.builtUpArea,
        numFloors: project?.buildingParams?.numFloors,
        height: project?.buildingParams?.height,
        materials: Object.keys(project?.materialSelections || {}).length
      });
      
      // Only regenerate if key changed or first time
        if (hasValidParams && currentKey !== lastGeneratedKey) {
        setBoqLoading(true);
        try {
          console.log("[Reports] Generating BoQ for:", project.name);
          const boqData = await generateBoQAsync(project);
          console.log("[Reports] BoQ generated:", boqData);
          console.log("[Reports] Categories:", boqData?.categories?.length);
          console.log("[Reports] Grand total:", boqData?.summary?.grandTotal);
          setBoq(boqData);
          setBoqGenerated(true);
          setLastGeneratedKey(currentKey);
          // Update workflow to mark BOQ as generated
          completeBOQGeneration();
        } catch (error) {
          console.error("[Reports] Failed to generate BoQ:", error);
          setBoq({
            projectInfo: { name: project.name, builtUpArea: project.buildingParams?.builtUpArea || 150, numFloors: project.buildingParams?.numFloors || 2 },
            categories: [],
            summary: { subTotal: 0, gstRate: 18, gstAmount: 0, grandTotal: 0 },
          });
          setBoqGenerated(true);
          setLastGeneratedKey(currentKey);
        } finally {
          setBoqLoading(false);
        }
      }
    };

    fetchBoQ();
  }, [project?.id, project?.buildingParams?.builtUpArea, project?.buildingParams?.numFloors, project?.buildingParams?.height, JSON.stringify(project?.materialSelections)]);

  // Manual refresh function
  const handleRefreshBoQ = async () => {
    setBoqGenerated(false);
    setLastGeneratedKey(null);
  };

  // Fetch citations for references
  useEffect(() => {
    const fetchCitations = async () => {
      try {
        console.log("Fetching citations...");
        const response = await ecoBuildAPI.getCitations();
        console.log("Citations response:", response.data);
        if (response.data) {
          setCitations(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch citations:", error);
        // Set empty citations to show fallback message
        setCitations({ bibliography: {}, all_citations: [] });
      }
    };
    fetchCitations();
  }, []);

  // Check if we have valid project data
  const hasValidProject =
    project && project.buildingParams && project.buildingParams.builtUpArea > 0;

  if (!hasValidProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="empty-state-icon mb-6">
            <FaFilePdf className="text-3xl" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            No Project Configured
          </h2>
          <p className="text-foreground-secondary mb-6">
            Set up your project first to generate comprehensive reports.
          </p>
          <button
            onClick={() => navigate("/setup")}
            className="btn btn-primary"
          >
            <FaArrowLeft className="mr-2" />
            Create Project
          </button>
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    // Show only the active tab for printing
    const printStyles = document.createElement('style');
    printStyles.id = 'print-styles';
    printStyles.innerHTML = `
      @media print {
        /* Hide everything except the report content */
        * { visibility: hidden !important; }
        
        /* Show only print containers */
        .print-container,
        .print-container * { visibility: visible !important; }
        
        /* Hide other tabs */
        [data-tab-content]:not([data-tab-content="${activeTab}"]) { display: none !important; }
        [data-tab-content="${activeTab}"] { display: block !important; }
        
        /* Hide navigation and buttons */
        .print\\:hidden { display: none !important; }
        
        /* Page setup */
        body { 
          font-size: 10pt !important;
          line-height: 1.4 !important;
        }
        
        /* Report styling */
        table { font-size: 9pt !important; }
        th { font-weight: bold !important; }
      }
    `;
    document.head.appendChild(printStyles);
    
    // Trigger print
    window.print();
    
    // Clean up
    setTimeout(() => {
      document.getElementById('print-styles')?.remove();
    }, 1000);
  };

  const handleExportPDF = async () => {
    setExporting(true);
    
    try {
      // Dynamic import of jsPDF
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Set up document
      doc.setFont('helvetica');
      
      // Title Block
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('ECOBUILD SUSTAINABILITY ANALYSIS', 105, 15, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('LIFECYCLE DECISION SUPPORT SYSTEM', 105, 22, { align: 'center' });
      doc.text('GEC THRISSUR | DEPARTMENT OF CIVIL ENGINEERING', 105, 28, { align: 'center' });
      
      // Project Info
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('PROJECT: ' + (project.name || 'UNNAMED').toUpperCase(), 15, 40);
      doc.text('JOB NO: EB-' + (project.id?.slice(-6) || '000000').toUpperCase(), 15, 47);
      doc.text('DATE: ' + new Date().toLocaleDateString(), 140, 40);
      doc.text('ENGINEER: ECOBUILD AI', 140, 47);
      
      // Section 1: Project Parameters
      let yPos = 60;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('1. PROJECT PARAMETERS', 15, yPos);
      doc.line(15, yPos + 2, 195, yPos + 2);
      yPos += 10;
      
      // Table headers
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('PARAMETER', 15, yPos);
      doc.text('VALUE', 120, yPos);
      doc.text('UNIT', 170, yPos);
      yPos += 7;
      
      // Table data
      doc.setFont('helvetica', 'normal');
      const params = [
        ['LOCATION', project.location?.district || 'Thrissur', 'Kerala'],
        ['PLOT AREA', (project.buildingParams?.plotArea || 0).toString(), 'SQ.M'],
        ['BUILT-UP AREA', (project.buildingParams?.builtUpArea || 0).toString(), 'SQ.M'],
        ['NO. OF FLOORS', (project.buildingParams?.numFloors || 1).toString(), 'NOS'],
        ['BUILDING HEIGHT', (project.buildingParams?.height || 0).toString(), 'M'],
        ['FAR', (project.buildingParams?.builtUpArea / project.buildingParams?.plotArea || 0).toFixed(3), '-'],
      ];
      
      params.forEach(([param, value, unit]) => {
        doc.text(param, 15, yPos);
        doc.text(value, 120, yPos);
        doc.text(unit, 170, yPos);
        yPos += 6;
      });
      
      // Section 2: Material Quantities
      yPos += 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('2. MATERIAL QUANTITIES', 15, yPos);
      doc.line(15, yPos + 2, 195, yPos + 2);
      yPos += 10;
      
      // Table headers
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('MATERIAL', 15, yPos);
      doc.text('QTY', 80, yPos);
      doc.text('UNIT', 120, yPos);
      doc.text('RATE', 145, yPos);
      doc.text('AMOUNT', 170, yPos);
      yPos += 7;
      
      // Material data
      doc.setFont('helvetica', 'normal');
      const materials = [
        ['Cement', materialQuantities.cementBags?.toFixed(0) || '0', 'bags', '370', ((materialQuantities.cementBags || 0) * 370).toLocaleString()],
        ['Steel', materialQuantities.steelKg?.toFixed(0) || '0', 'kg', '72', ((materialQuantities.steelKg || 0) * 72).toLocaleString()],
        ['Sand', materialQuantities.sandCft?.toFixed(0) || '0', 'cft', '58', ((materialQuantities.sandCft || 0) * 58).toLocaleString()],
        ['Aggregate', materialQuantities.aggregateCft?.toFixed(0) || '0', 'cft', '42', ((materialQuantities.aggregateCft || 0) * 42).toLocaleString()],
      ];
      
      materials.forEach(([mat, qty, unit, rate, amount]) => {
        doc.text(mat, 15, yPos);
        doc.text(qty, 80, yPos);
        doc.text(unit, 120, yPos);
        doc.text(rate, 145, yPos);
        doc.text(amount, 170, yPos);
        yPos += 6;
      });
      
      // Section 3: Sustainability Scores
      yPos += 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('3. SUSTAINABILITY ASSESSMENT', 15, yPos);
      doc.line(15, yPos + 2, 195, yPos + 2);
      yPos += 10;
      
      // Scores
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      doc.text('GRIHA Score: ' + grihaScore + '/100 (' + grihaRating + ')', 15, yPos);
      yPos += 7;
      doc.text('IGBC Score: ' + igbcScore + '/100 (' + igbcRating + ')', 15, yPos);
      yPos += 7;
      doc.text('LEED Score: ' + leedScore + '/110 (' + leedRating + ')', 15, yPos);
      yPos += 7;
      doc.text('Sustainability Score: ' + sustainabilityScore + '/100', 15, yPos);
      yPos += 10;
      
      doc.text('Embodied Carbon: ' + (embodiedCarbon.total || 0).toFixed(0) + ' kg CO2', 15, yPos);
      yPos += 7;
      doc.text('Carbon Reduction: ' + carbonReductionPercent.toFixed(1) + '%', 15, yPos);
      
      // Footer
      doc.setFontSize(8);
      doc.text('Generated by EcoBuild System | Government Engineering College, Thrissur', 105, 285, { align: 'center' });
      doc.text('Date: ' + new Date().toLocaleString(), 105, 290, { align: 'center' });
      
      // Save PDF
      const fileName = (project.name || 'EcoBuild').replace(/\s+/g, '_') + '_Report.pdf';
      doc.save(fileName);
      
    } catch (error) {
      console.error('PDF generation error:', error);
      // Fallback to window.print if jsPDF fails
      window.print();
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);

    if (activeTab === "boq") {
      // Export BoQ CSV
      const { generateBoQAsync } = await import("../utils/boqCalculator");
      const boq = await generateBoQAsync(project);
      const csv = exportBoQToCSV(boq);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${project.name.replace(/\s+/g, "_")}_BoQ.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Generate STAAD-style CSV
      let csv = "*** STAAD.PRO STYLE ANALYSIS REPORT ***\n";
      csv += `PROJECT TITLE: ${project.name.toUpperCase()}\n`;
      csv += `ANALYSIS TYPE: SUSTAINABLE CONSTRUCTION LCA\n`;
      csv += `DATE: ${new Date().toLocaleDateString()}\n`;
      const engineerName =
        isEngineerConfigured && engineer.name
          ? engineer.name
          : "GEC THRISSUR - ECOBUILD SYSTEM";
      const engineerReg =
        isEngineerConfigured && engineer.registrationNumber
          ? ` (${engineer.registrationNumber})`
          : "";
      csv += `ENGINEER: ${engineerName}${engineerReg}\n`;
      if (isEngineerConfigured && engineer.company) {
        csv += `COMPANY: ${engineer.company}\n`;
      }
      csv += `DATE: ${new Date().toLocaleDateString()}\n\n`;

      csv += "*** PROJECT GEOMETRY ***\n";
      csv += `JOINT COORDINATES (LAT,LON): ${project.location.lat.toFixed(6)} ${project.location.lon.toFixed(6)}\n`;
      csv += `PLOT AREA (SQ.M): ${project.buildingParams.plotArea}\n`;
      csv += `BUILT-UP AREA (SQ.M): ${project.buildingParams.builtUpArea}\n`;
      csv += `NO. OF FLOORS: ${project.buildingParams.numFloors}\n`;
      csv += `BUILDING HEIGHT (M): ${project.buildingParams.height}\n`;
      csv += `FAR: ${(project.buildingParams.builtUpArea / project.buildingParams.plotArea).toFixed(3)}\n\n`;

      csv += "*** MATERIAL SPECIFICATIONS ***\n";
      csv += "MEMBER,TYPE,GRADE,QUANTITY,UNIT,CARBON(kg),COST(Rs)\n";
      Object.entries(project.materialSelections).forEach(([cat, mat]) => {
        csv += `${cat.toUpperCase()},${mat.name},STD,${mat.quantity || 1},${mat.unit || "each"},${mat.embodied_carbon},${mat.cost_per_unit}\n`;
      });

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name.replace(/\s+/g, "_")}_STAAD_REPORT.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }

    setExporting(false);
  };

  // Render BoQ Summary Card
  const renderBoQSummary = () => {
    if (boqLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <FaSpinner className="animate-spin text-2xl text-primary mr-2" />
          <span className="text-foreground-secondary">
            Calculating Bill of Quantities...
          </span>
        </div>
      );
    }

    if (!boq || !boq.summary) {
      return (
        <div className="p-4 text-center text-foreground-secondary">
          Unable to load BoQ data. Please try again.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-5 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <FaMoneyBillWave className="text-xl" />
            </div>
            <span className="text-sm text-blue-100">Grand Total</span>
          </div>
          <p className="text-2xl font-bold">
            {formatCurrency(boq?.summary?.grandTotal || 0)}
          </p>
          <p className="text-xs text-blue-100 mt-1">Incl. GST @ 18%</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg">
              <FaClipboardList className="text-xl" />
            </div>
            <span className="text-sm text-foreground-secondary">
              Total Items
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {boq?.categories?.reduce((sum, cat) => sum + cat.items.length, 0) ||
              0}
          </p>
          <p className="text-xs text-foreground-secondary mt-1">
            Across {boq?.categories?.length || 0} categories
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-lg">
              <FaCalculator className="text-xl" />
            </div>
            <span className="text-sm text-foreground-secondary">
              Cost per sq.ft
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            ₹{" "}
            {(boq?.summary?.grandTotal || 0) /
              ((boq?.projectInfo?.totalArea || 1) * 10.764)}
          </p>
          <p className="text-xs text-foreground-secondary mt-1">
            Based on total area
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg">
              <FaChartBar className="text-xl" />
            </div>
            <span className="text-sm text-foreground-secondary">
              GST Amount
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(boq?.summary?.gstAmount || 0)}
          </p>
          <p className="text-xs text-foreground-secondary mt-1">
            @ {boq?.summary?.gstRate || 18}%
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Analysis Reports
          </h1>
          <p className="text-foreground-secondary mt-1">
            Generate Quantity Survey, Bill of Quantities (BoQ), and
            Sustainability Assessment reports
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button onClick={handleRefreshBoQ} className="btn btn-secondary">
            <FaSyncAlt className="mr-2" />
            Refresh
          </button>
          <button onClick={handlePrint} className="btn btn-secondary">
            <FaPrint className="mr-2" />
            Print
          </button>
          <button
            onClick={handleExportExcel}
            disabled={exporting}
            className="btn btn-secondary"
          >
            <FaFileExcel className="mr-2" />
            Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="btn btn-primary"
          >
            <FaFilePdf className="mr-2" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 dark:border-gray-700 print:hidden">
        <button
          onClick={() => setActiveTab("staad")}
          className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "staad"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-foreground-secondary hover:text-foreground"
          }`}
        >
          <FaChartBar />
          Technical Report
        </button>
        <button
          onClick={() => setActiveTab("boq")}
          className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "boq"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-foreground-secondary hover:text-foreground"
          }`}
        >
          <FaClipboardList />
          Bill of Quantities
        </button>
        <button
          onClick={() => setActiveTab("materialsummary")}
          className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "materialsummary"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-foreground-secondary hover:text-foreground"
          }`}
        >
          <FaIndustry />
          Material Summary
        </button>
        <button
          onClick={() => setActiveTab("suppliers")}
          className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "suppliers"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-foreground-secondary hover:text-foreground"
          }`}
        >
          <FaIndustry />
          Suppliers
        </button>
        <button
          onClick={() => setActiveTab("sustainability")}
          className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "sustainability"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-foreground-secondary hover:text-foreground"
          }`}
        >
          <FaLeaf />
          Sustainability
        </button>
        <button
          onClick={() => setActiveTab("cost")}
          className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "cost"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-foreground-secondary hover:text-foreground"
          }`}
        >
          <FaMoneyBillWave />
          Cost Summary
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "ai"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-foreground-secondary hover:text-foreground"
          }`}
        >
          <FaLeaf />
          AI Recommendations
        </button>
      </div>

      {/* Content */}
      <div ref={reportRef} className="print-container">
        {/* Print Header - Only visible when printing */}
        <div className="hidden print:block mb-8 print-header">
          <div className="text-center border-b-2 border-gray-800 pb-4 mb-4">
            <h1 className="text-3xl font-bold">PROJECT REPORT</h1>
            <p className="text-xl mt-2">{project.name}</p>
            <p className="text-sm text-gray-600">
              {project.location?.district || "Thrissur"}, Kerala
            </p>
            <p className="text-sm text-gray-600">
              Generated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>

        <div
          data-tab-content="boq"
          style={{ display: activeTab === "boq" ? "block" : "none" }}
          className="print:hidden"
        >
          <BillOfQuantities />
        </div>

        <div
          data-tab-content="materialsummary"
          style={{
            display: activeTab === "materialsummary" ? "block" : "none",
          }}
          className="print:hidden"
        >
          <MaterialSummaryTab boq={boq} project={project} />
        </div>

        <div
          data-tab-content="suppliers"
          style={{ display: activeTab === "suppliers" ? "block" : "none" }}
          className="print:hidden"
        >
          <SuppliersTab boq={boq} project={project} />
        </div>

        <div
          data-tab-content="staad"
          style={{ display: activeTab === "staad" ? "block" : "none" }}
          className="print:block"
        >
          <div className="bg-white text-black font-mono text-sm leading-relaxed p-8 shadow-lg print:p-4">
            {/* Draft Watermark */}
            {validationResults.placeholders.isDraft && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 print:opacity-5">
                <div className="transform -rotate-45 text-8xl font-bold text-red-600 border-8 border-red-600 px-8 py-4">
                  DRAFT
                </div>
              </div>
            )}

            {/* Page 1: Title Block */}
            <div className="border-2 border-black p-6 mb-8 relative">
              {validationResults.placeholders.isDraft && (
                <div className="absolute top-2 right-2 bg-red-100 border border-red-500 text-red-700 px-2 py-1 text-xs font-bold">
                  DRAFT REPORT
                </div>
              )}

              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold mb-2">
                  *** ECOBUILD SUSTAINABILITY ANALYSIS ***
                </h1>
                <h2 className="text-lg">LIFECYCLE DECISION SUPPORT SYSTEM</h2>
                <p className="text-sm mt-2">
                  GEC THRISSUR | DEPARTMENT OF CIVIL ENGINEERING
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t-2 border-black pt-4">
                <div>
                  <p>
                    <strong>PROJECT:</strong>{" "}
                    {project.name?.toUpperCase() || "UNNAMED PROJECT"}
                  </p>
                  <p>
                    <strong>JOB NO:</strong> EB-
                    {project.id?.slice(-6).toUpperCase() ||
                      Date.now().toString(36).toUpperCase().slice(-6)}
                  </p>
                  <p>
                    <strong>CLIENT:</strong>{" "}
                    {project.clientName?.toUpperCase() ||
                      project.buildingClassification?.mainUse?.toUpperCase() ||
                      "NOT SPECIFIED"}
                  </p>
                </div>
                <div>
                  <p>
                    <strong>DATE:</strong> {new Date().toLocaleDateString()}
                  </p>
                  <p>
                    <strong>ENGINEER:</strong>{" "}
                    {isEngineerConfigured && engineer.name
                      ? engineer.name
                      : "ECOBUILD AI"}
                  </p>
                  <p>
                    <strong>REG NO:</strong>{" "}
                    {isEngineerConfigured && engineer.registrationNumber
                      ? engineer.registrationNumber
                      : "N/A"}
                  </p>
                  <p>
                    <strong>CHECKED:</strong>{" "}
                    {validationResults.placeholders.isDraft
                      ? "PENDING REVIEW"
                      : "APPROVED"}
                  </p>
                </div>
              </div>

              {validationResults.placeholders.hasPlaceholders && (
                <div className="mt-4 p-2 bg-yellow-50 border border-yellow-400 text-xs text-yellow-800">
                  <strong>NOTE:</strong> This report contains placeholder data.
                  Please complete all project fields for final approval.
                </div>
              )}
            </div>

            {/* Page 2: Project Data */}
            <div className="mb-8">
              <h3 className="font-bold text-lg border-b-2 border-black mb-4">
                1. PROJECT PARAMETERS
              </h3>

              <table className="w-full border-collapse border border-black mb-4">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-black p-2 text-left">
                      PARAMETER
                    </th>
                    <th className="border border-black p-2 text-left">VALUE</th>
                    <th className="border border-black p-2 text-left">UNIT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-2">
                      LOCATION (LATITUDE)
                    </td>
                    <td className="border border-black p-2">
                      {project.location.lat.toFixed(6)}
                    </td>
                    <td className="border border-black p-2">DEG</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">
                      LOCATION (LONGITUDE)
                    </td>
                    <td className="border border-black p-2">
                      {project.location.lon.toFixed(6)}
                    </td>
                    <td className="border border-black p-2">DEG</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">PLOT AREA</td>
                    <td className="border border-black p-2">
                      {project.buildingParams.plotArea}
                    </td>
                    <td className="border border-black p-2">SQ.M</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">BUILT-UP AREA</td>
                    <td className="border border-black p-2">
                      {project.buildingParams.builtUpArea}
                    </td>
                    <td className="border border-black p-2">SQ.M</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">NO. OF FLOORS</td>
                    <td className="border border-black p-2">
                      {project.buildingParams.numFloors}
                    </td>
                    <td className="border border-black p-2">NOS</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">BUILDING HEIGHT</td>
                    <td className="border border-black p-2">
                      {project.buildingParams.height}
                    </td>
                    <td className="border border-black p-2">M</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">
                      FLOOR AREA RATIO (FAR)
                    </td>
                    <td className="border border-black p-2">
                      {(
                        project.buildingParams.builtUpArea /
                        project.buildingParams.plotArea
                      ).toFixed(3)}
                    </td>
                    <td className="border border-black p-2">-</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">ROAD WIDTH</td>
                    <td className="border border-black p-2">
                      {project.buildingParams.roadWidth}
                    </td>
                    <td className="border border-black p-2">M</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Page 3: Material Summary */}
            <div className="mb-8">
              <h3 className="font-bold text-lg border-b-2 border-black mb-4">
                2. MATERIAL SPECIFICATIONS
              </h3>

              <table className="w-full border-collapse border border-black mb-4">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-black p-2 text-left">
                      MEMBER
                    </th>
                    <th className="border border-black p-2 text-left">
                      MATERIAL TYPE
                    </th>
                    <th className="border border-black p-2 text-right">QTY</th>
                    <th className="border border-black p-2 text-left">UNIT</th>
                    <th className="border border-black p-2 text-right">
                      CARBON (KG)
                    </th>
                    <th className="border border-black p-2 text-right">
                      COST (Rs)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(project.materialSelections).length > 0 ? (
                    Object.entries(project.materialSelections).map(
                      ([cat, mat], idx) => (
                        <tr key={idx}>
                          <td className="border border-black p-2">
                            {cat.toUpperCase()}
                          </td>
                          <td className="border border-black p-2">
                            {mat.name || mat.id || 'Selected Material'}
                          </td>
                          <td className="border border-black p-2 text-right">
                            {mat.qty || mat.quantity || '-'}
                          </td>
                          <td className="border border-black p-2">
                            {mat.unit || mat.unit_type || '-'}
                          </td>
                          <td className="border border-black p-2 text-right">
                            {mat.carbon || mat.embodied_carbon || '-'}
                          </td>
                          <td className="border border-black p-2 text-right">
                            {mat.rate || mat.cost_per_unit ? 
                              'Rs ' + (mat.rate || mat.cost_per_unit).toLocaleString() : '-'}
                          </td>
                        </tr>
                      ),
                    )
                  ) : (
                    <tr>
                      <td
                        colSpan="6"
                        className="border border-black p-4 text-center text-gray-500"
                      >
                        NO MATERIALS SELECTED - RUN OPTIMIZATION FIRST
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Page 4: Analysis Results */}
            <div className="mb-8">
              <h3 className="font-bold text-lg border-b-2 border-black mb-4">
                3. SUSTAINABILITY ANALYSIS RESULTS
              </h3>

              {/* Validation Warnings */}
              {(validationResults.dimensions.warnings.length > 0 ||
                validationResults.dimensions.errors.length > 0 ||
                !validationResults.steelRatio.isValid) && (
                <div className="mb-6 p-4 border-2 border-red-500 bg-red-50">
                  <h4 className="font-bold text-red-700 mb-2 flex items-center">
                    <FaExclamationTriangle className="mr-2" />
                    VALIDATION WARNINGS
                  </h4>
                  {validationResults.dimensions.errors.map((err, idx) => (
                    <p key={`err-${idx}`} className="text-red-600 text-sm mb-1">
                      ERROR: {err.message}
                    </p>
                  ))}
                  {validationResults.dimensions.warnings.map((warn, idx) => (
                    <p
                      key={`warn-${idx}`}
                      className="text-orange-600 text-sm mb-1"
                    >
                      WARNING: {warn.message}
                    </p>
                  ))}
                  {validationResults.steelRatio.status === "over-designed" && (
                    <p className="text-red-600 text-sm mb-1">
                      ERROR: {validationResults.steelRatio.message}
                    </p>
                  )}
                  {validationResults.steelRatio.status === "high" && (
                    <p className="text-orange-600 text-sm mb-1">
                      WARNING: {validationResults.steelRatio.message}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="border border-black p-4">
                  <p className="font-bold mb-2">SUSTAINABILITY SCORE</p>
                  <p className="text-3xl font-bold">
                    {sustainabilityScore}/100
                  </p>
                  <p className="text-sm text-gray-600">
                    {sustainabilityScore >= 75
                      ? "GRIHA 5-STAR ELIGIBLE"
                      : sustainabilityScore >= 60
                        ? "GRIHA 4-STAR ELIGIBLE"
                        : sustainabilityScore >= 45
                          ? "GRIHA 3-STAR ELIGIBLE"
                          : "NEEDS IMPROVEMENT"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    (Based on structural elements only)
                  </p>
                </div>
                <div className="border border-black p-4">
                  <p className="font-bold mb-2">CARBON REDUCTION</p>
                  <p className="text-3xl font-bold">
                    {carbonReductionPercent.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-600">
                    VS CONVENTIONAL DESIGN
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    ({baselineCarbonTonnes} → {optimizedCarbonTonnes} tons CO2)
                  </p>
                </div>
              </div>

              <table className="w-full border-collapse border border-black mb-4">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-black p-2 text-left">
                      ANALYSIS TYPE
                    </th>
                    <th className="border border-black p-2 text-right">
                      CONVENTIONAL
                    </th>
                    <th className="border border-black p-2 text-right">
                      OPTIMIZED
                    </th>
                    <th className="border border-black p-2 text-right">
                      SAVINGS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-2">
                      EMBODIED CARBON (TONS)
                    </td>
                    <td className="border border-black p-2 text-right">
                      {baselineCarbonTonnes}
                    </td>
                    <td className="border border-black p-2 text-right">
                      {optimizedCarbonTonnes}
                    </td>
                    <td className="border border-black p-2 text-right">
                      {(
                        parseFloat(baselineCarbonTonnes) -
                        parseFloat(optimizedCarbonTonnes)
                      ).toFixed(1)}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">
                      MATERIAL COST (Rs LAKHS)
                    </td>
                    <td className="border border-black p-2 text-right">
                      {(
                        ((boq?.summary?.grandTotal || 0) * 1.15) /
                        100000
                      ).toFixed(1)}
                    </td>
                    <td className="border border-black p-2 text-right">
                      {((boq?.summary?.grandTotal || 0) / 100000).toFixed(1)}
                    </td>
                    <td className="border border-black p-2 text-right">
                      {(
                        ((boq?.summary?.grandTotal || 0) * 0.15) /
                        100000
                      ).toFixed(1)}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">
                      RECYCLED CONTENT (%)
                    </td>
                    <td className="border border-black p-2 text-right">5%</td>
                    <td className="border border-black p-2 text-right">
                      {project.buildingParams?.sustainabilityPriority === "high"
                        ? "35%"
                        : project.buildingParams?.sustainabilityPriority ===
                            "medium"
                          ? "20%"
                          : "10%"}
                    </td>
                    <td className="border border-black p-2 text-right">
                      {project.buildingParams?.sustainabilityPriority === "high"
                        ? "30%"
                        : project.buildingParams?.sustainabilityPriority ===
                            "medium"
                          ? "15%"
                          : "5%"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="border-t-2 border-black pt-4 text-center text-xs">
              <p>*** END OF TECHNICAL REPORT ***</p>
              <p className="mt-2">
                ECOBUILD LIFECYCLE DECISION SUPPORT SYSTEM v1.0
              </p>
              <p>GOVERNMENT ENGINEERING COLLEGE THRISSUR</p>
              <p>ANALYSIS DATE: {new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div
          data-tab-content="sustainability"
          style={{ display: activeTab === "sustainability" ? "block" : "none" }}
          className="print:block"
        >
          <div className="bg-white text-black font-mono text-sm leading-relaxed p-8 shadow-lg print:p-4">
            <div className="border-2 border-black p-6 mb-8 print:break-inside-avoid">
              <h1 className="text-2xl font-bold text-center mb-4">
                SUSTAINABILITY ASSESSMENT REPORT
              </h1>
              <h2 className="text-lg text-center">
                GRIHA / IGBC / LEED Rating Analysis
              </h2>
            </div>

            <div className="mb-8">
              <h3 className="font-bold text-lg border-b-2 border-black mb-4">
                1. GREEN BUILDING RATINGS
              </h3>

              <table className="w-full border-collapse border border-black mb-4">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-black p-2 text-left">
                      RATING SYSTEM
                    </th>
                    <th className="border border-black p-2 text-left">SCORE</th>
                    <th className="border border-black p-2 text-left">
                      RATING
                    </th>
                    <th className="border border-black p-2 text-center">
                      STATUS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-2">GRIHA (India)</td>
                    <td className="border border-black p-2">{grihaScore}</td>
                    <td className="border border-black p-2">{grihaRating}</td>
                    <td className="border border-black p-2 text-center">
                      {grihaScore >= 50 ? "✓" : "○"}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">IGBC (India)</td>
                    <td className="border border-black p-2">{igbcScore}</td>
                    <td className="border border-black p-2">{igbcRating}</td>
                    <td className="border border-black p-2 text-center">
                      {igbcScore >= 40 ? "✓" : "○"}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">
                      LEED (International)
                    </td>
                    <td className="border border-black p-2">{leedScore}</td>
                    <td className="border border-black p-2">{leedRating}</td>
                    <td className="border border-black p-2 text-center">
                      {leedScore >= 40 ? "✓" : "○"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* EMBODIED CARBON SECTION */}
            <div className="mb-8">
              <h3 className="font-bold text-lg border-b-2 border-black mb-4">
                2. EMBODIED CARBON ANALYSIS
              </h3>

              <table className="w-full border-collapse border border-black mb-4">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-black p-2 text-left">
                      MATERIAL
                    </th>
                    <th className="border border-black p-2 text-right">
                      QUANTITY
                    </th>
                    <th className="border border-black p-2 text-right">
                      CARBON (kg CO2)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-2">Cement</td>
                    <td className="border border-black p-2 text-right">
                      {formatNumber(Math.round(materialQuantities.cementBags))}{" "}
                      bags
                    </td>
                    <td className="border border-black p-2 text-right">
                      {formatNumber(
                        Math.round(embodiedCarbon.breakdown.cement),
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">Steel</td>
                    <td className="border border-black p-2 text-right">
                      {formatNumber(Math.round(materialQuantities.steelKg))} kg
                    </td>
                    <td className="border border-black p-2 text-right">
                      {formatNumber(Math.round(embodiedCarbon.breakdown.steel))}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">Sand</td>
                    <td className="border border-black p-2 text-right">
                      {formatNumber(Math.round(materialQuantities.sandCft))} cft
                    </td>
                    <td className="border border-black p-2 text-right">
                      {formatNumber(Math.round(embodiedCarbon.breakdown.sand))}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">Aggregate</td>
                    <td className="border border-black p-2 text-right">
                      {formatNumber(
                        Math.round(materialQuantities.aggregateCft),
                      )}{" "}
                      cft
                    </td>
                    <td className="border border-black p-2 text-right">
                      {formatNumber(
                        Math.round(embodiedCarbon.breakdown.aggregate),
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">Blocks</td>
                    <td className="border border-black p-2 text-right">
                      {formatNumber(Math.round(materialQuantities.blocksNos))}{" "}
                      nos
                    </td>
                    <td className="border border-black p-2 text-right">
                      {formatNumber(
                        Math.round(embodiedCarbon.breakdown.blocks),
                      )}
                    </td>
                  </tr>
                  <tr className="bg-gray-100 font-bold">
                    <td className="border border-black p-2">
                      TOTAL EMBODIED CARBON
                    </td>
                    <td className="border border-black p-2 text-right"></td>
                    <td className="border border-black p-2 text-right">
                      {formatNumber(Math.round(embodiedCarbon.total))} kg CO2
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-green-800 font-semibold">
                  Carbon Reduction vs Conventional:{" "}
                  {carbonReductionPercent.toFixed(1)}%
                </p>
                <p className="text-sm text-green-700">
                  Using optimized materials and sustainable practices reduces
                  environmental impact
                </p>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="font-bold text-lg border-b-2 border-black mb-4">
                3. DEVELOPMENT CONTROL
              </h3>

              <table className="w-full border-collapse border border-black mb-4">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-black p-2 text-left">
                      CATEGORY
                    </th>
                    <th className="border border-black p-2 text-left">
                      POINTS EARNED
                    </th>
                    <th className="border border-black p-2 text-left">
                      MAX POINTS
                    </th>
                    <th className="border border-black p-2 text-center">
                      CONTRIBUTION
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-2">Site & Planning</td>
                    <td className="border border-black p-2">{siteScore}</td>
                    <td className="border border-black p-2">15</td>
                    <td className="border border-black p-2 text-center">
                      Site selection, accessibility
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">
                      Water Efficiency
                    </td>
                    <td className="border border-black p-2">{waterScore}</td>
                    <td className="border border-black p-2">10</td>
                    <td className="border border-black p-2 text-center">
                      Rainwater harvesting, STP
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">
                      Energy Performance
                    </td>
                    <td className="border border-black p-2">{energyScore}</td>
                    <td className="border border-black p-2">20</td>
                    <td className="border border-black p-2 text-center">
                      Solar, efficient systems
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">
                      Materials & Resources
                    </td>
                    <td className="border border-black p-2">
                      {materialsScore}
                    </td>
                    <td className="border border-black p-2">15</td>
                    <td className="border border-black p-2 text-center">
                      Low carbon materials
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">
                      Indoor Environment
                    </td>
                    <td className="border border-black p-2">{iqScore}</td>
                    <td className="border border-black p-2">5</td>
                    <td className="border border-black p-2 text-center">
                      Ventilation, lighting
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mb-8">
              <h3 className="font-bold text-lg border-b-2 border-black mb-4">
                4. SUSTAINABLE FEATURES
              </h3>

              <table className="w-full border-collapse border border-black mb-4">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-black p-2 text-left">
                      FEATURE
                    </th>
                    <th className="border border-black p-2 text-left">
                      STATUS
                    </th>
                    <th className="border border-black p-2 text-center">
                      IMPACT
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-2">
                      RAINWATER HARVESTING
                    </td>
                    <td className="border border-black p-2">
                      {project.buildingParams.hasRainwaterHarvesting
                        ? "INSTALLED"
                        : "NOT INSTALLED"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      +{project.buildingParams.hasRainwaterHarvesting ? 5 : 0}{" "}
                      pts
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">
                      SOLAR WATER HEATER
                    </td>
                    <td className="border border-black p-2">
                      {project.buildingParams.hasSolarWaterHeater
                        ? "INSTALLED"
                        : "NOT INSTALLED"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      +{project.buildingParams.hasSolarWaterHeater ? 5 : 0} pts
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">
                      SEWAGE TREATMENT PLANT
                    </td>
                    <td className="border border-black p-2">
                      {project.buildingParams.hasSTP
                        ? "INSTALLED"
                        : "NOT INSTALLED"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      +{project.buildingParams.hasSTP ? 4 : 0} pts
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">
                      LOW CARBON MATERIALS
                    </td>
                    <td className="border border-black p-2">
                      {project.sustainability?.lowCarbonMaterials
                        ? "SELECTED"
                        : "STANDARD"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      +{project.sustainability?.lowCarbonMaterials ? 6 : 0} pts
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Eco-Friendly Recommendations */}
            <div className="mb-8">
              <h3 className="font-bold text-lg border-b-2 border-black mb-4">
                3. ECO-FRIENDLY CONSTRUCTION RECOMMENDATIONS
              </h3>

              <div className="space-y-4">
                {/* Material Recommendations */}
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                    <FaLeaf className="text-green-600" />
                    Material Selection
                  </h4>
                  <ul className="text-sm text-green-700 dark:text-green-300 space-y-1 list-disc list-inside">
                    {project.sustainability?.lowCarbonMaterials ? (
                      <li>
                        ✓ Using low carbon materials - great choice for
                        environmental impact!
                      </li>
                    ) : (
                      <>
                        <li>
                          Consider using fly ash or slag-based cement (PPC/PSC)
                          to reduce embodied carbon by 30-40%
                        </li>
                        <li>
                          Use recycled steel or secondary steel to reduce carbon
                          footprint
                        </li>
                        <li>
                          Consider using fly ash brick/block masonry instead of
                          conventional bricks
                        </li>
                      </>
                    )}
                    <li>
                      Use locally sourced aggregates to minimize transportation
                      emissions
                    </li>
                    <li>
                      Consider using bamboo or engineered wood for
                      non-structural elements
                    </li>
                  </ul>
                </div>

                {/* Energy Recommendations */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2 flex items-center gap-2">
                    <FaSun className="text-yellow-600" />
                    Energy Efficiency
                  </h4>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 list-disc list-inside">
                    {!project.buildingParams.hasSolarWaterHeater && (
                      <li>
                        Install solar water heater to earn 5 GRIHA points and
                        reduce electricity costs
                      </li>
                    )}
                    <li>
                      Use energy-efficient lighting (LED) to reduce operational
                      energy by 40-60%
                    </li>
                    <li>
                      Install rainwater harvesting system for water security and
                      sustainability points
                    </li>
                    <li>
                      Consider building orientation for maximum natural
                      ventilation and daylight
                    </li>
                  </ul>
                </div>

                {/* Water Recommendations */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                    <FaWater className="text-blue-600" />
                    Water Conservation
                  </h4>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                    {!project.buildingParams.hasRainwaterHarvesting && (
                      <li>
                        Install rainwater harvesting system - mandatory for
                        buildings over 100 sqm
                      </li>
                    )}
                    {!project.buildingParams.hasSTP && (
                      <li>
                        Consider sewage treatment plant for water reuse (toilet
                        flushing, gardening)
                      </li>
                    )}
                    <li>
                      Use low-flow fixtures to reduce water consumption by 30%
                    </li>
                    <li>Install dual-flush toilets to save water</li>
                    <li>Use permeable paving for groundwater recharge</li>
                  </ul>
                </div>

                {/* Waste Management */}
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                  <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-2 flex items-center gap-2">
                    <FaRecycle className="text-purple-600" />
                    Waste Management
                  </h4>
                  <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-1 list-disc list-inside">
                    <li>
                      Segregate construction waste (hazardous, recyclable,
                      inert)
                    </li>
                    <li>
                      Use prefabricated components to reduce on-site waste
                    </li>
                    <li>
                      Donate leftover materials to NGOs or reuse in other
                      projects
                    </li>
                    <li>Set up a construction waste management plan</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Supplier & Logistics Information */}
            <div className="mb-8">
              <h3 className="font-bold text-lg border-b-2 border-black mb-4">
                4. SUPPLIER & LOGISTICS
              </h3>

              <table className="w-full border-collapse border border-black mb-4">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-black p-2 text-left">
                      MATERIAL
                    </th>
                    <th className="border border-black p-2 text-left">
                      SUPPLIER
                    </th>
                    <th className="border border-black p-2 text-left">
                      LOCATION
                    </th>
                    <th className="border border-black p-2 text-center">
                      LEAD TIME
                    </th>
                    <th className="border border-black p-2 text-center">
                      RELIABILITY
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(project.materialSelections || {}).map(
                    ([cat, mat]) => (
                      <tr key={cat}>
                        <td className="border border-black p-2 capitalize">
                          {cat}
                        </td>
                        <td className="border border-black p-2">
                          {mat.supplier_name ||
                            mat.supplier ||
                            "Local Supplier"}
                        </td>
                        <td className="border border-black p-2">
                          {mat.supplier_location ||
                            project.location?.district ||
                            "Thrissur"}
                        </td>
                        <td className="border border-black p-2 text-center">
                          {mat.lead_time_days || "1-2"} days
                        </td>
                        <td className="border border-black p-2 text-center">
                          {mat.reliability_rating || "9"}/10
                        </td>
                      </tr>
                    ),
                  )}
                  {(!project.materialSelections ||
                    Object.keys(project.materialSelections).length === 0) && (
                    <tr>
                      <td
                        colSpan={5}
                        className="border border-black p-4 text-center text-gray-500"
                      >
                        Run Material Optimization to see supplier details
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                  Logistics Recommendations
                </h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                  <li>
                    Transportation distance:{" "}
                    {project.buildingParams.maxTransportDistance || 50} km
                    maximum (reduces embodied carbon)
                  </li>
                  <li>
                    Consolidated delivery schedules reduce logistics emissions
                  </li>
                  <li>
                    Local sourcing priority within{" "}
                    {project.buildingParams.maxTransportDistance || 50} km
                    radius
                  </li>
                  <li>
                    Consider bulk ordering to optimize transportation costs
                  </li>
                </ul>
              </div>
            </div>

            {/* AI Recommendations */}
            <div className="mb-8">
              <h3 className="font-bold text-lg border-b-2 border-black mb-4">
                5. AI RECOMMENDATIONS
              </h3>

              <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 rounded-lg border border-primary">
                <h4 className="font-semibold text-primary mb-2">
                  Smart Recommendations
                </h4>
                <div className="text-sm text-foreground space-y-2">
                  <p>
                    <strong>Based on your project parameters:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>
                      Built-up Area:{" "}
                      {project.buildingParams?.builtUpArea || 150} m² with{" "}
                      {project.buildingParams?.numFloors || 2} floors
                    </li>
                    <li>
                      Recommended Steel Ratio:{" "}
                      {project.buildingParams?.steelRatio || 100} kg/m³ (IS 456
                      compliant)
                    </li>
                    <li>
                      Exposure Condition:{" "}
                      {project.buildingParams?.exposureCondition || "moderate"}{" "}
                      (IS 456)
                    </li>
                    <li>
                      Sustainability Priority:{" "}
                      {project.buildingParams?.sustainabilityPriority || "high"}
                    </li>
                  </ul>
                  {project.sustainabilityPriority === "high" && (
                    <p className="mt-2 text-primary">
                      ✓ High sustainability mode enabled - prioritizing low
                      carbon materials
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t-2 border-black pt-4 text-center text-xs">
              <p>*** END OF SUSTAINABILITY ASSESSMENT ***</p>
              <p className="mt-2">GRIHA / IGBC / LEED Rating Analysis</p>
              <p>GENERATED: {new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div
          data-tab-content="cost"
          style={{ display: activeTab === "cost" ? "block" : "none" }}
          className="print:block"
        >
          <div className="space-y-6">
            {renderBoQSummary()}

            {/* Cost Breakdown by Category */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                <FaMoneyBillWave className="text-green-500" />
                Cost Breakdown by Category
              </h3>

              <div className="space-y-4">
                {boq?.categories?.map((category, idx) => {
                  const percentage =
                    (category.subTotal / (boq?.summary?.subTotal || 1)) * 100;
                  return (
                    <div key={category.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-foreground font-medium">
                          {category.name}
                        </span>
                        <div className="flex items-center gap-4">
                          <span className="text-foreground-secondary text-sm">
                            {percentage.toFixed(1)}%
                          </span>
                          <span className="text-foreground font-mono font-semibold w-32 text-right">
                            {formatCurrency(category.subTotal)}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 pt-6 border-t-2 border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between text-lg mb-3">
                  <span className="text-foreground-secondary">Sub-Total</span>
                  <span className="font-mono font-bold text-foreground">
                    {formatCurrency(boq?.summary?.subTotal || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-lg mb-3">
                  <span className="text-foreground-secondary">
                    GST @ {boq?.summary?.gstRate || 18}%
                  </span>
                  <span className="font-mono text-foreground">
                    {formatCurrency(boq?.summary?.gstAmount || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-4 border-t-2 border-dashed border-gray-300 dark:border-gray-600">
                  <span className="text-2xl font-bold text-foreground">
                    Grand Total
                  </span>
                  <span className="text-3xl font-bold text-green-600 dark:text-green-400 font-mono">
                    {formatCurrency(boq?.summary?.grandTotal || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Material Cost Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">
                  Major Materials Required
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-foreground-secondary flex items-center gap-2">
                      <FaIndustry className="text-gray-400" /> Cement (OPC 53)
                    </span>
                    <span className="text-foreground font-semibold">
                      {formatNumber(Math.round(materialQuantities.cementBags))}{" "}
                      bags
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-foreground-secondary flex items-center gap-2">
                      <FaHardHat className="text-gray-400" /> TMT Steel (Fe500)
                    </span>
                    <span className="text-foreground font-semibold">
                      {formatNumber(Math.round(materialQuantities.steelKg))} kg
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-foreground-secondary flex items-center gap-2">
                      <FaTruck className="text-gray-400" /> M-Sand
                    </span>
                    <span className="text-foreground font-semibold">
                      {formatNumber(Math.round(materialQuantities.sandCft))} cft
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-foreground-secondary flex items-center gap-2">
                      <FaTruck className="text-gray-400" /> 20mm Aggregate
                    </span>
                    <span className="text-foreground font-semibold">
                      {formatNumber(
                        Math.round(materialQuantities.aggregateCft),
                      )}{" "}
                      cft
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-foreground-secondary flex items-center gap-2">
                      <FaIndustry className="text-gray-400" /> AAC Blocks
                    </span>
                    <span className="text-foreground font-semibold">
                      {formatNumber(Math.round(materialQuantities.blocksNos))}{" "}
                      nos
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-foreground-secondary flex items-center gap-2">
                      <FaIndustry className="text-gray-400" /> Concrete Volume
                    </span>
                    <span className="text-foreground font-semibold">
                      {formatNumber(
                        materialQuantities.concreteVolume.toFixed(2),
                      )}{" "}
                      m³
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">
                  Cost Analysis
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-foreground-secondary">
                      Cost per sq.m
                    </span>
                    <span className="text-foreground font-semibold">
                      ₹{" "}
                      {Math.round(
                        (boq?.summary?.grandTotal || 0) /
                          (boq?.projectInfo?.totalArea || 1),
                      ).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-foreground-secondary">
                      Cost per sq.ft
                    </span>
                    <span className="text-foreground font-semibold">
                      ₹{" "}
                      {Math.round(
                        (boq?.summary?.grandTotal || 0) /
                          ((boq?.projectInfo?.totalArea || 1) * 10.764),
                      ).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-foreground-secondary">
                      Concrete Work Cost
                    </span>
                    <span className="text-foreground font-semibold">
                      {formatCurrency(
                        boq?.categories?.find((c) => c.name === "Concrete Work")
                          ?.subTotal || 0,
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-foreground-secondary">
                      Steel Cost
                    </span>
                    <span className="text-foreground font-semibold">
                      {formatCurrency(
                        boq?.categories?.find(
                          (c) => c.name === "Reinforcement Steel",
                        )?.subTotal || 0,
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-foreground-secondary">
                      Finishes Cost
                    </span>
                    <span className="text-foreground font-semibold">
                      {formatCurrency(
                        (boq?.categories?.find((c) => c.name === "Flooring")
                          ?.subTotal || 0) +
                          (boq?.categories?.find((c) => c.name === "Painting")
                            ?.subTotal || 0) +
                          (boq?.categories?.find((c) => c.name === "Plastering")
                            ?.subTotal || 0),
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-foreground mb-2">
                Important Notes:
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-foreground-secondary">
                <li>All rates are based on Thrissur market rates as of 2024</li>
                <li>
                  Wastage factors included as per standard engineering practices
                  (2-8%)
                </li>
                <li>GST @ 18% is applicable on the total amount</li>
                <li>
                  Transportation charges to site not included unless specified
                </li>
                <li>
                  Rates may vary based on actual market conditions and supplier
                  quotations
                </li>
                <li>Contingency of 3-5% recommended for unforeseen expenses</li>
              </ul>
            </div>
          </div>
        </div>

        <div
          data-tab-content="ai"
          style={{ display: activeTab === "ai" ? "block" : "none" }}
          className="print:hidden"
        >
          <AIRecommendationsTab
            project={project}
            boq={boq}
            embodiedCarbon={embodiedCarbon}
            sustainabilityScore={sustainabilityScore}
          />
        </div>

        <div
          data-tab-content="sustainability-explanation"
          style={{ display: activeTab === "sustainability" ? "block" : "none" }}
          className="print:hidden"
        >
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <FaLeaf className="text-green-500" />
                How Sustainability Score is Calculated
              </h3>
              
              <div className="space-y-4 text-foreground-secondary">
                <p>
                  The sustainability score is calculated based on GRIHA v3.1 guidelines 
                  (Green Rating for Integrated Habitat Assessment) developed by TERI.
                </p>
                
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="font-semibold text-foreground mb-3">Score Components:</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Rainwater Harvesting</span>
                      <span className="font-mono text-primary">+10 points</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Solar Water Heater</span>
                      <span className="font-mono text-primary">+10 points</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Sewage Treatment Plant</span>
                      <span className="font-mono text-primary">+8 points</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>High Sustainability Priority</span>
                      <span className="font-mono text-primary">+8 points</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Medium Sustainability Priority</span>
                      <span className="font-mono text-primary">+5 points</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Low Embodied Carbon (&lt;50 tons)</span>
                      <span className="font-mono text-primary">+7 points</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Medium Embodied Carbon (50-100 tons)</span>
                      <span className="font-mono text-primary">+4 points</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="font-semibold text-foreground mb-3">Rating Thresholds:</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>5-Star (Excellent)</span>
                      <span className="font-mono">75-100 points</span>
                    </div>
                    <div className="flex justify-between">
                      <span>4-Star (Very Good)</span>
                      <span className="font-mono">65-74 points</span>
                    </div>
                    <div className="flex justify-between">
                      <span>3-Star (Good)</span>
                      <span className="font-mono">55-64 points</span>
                    </div>
                    <div className="flex justify-between">
                      <span>2-Star</span>
                      <span className="font-mono">46-54 points</span>
                    </div>
                    <div className="flex justify-between">
                      <span>1-Star</span>
                      <span className="font-mono">36-45 points</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-foreground mb-2">Your Project Score: {sustainabilityScore || 0}/100</h4>
                  <p className="text-sm">
                    {sustainabilityScore >= 65 ? 'Excellent! Your project qualifies for GRIHA 4-Star or higher.' :
                     sustainabilityScore >= 55 ? 'Good! Your project qualifies for GRIHA 3-Star.' :
                     sustainabilityScore >= 46 ? 'Your project qualifies for GRIHA 2-Star. Add more sustainability features to improve.' :
                     sustainabilityScore >= 36 ? 'Your project qualifies for GRIHA 1-Star. Consider adding rainwater harvesting and solar heater.' :
                     'Your project needs more sustainability features to qualify for GRIHA certification.'}
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="font-semibold text-foreground mb-3">Embodied Carbon Calculation:</h4>
                  <p className="text-sm mb-2">
                    Based on material quantities from BOQ:
                  </p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Cement (OPC): 0.93 kg CO2/kg</span>
                      <span>{embodiedCarbon?.cement || 0} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Steel: 2.50 kg CO2/kg</span>
                      <span>{embodiedCarbon?.steel || 0} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span>AAC Blocks: 0.55 kg CO2/unit</span>
                      <span>{embodiedCarbon?.blocks || 0} kg</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                      <span>Total Embodied Carbon</span>
                      <span>{embodiedCarbon?.total || 0} kg CO2</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Print Footer */}
        <div className="hidden print:block mt-8 pt-4 border-t border-gray-800 text-center text-sm">
          <p>
            Generated by Ecobuild System | Government Engineering College,
            Thrissur
          </p>
          <p className="mt-1">{new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

export default Reports;

import React, { useState, useRef, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import { useMaterialSelections } from "../hooks/useMaterialSelections";
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
  FaBuilding,
} from "react-icons/fa";
import BillOfQuantities from "../components/BillOfQuantities";
import AIReportReview from "../components/AIReportReview";
import AISustainabilitySuggestions from "../components/AISustainabilitySuggestions";
import {
  generateBoQAsync,
  exportBoQToCSV,
  formatCurrency,
  formatNumber,
  calculateBoQCarbon,
} from "../utils/boqCalculator";
import {
  validateBoQQuantities,
  optimizeBoQ as aiOptimizeBoQ,
} from "../services/aiBoQService";
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
function calculateGRIHAScore(project, boqCarbon, materialSelections) {
  let score = 0;

  const hasRWH = project.buildingParams?.hasRainwaterHarvesting;
  const plotArea = project.buildingParams?.plotArea || 200;
  const builtUpArea = project.buildingParams?.builtUpArea || 150;
  const far = builtUpArea / plotArea;

  // Site & Planning (max 15 points)
  if (hasRWH) score += 7;
  if (far <= 1.5) score += 5;
  if (far <= 1.0) score += 3;

  // Water Efficiency (max 10 points)
  if (project.buildingParams?.hasSTP) score += 5;
  if (project.buildingParams?.hasWaterEfficientFixtures) score += 5;

  // Energy Performance (max 25 points)
  if (project.buildingParams?.hasSolarWaterHeater) score += 12;
  if (project.buildingParams?.hasSolarPanels) score += 8;
  const sustainabilityPriority = project.buildingParams?.sustainabilityPriority;
  if (sustainabilityPriority === "high") score += 5;
  else if (sustainabilityPriority === "medium") score += 3;

  // Materials & Resources (max 28 points)
  const matSelections = materialSelections || {};
  const hasLowCarbonMat = Object.values(matSelections).some(m => (m.carbon || 0) < 1);
  if (hasLowCarbonMat) score += 8;
  const hasRecycledMat = Object.values(matSelections).some(m => (m.recycled || 0) > 20);
  if (hasRecycledMat) score += 8;
  if (sustainabilityPriority === "high") score += 7;
  else if (sustainabilityPriority === "medium") score += 4;
  else score += 2;

  // Low embodied carbon bonus (max 12 points)
  if (boqCarbon > 0 && boqCarbon < 50000) score += 12;
  else if (boqCarbon > 0 && boqCarbon < 100000) score += 8;
  else if (boqCarbon > 0) score += 4;

  return Math.min(100, score);
}

// Calculate IGBC score based on project parameters
function calculateIGBCScore(project, boqCarbon, materialSelections) {
  let score = 0;

  const plotArea = project.buildingParams?.plotArea || 200;
  const builtUpArea = project.buildingParams?.builtUpArea || 150;
  const far = builtUpArea / plotArea;

  // Sustainable Sites (max 15 points)
  if (project.buildingParams?.hasRainwaterHarvesting) score += 8;
  if (far <= 1.5) score += 7;

  // Water Efficiency (max 20 points)
  if (project.buildingParams?.hasRainwaterHarvesting) score += 8;
  if (project.buildingParams?.hasSTP) score += 12;

  // Energy & Atmosphere (max 25 points)
  if (project.buildingParams?.hasSolarWaterHeater) score += 12;
  const sustainabilityPriority = project.buildingParams?.sustainabilityPriority;
  if (sustainabilityPriority === "high") score += 8;
  else if (sustainabilityPriority === "medium") score += 5;

  // Materials & Resources (max 25 points)
  const matSelections = materialSelections || {};
  const hasRecycledMat = Object.values(matSelections).some(m => (m.recycled || 0) > 20);
  if (hasRecycledMat) score += 10;
  if (sustainabilityPriority === "high") score += 10;
  else if (sustainabilityPriority === "medium") score += 5;
  else score += 3;

  // Indoor Environment Quality (max 15 points)
  if (project.buildingParams?.hasNaturalVentilation) score += 8;
  if (far <= 1.5) score += 7;

  return Math.min(100, score);
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
            {/* Section 4: AI Sustainability Suggestions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <FaLeaf className="text-green-500" />
                Sustainability Suggestions
              </h3>
              <AISustainabilitySuggestions
                project={project}
                boq={boq}
                materialSelections={materialSelections}
                embodiedCarbon={embodiedCarbon}
                sustainabilityScore={sustainabilityScore}
              />
            </div>
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

function MaterialSummaryTab({ boq, project, materialSelections }) {
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

  // Extract material quantities from BoQ - uses latest selections from hook
  const extractMaterials = () => {
    if (!boq || !boq.categories) return {};

    const selectedMats = materialSelections || {};
    
    const materials = {
      cement: {
        name: selectedMats.cement?.name || "Cement",
        unit: selectedMats.cement?.unit || "bags",
        qty: 0,
        rate: selectedMats.cement?.rate || 370,
        supplier: findSupplier(["cement", "ppc", "opc", "ultratech", "acc"]),
        category: "Cement",
      },
      steel: {
        name: selectedMats.steel?.name || "TMT Steel Bars",
        unit: selectedMats.steel?.unit || "kg",
        qty: 0,
        rate: selectedMats.steel?.rate || 68,
        supplier: findSupplier(["steel", "tmt", "tata", "jsw"]),
        category: "Steel",
      },
      concrete: {
        name: selectedMats.concrete?.name || "Concrete",
        unit: selectedMats.concrete?.unit || "cum",
        qty: 0,
        rate: selectedMats.concrete?.rate || 5500,
        supplier: findSupplier(["concrete", "rmc", "ready mix"]),
        category: "Concrete",
      },
      masonry: {
        name: selectedMats.masonry?.name || "Blocks/Bricks",
        unit: selectedMats.masonry?.unit || "nos",
        qty: 0,
        rate: selectedMats.masonry?.rate || 40,
        supplier: findSupplier(["block", "brick", "aac", "fly ash"]),
        category: "Masonry",
      },
      aggregates: {
        name: selectedMats.aggregates?.name || "Aggregates",
        unit: selectedMats.aggregates?.unit || "cft",
        qty: 0,
        rate: selectedMats.aggregates?.rate || 42,
        supplier: findSupplier(["aggregate", "sand", "m-sand"]),
        category: "Aggregates",
      },
    };

    // Extract quantities from BoQ categories
    let totalConcreteCum = 0;
    boq.categories.forEach((category) => {
      const catName = category.name?.toLowerCase() || "";
      
      category.items.forEach((item) => {
        const remarks = item.remarks?.toLowerCase() || "";
        const quantity = parseFloat(item.quantity) || 0;
        
        // Cement bags from remarks (concrete + plastering + masonry)
        const cementMatch = remarks.match(/cement:\s*([\d,.]+)\s*bags/i);
        if (cementMatch) {
          materials.cement.qty += parseFloat(cementMatch[1].replace(/,/g, "")) || 0;
        }
        
        // Sand + aggregate from remarks -> combine into aggregates
        const sandMatch = remarks.match(/sand:\s*([\d,.]+)\s*cft/i);
        if (sandMatch) {
          materials.aggregates.qty += parseFloat(sandMatch[1].replace(/,/g, "")) || 0;
        }
        
        const aggMatch = remarks.match(/aggregate:\s*([\d,.]+)\s*cft/i);
        if (aggMatch) {
          materials.aggregates.qty += parseFloat(aggMatch[1].replace(/,/g, "")) || 0;
        }
        
        // Steel from reinforcement category (all items in kg, exclude binding wire and cover blocks)
        if (catName.includes("steel") && item.unit === "kg" && !item.description?.toLowerCase().includes("binding wire") && !item.description?.toLowerCase().includes("cover block")) {
          materials.steel.qty += quantity;
        }
        
        // Concrete volume from concrete work (all items in cum)
        if (catName.includes("concrete") && item.unit === "cum") {
          totalConcreteCum += quantity;
        }
        
        // Masonry from Masonry Work category (first item is blocks/bricks)
        if (catName.includes("masonry") && item.sno === 1) {
          materials.masonry.qty += quantity;
        }
      });
    });

    // Set concrete quantity
    materials.concrete.qty = Math.round(totalConcreteCum * 10) / 10;

    // Round quantities
    Object.keys(materials).forEach((key) => {
      materials[key].qty = Math.round(materials[key].qty * 10) / 10;
    });

    return materials;
  };

  const materials = useMemo(() => extractMaterials(), [boq, materialSelections, lastUpdated]);
  // Show ALL 5 categories, not just those with qty > 0
  const materialList = Object.values(materials);
  const materialListWithQty = materialList.filter((m) => m.qty > 0);
  const totalMaterialCost = materialList.reduce((sum, m) => sum + (m.qty * m.rate), 0);

  if (!boq || !boq.categories) {
    return (
      <div className="p-8 text-center text-foreground-secondary">
        <FaSpinner className="animate-spin text-2xl mx-auto mb-4" />
        <p>Loading material quantities...</p>
      </div>
    );
  }

  const categoryColors = {
    cement: { bg: 'from-amber-500 to-amber-600', icon: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600', border: 'border-amber-200 dark:border-amber-800' },
    steel: { bg: 'from-slate-500 to-slate-600', icon: 'bg-slate-100 dark:bg-slate-900/30 text-slate-600', border: 'border-slate-200 dark:border-slate-800' },
    concrete: { bg: 'from-blue-500 to-blue-600', icon: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600', border: 'border-blue-200 dark:border-blue-800' },
    masonry: { bg: 'from-orange-500 to-orange-600', icon: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600', border: 'border-orange-200 dark:border-orange-800' },
    aggregates: { bg: 'from-teal-500 to-teal-600', icon: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600', border: 'border-teal-200 dark:border-teal-800' },
  };

  const getCategoryIcon = (category) => {
    const icons = { cement: FaIndustry, steel: FaHardHat, concrete: FaBuilding, masonry: FaTruck, aggregates: FaTruck };
    return icons[category] || FaIndustry;
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-5 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-white/20 rounded-lg"><FaIndustry className="text-xl" /></div>
            <span className="text-sm text-blue-100">Total Materials</span>
          </div>
          <p className="text-2xl font-bold">{materialList.length}</p>
          <p className="text-xs text-blue-100 mt-1">{materialListWithQty.length} with quantities</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-5 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-white/20 rounded-lg"><FaMoneyBillWave className="text-xl" /></div>
            <span className="text-sm text-green-100">Material Cost</span>
          </div>
          <p className="text-2xl font-bold">₹{totalMaterialCost.toLocaleString()}</p>
          <p className="text-xs text-green-100 mt-1">{((totalMaterialCost / (boq?.summary?.grandTotal || 1)) * 100).toFixed(1)}% of total</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-5 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-white/20 rounded-lg"><FaChartBar className="text-xl" /></div>
            <span className="text-sm text-purple-100">Cost per sqm</span>
          </div>
          <p className="text-2xl font-bold">₹{materialList.length > 0 ? Math.round(totalMaterialCost / ((boq?.projectInfo?.totalArea || 1))) : 0}</p>
          <p className="text-xs text-purple-100 mt-1">Based on total area</p>
        </div>
      </div>

      {/* Material Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {materialList.map((mat, idx) => {
          const catKey = mat.category?.toLowerCase() || 'other';
          const colors = categoryColors[catKey] || categoryColors.cement;
          const Icon = getCategoryIcon(catKey);
          const amount = mat.qty * mat.rate;
          const pctOfTotal = totalMaterialCost > 0 ? ((amount / totalMaterialCost) * 100).toFixed(1) : '0.0';
          const hasQty = mat.qty > 0;

          return (
            <div key={idx} className={`bg-white dark:bg-gray-800 rounded-xl shadow-md border ${colors.border} overflow-hidden hover:shadow-lg transition-shadow ${!hasQty ? 'opacity-60' : ''}`}>
              <div className={`bg-gradient-to-r ${colors.bg} p-4`}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg text-white"><Icon className="text-lg" /></div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-white text-sm truncate">{mat.name}</h4>
                    <p className="text-xs text-white/80">{mat.category}</p>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2.5">
                    <p className="text-xs text-foreground-muted">Quantity</p>
                    <p className="text-lg font-bold font-mono text-foreground">{mat.qty.toLocaleString()}</p>
                    <p className="text-xs text-foreground-secondary">{mat.unit}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2.5">
                    <p className="text-xs text-foreground-muted">Rate</p>
                    <p className="text-lg font-bold font-mono text-foreground">₹{mat.rate}</p>
                    <p className="text-xs text-foreground-secondary">per {mat.unit}</p>
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-700 dark:text-green-300 font-medium">Amount</span>
                    <span className="text-lg font-bold font-mono text-green-700 dark:text-green-300">₹{amount.toLocaleString()}</span>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-green-600 dark:text-green-400 mb-1">
                      <span>{pctOfTotal}% of material cost</span>
                      <span>{pctOfTotal}%</span>
                    </div>
                    <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-1.5">
                      <div className={`bg-gradient-to-r ${colors.bg} h-1.5 rounded-full`} style={{ width: `${pctOfTotal}%` }} />
                    </div>
                  </div>
                </div>
                {mat.supplier && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <p className="text-xs text-foreground-muted mb-1">Best Supplier</p>
                    <p className="text-sm font-medium text-foreground">{mat.supplier["Supplier Name"]}</p>
                    <p className="text-xs text-foreground-secondary">{cleanRate(mat.supplier["Indicative Rate Range (Academic)"])} • {mat.supplier.distance || 0} km</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {materialList.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-8 text-center">
          <FaIndustry className="text-4xl text-foreground-muted mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">No materials found</p>
          <p className="text-sm text-foreground-secondary mt-1">Generate BoQ first to see material quantities</p>
        </div>
      )}
    </div>
  );
}

function SuppliersTab({ boq, project }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState(project?.location?.district || "Thrissur");

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
    "Kollam",
    "Kottayam",
    "Kannur",
    "Alappuzha",
    "Pathanamthitta",
    "Idukki",
    "Malappuram",
    "Wayanad",
    "Kasaragod",
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
  const [aiValidation, setAiValidation] = useState(null);
  const [aiOptimization, setAiOptimization] = useState(null);
  const [citations, setCitations] = useState(null);
  const [lastGeneratedState, setLastGeneratedState] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Always use latest material selections from localStorage
  const { selections: materialSelections, lastUpdated } = useMaterialSelections();

  const getCurrentState = () => ({
    materials: JSON.stringify(materialSelections || {}),
    builtUpArea: project?.buildingParams?.builtUpArea,
    numFloors: project?.buildingParams?.numFloors,
    height: project?.buildingParams?.height,
    district: project?.location?.district,
  });

  const getChangeSummary = () => {
    if (!lastGeneratedState) return 'Report not yet generated';
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
      if (changed.length) changes.push(`${changed.length} rate(s) changed`);
    }
    if (current.builtUpArea !== lastGeneratedState.builtUpArea) changes.push(`Area changed`);
    if (current.numFloors !== lastGeneratedState.numFloors) changes.push(`Floors changed`);
    return changes.length > 0 ? changes.join(' | ') : 'No changes since last generation';
  };

  useEffect(() => {
    if (lastGeneratedState) {
      setHasChanges(JSON.stringify(getCurrentState()) !== JSON.stringify(lastGeneratedState));
    }
  }, [project?.materialSelections, project?.buildingParams?.builtUpArea, project?.buildingParams?.numFloors, project?.location?.district]);
  
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

  // Calculate GRIHA/IGBC scores
  const grihaScore = useMemo(
    () => calculateGRIHAScore(project, embodiedCarbon.total, materialSelections),
    [project, embodiedCarbon.total, materialSelections],
  );
  const igbcScore = useMemo(
    () => calculateIGBCScore(project, embodiedCarbon.total, materialSelections),
    [project, embodiedCarbon.total, materialSelections],
  );

  const grihaRating = getGRIHARating(grihaScore);
  const igbcRating = getIGBCRating(igbcScore);

  // Calculate conventional design baseline (standard construction without optimization)
  const totalArea = (project.buildingParams?.builtUpArea || 0) * (project.buildingParams?.numFloors || 1);
  const conventionalConcreteVolume = materialQuantities.concreteVolume * 1.25; // 25% more concrete in conventional design
  const conventionalSteelKg = materialQuantities.steelKg * 1.30; // 30% more steel in conventional design
  const conventionalBlockMultiplier = 1.15; // 15% more blocks in conventional (thicker walls)
  const conventionalCarbon =
    conventionalConcreteVolume * 420 + // ~420 kg CO2/m³ for conventional OPC concrete
    conventionalSteelKg * 2.5 + // Same steel coefficient for fair comparison
    (materialQuantities.blocksNos * conventionalBlockMultiplier) * 0.35 + // AAC blocks
    (materialQuantities.bricksNos * 1.20) * 0.22; // 20% more bricks (less efficient)
  const optimizedCarbon = embodiedCarbon.total || 0;
  const carbonReductionPercent =
    conventionalCarbon > 0
      ? ((conventionalCarbon - optimizedCarbon) / conventionalCarbon) * 100
      : 0;

  // Conventional cost baseline (standard market rates without optimization)
  const conventionalCostMultiplier = 1.18; // ~18% higher for conventional (no bulk discounts, standard materials)
  const conventionalMaterialCost = (boq?.summary?.subTotal || 0) * conventionalCostMultiplier;
  const optimizedMaterialCost = boq?.summary?.subTotal || 0;
  const costSavings = conventionalMaterialCost - optimizedMaterialCost;
  const costSavingsPercent = conventionalMaterialCost > 0
    ? (costSavings / conventionalMaterialCost) * 100
    : 0;

  // Calculate recycled content from actual material selections
  const calculateRecycledContent = () => {
    const selections = materialSelections || {};
    let recycledPercent = 0;
    let totalMaterials = 0;

    // PPC cement contains 15-35% fly ash (recycled)
    if (selections.cement) {
      const cementName = (selections.cement.name || '').toLowerCase();
      if (cementName.includes('ppc') || cementName.includes('fly ash')) {
        recycledPercent += 25; // Average fly ash content in PPC
      } else if (cementName.includes('psc') || cementName.includes('slag')) {
        recycledPercent += 35; // Slag content in PSC
      } else {
        recycledPercent += 0; // OPC has no recycled content
      }
      totalMaterials++;
    }

    // Recycled aggregates
    if (selections.aggregates) {
      const aggName = (selections.aggregates.name || '').toLowerCase();
      if (aggName.includes('recycled') || aggName.includes('rca')) {
        recycledPercent += 30;
      } else if (aggName.includes('m-sand')) {
        recycledPercent += 10; // M-sand is manufactured, partially recycled
      }
      totalMaterials++;
    }

    // Steel recycling content
    if (selections.steel) {
      recycledPercent += 15; // TMT steel typically contains 15-20% recycled scrap
      totalMaterials++;
    }

    // AAC blocks contain fly ash
    if (selections.masonry) {
      const masonryName = (selections.masonry.name || '').toLowerCase();
      if (masonryName.includes('aac') || masonryName.includes('fly ash')) {
        recycledPercent += 20;
      } else if (masonryName.includes('solid') || masonryName.includes('concrete block')) {
        recycledPercent += 10;
      }
      totalMaterials++;
    }

    return totalMaterials > 0 ? Math.round(recycledPercent / totalMaterials) : 5;
  };

  const recycledContentPercent = calculateRecycledContent();
  const conventionalRecycledContent = 5; // Conventional design uses minimal recycled materials

  // Unified sustainability score (based on GRIHA scoring)
  const sustainabilityScore = grihaScore;

  // Development control scores (derived from GRIHA category breakdown)
  const hasRWH = project.buildingParams?.hasRainwaterHarvesting;
  const hasSTP = project.buildingParams?.hasSTP;
  const hasSWH = project.buildingParams?.hasSolarWaterHeater;
  const sustPriority = project.buildingParams?.sustainabilityPriority;
  const plotArea = project.buildingParams?.plotArea || 200;
  const builtUpArea = project.buildingParams?.builtUpArea || 150;
  const far = builtUpArea / plotArea;

  const siteScore = (hasRWH ? 5 : 0) + (far <= 1.5 ? 5 : 0) + (project.location?.district ? 2 : 0);
  const waterScore = (hasRWH ? 5 : 0) + (hasSTP ? 5 : 0);
  const energyScore = (hasSWH ? 10 : 0) + (sustPriority === "high" ? 5 : sustPriority === "medium" ? 3 : 0);
  const materialsScore = sustPriority === "high" ? 10 : sustPriority === "medium" ? 6 : 2;
  const iqScore = 5; // Natural ventilation for Kerala climate

  // Validation state
  const [validationResults, setValidationResults] = useState({
    dimensions: { warnings: [], errors: [], isValid: true },
    steelRatio: { isValid: true, status: "unknown", message: "" },
    placeholders: { hasPlaceholders: false, issues: [], isDraft: false },
  });

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
        setAiValidation(null);
        setAiOptimization(null);
        try {
          console.log("[Reports] Generating BoQ for:", project.name);
          const boqData = await generateBoQAsync(project);
          console.log("[Reports] BoQ generated:", boqData);
          console.log("[Reports] Categories:", boqData?.categories?.length);
          console.log("[Reports] Grand total:", boqData?.summary?.grandTotal);
          setBoq(boqData);
          setBoqGenerated(true);
          setLastGeneratedKey(currentKey);
          setLastGeneratedState(getCurrentState());
          setHasChanges(false);
          completeBOQGeneration();

          // Run AI validation in background (non-blocking)
          validateBoQQuantities(project, boqData).then(validation => {
            setAiValidation(validation);
          }).catch(() => {});

          // Run AI optimization in background (non-blocking)
          aiOptimizeBoQ(project, boqData, materialSelections).then(optimization => {
            setAiOptimization(optimization);
          }).catch(() => {});
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
      
      // Material data - use actual rates from material selections
      const cementRate = materialSelections?.cement?.rate || 370;
      const steelRate = materialSelections?.steel?.rate || 72;
      const sandRate = materialSelections?.aggregates?.rate || 58;
      const aggRate = materialSelections?.aggregates?.rate || 42;
      
      const materials = [
        ['Cement', materialQuantities.cementBags?.toFixed(0) || '0', 'bags', String(cementRate), ((materialQuantities.cementBags || 0) * cementRate).toLocaleString()],
        ['Steel', materialQuantities.steelKg?.toFixed(0) || '0', 'kg', String(steelRate), ((materialQuantities.steelKg || 0) * steelRate).toLocaleString()],
        ['Sand', materialQuantities.sandCft?.toFixed(0) || '0', 'cft', String(sandRate), ((materialQuantities.sandCft || 0) * sandRate).toLocaleString()],
        ['Aggregate', materialQuantities.aggregateCft?.toFixed(0) || '0', 'cft', String(aggRate), ((materialQuantities.aggregateCft || 0) * aggRate).toLocaleString()],
      ];
      
      doc.setFont('helvetica', 'normal');
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
      Object.entries(materialSelections).forEach(([cat, mat]) => {
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
      {/* Header with State Tracking */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Analysis Reports
          </h1>
          <p className="text-foreground-secondary mt-1">
            Generate Quantity Survey, Bill of Quantities (BoQ), and
            Sustainability Assessment reports
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
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {hasChanges && boq && (
            <button onClick={handleRefreshBoQ} className="btn btn-primary">
              <FaSyncAlt className="mr-2" />
              Regenerate Report
            </button>
          )}
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
            className="btn btn-secondary"
          >
            <FaFilePdf className="mr-2" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 dark:border-gray-700 print:hidden">
        <button
          onClick={() => setActiveTab("boq")}
          className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "boq"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-foreground-secondary hover:text-foreground"
          }`}
        >
          <FaClipboardList />
          BoQ
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
          Materials
        </button>
        <button
          onClick={() => setActiveTab("aireview")}
          className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "aireview"
              ? "border-purple-500 text-purple-600 dark:text-purple-400"
              : "border-transparent text-foreground-secondary hover:text-foreground"
          }`}
        >
          <FaRobot />
          AI Insights
        </button>
        <button
          onClick={() => setActiveTab("sustainability")}
          className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "sustainability"
              ? "border-green-500 text-green-600 dark:text-green-400"
              : "border-transparent text-foreground-secondary hover:text-foreground"
          }`}
        >
          <FaLeaf />
          Sustainability
        </button>
        <button
          onClick={() => setActiveTab("staad")}
          className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "staad"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-foreground-secondary hover:text-foreground"
          }`}
        >
          <FaChartBar />
          Technical
        </button>
        <button
          onClick={() => setActiveTab("suppliers")}
          className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "suppliers"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-foreground-secondary hover:text-foreground"
          }`}
        >
          <FaTruck />
          Suppliers
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
          <BillOfQuantities boq={boq} onBoQUpdate={setBoq} />
        </div>

        <div
          data-tab-content="materialsummary"
          style={{
            display: activeTab === "materialsummary" ? "block" : "none",
          }}
          className="print:hidden"
        >
          <MaterialSummaryTab boq={boq} project={project} materialSelections={materialSelections} />
        </div>

        {/* AI Insights (Merged: Validation + Optimization + Review) */}
        <div
          data-tab-content="aireview"
          style={{ display: activeTab === "aireview" ? "block" : "none" }}
          className="print:hidden"
        >
          <div className="space-y-6">
            {/* Section 1: Quantity Validation */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <FaRobot className="text-primary" />
                BoQ Validation
              </h3>
              {aiValidation ? (
                <div className="space-y-3">
                  <p className="text-sm text-foreground">{aiValidation.overallAssessment}</p>
                  {aiValidation.validations?.map((v, i) => (
                    <div key={i} className={`p-3 rounded-lg border ${
                      v.status === 'ok' ? 'bg-green-50 dark:bg-green-900/20 border-green-200' :
                      v.status === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200' :
                      'bg-red-50 dark:bg-red-900/20 border-red-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${v.status === 'ok' ? 'bg-green-500' : v.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                        <span className="font-medium text-sm">{v.category}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${v.status === 'ok' ? 'bg-green-100 text-green-700' : v.status === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{v.status}</span>
                      </div>
                      <p className="text-sm text-foreground-secondary mt-1">{v.message}</p>
                    </div>
                  ))}
                  {aiValidation.steelRatio && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-xs text-foreground-secondary">Steel Ratio</p>
                        <p className="text-lg font-bold">{aiValidation.steelRatio} kg/sqm</p>
                        <p className="text-xs text-foreground-muted">{aiValidation.steelAssessment}</p>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-xs text-foreground-secondary">Concrete Ratio</p>
                        <p className="text-lg font-bold">{aiValidation.concreteRatio} cum/sqm</p>
                        <p className="text-xs text-foreground-muted">{aiValidation.concreteAssessment}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-foreground-secondary">
                  <FaSpinner className="animate-spin text-xl mx-auto mb-2" />
                  <p className="text-sm">Analyzing quantities...</p>
                </div>
              )}
            </div>

            {/* Section 2: Cost Optimization */}
            {aiOptimization && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <FaChartBar className="text-green-500" />
                  Cost Optimization
                </h3>
                <div className="space-y-3">
                  {aiOptimization.totalPotentialSavings > 0 && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-lg">
                      <p className="text-lg font-bold text-green-600">Potential Savings: ₹{aiOptimization.totalPotentialSavings.toLocaleString()}</p>
                    </div>
                  )}
                  {aiOptimization.optimizations?.slice(0, 5).map((opt, i) => (
                    <div key={i} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm text-foreground">{opt.title}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded ${opt.priority === 'high' ? 'bg-red-100 text-red-700' : opt.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{opt.priority}</span>
                      </div>
                      <p className="text-xs text-foreground-secondary">{opt.description}</p>
                      {opt.potentialSavings > 0 && (
                        <span className="text-xs text-green-600 font-medium">Save: ₹{opt.potentialSavings.toLocaleString()}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 3: AI Report Review (Suggestions) */}
            <AIReportReview
              boq={boq}
              project={project}
              materialSelections={materialSelections}
              onApplyChanges={(suggestion) => {
                if (!boq || !suggestion) return;
                const updatedBoq = { ...boq };
                const catIndex = updatedBoq.categories.findIndex(
                  (c) => c.name === suggestion.category
                );
                if (catIndex >= 0) {
                  const cat = { ...updatedBoq.categories[catIndex] };
                  if (suggestion.type === 'rate_change') {
                    cat.items = cat.items.map((item) => {
                      if (item.description?.toLowerCase().includes((suggestion.item || '').toLowerCase())) {
                        return { ...item, rate: parseFloat(suggestion.suggested) };
                      }
                      return item;
                    });
                  } else if (suggestion.type === 'quantity_change') {
                    cat.items = cat.items.map((item) => {
                      if (item.description?.toLowerCase().includes((suggestion.item || '').toLowerCase())) {
                        return { ...item, quantity: parseFloat(suggestion.suggested) };
                      }
                      return item;
                    });
                  }
                  cat.subTotal = cat.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0), 0);
                  updatedBoq.categories[catIndex] = cat;
                }
                updatedBoq.summary.subTotal = updatedBoq.categories.reduce((sum, c) => sum + (c.subTotal || 0), 0);
                updatedBoq.summary.gstAmount = (updatedBoq.summary.subTotal * updatedBoq.summary.gstRate) / 100;
                updatedBoq.summary.grandTotal = updatedBoq.summary.subTotal + updatedBoq.summary.gstAmount;
                setBoq(updatedBoq);
              }}
            />
          </div>
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
                  {Object.entries(materialSelections).length > 0 ? (
                    Object.entries(materialSelections).map(
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
                      {(conventionalMaterialCost / 100000).toFixed(1)}
                    </td>
                    <td className="border border-black p-2 text-right">
                      {(optimizedMaterialCost / 100000).toFixed(1)}
                    </td>
                    <td className="border border-black p-2 text-right">
                      {(costSavings / 100000).toFixed(1)}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">
                      RECYCLED CONTENT (%)
                    </td>
                    <td className="border border-black p-2 text-right">{conventionalRecycledContent}%</td>
                    <td className="border border-black p-2 text-right">
                      {recycledContentPercent}%
                    </td>
                    <td className="border border-black p-2 text-right">
                      {recycledContentPercent - conventionalRecycledContent}%
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
                GRIHA / IGBC Rating Analysis
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
                5. ECO-FRIENDLY CONSTRUCTION RECOMMENDATIONS
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
                6. SUPPLIER & LOGISTICS
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
                  {Object.entries(materialSelections || {}).map(
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
                  {(!materialSelections ||
                    Object.keys(materialSelections).length === 0) && (
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
                7. AI RECOMMENDATIONS
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
              <p className="mt-2">GRIHA / IGBC Rating Analysis</p>
              <p>GENERATED: {new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Sustainability Explanation */}
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
                  (Green Rating for Integrated Habitat Assessment) developed by TERI and MNRE,
                  along with IGBC (Indian Green Building Council) criteria.
                </p>
                
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="font-semibold text-foreground mb-3">GRIHA Score Components (max 100 points):</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Site & Planning (FAR, location)</span>
                      <span className="font-mono text-primary">up to 15 pts</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Rainwater Harvesting</span>
                      <span className="font-mono text-primary">+7 pts</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Water Efficiency (RWH + STP)</span>
                      <span className="font-mono text-primary">up to 15 pts</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Solar Water Heater</span>
                      <span className="font-mono text-primary">+12 pts</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>High Sustainability Priority</span>
                      <span className="font-mono text-primary">+20 pts</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Medium Sustainability Priority</span>
                      <span className="font-mono text-primary">+10 pts</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Low Embodied Carbon (&lt;50 tons)</span>
                      <span className="font-mono text-primary">+15 pts</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Medium Embodied Carbon (50-100 tons)</span>
                      <span className="font-mono text-primary">+10 pts</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="font-semibold text-foreground mb-3">GRIHA Rating Thresholds:</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>5-Star (Excellent)</span>
                      <span className="font-mono">80-100 points</span>
                    </div>
                    <div className="flex justify-between">
                      <span>4-Star (Very Good)</span>
                      <span className="font-mono">65-79 points</span>
                    </div>
                    <div className="flex justify-between">
                      <span>3-Star (Good)</span>
                      <span className="font-mono">50-64 points</span>
                    </div>
                    <div className="flex justify-between">
                      <span>2-Star (Average)</span>
                      <span className="font-mono">35-49 points</span>
                    </div>
                    <div className="flex justify-between">
                      <span>1-Star (Below Average)</span>
                      <span className="font-mono">0-34 points</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-foreground mb-2">Your Project Score: {sustainabilityScore || 0}/100</h4>
                  <p className="text-sm">
                    {sustainabilityScore >= 80 ? 'Excellent! Your project qualifies for GRIHA 5-Star.' :
                     sustainabilityScore >= 65 ? 'Very Good! Your project qualifies for GRIHA 4-Star.' :
                     sustainabilityScore >= 50 ? 'Good! Your project qualifies for GRIHA 3-Star.' :
                     sustainabilityScore >= 35 ? 'Your project qualifies for GRIHA 2-Star. Add more sustainability features to improve.' :
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
                      <span>{embodiedCarbon?.breakdown?.cement ? formatNumber(Math.round(embodiedCarbon.breakdown.cement)) : 0} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Steel: 2.50 kg CO2/kg</span>
                      <span>{embodiedCarbon?.breakdown?.steel ? formatNumber(Math.round(embodiedCarbon.breakdown.steel)) : 0} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sand: ~0.04 kg CO2/kg</span>
                      <span>{embodiedCarbon?.breakdown?.sand ? formatNumber(Math.round(embodiedCarbon.breakdown.sand)) : 0} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Aggregate: ~0.04 kg CO2/kg</span>
                      <span>{embodiedCarbon?.breakdown?.aggregate ? formatNumber(Math.round(embodiedCarbon.breakdown.aggregate)) : 0} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span>AAC Blocks: 0.35 kg CO2/unit</span>
                      <span>{embodiedCarbon?.breakdown?.blocks ? formatNumber(Math.round(embodiedCarbon.breakdown.blocks)) : 0} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bricks: 0.22 kg CO2/unit</span>
                      <span>{embodiedCarbon?.breakdown?.bricks ? formatNumber(Math.round(embodiedCarbon.breakdown.bricks)) : 0} kg</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                      <span>Total Embodied Carbon</span>
                      <span>{embodiedCarbon?.total ? formatNumber(Math.round(embodiedCarbon.total)) : 0} kg CO2</span>
                    </div>
                  </div>
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
                      <FaIndustry className="text-gray-400" /> Cement
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
                <li>All rates are based on Kerala market rates as of 2026</li>
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

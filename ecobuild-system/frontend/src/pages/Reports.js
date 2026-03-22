import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { useEngineer } from '../context/EngineerContext';
import { ecoBuildAPI } from '../services/api';
import { generateAIResponse } from '../services/aiService';
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
  FaTimes
} from 'react-icons/fa';
import BillOfQuantities from '../components/BillOfQuantities';
import { 
  generateBoQAsync, 
  exportBoQToCSV,
  formatCurrency,
  formatNumber,
  calculateBoQCarbon 
} from '../utils/boqCalculator';
import {
  validateBuildingDimensions,
  validateSteelRatio,
  calculateCarbonReduction,
  hasPlaceholderData,
  filterStructuralCategories
} from '../utils/validation';

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
  if (sustainabilityPriority === 'high') score += 8;
  else if (sustainabilityPriority === 'medium') score += 5;
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
  if (sustainabilityPriority === 'high') score += 6;
  else if (sustainabilityPriority === 'medium') score += 4;
  
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
  if (sustainabilityPriority === 'high') score += 5;
  else if (sustainabilityPriority === 'medium') score += 3;
  
  // Indoor Environmental Quality
  score += 4;
  
  return Math.min(110, score);
}

// Get rating label for GRIHA
function getGRIHARating(score) {
  if (score >= 80) return '5-Star (Excellent)';
  if (score >= 65) return '4-Star (Very Good)';
  if (score >= 50) return '3-Star (Good)';
  if (score >= 35) return '2-Star (Average)';
  return '1-Star (Below Average)';
}

// Get rating label for IGBC
function getIGBCRating(score) {
  if (score >= 80) return 'Platinum';
  if (score >= 60) return 'Gold';
  if (score >= 40) return 'Silver';
  if (score >= 20) return 'Certified';
  return 'Not Certified';
}

// Get rating label for LEED
function getLEEDRating(score) {
  if (score >= 80) return 'Platinum';
  if (score >= 60) return 'Gold';
  if (score >= 40) return 'Silver';
  if (score >= 20) return 'Certified';
  return 'Not Certified';
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
    concreteVolume: 0
  };
  
  if (!boq?.categories) return result;
  
  boq.categories.forEach(cat => {
    const catName = cat.name?.toLowerCase() || '';
    
    cat.items?.forEach(item => {
      const desc = item.description?.toLowerCase() || '';
      const qty = parseFloat(item.quantity) || 0;
      const unit = item.unit?.toLowerCase() || '';
      
      // Concrete work
      if (catName.includes('concrete') || desc.includes('concrete') || desc.includes('pcc') || desc.includes('rcc')) {
        if (unit === 'cum' || unit === 'm³') {
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
      if (catName.includes('steel') || catName.includes('reinforcement') || desc.includes('steel') || desc.includes('tmt') || desc.includes('reinforcement')) {
        if (unit === 'kg' || unit === 'quintal') {
          result.steelKg += unit === 'quintal' ? qty * 100 : qty;
        }
      }
      
      // Masonry - blocks
      if (catName.includes('masonry') || catName.includes('block') || desc.includes('aac') || desc.includes('block')) {
        if (unit === 'nos' || unit === 'piece') {
          result.blocksNos += qty;
        }
      }
      
      // Masonry - bricks
      if (catName.includes('masonry') || desc.includes('brick')) {
        if (unit === 'nos' || unit === 'piece') {
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
    sand: materials.sandCft * 0.04 * 1600 / 35.31, // per tonne
    aggregate: materials.aggregateCft * 0.04 * 1450 / 35.31,
    blocks: materials.blocksNos * 0.35, // AAC block carbon
    bricks: materials.bricksNos * 0.22, // brick carbon
  };
  
  return {
    total: Object.values(carbon).reduce((a, b) => a + b, 0),
    breakdown: carbon,
    materials
  };
}

// ============================================
// AI RECOMMENDATIONS COMPONENT
// ============================================

function AIRecommendationsTab({ project, boq, embodiedCarbon, sustainabilityScore }) {
  const recommendations = useMemo(() => generateRecommendations(project, boq, embodiedCarbon), [project, boq, embodiedCarbon]);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800 border-red-300';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Materials': return FaIndustry;
      case 'Sustainability': return FaLeaf;
      case 'Cost': return FaMoneyBillWave;
      case 'Carbon': return FaRecycle;
      case 'Structural': return FaHardHat;
      default: return FaChartBar;
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
            <span className="text-sm text-foreground-secondary">Carbon Footprint</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{((embodiedCarbon?.total || 0) / 1000).toFixed(1)} tonnes</p>
          <p className="text-xs text-foreground-secondary mt-1">Total embodied carbon</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-green-500 text-white">
              <FaLeaf className="text-xl" />
            </div>
            <span className="text-sm text-foreground-secondary">GRIHA Score</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{sustainabilityScore || 0}/100</p>
          <p className="text-xs text-foreground-secondary mt-1">
            {sustainabilityScore >= 64 ? '4-Star' : sustainabilityScore >= 50 ? '3-Star' : 'Needs improvement'}
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-500 text-white">
              <FaMoneyBillWave className="text-xl" />
            </div>
            <span className="text-sm text-foreground-secondary">Project Cost</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(boq?.summary?.grandTotal || 0)}</p>
          <p className="text-xs text-foreground-secondary mt-1">Total with GST</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-purple-500 text-white">
              <FaRecycle className="text-xl" />
            </div>
            <span className="text-sm text-foreground-secondary">Recommendations</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{recommendations.length}</p>
          <p className="text-xs text-foreground-secondary mt-1">Optimization opportunities</p>
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <FaLeaf className="text-green-500" />
          AI-Powered Recommendations
        </h3>
        
        <div className="space-y-4">
          {recommendations.map((rec, idx) => {
            const Icon = getCategoryIcon(rec.category);
            return (
              <div key={idx} className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
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
                    <span className="text-green-600 dark:text-green-400">
                      -{rec.carbonReduction} kg CO2
                    </span>
                  )}
                  {rec.pointValue > 0 && (
                    <span className="text-blue-600 dark:text-blue-400">
                      +{rec.pointValue} points
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {recommendations.length === 0 && (
          <div className="p-8 text-center text-foreground-secondary">
            <FaCheckCircle className="text-4xl text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium">Great job! No critical issues found.</p>
            <p className="text-sm">Your project is well optimized for sustainability and cost.</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h4 className="font-semibold text-foreground mb-4">Quick Actions</h4>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'View Material Optimizer', action: () => window.location.href = '/optimizer' },
            { label: 'Check Sustainability', action: () => {} },
            { label: 'View BoQ Details', action: () => {} },
            { label: 'Export Report', action: () => {} }
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
function generateRecommendations(project, boq, carbon) {
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
  if (!Object.keys(materials).some(k => k.includes('cement'))) {
    recommendations.push({
      category: 'Materials',
      priority: 'High',
      title: 'Switch to PPC Cement',
      description: 'Using PPC (Fly Ash) cement instead of OPC reduces carbon by 35% and costs 5-10% less.',
      impact: 'Save Rs ' + Math.round(baseCost * 0.03).toLocaleString(),
      carbonReduction: Math.round(totalArea * 0.5),
      pointValue: 5
    });
  }
  
  if (!Object.keys(materials).some(k => k.includes('block'))) {
    recommendations.push({
      category: 'Materials',
      priority: 'Medium',
      title: 'Use AAC Blocks',
      description: 'AAC blocks are 50% lighter than traditional bricks, reducing transport costs and carbon footprint.',
      impact: 'Save Rs ' + Math.round(totalArea * 50).toLocaleString(),
      carbonReduction: Math.round(totalArea * 0.3),
      pointValue: 5
    });
  }
  
  // Sustainability recommendations
  if (!bp.hasSolarWaterHeater) {
    recommendations.push({
      category: 'Sustainability',
      priority: 'High',
      title: 'Install Solar Water Heater',
      description: 'Solar water heaters save electricity and contribute to GRIHA certification.',
      impact: 'Save Rs 25,000-50,000 annually',
      carbonReduction: 0,
      pointValue: 10
    });
  }
  
  if (!bp.hasSTP) {
    recommendations.push({
      category: 'Sustainability',
      priority: 'Medium',
      title: 'Install Sewage Treatment Plant',
      description: 'STP is recommended for buildings with more than 20 units and contributes to IGBC points.',
      impact: 'IGBC certification support',
      carbonReduction: 0,
      pointValue: 8
    });
  }
  
  // Cost optimization
  if (baseCost > 10000000) {
    recommendations.push({
      category: 'Cost',
      priority: 'High',
      title: 'Bulk Material Purchase',
      description: 'For projects above Rs 1 Crore, negotiate bulk discounts with suppliers.',
      impact: 'Save 5-8% on material costs',
      carbonReduction: 0,
      pointValue: 0
    });
  }
  
  // Structural recommendations
  if (numFloors > 2) {
    recommendations.push({
      category: 'Structural',
      priority: 'Medium',
      title: 'Consider Pre-cast Elements',
      description: 'For multi-story buildings, pre-cast lintels and sunshades can save construction time.',
      impact: 'Save 10-15% construction time',
      carbonReduction: 0,
      pointValue: 0
    });
  }
  
  // Sustainability score
  if (!bp.hasRainwaterHarvesting) {
    recommendations.push({
      category: 'Sustainability',
      priority: 'High',
      title: 'Add Rainwater Harvesting',
      description: 'Rainwater harvesting is mandatory in Kerala and provides 10 GRIHA points.',
      impact: '10 GRIHA points',
      carbonReduction: 0,
      pointValue: 10
    });
  }
  
  // Carbon reduction
  if (carbonTotal > 30000) {
    recommendations.push({
      category: 'Carbon',
      priority: 'High',
      title: 'Reduce Carbon Footprint',
      description: 'Your embodied carbon is high. Use recycled aggregate and optimize structural design.',
      impact: 'Reduce carbon by 20-30%',
      carbonReduction: Math.round(carbonTotal * 0.25),
      pointValue: 10
    });
  }
  
  // Default recommendations if none generated
  if (recommendations.length === 0) {
    recommendations.push({
      category: 'General',
      priority: 'Low',
      title: 'Good Project Setup',
      description: 'Your project has a good configuration. Continue monitoring for optimization opportunities.',
      impact: 'N/A',
      carbonReduction: 0,
      pointValue: 0
    });
  }
  
  return recommendations;
}

// ============================================
// MATERIAL SUMMARY TAB COMPONENT
// Shows material quantities needed for procurement
// ============================================

function MaterialSummaryTab({ boq }) {
  if (!boq || !boq.categories) {
    return (
      <div className="p-8 text-center text-foreground-secondary">
        <FaSpinner className="animate-spin text-2xl mx-auto mb-4" />
        <p>Loading material quantities...</p>
      </div>
    );
  }

  // Extract material quantities from BoQ
  const extractMaterials = () => {
    const materials = {
      cement: { name: 'Cement', unit: 'bags', qty: 0, items: [] },
      steel: { name: 'Steel (TMT Bars)', unit: 'kg', qty: 0, items: [] },
      sand: { name: 'Sand (M-Sand/River Sand)', unit: 'cft', qty: 0, items: [] },
      aggregate: { name: 'Aggregate (20mm)', unit: 'cft', qty: 0, items: [] },
      aacBlocks: { name: 'AAC Blocks (600x200x200mm)', unit: 'nos', qty: 0, items: [] },
      vitrifiedTiles: { name: 'Vitrified Tiles (600x600mm)', unit: 'sqft', qty: 0, items: [] },
      ceramicTiles: { name: 'Ceramic Tiles (300x300mm)', unit: 'sqft', qty: 0, items: [] },
      wallTiles: { name: 'Wall Tiles', unit: 'sqft', qty: 0, items: [] },
      paint: { name: 'Paint (Interior)', unit: 'litres', qty: 0, items: [] },
      exteriorPaint: { name: 'Paint (Exterior)', unit: 'litres', qty: 0, items: [] },
      primer: { name: 'Primer', unit: 'litres', qty: 0, items: [] },
      putty: { name: 'Wall Putty', unit: 'kg', qty: 0, items: [] },
      steelWire: { name: 'Binding Wire', unit: 'kg', qty: 0, items: [] },
      concrete: { name: 'Ready Mix Concrete (RMC)', unit: 'cum', qty: 0, items: [] },
    };

    // Parse each category's remarks to extract quantities
    boq.categories.forEach(category => {
      category.items.forEach(item => {
        const desc = item.description?.toLowerCase() || '';
        const remarks = item.remarks?.toLowerCase() || '';
        
        // Extract cement bags from remarks
        const cementMatch = remarks.match(/cement:\s*([\d,.]+)\s*bags/i) || 
                          remarks.match(/cement:\s*([\d,.]+)/i);
        if (cementMatch) {
          materials.cement.qty += parseFloat(cementMatch[1].replace(/,/g, ''));
        }
        
        // Extract sand from remarks
        const sandMatch = remarks.match(/sand:\s*([\d,.]+)\s*cft/i);
        if (sandMatch) {
          materials.sand.qty += parseFloat(sandMatch[1].replace(/,/g, ''));
        }
        
        // Extract aggregate from remarks
        const aggMatch = remarks.match(/aggregate:\s*([\d,.]+)\s*cft/i);
        if (aggMatch) {
          materials.aggregate.qty += parseFloat(aggMatch[1].replace(/,/g, ''));
        }
        
        // Steel
        if (desc.includes('steel') && desc.includes('tmt') && item.unit === 'kg') {
          materials.steel.qty += parseFloat(item.quantity) || 0;
        }
        
        // Binding wire
        if (desc.includes('binding wire')) {
          materials.steelWire.qty += parseFloat(item.quantity) || 0;
        }
        
        // AAC Blocks
        if (desc.includes('aac block') && item.unit === 'nos') {
          materials.aacBlocks.qty += parseFloat(item.quantity) || 0;
        }
        
        // Tiles
        if (desc.includes('vitrified') && item.unit === 'sqft') {
          materials.vitrifiedTiles.qty += parseFloat(item.quantity) || 0;
        }
        if (desc.includes('ceramic') && !desc.includes('wall') && item.unit === 'sqft') {
          materials.ceramicTiles.qty += parseFloat(item.quantity) || 0;
        }
        if (desc.includes('wall tile') && item.unit === 'sqft') {
          materials.wallTiles.qty += parseFloat(item.quantity) || 0;
        }
        
        // Paint
        if (desc.includes('interior') && desc.includes('paint') && item.unit === 'litre') {
          materials.paint.qty += parseFloat(item.quantity) || 0;
        }
        if (desc.includes('exterior') && desc.includes('paint') && item.unit === 'litre') {
          materials.exteriorPaint.qty += parseFloat(item.quantity) || 0;
        }
        if (desc.includes('primer') && item.unit === 'litre') {
          materials.primer.qty += parseFloat(item.quantity) || 0;
        }
        if (desc.includes('putty') && item.unit === 'kg') {
          materials.putty.qty += parseFloat(item.quantity) || 0;
        }
        
        // Concrete volume
        if (desc.includes('rcc') || desc.includes('pcc')) {
          if (item.unit === 'cum') {
            materials.concrete.qty += parseFloat(item.quantity) || 0;
          }
        }
      });
    });

    // Round all quantities
    Object.keys(materials).forEach(key => {
      materials[key].qty = Math.round(materials[key].qty * 10) / 10;
    });

    return materials;
  };

  const materials = extractMaterials();

  // Define categories for display
  const materialCategories = [
    {
      name: 'Concrete & Cement',
      icon: FaIndustry,
      items: [
        { ...materials.cement, rate: 370, priority: 'High' },
        { ...materials.concrete, rate: 5500, priority: 'Medium' },
      ]
    },
    {
      name: 'Steel',
      icon: FaIndustry,
      items: [
        { ...materials.steel, rate: 72, priority: 'High' },
        { ...materials.steelWire, rate: 85, priority: 'Medium' },
      ]
    },
    {
      name: 'Aggregates & Sand',
      icon: FaIndustry,
      items: [
        { ...materials.sand, rate: 58, priority: 'High' },
        { ...materials.aggregate, rate: 42, priority: 'High' },
      ]
    },
    {
      name: 'Blocks & Masonry',
      icon: FaIndustry,
      items: [
        { ...materials.aacBlocks, rate: 78, priority: 'High' },
      ]
    },
    {
      name: 'Flooring & Tiles',
      icon: FaIndustry,
      items: [
        { ...materials.vitrifiedTiles, rate: 95, priority: 'Medium' },
        { ...materials.ceramicTiles, rate: 85, priority: 'Medium' },
        { ...materials.wallTiles, rate: 65, priority: 'Medium' },
      ]
    },
    {
      name: 'Paint & Finishes',
      icon: FaIndustry,
      items: [
        { ...materials.putty, rate: 35, priority: 'Low' },
        { ...materials.primer, rate: 180, priority: 'Low' },
        { ...materials.paint, rate: 280, priority: 'Medium' },
        { ...materials.exteriorPaint, rate: 380, priority: 'Medium' },
      ]
    },
  ];

  const totalMaterials = Object.values(materials).filter(m => m.qty > 0).length;

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FaIndustry className="text-blue-500" />
            Material Quantity Summary
          </h3>
          <span className="text-sm text-foreground-secondary">{totalMaterials} materials</span>
        </div>
        <p className="text-foreground-secondary text-sm">
          Total quantities of materials required for procurement based on structural calculations
        </p>
      </div>

      {/* Material Categories */}
      {materialCategories.map((category, catIdx) => {
        const categoryItems = category.items.filter(item => item.qty > 0);
        if (categoryItems.length === 0) return null;
        
        const categoryTotal = categoryItems.reduce((sum, item) => sum + (item.qty * item.rate), 0);
        
        return (
          <div key={catIdx} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <category.icon className="text-blue-500" />
                  {category.name}
                </h4>
                <span className="text-sm font-mono text-foreground-secondary">₹{categoryTotal.toLocaleString()}</span>
              </div>
            </div>
            
            <div className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-foreground-secondary border-b border-gray-200 dark:border-gray-700">
                    <th className="p-3 font-medium">Material</th>
                    <th className="p-3 font-medium text-right">Quantity</th>
                    <th className="p-3 font-medium">Unit</th>
                    <th className="p-3 font-medium text-right">Rate (₹)</th>
                    <th className="p-3 font-medium text-right">Estimated Cost (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryItems.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="p-3 text-foreground font-medium">{item.name}</td>
                      <td className="p-3 text-right font-mono text-foreground font-bold">{item.qty.toLocaleString()}</td>
                      <td className="p-3 text-foreground-secondary">{item.unit}</td>
                      <td className="p-3 text-right font-mono text-foreground-secondary">₹{item.rate}</td>
                      <td className="p-3 text-right font-mono text-foreground font-semibold">₹{(item.qty * item.rate).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-gray-900">
                    <td colSpan={4} className="p-3 text-right font-semibold text-foreground">Category Total</td>
                    <td className="p-3 text-right font-mono font-bold text-foreground">₹{categoryTotal.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })}

      {/* Procurement Notes */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h4 className="font-semibold text-foreground mb-4">Procurement Notes</h4>
        <ul className="space-y-2 text-sm text-foreground-secondary">
          <li>• Quantities include wastage as per IS 3861:1966 standards</li>
          <li>• Rates are approximate based on Kerala market 2026 prices</li>
          <li>• Actual rates may vary based on supplier location and bulk orders</li>
          <li>• Transport costs are not included in material rates</li>
          <li>• GST will be applied separately based on material category</li>
        </ul>
      </div>
    </div>
  );
}

// ============================================
// SUPPLIERS TAB COMPONENT
// Shows suppliers connected to materials in the project
// ============================================

function SuppliersTab({ boq }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState('Thrissur');
  const [costIndex, setCostIndex] = useState(135.59);
  
  const API_URL = 'https://ecobuildai-production-1f9d.up.railway.app';

  useEffect(() => {
    fetchData();
  }, [selectedDistrict]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch suppliers
      const suppliersRes = await fetch(`${API_URL}/api/material-suppliers?district=${selectedDistrict}`);
      const suppliersData = await suppliersRes.json();
      setSuppliers(suppliersData.suppliers || []);
      
      // Fetch cost index
      const costIndexRes = await fetch(`${API_URL}/api/location-cost-indices/${selectedDistrict}`);
      const costIndexData = await costIndexRes.json();
      setCostIndex(costIndexData['cost index to be applied to DSR 2016 with base 102'] || 100);
      
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setLoading(false);
    }
  };

  // Clean rate display
  const cleanRate = (rate) => {
    if (!rate) return 'N/A';
    // Remove garbled characters and clean up
    return rate
      .replace(/â‚¹/g, '₹')
      .replace(/â€"/g, '–')
      .replace(/Ã—/g, '×')
      .replace(/â€™/g, "'")
      .replace(/Â/g, '');
  };

  // Get materials from BoQ
  const getMaterials = () => {
    if (!boq?.categories) return [];
    const materials = [];
    boq.categories.forEach(cat => {
      cat.items?.forEach(item => {
        if (item.quantity > 0) {
          materials.push({
            category: cat.name,
            name: item.description?.substring(0, 50) || 'Material',
            quantity: item.quantity,
            unit: item.unit,
            baseRate: item.rate,
            amount: item.amount
          });
        }
      });
    });
    return materials;
  };

  // Find best supplier for a material
  const findBestSupplier = (materialName) => {
    if (!suppliers.length) return null;
    
    const searchTerms = materialName.toLowerCase();
    
    // Find matching suppliers
    const matchingSuppliers = suppliers.filter(s => {
      const supplied = (s['Materials Supplied'] || '').toLowerCase();
      return searchTerms.includes(supplied) || supplied.includes(searchTerms.split(' ')[0]);
    });
    
    if (matchingSuppliers.length === 0) return null;
    
    // Sort by distance (closest first)
    return matchingSuppliers.sort((a, b) => {
      const distA = a['Distance from Thrissur (km)'] || 999;
      const distB = b['Distance from Thrissur (km)'] || 999;
      return distA - distB;
    })[0];
  };

  // Calculate transportation cost (₹ per km per ton)
  const calculateTransportCost = (supplier, quantity, unit) => {
    const distance = supplier['Distance from Thrissur (km)'] || 0;
    // Transport rate: ₹5-10 per km per ton
    const transportRatePerKmPerTon = 7;
    
    // Estimate weight in tons
    let weightInTons = 0;
    if (unit === 'kg') weightInTons = quantity / 1000;
    else if (unit === 'cft') weightInTons = quantity * 0.02; // ~20kg per cft
    else if (unit === 'cum') weightInTons = quantity * 2.5; // ~2.5 tons per cum
    else if (unit === 'nos') weightInTons = quantity * 0.005; // ~5kg per piece
    else weightInTons = quantity / 1000; // default
    
    return Math.round(distance * transportRatePerKmPerTon * weightInTons);
  };

  const materials = getMaterials();
  const districts = ['Thrissur', 'Ernakulam', 'Palakkad', 'Kozhikode', 'Thiruvananthapuram'];

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
            Material Procurement & Suppliers
          </h3>
          <span className="text-sm text-foreground-secondary">Cost Index: {(costIndex / 102 * 100).toFixed(1)}%</span>
        </div>
        
        {/* District Selection */}
        <div className="flex gap-4">
          <label className="text-sm text-foreground-secondary">Select District:</label>
          <select 
            value={selectedDistrict} 
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="input text-sm w-48"
          >
            {districts.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Materials with Suppliers */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-foreground">Materials & Recommended Suppliers</h4>
          <p className="text-sm text-foreground-secondary mt-1">
            Suppliers auto-selected based on distance from {selectedDistrict}
          </p>
        </div>
        <div className="p-0">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-foreground-secondary border-b border-gray-200 dark:border-gray-700">
                <th className="p-3 font-medium">Material</th>
                <th className="p-3 font-medium">Category</th>
                <th className="p-3 font-medium text-right">Quantity</th>
                <th className="p-3 font-medium">Supplier</th>
                <th className="p-3 font-medium text-right">Distance</th>
                <th className="p-3 font-medium text-right">Transport Cost</th>
              </tr>
            </thead>
            <tbody>
              {materials.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-foreground-secondary">
                    No materials in BoQ. Generate BoQ first.
                  </td>
                </tr>
              ) : (
                materials.slice(0, 15).map((mat, idx) => {
                  const bestSupplier = findBestSupplier(mat.name);
                  const transportCost = bestSupplier ? calculateTransportCost(bestSupplier, mat.quantity, mat.unit) : 0;
                  
                  return (
                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="p-3 text-foreground font-medium text-sm">
                        {mat.name.substring(0, 40)}
                      </td>
                      <td className="p-3 text-foreground-secondary text-sm">
                        {mat.category}
                      </td>
                      <td className="p-3 text-right font-mono text-foreground">
                        {mat.quantity.toFixed(1)} {mat.unit}
                      </td>
                      <td className="p-3 text-foreground-secondary text-sm">
                        {bestSupplier ? (
                          <div>
                            <div className="font-medium">{bestSupplier['Supplier Name']}</div>
                            <div className="text-xs text-foreground-muted">{bestSupplier['City / Area']}</div>
                          </div>
                        ) : (
                          <span className="text-foreground-muted">No supplier found</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono text-foreground-secondary">
                        {bestSupplier ? `${bestSupplier['Distance from Thrissur (km)'] || 0} km` : 'N/A'}
                      </td>
                      <td className="p-3 text-right font-mono text-foreground">
                        {transportCost > 0 ? `₹${transportCost.toLocaleString()}` : 'N/A'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {materials.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-900">
                  <td colSpan={5} className="p-3 text-right font-semibold text-foreground">Total Transportation Cost</td>
                  <td className="p-3 text-right font-mono font-bold text-foreground">
                    ₹{materials.reduce((sum, mat) => {
                      const supplier = findBestSupplier(mat.name);
                      return sum + (supplier ? calculateTransportCost(supplier, mat.quantity, mat.unit) : 0);
                    }, 0).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Supplier Contact List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="font-semibold text-foreground mb-4">All Suppliers in {selectedDistrict} ({suppliers.length})</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.slice(0, 12).map((sup, idx) => (
            <div key={idx} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="font-medium text-foreground text-sm">{sup['Supplier Name']}</div>
              <div className="text-xs text-foreground-secondary mt-1">{sup['City / Area']}</div>
              <div className="text-xs text-foreground-muted mt-1">{sup['Materials Supplied']}</div>
              <div className="text-xs text-foreground-muted mt-1">{cleanRate(sup['Indicative Rate Range (Academic)'])}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Reports() {
  const navigate = useNavigate();
  const { project, completeBOQGeneration } = useProject();
  const { engineer, isConfigured: isEngineerConfigured } = useEngineer();
  const reportRef = useRef();
  const [activeTab, setActiveTab] = useState('boq');
  const [exporting, setExporting] = useState(false);
  const [boq, setBoq] = useState(null);
  const [boqLoading, setBoqLoading] = useState(true);
  const [citations, setCitations] = useState(null);

  // ============================================
  // CALCULATED VALUES (ACCURATE)
  // ============================================
  
  // Extract material quantities from BoQ
  const materialQuantities = useMemo(() => extractMaterialQuantities(boq), [boq]);
  
  // Calculate embodied carbon from BoQ
  const embodiedCarbon = useMemo(() => calculateEmbodiedCarbon(boq, project), [boq, project]);
  
  // Calculate GRIHA/IGBC/LEED scores
  const grihaScore = useMemo(() => calculateGRIHAScore(project, embodiedCarbon.total), [project, embodiedCarbon.total]);
  const igbcScore = useMemo(() => calculateIGBCScore(project, embodiedCarbon.total), [project, embodiedCarbon.total]);
  const leedScore = useMemo(() => calculateLEEDScore(project, embodiedCarbon.total), [project, embodiedCarbon.total]);
  
  const grihaRating = getGRIHARating(grihaScore);
  const igbcRating = getIGBCRating(igbcScore);
  const leedRating = getLEEDRating(leedScore);
  
  // Calculate carbon reduction based on conventional vs optimized
  // Conventional concrete: ~450 kg CO2/m³, Optimized: ~350 kg CO2/m³
  const conventionalCarbon = materialQuantities.concreteVolume * 450 + materialQuantities.steelKg * 3.0;
  const optimizedCarbon = embodiedCarbon.total || 0;
  const carbonReductionPercent = conventionalCarbon > 0 ? ((conventionalCarbon - optimizedCarbon) / conventionalCarbon * 100) : 0;
  
  // Sustainability score based on carbon reduction and project parameters
  const sustainabilityScore = Math.min(100, Math.round(
    (carbonReductionPercent > 20 ? 30 : carbonReductionPercent) + 
    (project.buildingParams?.sustainabilityPriority === 'high' ? 25 : 
     project.buildingParams?.sustainabilityPriority === 'medium' ? 15 : 5) +
    (project.buildingParams?.hasSolarWaterHeater ? 15 : 0) +
    (project.buildingParams?.hasRainwaterHarvesting ? 15 : 0) +
    (project.buildingParams?.hasSTP ? 10 : 0)
  ));
  
  // Calculate development control scores
  const siteScore = (project.buildingParams?.hasRainwaterHarvesting ? 5 : 0) + 5;
  const waterScore = (project.buildingParams?.hasRainwaterHarvesting ? 5 : 0) + (project.buildingParams?.hasSTP ? 5 : 0);
  const energyScore = (project.buildingParams?.hasSolarWaterHeater ? 10 : 0) + 10;
  const materialsScore = (project.buildingParams?.sustainabilityPriority === 'high' ? 8 : 
                         project.buildingParams?.sustainabilityPriority === 'medium' ? 5 : 2);
  const iqScore = 5; // Indoor quality assumed good

  // Validation state
  const [validationResults, setValidationResults] = useState({
    dimensions: { warnings: [], errors: [], isValid: true },
    steelRatio: { isValid: true, status: 'unknown', message: '' },
    placeholders: { hasPlaceholders: false, issues: [], isDraft: false }
  });

  // Calculate carbon reduction correctly
  // Carbon calculations - use embodied carbon from materials
  const boqCarbonData = boq?.categories ? calculateBoQCarbon(boq.categories, {}) : null;
  const boqCarbon = boqCarbonData?.totalCarbon || 0;
  
  // Calculate carbon in tonnes for display
  const baselineCarbonTonnes = (conventionalCarbon / 1000).toFixed(1);
  const optimizedCarbonTonnes = (optimizedCarbon / 1000).toFixed(1);

  // Run validation on mount
  useEffect(() => {
    if (project && project.isConfigured) {
      const dimValidation = validateBuildingDimensions(project.buildingParams);
      
      // Get steel quantity from BoQ if available
      const steelCategory = boq?.categories?.find(c => 
        c.id?.toLowerCase().includes('steel') || c.name?.toLowerCase().includes('steel')
      );
      const steelQuantity = steelCategory?.items?.reduce((sum, item) => {
        const qty = parseFloat(item.quantity) || 0;
        return sum + qty;
      }, 0) || 0;
      
      const steelValidation = validateSteelRatio(steelQuantity, project.buildingParams?.builtUpArea);
      const placeholderCheck = hasPlaceholderData(project);
      
      setValidationResults({
        dimensions: dimValidation,
        steelRatio: steelValidation,
        placeholders: placeholderCheck
      });
    }
  }, [project?.isConfigured]);

  // Track if BoQ has been generated for this session
  const [boqGenerated, setBoqGenerated] = useState(false);

  // Fetch BoQ data asynchronously - runs whenever project changes
  useEffect(() => {
    const fetchBoQ = async () => {
      // Generate BoQ if we have a valid project with building params
      const builtUpArea = project?.buildingParams?.builtUpArea;
      const hasValidParams = builtUpArea && builtUpArea > 0;
      
      if (hasValidParams) {
        setBoqLoading(true);
        try {
          console.log('Generating BoQ with project:', project.name, 'builtUpArea:', builtUpArea);
          const boqData = await generateBoQAsync(project);
          console.log('BoQ generated successfully, categories:', boqData?.categories?.length, 'total:', boqData?.summary?.grandTotal);
          setBoq(boqData);
          setBoqGenerated(true);
          // Update workflow to mark BOQ as generated
          completeBOQGeneration();
        } catch (error) {
          console.error('Failed to generate BoQ:', error);
          // Fallback to empty BoQ structure
          setBoq({
            projectInfo: { name: project.name, builtUpArea: project.buildingParams?.builtUpArea || 150, numFloors: project.buildingParams?.numFloors || 2 },
            categories: [],
            summary: { subTotal: 0, gstRate: 18, gstAmount: 0, grandTotal: 0 }
          });
          setBoqGenerated(true);
        } finally {
          setBoqLoading(false);
        }
      } else {
        console.log('Skipping BoQ generation - no valid project params');
        setBoqLoading(false);
      }
    };

    fetchBoQ();
  }, [project?.id, project?.buildingParams?.builtUpArea]);

  // Fetch citations for references
  useEffect(() => {
    const fetchCitations = async () => {
      try {
        console.log('Fetching citations...');
        const response = await ecoBuildAPI.getCitations();
        console.log('Citations response:', response.data);
        if (response.data) {
          setCitations(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch citations:', error);
        // Set empty citations to show fallback message
        setCitations({ bibliography: {}, all_citations: [] });
      }
    };
    fetchCitations();
  }, []);

  // Check if we have valid project data
  const hasValidProject = project && project.buildingParams && project.buildingParams.builtUpArea > 0;

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
            onClick={() => navigate('/setup')}
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
    // Add a class to body to trigger print-specific styles
    document.body.classList.add('printing');
    
    // Trigger print
    window.print();
    
    // Remove the class after printing
    setTimeout(() => {
      document.body.classList.remove('printing');
    }, 1000);
  };

  const handleExportPDF = () => {
    setExporting(true);
    setTimeout(() => {
      window.print();
      setExporting(false);
    }, 500);
  };

  const handleExportExcel = async () => {
    setExporting(true);
    
    if (activeTab === 'boq') {
      // Export BoQ CSV
      const { generateBoQAsync } = await import('../utils/boqCalculator');
      const boq = await generateBoQAsync(project);
      const csv = exportBoQToCSV(boq);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${project.name.replace(/\s+/g, '_')}_BoQ.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Generate STAAD-style CSV
      let csv = '*** STAAD.PRO STYLE ANALYSIS REPORT ***\n';
      csv += `PROJECT TITLE: ${project.name.toUpperCase()}\n`;
      csv += `ANALYSIS TYPE: SUSTAINABLE CONSTRUCTION LCA\n`;
      csv += `DATE: ${new Date().toLocaleDateString()}\n`;
      const engineerName = isEngineerConfigured && engineer.name ? engineer.name : 'GEC THRISSUR - ECOBUILD SYSTEM';
      const engineerReg = isEngineerConfigured && engineer.registrationNumber ? ` (${engineer.registrationNumber})` : '';
      csv += `ENGINEER: ${engineerName}${engineerReg}\n`;
      if (isEngineerConfigured && engineer.company) {
        csv += `COMPANY: ${engineer.company}\n`;
      }
      csv += `DATE: ${new Date().toLocaleDateString()}\n\n`;
      
      csv += '*** PROJECT GEOMETRY ***\n';
      csv += `JOINT COORDINATES (LAT,LON): ${project.location.lat.toFixed(6)} ${project.location.lon.toFixed(6)}\n`;
      csv += `PLOT AREA (SQ.M): ${project.buildingParams.plotArea}\n`;
      csv += `BUILT-UP AREA (SQ.M): ${project.buildingParams.builtUpArea}\n`;
      csv += `NO. OF FLOORS: ${project.buildingParams.numFloors}\n`;
      csv += `BUILDING HEIGHT (M): ${project.buildingParams.height}\n`;
      csv += `FAR: ${(project.buildingParams.builtUpArea / project.buildingParams.plotArea).toFixed(3)}\n\n`;
      
      csv += '*** MATERIAL SPECIFICATIONS ***\n';
      csv += 'MEMBER,TYPE,GRADE,QUANTITY,UNIT,CARBON(kg),COST(Rs)\n';
      Object.entries(project.materialSelections).forEach(([cat, mat]) => {
        csv += `${cat.toUpperCase()},${mat.name},STD,${mat.quantity || 1},${mat.unit || 'each'},${mat.embodied_carbon},${mat.cost_per_unit}\n`;
      });
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/\s+/g, '_')}_STAAD_REPORT.csv`;
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
          <span className="text-foreground-secondary">Calculating Bill of Quantities...</span>
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
        <p className="text-2xl font-bold">{formatCurrency(boq?.summary?.grandTotal || 0)}</p>
        <p className="text-xs text-blue-100 mt-1">Incl. GST @ 18%</p>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg">
            <FaClipboardList className="text-xl" />
          </div>
          <span className="text-sm text-foreground-secondary">Total Items</span>
        </div>
        <p className="text-2xl font-bold text-foreground">
          {boq?.categories?.reduce((sum, cat) => sum + cat.items.length, 0) || 0}
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
          <span className="text-sm text-foreground-secondary">Cost per sq.ft</span>
        </div>
        <p className="text-2xl font-bold text-foreground">
          ₹ {(boq?.summary?.grandTotal || 0) / ((boq?.projectInfo?.totalArea || 1) * 10.764)}
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
          <span className="text-sm text-foreground-secondary">GST Amount</span>
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
          <h1 className="text-2xl font-bold text-foreground">Analysis Reports</h1>
          <p className="text-foreground-secondary mt-1">
            Generate Quantity Survey, Bill of Quantities (BoQ), and Sustainability Assessment reports
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handlePrint} className="btn btn-secondary">
            <FaPrint className="mr-2" />
            Print
          </button>
          <button onClick={handleExportExcel} disabled={exporting} className="btn btn-secondary">
            <FaFileExcel className="mr-2" />
            Export CSV
          </button>
          <button onClick={handleExportPDF} disabled={exporting} className="btn btn-primary">
            <FaFilePdf className="mr-2" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('staad')}
          className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'staad'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-foreground-secondary hover:text-foreground'
          }`}
        >
          <FaChartBar />
          Technical Report
        </button>
        <button
          onClick={() => setActiveTab('boq')}
          className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'boq'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-foreground-secondary hover:text-foreground'
          }`}
        >
          <FaClipboardList />
          Bill of Quantities
        </button>
        <button
          onClick={() => setActiveTab('materialsummary')}
          className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'materialsummary'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-foreground-secondary hover:text-foreground'
          }`}
        >
          <FaIndustry />
          Material Summary
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'suppliers'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-foreground-secondary hover:text-foreground'
          }`}
        >
          <FaIndustry />
          Suppliers
        </button>
        <button
          onClick={() => setActiveTab('sustainability')}
          className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'sustainability'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-foreground-secondary hover:text-foreground'
          }`}
        >
          <FaLeaf />
          Sustainability
        </button>
        <button
          onClick={() => setActiveTab('cost')}
          className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'cost'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-foreground-secondary hover:text-foreground'
          }`}
        >
          <FaMoneyBillWave />
          Cost Summary
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'ai'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-foreground-secondary hover:text-foreground'
          }`}
        >
          <FaLeaf />
          AI Recommendations
        </button>
        <button
          onClick={() => setActiveTab('references')}
          className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'references'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-foreground-secondary hover:text-foreground'
          }`}
        >
          <FaBook />
          References
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
              {project.location?.district || 'Thrissur'}, Kerala
            </p>
            <p className="text-sm text-gray-600">
              Generated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>

        <div data-tab-content="boq" style={{ display: activeTab === 'boq' ? 'block' : 'none' }} className="print:block">
          <BillOfQuantities />
        </div>

        <div data-tab-content="materialsummary" style={{ display: activeTab === 'materialsummary' ? 'block' : 'none' }} className="print:block">
          <MaterialSummaryTab boq={boq} />
        </div>

        <div data-tab-content="suppliers" style={{ display: activeTab === 'suppliers' ? 'block' : 'none' }} className="print:block">
          <SuppliersTab boq={boq} />
        </div>

        <div data-tab-content="staad" style={{ display: activeTab === 'staad' ? 'block' : 'none' }} className="print:block">
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
                <h1 className="text-2xl font-bold mb-2">*** ECOBUILD SUSTAINABILITY ANALYSIS ***</h1>
                <h2 className="text-lg">LIFECYCLE DECISION SUPPORT SYSTEM</h2>
                <p className="text-sm mt-2">GEC THRISSUR | DEPARTMENT OF CIVIL ENGINEERING</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 border-t-2 border-black pt-4">
                <div>
                  <p><strong>PROJECT:</strong> {project.name?.toUpperCase() || 'UNNAMED PROJECT'}</p>
                  <p><strong>JOB NO:</strong> EB-{project.id?.slice(-6).toUpperCase() || Date.now().toString(36).toUpperCase().slice(-6)}</p>
                  <p><strong>CLIENT:</strong> {project.clientName?.toUpperCase() || project.buildingClassification?.mainUse?.toUpperCase() || 'NOT SPECIFIED'}</p>
                </div>
                <div>
                  <p><strong>DATE:</strong> {new Date().toLocaleDateString()}</p>
                  <p><strong>ENGINEER:</strong> {isEngineerConfigured && engineer.name ? engineer.name : 'ECOBUILD AI'}</p>
                  <p><strong>REG NO:</strong> {isEngineerConfigured && engineer.registrationNumber ? engineer.registrationNumber : 'N/A'}</p>
                  <p><strong>CHECKED:</strong> {validationResults.placeholders.isDraft ? 'PENDING REVIEW' : 'APPROVED'}</p>
                </div>
              </div>
              
              {validationResults.placeholders.hasPlaceholders && (
                <div className="mt-4 p-2 bg-yellow-50 border border-yellow-400 text-xs text-yellow-800">
                  <strong>NOTE:</strong> This report contains placeholder data. Please complete all project fields for final approval.
                </div>
              )}
            </div>

            {/* Page 2: Project Data */}
            <div className="mb-8">
              <h3 className="font-bold text-lg border-b-2 border-black mb-4">1. PROJECT PARAMETERS</h3>
              
              <table className="w-full border-collapse border border-black mb-4">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-black p-2 text-left">PARAMETER</th>
                    <th className="border border-black p-2 text-left">VALUE</th>
                    <th className="border border-black p-2 text-left">UNIT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-2">LOCATION (LATITUDE)</td>
                    <td className="border border-black p-2">{project.location.lat.toFixed(6)}</td>
                    <td className="border border-black p-2">DEG</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">LOCATION (LONGITUDE)</td>
                    <td className="border border-black p-2">{project.location.lon.toFixed(6)}</td>
                    <td className="border border-black p-2">DEG</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">PLOT AREA</td>
                    <td className="border border-black p-2">{project.buildingParams.plotArea}</td>
                    <td className="border border-black p-2">SQ.M</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">BUILT-UP AREA</td>
                    <td className="border border-black p-2">{project.buildingParams.builtUpArea}</td>
                    <td className="border border-black p-2">SQ.M</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">NO. OF FLOORS</td>
                    <td className="border border-black p-2">{project.buildingParams.numFloors}</td>
                    <td className="border border-black p-2">NOS</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">BUILDING HEIGHT</td>
                    <td className="border border-black p-2">{project.buildingParams.height}</td>
                    <td className="border border-black p-2">M</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">FLOOR AREA RATIO (FAR)</td>
                    <td className="border border-black p-2">{(project.buildingParams.builtUpArea / project.buildingParams.plotArea).toFixed(3)}</td>
                    <td className="border border-black p-2">-</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">ROAD WIDTH</td>
                    <td className="border border-black p-2">{project.buildingParams.roadWidth}</td>
                    <td className="border border-black p-2">M</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Page 3: Material Summary */}
            <div className="mb-8">
              <h3 className="font-bold text-lg border-b-2 border-black mb-4">2. MATERIAL SPECIFICATIONS</h3>
              
              <table className="w-full border-collapse border border-black mb-4">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-black p-2 text-left">MEMBER</th>
                    <th className="border border-black p-2 text-left">MATERIAL TYPE</th>
                    <th className="border border-black p-2 text-right">QTY</th>
                    <th className="border border-black p-2 text-left">UNIT</th>
                    <th className="border border-black p-2 text-right">CARBON (KG)</th>
                    <th className="border border-black p-2 text-right">COST (Rs)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(project.materialSelections).length > 0 ? (
                    Object.entries(project.materialSelections).map(([cat, mat], idx) => (
                      <tr key={idx}>
                        <td className="border border-black p-2">{cat.toUpperCase()}</td>
                        <td className="border border-black p-2">{mat.name}</td>
                        <td className="border border-black p-2 text-right">{mat.quantity || 1}</td>
                        <td className="border border-black p-2">{mat.unit || 'EACH'}</td>
                        <td className="border border-black p-2 text-right">{mat.embodied_carbon}</td>
                        <td className="border border-black p-2 text-right">{mat.cost_per_unit}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="border border-black p-4 text-center text-gray-500">
                        NO MATERIALS SELECTED - RUN OPTIMIZATION FIRST
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Page 4: Analysis Results */}
            <div className="mb-8">
              <h3 className="font-bold text-lg border-b-2 border-black mb-4">3. SUSTAINABILITY ANALYSIS RESULTS</h3>
              
              {/* Validation Warnings */}
              {(validationResults.dimensions.warnings.length > 0 || validationResults.dimensions.errors.length > 0 || !validationResults.steelRatio.isValid) && (
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
                    <p key={`warn-${idx}`} className="text-orange-600 text-sm mb-1">
                      WARNING: {warn.message}
                    </p>
                  ))}
                  {validationResults.steelRatio.status === 'over-designed' && (
                    <p className="text-red-600 text-sm mb-1">
                      ERROR: {validationResults.steelRatio.message}
                    </p>
                  )}
                  {validationResults.steelRatio.status === 'high' && (
                    <p className="text-orange-600 text-sm mb-1">
                      WARNING: {validationResults.steelRatio.message}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="border border-black p-4">
                  <p className="font-bold mb-2">SUSTAINABILITY SCORE</p>
                  <p className="text-3xl font-bold">{sustainabilityScore}/100</p>
                  <p className="text-sm text-gray-600">
                    {sustainabilityScore >= 75 ? 'GRIHA 5-STAR ELIGIBLE' : 
                     sustainabilityScore >= 60 ? 'GRIHA 4-STAR ELIGIBLE' : 
                     sustainabilityScore >= 45 ? 'GRIHA 3-STAR ELIGIBLE' : 'NEEDS IMPROVEMENT'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    (Based on structural elements only)
                  </p>
                </div>
                <div className="border border-black p-4">
                  <p className="font-bold mb-2">CARBON REDUCTION</p>
                  <p className="text-3xl font-bold">{carbonReductionPercent.toFixed(1)}%</p>
                  <p className="text-sm text-gray-600">VS CONVENTIONAL DESIGN</p>
                  <p className="text-xs text-gray-500 mt-1">
                    ({baselineCarbonTonnes} → {optimizedCarbonTonnes} tons CO2)
                  </p>
                </div>
              </div>

              <table className="w-full border-collapse border border-black mb-4">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-black p-2 text-left">ANALYSIS TYPE</th>
                    <th className="border border-black p-2 text-right">CONVENTIONAL</th>
                    <th className="border border-black p-2 text-right">OPTIMIZED</th>
                    <th className="border border-black p-2 text-right">SAVINGS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-2">EMBODIED CARBON (TONS)</td>
                    <td className="border border-black p-2 text-right">{baselineCarbonTonnes}</td>
                    <td className="border border-black p-2 text-right">{optimizedCarbonTonnes}</td>
                    <td className="border border-black p-2 text-right">{(parseFloat(baselineCarbonTonnes) - parseFloat(optimizedCarbonTonnes)).toFixed(1)}</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">MATERIAL COST (Rs LAKHS)</td>
                    <td className="border border-black p-2 text-right">{((boq?.summary?.grandTotal || 0) * 1.15 / 100000).toFixed(1)}</td>
                    <td className="border border-black p-2 text-right">{((boq?.summary?.grandTotal || 0) / 100000).toFixed(1)}</td>
                    <td className="border border-black p-2 text-right">{((boq?.summary?.grandTotal || 0) * 0.15 / 100000).toFixed(1)}</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">RECYCLED CONTENT (%)</td>
                    <td className="border border-black p-2 text-right">5%</td>
                    <td className="border border-black p-2 text-right">{project.buildingParams?.sustainabilityPriority === 'high' ? '35%' : project.buildingParams?.sustainabilityPriority === 'medium' ? '20%' : '10%'}</td>
                    <td className="border border-black p-2 text-right">{project.buildingParams?.sustainabilityPriority === 'high' ? '30%' : project.buildingParams?.sustainabilityPriority === 'medium' ? '15%' : '5%'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="border-t-2 border-black pt-4 text-center text-xs">
              <p>*** END OF TECHNICAL REPORT ***</p>
              <p className="mt-2">ECOBUILD LIFECYCLE DECISION SUPPORT SYSTEM v1.0</p>
              <p>GOVERNMENT ENGINEERING COLLEGE THRISSUR</p>
              <p>ANALYSIS DATE: {new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div data-tab-content="sustainability" style={{ display: activeTab === 'sustainability' ? 'block' : 'none' }} className="print:block">
          <div className="bg-white text-black font-mono text-sm leading-relaxed p-8 shadow-lg print:p-4">
            <div className="border-2 border-black p-6 mb-8 print:break-inside-avoid">
              <h1 className="text-2xl font-bold text-center mb-4">SUSTAINABILITY ASSESSMENT REPORT</h1>
              <h2 className="text-lg text-center">GRIHA / IGBC / LEED Rating Analysis</h2>
            </div>

            <div className="mb-8">
              <h3 className="font-bold text-lg border-b-2 border-black mb-4">1. GREEN BUILDING RATINGS</h3>
              
              <table className="w-full border-collapse border border-black mb-4">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-black p-2 text-left">RATING SYSTEM</th>
                    <th className="border border-black p-2 text-left">SCORE</th>
                    <th className="border border-black p-2 text-left">RATING</th>
                    <th className="border border-black p-2 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-2">GRIHA (India)</td>
                    <td className="border border-black p-2">{grihaScore}</td>
                    <td className="border border-black p-2">{grihaRating}</td>
                    <td className="border border-black p-2 text-center">{grihaScore >= 50 ? '✓' : '○'}</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">IGBC (India)</td>
                    <td className="border border-black p-2">{igbcScore}</td>
                    <td className="border border-black p-2">{igbcRating}</td>
                    <td className="border border-black p-2 text-center">{igbcScore >= 40 ? '✓' : '○'}</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">LEED (International)</td>
                    <td className="border border-black p-2">{leedScore}</td>
                    <td className="border border-black p-2">{leedRating}</td>
                    <td className="border border-black p-2 text-center">{leedScore >= 40 ? '✓' : '○'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* EMBODIED CARBON SECTION */}
            <div className="mb-8">
              <h3 className="font-bold text-lg border-b-2 border-black mb-4">2. EMBODIED CARBON ANALYSIS</h3>
              
              <table className="w-full border-collapse border border-black mb-4">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-black p-2 text-left">MATERIAL</th>
                    <th className="border border-black p-2 text-right">QUANTITY</th>
                    <th className="border border-black p-2 text-right">CARBON (kg CO2)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-2">Cement</td>
                    <td className="border border-black p-2 text-right">{formatNumber(Math.round(materialQuantities.cementBags))} bags</td>
                    <td className="border border-black p-2 text-right">{formatNumber(Math.round(embodiedCarbon.breakdown.cement))}</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">Steel</td>
                    <td className="border border-black p-2 text-right">{formatNumber(Math.round(materialQuantities.steelKg))} kg</td>
                    <td className="border border-black p-2 text-right">{formatNumber(Math.round(embodiedCarbon.breakdown.steel))}</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">Sand</td>
                    <td className="border border-black p-2 text-right">{formatNumber(Math.round(materialQuantities.sandCft))} cft</td>
                    <td className="border border-black p-2 text-right">{formatNumber(Math.round(embodiedCarbon.breakdown.sand))}</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">Aggregate</td>
                    <td className="border border-black p-2 text-right">{formatNumber(Math.round(materialQuantities.aggregateCft))} cft</td>
                    <td className="border border-black p-2 text-right">{formatNumber(Math.round(embodiedCarbon.breakdown.aggregate))}</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">Blocks</td>
                    <td className="border border-black p-2 text-right">{formatNumber(Math.round(materialQuantities.blocksNos))} nos</td>
                    <td className="border border-black p-2 text-right">{formatNumber(Math.round(embodiedCarbon.breakdown.blocks))}</td>
                  </tr>
                  <tr className="bg-gray-100 font-bold">
                    <td className="border border-black p-2">TOTAL EMBODIED CARBON</td>
                    <td className="border border-black p-2 text-right"></td>
                    <td className="border border-black p-2 text-right">{formatNumber(Math.round(embodiedCarbon.total))} kg CO2</td>
                  </tr>
                </tbody>
              </table>
              
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-green-800 font-semibold">
                  Carbon Reduction vs Conventional: {carbonReductionPercent.toFixed(1)}%
                </p>
                <p className="text-sm text-green-700">
                  Using optimized materials and sustainable practices reduces environmental impact
                </p>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="font-bold text-lg border-b-2 border-black mb-4">3. DEVELOPMENT CONTROL</h3>
              
              <table className="w-full border-collapse border border-black mb-4">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-black p-2 text-left">CATEGORY</th>
                    <th className="border border-black p-2 text-left">POINTS EARNED</th>
                    <th className="border border-black p-2 text-left">MAX POINTS</th>
                    <th className="border border-black p-2 text-center">CONTRIBUTION</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-2">Site & Planning</td>
                    <td className="border border-black p-2">{siteScore}</td>
                    <td className="border border-black p-2">15</td>
                    <td className="border border-black p-2 text-center">Site selection, accessibility</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">Water Efficiency</td>
                    <td className="border border-black p-2">{waterScore}</td>
                    <td className="border border-black p-2">10</td>
                    <td className="border border-black p-2 text-center">Rainwater harvesting, STP</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">Energy Performance</td>
                    <td className="border border-black p-2">{energyScore}</td>
                    <td className="border border-black p-2">20</td>
                    <td className="border border-black p-2 text-center">Solar, efficient systems</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">Materials & Resources</td>
                    <td className="border border-black p-2">{materialsScore}</td>
                    <td className="border border-black p-2">15</td>
                    <td className="border border-black p-2 text-center">Low carbon materials</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">Indoor Environment</td>
                    <td className="border border-black p-2">{iqScore}</td>
                    <td className="border border-black p-2">5</td>
                    <td className="border border-black p-2 text-center">Ventilation, lighting</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mb-8">
              <h3 className="font-bold text-lg border-b-2 border-black mb-4">4. SUSTAINABLE FEATURES</h3>
              
              <table className="w-full border-collapse border border-black mb-4">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-black p-2 text-left">FEATURE</th>
                    <th className="border border-black p-2 text-left">STATUS</th>
                    <th className="border border-black p-2 text-center">IMPACT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-2">RAINWATER HARVESTING</td>
                    <td className="border border-black p-2">{project.buildingParams.hasRainwaterHarvesting ? 'INSTALLED' : 'NOT INSTALLED'}</td>
                    <td className="border border-black p-2 text-center">+{project.buildingParams.hasRainwaterHarvesting ? 5 : 0} pts</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">SOLAR WATER HEATER</td>
                    <td className="border border-black p-2">{project.buildingParams.hasSolarWaterHeater ? 'INSTALLED' : 'NOT INSTALLED'}</td>
                    <td className="border border-black p-2 text-center">+{project.buildingParams.hasSolarWaterHeater ? 5 : 0} pts</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">SEWAGE TREATMENT PLANT</td>
                    <td className="border border-black p-2">{project.buildingParams.hasSTP ? 'INSTALLED' : 'NOT INSTALLED'}</td>
                    <td className="border border-black p-2 text-center">+{project.buildingParams.hasSTP ? 4 : 0} pts</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">LOW CARBON MATERIALS</td>
                    <td className="border border-black p-2">{project.sustainability?.lowCarbonMaterials ? 'SELECTED' : 'STANDARD'}</td>
                    <td className="border border-black p-2 text-center">+{project.sustainability?.lowCarbonMaterials ? 6 : 0} pts</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Eco-Friendly Recommendations */}
            <div className="mb-8">
              <h3 className="font-bold text-lg border-b-2 border-black mb-4">3. ECO-FRIENDLY CONSTRUCTION RECOMMENDATIONS</h3>
              
              <div className="space-y-4">
                {/* Material Recommendations */}
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                    <FaLeaf className="text-green-600" />
                    Material Selection
                  </h4>
                  <ul className="text-sm text-green-700 dark:text-green-300 space-y-1 list-disc list-inside">
                    {project.sustainability?.lowCarbonMaterials ? (
                      <li>✓ Using low carbon materials - great choice for environmental impact!</li>
                    ) : (
                      <>
                        <li>Consider using fly ash or slag-based cement (PPC/PSC) to reduce embodied carbon by 30-40%</li>
                        <li>Use recycled steel or secondary steel to reduce carbon footprint</li>
                        <li>Consider using fly ash brick/block masonry instead of conventional bricks</li>
                      </>
                    )}
                    <li>Use locally sourced aggregates to minimize transportation emissions</li>
                    <li>Consider using bamboo or engineered wood for non-structural elements</li>
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
                      <li>Install solar water heater to earn 5 GRIHA points and reduce electricity costs</li>
                    )}
                    <li>Use energy-efficient lighting (LED) to reduce operational energy by 40-60%</li>
                    <li>Install rainwater harvesting system for water security and sustainability points</li>
                    <li>Consider building orientation for maximum natural ventilation and daylight</li>
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
                      <li>Install rainwater harvesting system - mandatory for buildings over 100 sqm</li>
                    )}
                    {!project.buildingParams.hasSTP && (
                      <li>Consider sewage treatment plant for water reuse (toilet flushing, gardening)</li>
                    )}
                    <li>Use low-flow fixtures to reduce water consumption by 30%</li>
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
                    <li>Segregate construction waste (hazardous, recyclable, inert)</li>
                    <li>Use prefabricated components to reduce on-site waste</li>
                    <li>Donate leftover materials to NGOs or reuse in other projects</li>
                    <li>Set up a construction waste management plan</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Supplier & Logistics Information */}
            <div className="mb-8">
              <h3 className="font-bold text-lg border-b-2 border-black mb-4">4. SUPPLIER & LOGISTICS</h3>
              
              <table className="w-full border-collapse border border-black mb-4">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-black p-2 text-left">MATERIAL</th>
                    <th className="border border-black p-2 text-left">SUPPLIER</th>
                    <th className="border border-black p-2 text-left">LOCATION</th>
                    <th className="border border-black p-2 text-center">LEAD TIME</th>
                    <th className="border border-black p-2 text-center">RELIABILITY</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(project.materialSelections || {}).map(([cat, mat]) => (
                    <tr key={cat}>
                      <td className="border border-black p-2 capitalize">{cat}</td>
                      <td className="border border-black p-2">{mat.supplier_name || mat.supplier || 'Local Supplier'}</td>
                      <td className="border border-black p-2">{mat.supplier_location || project.location?.district || 'Thrissur'}</td>
                      <td className="border border-black p-2 text-center">{mat.lead_time_days || '1-2'} days</td>
                      <td className="border border-black p-2 text-center">{mat.reliability_rating || '9'}/10</td>
                    </tr>
                  ))}
                  {(!project.materialSelections || Object.keys(project.materialSelections).length === 0) && (
                    <tr>
                      <td colSpan={5} className="border border-black p-4 text-center text-gray-500">
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
                  <li>Transportation distance: {project.buildingParams.maxTransportDistance || 50} km maximum (reduces embodied carbon)</li>
                  <li>Consolidated delivery schedules reduce logistics emissions</li>
                  <li>Local sourcing priority within {project.buildingParams.maxTransportDistance || 50} km radius</li>
                  <li>Consider bulk ordering to optimize transportation costs</li>
                </ul>
              </div>
            </div>

            {/* AI Recommendations */}
            <div className="mb-8">
              <h3 className="font-bold text-lg border-b-2 border-black mb-4">5. AI RECOMMENDATIONS</h3>
              
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 rounded-lg border border-primary">
                <h4 className="font-semibold text-primary mb-2">Smart Recommendations</h4>
                <div className="text-sm text-foreground space-y-2">
                  <p><strong>Based on your project parameters:</strong></p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Built-up Area: {project.buildingParams?.builtUpArea || 150} m² with {project.buildingParams?.numFloors || 2} floors</li>
                    <li>Recommended Steel Ratio: {project.buildingParams?.steelRatio || 100} kg/m³ (IS 456 compliant)</li>
                    <li>Exposure Condition: {project.buildingParams?.exposureCondition || 'moderate'} (IS 456)</li>
                    <li>Sustainability Priority: {project.buildingParams?.sustainabilityPriority || 'high'}</li>
                  </ul>
                  {project.sustainabilityPriority === 'high' && (
                    <p className="mt-2 text-primary">✓ High sustainability mode enabled - prioritizing low carbon materials</p>
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
        </div>}

        <div data-tab-content="cost" style={{ display: activeTab === 'cost' ? 'block' : 'none' }} className="print:block">
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
                  const percentage = (category.subTotal / (boq?.summary?.subTotal || 1)) * 100;
                  return (
                    <div key={category.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-foreground font-medium">{category.name}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-foreground-secondary text-sm">{percentage.toFixed(1)}%</span>
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
                  <span className="font-mono font-bold text-foreground">{formatCurrency(boq?.summary?.subTotal || 0)}</span>
                </div>
                <div className="flex items-center justify-between text-lg mb-3">
                  <span className="text-foreground-secondary">GST @ {boq?.summary?.gstRate || 18}%</span>
                  <span className="font-mono text-foreground">{formatCurrency(boq?.summary?.gstAmount || 0)}</span>
                </div>
                <div className="flex items-center justify-between pt-4 border-t-2 border-dashed border-gray-300 dark:border-gray-600">
                  <span className="text-2xl font-bold text-foreground">Grand Total</span>
                  <span className="text-3xl font-bold text-green-600 dark:text-green-400 font-mono">
                    {formatCurrency(boq?.summary?.grandTotal || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Material Cost Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">Major Materials Required</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-foreground-secondary flex items-center gap-2"><FaIndustry className="text-gray-400" /> Cement (OPC 53)</span>
                    <span className="text-foreground font-semibold">{formatNumber(Math.round(materialQuantities.cementBags))} bags</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-foreground-secondary flex items-center gap-2"><FaHardHat className="text-gray-400" /> TMT Steel (Fe500)</span>
                    <span className="text-foreground font-semibold">
                      {formatNumber(Math.round(materialQuantities.steelKg))} kg
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-foreground-secondary flex items-center gap-2"><FaTruck className="text-gray-400" /> M-Sand</span>
                    <span className="text-foreground font-semibold">
                      {formatNumber(Math.round(materialQuantities.sandCft))} cft
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-foreground-secondary flex items-center gap-2"><FaTruck className="text-gray-400" /> 20mm Aggregate</span>
                    <span className="text-foreground font-semibold">
                      {formatNumber(Math.round(materialQuantities.aggregateCft))} cft
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-foreground-secondary flex items-center gap-2"><FaIndustry className="text-gray-400" /> AAC Blocks</span>
                    <span className="text-foreground font-semibold">
                      {formatNumber(Math.round(materialQuantities.blocksNos))} nos
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-foreground-secondary flex items-center gap-2"><FaIndustry className="text-gray-400" /> Concrete Volume</span>
                    <span className="text-foreground font-semibold">
                      {formatNumber(materialQuantities.concreteVolume.toFixed(2))} m³
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">Cost Analysis</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-foreground-secondary">Cost per sq.m</span>
                    <span className="text-foreground font-semibold">
                      ₹ {Math.round((boq?.summary?.grandTotal || 0) / (boq?.projectInfo?.totalArea || 1)).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-foreground-secondary">Cost per sq.ft</span>
                    <span className="text-foreground font-semibold">
                      ₹ {Math.round((boq?.summary?.grandTotal || 0) / ((boq?.projectInfo?.totalArea || 1) * 10.764)).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-foreground-secondary">Concrete Work Cost</span>
                    <span className="text-foreground font-semibold">
                      {formatCurrency(boq?.categories?.find(c => c.name === 'Concrete Work')?.subTotal || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-foreground-secondary">Steel Cost</span>
                    <span className="text-foreground font-semibold">
                      {formatCurrency(boq?.categories?.find(c => c.name === 'Reinforcement Steel')?.subTotal || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-foreground-secondary">Finishes Cost</span>
                    <span className="text-foreground font-semibold">
                      {formatCurrency(
                        (boq?.categories?.find(c => c.name === 'Flooring')?.subTotal || 0) +
                        (boq?.categories?.find(c => c.name === 'Painting')?.subTotal || 0) +
                        (boq?.categories?.find(c => c.name === 'Plastering')?.subTotal || 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-foreground mb-2">Important Notes:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-foreground-secondary">
                <li>All rates are based on Thrissur market rates as of 2024</li>
                <li>Wastage factors included as per standard engineering practices (2-8%)</li>
                <li>GST @ 18% is applicable on the total amount</li>
                <li>Transportation charges to site not included unless specified</li>
                <li>Rates may vary based on actual market conditions and supplier quotations</li>
                <li>Contingency of 3-5% recommended for unforeseen expenses</li>
              </ul>
            </div>
          </div>
        </div>

        <div data-tab-content="ai" style={{ display: activeTab === 'ai' ? 'block' : 'none' }} className="print:block">
          <AIRecommendationsTab 
            project={project} 
            boq={boq} 
            embodiedCarbon={embodiedCarbon}
            sustainabilityScore={sustainabilityScore}
          />
        </div>

        <div data-tab-content="references" style={{ display: activeTab === 'references' ? 'block' : 'none' }} className="print:block">
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <FaBook className="text-blue-500" />
                Academic References & Citations
              </h3>
              <p className="text-foreground-secondary mb-6">
                The structural engineering calculations in this system are based on Indian Standards (IS Codes). 
                The following academic papers provide technical background, validation, and comparative studies 
                for the implemented standards.
              </p>
              
              {citations && citations.bibliography && Object.keys(citations.bibliography).length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(citations.bibliography).map(([code, refs]) => (
                    <div key={code} className="border-l-4 border-blue-500 pl-4">
                      <h4 className="font-bold text-lg text-primary mb-3">{code}</h4>
                      <div className="space-y-3">
                        {refs.map((ref, idx) => (
                          <div key={idx} className="text-sm bg-gray-50 dark:bg-gray-700/50 p-3 rounded">
                            <p className="text-foreground">{ref}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-foreground-secondary">The following Indian Standards are implemented in this system:</p>
                  <ul className="list-disc list-inside space-y-2 text-foreground">
                    <li><strong>IS 875 (Part 3):2015</strong> - Wind Loads on Buildings and Structures</li>
                    <li><strong>IS 1893 (Part 1):2016</strong> - Criteria for Earthquake Resistant Design</li>
                    <li><strong>IS 456:2000</strong> - Plain and Reinforced Concrete Code of Practice</li>
                    <li><strong>IS 13920:2016</strong> - Ductile Detailing of RC Structures</li>
                    <li><strong>IS 10262:2019</strong> - Concrete Mix Proportioning Guidelines</li>
                  </ul>
                  <p className="text-sm text-foreground-secondary mt-4">
                    Academic citations are available when the backend server is running with the citations module.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-foreground mb-2">Note on Standards:</h4>
              <p className="text-sm text-foreground-secondary">
                This software implements the following Indian Standards for structural engineering calculations:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-foreground-secondary mt-2">
                <li>IS 875 (Part 1 & 3) - Design Loads (Dead, Imposed & Wind Loads)</li>
                <li>IS 1893 (Part 1):2016 - Earthquake Resistant Design</li>
                <li>IS 456:2000 - Plain and Reinforced Concrete Code</li>
                <li>IS 13920:2016 - Ductile Detailing of RC Structures</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Print Footer */}
        <div className="hidden print:block mt-8 pt-4 border-t border-gray-800 text-center text-sm">
          <p>Generated by Ecobuild System | Government Engineering College, Thrissur</p>
          <p className="mt-1">{new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

export default Reports;

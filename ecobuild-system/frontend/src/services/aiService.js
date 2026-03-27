// EcoBuild AI Service
// Uses local expert system for construction recommendations

/**
 * Generate AI response based on project data
 */
export async function generateAIResponse(question, project, chatHistory = [], boqData = null, carbonData = null) {
  return generateExpertResponse(question, project, boqData, carbonData);
}

/**
 * Generate AI recommendations for the Reports section
 */
export function generateAIRecommendations(project, boq, carbon) {
  const bp = project?.buildingParams || {};
  const recommendations = [];
  
  const builtUpArea = bp.builtUpArea || 0;
  const numFloors = bp.numFloors || 1;
  const totalArea = builtUpArea * numFloors;
  const carbonTotal = carbon?.total || 0;
  const boqTotal = boq?.summary?.grandTotal || 0;
  
  // Cement recommendations
  recommendations.push({
    category: 'Materials',
    priority: 'High',
    title: 'Use PPC Cement for 35% Lower Carbon',
    description: 'PPC (Fly Ash) cement reduces embodied carbon by 35% compared to OPC 53. It also has better durability and workability in Kerala\'s humid climate.',
    impact: 'Save ' + Math.round(carbonTotal * 0.15) + ' kg CO2',
    carbonReduction: Math.round(carbonTotal * 0.15),
    costImpact: 'Save 5-10% on cement cost',
  });
  
  // Block recommendations
  recommendations.push({
    category: 'Materials',
    priority: 'Medium',
    title: 'Use AAC Blocks Instead of Clay Bricks',
    description: 'AAC blocks are 50% lighter than traditional clay bricks, reducing foundation load and transport emissions. They also provide better thermal insulation.',
    impact: 'Better thermal comfort + 30% less transport emissions',
    carbonReduction: Math.round(totalArea * 0.5),
    costImpact: 'Similar cost, faster construction',
  });
  
  // Steel optimization
  recommendations.push({
    category: 'Structural',
    priority: 'High',
    title: 'Optimize Steel Reinforcement',
    description: 'Using Fe500D steel allows for 15% less steel consumption compared to Fe415 while maintaining structural integrity per IS 456:2000.',
    impact: 'Reduce steel by 15%',
    carbonReduction: Math.round(carbonTotal * 0.1),
    costImpact: 'Save Rs ' + Math.round(totalArea * 50),
  });
  
  // Water conservation
  if (!bp.hasRainwaterHarvesting) {
    recommendations.push({
      category: 'Sustainability',
      priority: 'High',
      title: 'Add Rainwater Harvesting System',
      description: 'Rainwater harvesting is mandatory in Kerala for buildings >100 sq.m plot area. It also provides 10 GRIHA points.',
      impact: '10 GRIHA points + water savings',
      carbonReduction: 0,
      costImpact: 'Investment: Rs 25,000-50,000',
    });
  }
  
  // Solar water heater
  if (!bp.hasSolarWaterHeater) {
    recommendations.push({
      category: 'Sustainability',
      priority: 'Medium',
      title: 'Install Solar Water Heater',
      description: 'Solar water heaters save electricity and provide 10 GRIHA points. ROI is typically 3-4 years.',
      impact: '10 GRIHA points + 60% water heating savings',
      carbonReduction: Math.round(totalArea * 0.2),
      costImpact: 'Investment: Rs 30,000-60,000',
    });
  }
  
  // Sustainable priority
  if (bp.sustainabilityPriority !== 'high') {
    recommendations.push({
      category: 'Sustainability',
      priority: 'Low',
      title: 'Increase Sustainability Priority',
      description: 'Setting sustainability priority to "High" unlocks additional GRIHA points and improves overall green building rating.',
      impact: 'Additional GRIHA points',
      carbonReduction: 0,
      costImpact: 'No additional cost',
    });
  }
  
  // Cost optimization for large projects
  if (totalArea > 500) {
    recommendations.push({
      category: 'Cost',
      priority: 'Medium',
      title: 'Bulk Purchase Materials',
      description: 'For projects above 500 sq.m, negotiate bulk discounts with suppliers. Cement and steel typically offer 5-10% bulk discounts.',
      impact: 'Save 5-10% on material costs',
      carbonReduction: 0,
      costImpact: 'Save Rs ' + Math.round(boqTotal * 0.05),
    });
  }
  
  return recommendations;
}

/**
 * Expert system for construction advice
 */
function generateExpertResponse(question, project, boq, carbon) {
  const q = question.toLowerCase().trim();
  const bp = project?.buildingParams || {};
  
  const builtUpArea = bp.builtUpArea || 0;
  const numFloors = bp.numFloors || 1;
  const totalArea = builtUpArea * numFloors;
  
  // Greeting
  if (['hi', 'hello', 'hey', 'namaste'].some(g => q.includes(g))) {
    return `Namaste! I'm your EcoBuild construction assistant.

Your project: ${project?.name || 'Not configured'}
Size: ${totalArea} sq.m across ${numFloors} floors

I can help with:
- Material selection and optimization
- Cost estimation and savings
- Sustainability ratings (GRIHA/IGBC/LEED)
- Structural design and IS codes
- Kerala building regulations

What would you like to know?`;
  }
  
  // GRIHA/Sustainability
  if (q.includes('griha') || q.includes('sustainab') || q.includes('green building')) {
    const score = calculateGRIHAScore(bp);
    return `GRIHA Rating for your project:

YOUR PROJECT: ${project?.name || 'Unnamed'}
Size: ${totalArea} sq.m
Current Score: ${score}/100

GRIHA RATING LEVELS:
- 1-Star: 36-45 points
- 2-Star: 46-54 points
- 3-Star: 55-64 points (Good)
- 4-Star: 65-74 points (Very Good)
- 5-Star: 75-100 points (Excellent)

YOUR CURRENT FEATURES:
- Rainwater Harvesting: ${bp.hasRainwaterHarvesting ? 'Yes (+10 pts)' : 'No'}
- Solar Water Heater: ${bp.hasSolarWaterHeater ? 'Yes (+10 pts)' : 'No'}
- STP: ${bp.hasSTP ? 'Yes (+8 pts)' : 'No'}

TO IMPROVE YOUR SCORE:
1. Add Rainwater Harvesting: +10 points
2. Add Solar Water Heater: +10 points
3. Add STP: +8 points
4. Set priority to High: +5 points

With these additions, your score could reach ${score + 33}/100.`;
  }
  
  // Carbon/Environment
  if (q.includes('carbon') || q.includes('co2') || q.includes('environment') || q.includes('emission')) {
    const carbonTotal = carbon?.total || 0;
    return `Carbon Footprint Analysis:

YOUR PROJECT: ${project?.name || 'Unnamed'}
Total Embodied Carbon: ${(carbonTotal / 1000).toFixed(1)} tonnes CO2

MAJOR CARBON CONTRIBUTORS:
1. Cement: ~45% of total (OPC = 0.93 kg CO2/kg)
2. Steel: ~35% of total (Fe500 = 2.5 kg CO2/kg)
3. Aggregates: ~10% of total
4. Blocks: ~5% of total
5. Transport: ~5% of total

REDUCTION STRATEGIES:
- Use PPC cement: 35% less carbon
- Use Fe500D steel: allows 15% reduction
- Use AAC blocks: 30% lighter
- Use M-sand instead of river sand
- Local materials: reduce transport emissions

These changes can reduce your carbon footprint by 20-30%.`;
  }
  
  // Materials
  if (q.includes('material') || q.includes('cement') || q.includes('steel') || q.includes('brick')) {
    return `Material Recommendations for Kerala Climate:

CEMENT:
- PPC (Fly Ash): Rs 370/bag - RECOMMENDED
  • 35% less carbon than OPC
  • Better durability in humid climate
  • IS 1489 compliant

- OPC 53: Rs 420/bag
  • Higher strength
  • More carbon intensive

STEEL:
- Fe 500 TMT: Rs 72/kg - STANDARD
  • IS 1786 compliant
  • Good ductility
  • IS 456 recommends 0.8% for columns

- Fe 500D: Rs 75/kg - BETTER
  • Higher elongation
  • Better for seismic zones

BLOCKS:
- AAC Blocks: Rs 78/nos - RECOMMENDED
  • 50% lighter than clay bricks
  • Better thermal insulation
  • Faster construction

- Fly Ash Bricks: Rs 10/nos
  • Eco-friendly (60% fly ash)
  • Lower embodied carbon

SAND:
- M-Sand: Rs 58/cft - RECOMMENDED
  • Manufactured (consistent quality)
  • No environmental issues
  • IS 383 compliant`;
  }
  
  // Cost/Budget
  if (q.includes('cost') || q.includes('budget') || q.includes('price') || q.includes('estimate') || q.includes('expensive')) {
    const baseCost = totalArea * 16000;
    return `Cost Estimate for your project:

PROJECT: ${project?.name || 'Unnamed'}
Area: ${totalArea} sq.m (${numFloors} floors)
Location: ${project?.location?.district || 'Kerala'}

BREAKDOWN (Kerala 2026):
- Structure (RCC): Rs ${Math.round(baseCost * 0.35).toLocaleString()}
- Masonry: Rs ${Math.round(baseCost * 0.15).toLocaleString()}
- Finishes: Rs ${Math.round(baseCost * 0.25).toLocaleString()}
- Doors/Windows: Rs ${Math.round(baseCost * 0.10).toLocaleString()}
- Electrical: Rs ${Math.round(baseCost * 0.08).toLocaleString()}
- Plumbing: Rs ${Math.round(baseCost * 0.07).toLocaleString()}
────────────────────────
TOTAL: Rs ${Math.round(baseCost).toLocaleString()}

Per sq.m: Rs 16,000

SAVINGS TIPS:
1. Use PPC cement: 5-10% cheaper
2. Use AAC blocks: faster construction
3. Bulk purchase: 5-8% discount
4. Standardize sizes: reduces wastage`;
  }
  
  // Structural
  if (q.includes('structural') || q.includes('column') || q.includes('beam') || q.includes('foundation') || q.includes('is 456') || q.includes('design')) {
    return `Structural Design Information:

YOUR PROJECT: ${project?.name || 'Unnamed'}
Area: ${totalArea} sq.m, Floors: ${numFloors}

MATERIAL REQUIREMENTS:
- Cement: ${Math.round(totalArea * 4.5)} bags
- Steel: ${Math.round(totalArea * 70)} kg
- Sand: ${Math.round(totalArea * 0.03 * 35.31)} cft
- Aggregate: ${Math.round(totalArea * 0.05 * 35.31)} cft

TYPICAL MEMBER SIZES:
- Slab: 125-150mm thick
- Beam: 230x450mm
- Column: 230x300mm
- Footing: 1.0-1.5m depth

IS CODES:
- IS 456:2000 - Concrete design
- IS 1893:2016 - Seismic (Kerala: Zone III)
- IS 875 - Loads
- IS 10262:2019 - Mix design

The BoQ calculator uses these standards to generate accurate material quantities.`;
  }
  
  // Default
  return `I can help you with:

- Sustainability ratings (GRIHA, IGBC, LEED)
- Material recommendations for Kerala climate
- Cost estimation and budget planning
- Structural design and IS codes
- Building regulations

Try asking:
"How can I improve my sustainability score?"
"What materials should I use?"
"What's the estimated cost?"
"Explain GRIHA ratings"

Or check the Reports section for detailed analysis.`;
}

/**
 * Calculate GRIHA score based on project parameters
 */
function calculateGRIHAScore(bp) {
  if (!bp) return 0;
  let score = 15; // Base
  if (bp.hasRainwaterHarvesting) score += 10;
  if (bp.hasSolarWaterHeater) score += 10;
  if (bp.hasSTP) score += 8;
  if (bp.sustainabilityPriority === 'high') score += 12;
  else if (bp.sustainabilityPriority === 'medium') score += 7;
  return Math.min(100, score);
}

export default generateAIResponse;

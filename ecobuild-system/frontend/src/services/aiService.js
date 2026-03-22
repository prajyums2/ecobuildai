// EcoBuild AI Service
// Uses Gemini API for intelligent responses with local fallback

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent';

/**
 * Generate AI response - tries Gemini first, falls back to local expert system
 */
export async function generateAIResponse(question, project, chatHistory = [], boqData = null, carbonData = null) {
  try {
    const response = await callGeminiAPI(question, project, chatHistory, boqData, carbonData);
    return response;
  } catch (error) {
    console.warn('Gemini API unavailable, using local expert system:', error.message);
    return generateExpertResponse(question, project, boqData, carbonData);
  }
}

/**
 * Call Gemini API for intelligent responses
 */
async function callGeminiAPI(question, project, chatHistory, boq, carbon) {
  if (!GEMINI_API_KEY) {
    throw new Error('No Gemini API key configured');
  }

  const bp = project?.buildingParams || {};
  const materials = project?.materialSelections || {};
  
  // Build project context for the AI
  const context = `
PROJECT: ${project?.name || 'Unnamed'}
Location: ${project?.location?.district || 'Kerala'}, India
Building Type: ${bp.buildingType || 'residential'}
Plot Area: ${bp.plotArea || 0} sq.m
Built-up Area: ${bp.builtUpArea || 0} sq.m
Floors: ${bp.numFloors || 1}
Height: ${bp.height || 0} m
FAR: ${bp.plotArea > 0 ? (bp.builtUpArea / bp.plotArea).toFixed(2) : 0}
Rainwater Harvesting: ${bp.hasRainwaterHarvesting ? 'Yes' : 'No'}
Solar Water Heater: ${bp.hasSolarWaterHeater ? 'Yes' : 'No'}
STP: ${bp.hasSTP ? 'Yes' : 'No'}
Sustainability Priority: ${bp.sustainabilityPriority || 'medium'}
Materials Selected: ${Object.keys(materials).length > 0 ? Object.entries(materials).map(([k, v]) => v.name || k).join(', ') : 'None'}
Budget: ${bp.totalBudget > 0 ? `Rs ${bp.totalBudget} Lakhs` : 'Not specified'}
`.trim();

  // Build conversation history
  const historyText = chatHistory.length > 0
    ? chatHistory.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.substring(0, 300)}`).join('\n')
    : '';

  const systemPrompt = `You are EcoBuild AI, an expert sustainable construction assistant for Kerala, India. You have deep knowledge of:
- Indian Building Regulations and Standards
- IS Codes (IS 456, IS 875, IS 1893, IS 10262)
- Sustainable construction materials and practices
- Cost estimation for Kerala market (2024 rates)
- GRIHA, IGBC, LEED green building rating systems
- Foundation design for lateritic soils
- Concrete mix design per IS standards

Personality: Professional, practical, concise. Give specific, actionable advice with numbers where possible.

CURRENT PROJECT:
${context}

${historyText ? `RECENT CONVERSATION:\n${historyText}\n` : ''}

USER QUESTION: ${question}

Respond in plain text (no markdown). Be specific and helpful.`;

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: systemPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
        topP: 0.9,
        topK: 40
      }
    })
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
    return data.candidates[0].content.parts[0].text;
  }
  
  throw new Error('Invalid response format');
}

/**
 * Local expert system for construction advice (fallback)
 */
function generateExpertResponse(question, project, boq, carbon) {
  const q = question.toLowerCase().trim();
  const bp = project?.buildingParams || {};
  const materials = project?.materialSelections || {};
  
  const builtUpArea = bp.builtUpArea || 0;
  const plotArea = bp.plotArea || 1;
  const numFloors = bp.numFloors || 1;
  const totalArea = builtUpArea * numFloors;
  const far = plotArea > 0 ? (builtUpArea / plotArea).toFixed(2) : 0;
  
  // GRIHA
  if (q.includes('griha') && (q.includes('what') || q.includes('explain') || q.includes('rating'))) {
    return `GRIHA (Green Rating for Integrated Habitat Assessment) is India's green building rating system.

RATING LEVELS:
1-Star: 36-45 points
2-Star: 46-54 points
3-Star: 55-64 points (Good)
4-Star: 65-74 points (Very Good)
5-Star: 75-100 points (Excellent)

YOUR PROJECT: ${calculateGRIHA(bp)} points

GRIHA has 34 criteria covering:
- Site & Planning (15 pts)
- Water Efficiency (10 pts)
- Energy Performance (20 pts)
- Materials & Resources (15 pts)
- Indoor Environment (5 pts)

For GRIHA certification, minimum 51 points required. Your project can improve by adding rainwater harvesting, solar water heater, and STP.`;
  }
  
  // Sustainability improvement
  if (q.includes('sustainab') || q.includes('improve') || q.includes('better')) {
    const currentScore = calculateGRIHA(bp);
    return `For your ${totalArea} sq.m project, here's how to improve sustainability:

CURRENT: ${currentScore}/100 points

RECOMMENDATIONS:
1. Install Rainwater Harvesting: +10 points
2. Add Solar Water Heater: +10 points
3. Install STP: +8 points
4. Use AAC blocks instead of bricks: lower carbon
5. Use PPC cement instead of OPC: 35% less carbon
6. Set sustainability priority to High: +7 points

Potential score: ${currentScore + 25} points

These changes can get you GRIHA 3-Star certification.`;
  }
  
  // Carbon
  if (q.includes('carbon') || q.includes('emission') || q.includes('environment')) {
    return `Carbon footprint analysis for ${totalArea} sq.m project:

MAJOR CONTRIBUTORS:
- Cement: ~900 kg CO2/tonne (OPC 53)
- Steel: ~2,500 kg CO2/tonne (TMT bars)
- Bricks: ~220 kg CO2/thousand

YOUR ESTIMATE: ~${Math.round(totalArea * 50)} kg CO2

REDUCTION STRATEGIES:
1. Use PPC cement: 35% less carbon
2. Use AAC blocks: 30% lighter
3. Use recycled aggregate: 50% reduction
4. Optimize steel design: right-size per IS 456

IS Code References:
- IS 15658:2022 for carbon rating
- IS 16727 for sustainability of concrete`;
  }
  
  // Materials
  if (q.includes('material') || q.includes('cement') || q.includes('steel') || q.includes('brick')) {
    return `Material recommendations for Kerala climate:

CEMENT:
- PPC (Fly Ash): Rs 365/bag - RECOMMENDED
- OPC 53: Rs 390/bag
- PSC (Slag): Rs 370/bag

STEEL:
- Fe 500 D TMT: Rs 72/kg - Standard

BLOCKS:
- AAC 600x200x200: Rs 45-55 - RECOMMENDED
- Solid Concrete: Rs 32/block
- Clay Bricks: Rs 8-12/piece

SAND:
- M-Sand: Rs 48/cft - RECOMMENDED
- River Sand: Rs 55/cft

For your project, estimated materials:
- Cement: ${Math.round(totalArea * 4.5)} bags
- Steel: ${Math.round(totalArea * 70)} kg
- Blocks: ${Math.round(totalArea * 50)} nos`;
  }
  
  // Cost
  if (q.includes('cost') || q.includes('budget') || q.includes('price') || q.includes('estimate')) {
    const baseCost = totalArea * 16000;
    return `Cost estimate for ${totalArea} sq.m project (Kerala 2024):

BREAKDOWN:
- Structure (RCC): Rs ${Math.round(baseCost * 0.35).toLocaleString()}
- Masonry: Rs ${Math.round(baseCost * 0.15).toLocaleString()}
- Finishes: Rs ${Math.round(baseCost * 0.25).toLocaleString()}
- Doors/Windows: Rs ${Math.round(baseCost * 0.10).toLocaleString()}
- Electrical: Rs ${Math.round(baseCost * 0.08).toLocaleString()}
- Plumbing: Rs ${Math.round(baseCost * 0.07).toLocaleString()}
-----------------------------------------
TOTAL: Rs ${Math.round(baseCost).toLocaleString()}

Per sq.m: Rs 16,000

SAVINGS TIPS:
- PPC cement: 5-10% cheaper
- AAC blocks: faster construction
- Standardize sizes: reduces wastage`;
  }
  
  // Structural/IS codes
  if (q.includes('structural') || q.includes('is code') || q.includes('column') || q.includes('beam')) {
    return `Structural design for ${totalArea} sq.m:

MATERIALS NEEDED:
- Cement: ${Math.round(totalArea * 4.5)} bags
- Steel: ${Math.round(totalArea * 70)} kg
- Sand: ${Math.round(totalArea * 0.03 * 35.31)} cft
- Aggregate: ${Math.round(totalArea * 0.05 * 35.31)} cft

KEY IS CODES:
- IS 456:2000 - Concrete design
- IS 1893:2016 - Seismic (Kerala: Zone III)
- IS 875 - Loads
- IS 10262:2019 - Mix design

TYPICAL DIMENSIONS:
- Slab: 125-150mm
- Beam: 230x450mm
- Column: 230x300mm
- Footing: 1.0-1.5m depth`;
  }
  
  // Foundation
  if (q.includes('foundation') || q.includes('footing') || q.includes('soil')) {
    return `Foundation design for ${numFloors}-storey building:

KERALA SOIL: Lateritic (Good for foundations)
SBC: 150-200 kN/sq.m

RECOMMENDED: ${numFloors <= 2 ? 'Isolated Footings' : 'Raft Foundation'}
Depth: 1.0-1.5m below ground
PCC: 1:4:8 grade, 100mm thick

Your building loads: ~${Math.round(totalArea * 15)} tonnes

For detailed foundation design, use Structural Design section.`;
  }
  
  // Water
  if (q.includes('water') || q.includes('rainwater') || q.includes('harvest')) {
    const tankCap = Math.round(builtUpArea * 0.008 * 1000);
    return `Rainwater Harvesting for your project:

ROOF AREA: ${builtUpArea} sq.m
TANK CAPACITY: ${tankCap} liters minimum
RECHARGE PITS: ${Math.ceil(plotArea / 50)} recommended

BENEFITS:
- Mandatory in Kerala for new buildings
- 10 GRIHA points
- Reduces water bills

WATER REQUIREMENT: 135 liters/person/day`;
  }
  
  // Greeting
  if (['hi', 'hello', 'hey', 'namaste'].some(g => q.includes(g))) {
    return `Namaste! I'm your EcoBuild construction assistant.

Your project: ${project?.name || 'Not configured'}
${builtUpArea > 0 ? `Size: ${totalArea} sq.m, FAR: ${far}` : 'Configure your project for personalized advice'}

I can help with:
- Material selection and costs
- Sustainability (GRIHA/IGBC/LEED)
- Structural design and IS codes
- Building regulations in Kerala

What would you like to know?`;
  }
  
  // Default
  return `I can help you with:

- Sustainability scores (GRIHA, IGBC, LEED)
- Material recommendations
- Cost estimation
- Structural design (IS codes)
- Foundation design
- Water management

Try asking:
"How can I improve sustainability?"
"What materials should I use?"
"What's the estimated cost?"

Or check the Reports section for detailed analysis.`;
}

/**
 * Calculate GRIHA score
 */
function calculateGRIHA(bp) {
  if (!bp) return 0;
  let score = 15;
  if (bp.hasRainwaterHarvesting) score += 10;
  if (bp.hasSolarWaterHeater) score += 10;
  if (bp.hasSTP) score += 8;
  if (bp.sustainabilityPriority === 'high') score += 12;
  else if (bp.sustainabilityPriority === 'medium') score += 7;
  return Math.min(100, score);
}

/**
 * Generate AI recommendations for the Reports section
 * @param {Object} project - Project data
 * @param {Object} boq - BoQ data
 * @param {Object} carbon - Carbon data
 * @returns {Array} - Array of recommendation objects
 */
export function generateAIRecommendations(project, boq, carbon) {
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
  const grihaScore = calculateGRIHA(bp);
  
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
  
  // Sustainability score improvement
  if (grihaScore < 50) {
    recommendations.push({
      category: 'Sustainability',
      priority: 'High',
      title: 'Improve GRIHA Score',
      description: `Your current GRIHA score is ${grihaScore}/100. Focus on water efficiency and energy performance to reach 3-Star certification.`,
      impact: 'GRIHA 3-Star certification',
      carbonReduction: 0,
      pointValue: 15
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

export default generateAIResponse;

// EcoBuild AI Service - Powered by Puter.js (Free, Unlimited AI)
// Uses puter.ai.chat() for real AI responses with no API key needed

import { puter } from '@heyputer/puter.js';

const AI_MODEL = 'gpt-4.1-nano';

/**
 * Generate AI response using Puter.js
 */
export async function generateAIResponse(question, project, chatHistory = [], boqData = null, carbonData = null) {
  const systemPrompt = buildSystemPrompt(project, boqData, carbonData);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...chatHistory.slice(-10).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    })),
    { role: 'user', content: question }
  ];

  try {
    const response = await puter.ai.chat(messages, { model: AI_MODEL });
    const rawResponse = typeof response === 'string' ? response : response.message?.content || response;
    
    // Validate AI response for IS code compliance and rate bounds
    const { response: cleanedResponse, warnings } = validateAIResponse(rawResponse, { question, project });
    
    // Append warnings if any
    if (warnings.length > 0) {
      return cleanedResponse + '\n\n---\n**AI Validation Notes:**\n' + warnings.join('\n');
    }
    
    return cleanedResponse;
  } catch (error) {
    console.warn('Puter.js AI failed, falling back to local:', error.message);
    return generateFallbackResponse(question, project, boqData, carbonData);
  }
}

/**
 * Generate streaming AI response
 */
export async function generateAIResponseStream(question, project, chatHistory = [], onChunk) {
  const systemPrompt = buildSystemPrompt(project);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...chatHistory.slice(-10).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    })),
    { role: 'user', content: question }
  ];

  try {
    const response = await puter.ai.chat(messages, { model: AI_MODEL, stream: true });
    let fullText = '';
    for await (const part of response) {
      if (part?.text) {
        fullText += part.text;
        if (onChunk) onChunk(part.text, fullText);
      }
    }
    return fullText;
  } catch (error) {
    console.warn('Puter.js streaming failed:', error.message);
    return generateFallbackResponse(question, project);
  }
}

/**
 * Analyze floorplan image using Puter.js vision
 */
export async function analyzeFloorplan(imageDataUrl) {
  const prompt = `You are a civil engineering assistant analyzing an architectural floor plan. Identify and list:

1. All rooms visible (bedrooms, bathrooms, kitchen, living room, etc.)
2. Approximate dimensions of each room in meters (estimate from the drawing scale if visible)
3. Total built-up area estimate in square meters
4. Number of floors (if indicated)
5. Wall thickness estimates
6. Door and window locations

Respond in this exact JSON format:
{
  "rooms": [
    {"name": "Living Room", "length_m": 4.5, "width_m": 3.5, "area_sqm": 15.75},
    ...
  ],
  "total_built_up_sqm": 120,
  "num_floors": 1,
  "wall_thickness_mm": 230,
  "doors": 6,
  "windows": 8,
  "notes": "Any additional observations"
}

If the image is not a floor plan or cannot be analyzed, respond with: {"error": "Could not analyze image", "rooms": []}`;

  try {
    const response = await puter.ai.chat(prompt, imageDataUrl, { model: AI_MODEL });
    const text = typeof response === 'string' ? response : response.message?.content || response;
    return parseFloorplanResponse(text);
  } catch (error) {
    console.warn('Floorplan analysis failed:', error.message);
    return {
      error: 'AI analysis unavailable. Please enter quantities manually.',
      rooms: []
    };
  }
}

/**
 * Generate AI recommendations for Reports page
 */
export async function generateAIRecommendations(project, boq, carbon, materials) {
  const prompt = `You are an expert civil engineer and sustainability consultant for construction in Kerala, India.

Analyze this project and provide specific, actionable recommendations:

PROJECT: ${project?.name || 'Unnamed'}
Location: ${project?.location?.district || 'Kerala'}
Built-up area: ${project?.buildingParams?.builtUpArea || 'N/A'} sqm
Floors: ${project?.buildingParams?.numFloors || 'N/A'}

${boq ? `BOQ TOTAL: Rs ${(boq.summary?.grandTotal || 0).toLocaleString()}
Concrete: ${boq.summary?.concrete || 0} cum
Steel: ${boq.summary?.steel || 0} kg
Blocks: ${boq.summary?.blocks || 0} nos` : ''}

${carbon ? `Embodied Carbon: ${(carbon.total || 0).toLocaleString()} kg CO2` : ''}

${materials ? `Selected Materials: ${materials.map(m => m.name).join(', ')}` : ''}

Provide 5-7 specific recommendations covering:
1. Material alternatives to reduce carbon
2. Cost optimization strategies
3. Structural efficiency improvements
4. Kerala-specific climate considerations
5. Green building certification tips (GRIHA/IGBC/LEED)

Format each recommendation with:
- Title
- Specific action
- Expected impact (cost/carbon savings with numbers)
- Priority (High/Medium/Low)

Keep it concise and practical.`;

  try {
    const response = await puter.ai.chat(prompt, { model: AI_MODEL });
    return typeof response === 'string' ? response : response.message?.content || response;
  } catch (error) {
    console.warn('AI recommendations failed:', error.message);
    return generateFallbackRecommendations(project, boq, carbon);
  }
}

/**
 * Generate AI executive summary for reports
 */
export async function generateExecutiveSummary(project, boq, carbon, sustainability) {
  const prompt = `Write a professional executive summary for this construction project report:

PROJECT: ${project?.name || 'Unnamed'}
Location: ${project?.location?.district || 'Kerala'}, India
Type: ${project?.buildingParams?.buildingType || 'Residential'}
Built-up area: ${project?.buildingParams?.builtUpArea || 'N/A'} sqm
Floors: ${project?.buildingParams?.numFloors || 'N/A'}

${boq ? `Estimated Cost: Rs ${(boq.summary?.grandTotal || 0).toLocaleString()}
Total Concrete: ${boq.summary?.concrete || 0} cum
Total Steel: ${boq.summary?.steel || 0} kg
Total Blocks: ${boq.summary?.blocks || 0} nos` : ''}

${carbon ? `Embodied Carbon: ${(carbon.total || 0).toLocaleString()} kg CO2` : ''}

${sustainability ? `GRIHA Score: ${sustainability.griha || 'N/A'}
IGBC Score: ${sustainability.igbc || 'N/A'}
LEED Score: ${sustainability.leed || 'N/A'}` : ''}

Write a 3-4 paragraph executive summary covering: project overview, key findings, sustainability assessment, and recommendations. Use professional engineering language. Reference relevant IS codes where applicable.`;

  try {
    const response = await puter.ai.chat(prompt, { model: AI_MODEL });
    return typeof response === 'string' ? response : response.message?.content || response;
  } catch (error) {
    console.warn('Executive summary generation failed:', error.message);
    return 'Executive summary generation unavailable. Please review the detailed reports below.';
  }
}

/**
 * Compare material alternatives using AI
 */
export async function compareMaterials(materialA, materialB, criteria) {
  const prompt = `Compare these two construction materials for use in Kerala, India:

Material A: ${materialA?.name || 'N/A'}
- Cost: Rs ${materialA?.financial_properties?.cost_per_unit || 'N/A'} per ${materialA?.financial_properties?.unit_type || 'unit'}
- Embodied Carbon: ${materialA?.environmental_properties?.embodied_carbon || 'N/A'} kg CO2/unit
- Compressive Strength: ${materialA?.physical_properties?.compressive_strength || 'N/A'} MPa
- Recycled Content: ${materialA?.environmental_properties?.recycled_content || 0}%
- Durability: ${materialA?.civil_properties?.durability_years || 'N/A'} years

Material B: ${materialB?.name || 'N/A'}
- Cost: Rs ${materialB?.financial_properties?.cost_per_unit || 'N/A'} per ${materialB?.financial_properties?.unit_type || 'unit'}
- Embodied Carbon: ${materialB?.environmental_properties?.embodied_carbon || 'N/A'} kg CO2/unit
- Compressive Strength: ${materialB?.physical_properties?.compressive_strength || 'N/A'} MPa
- Recycled Content: ${materialB?.environmental_properties?.recycled_content || 0}%
- Durability: ${materialB?.civil_properties?.durability_years || 'N/A'} years

Criteria: ${criteria || 'cost, carbon, durability, strength'}

Provide a detailed comparison with a clear recommendation for Kerala's tropical climate (high rainfall, humidity, seismic Zone III). Include IS code references where relevant.`;

  try {
    const response = await puter.ai.chat(prompt, { model: AI_MODEL });
    return typeof response === 'string' ? response : response.message?.content || response;
  } catch (error) {
    console.warn('Material comparison failed:', error.message);
    return 'Material comparison unavailable.';
  }
}

// ============ AI VALIDATION LAYER ============

// Valid IS codes that AI can reference
const VALID_IS_CODES = [
  'IS 456:2000', 'IS 875', 'IS 875 Part 1:1987', 'IS 875 Part 2:1987',
  'IS 875 Part 3:2015', 'IS 875 Part 5:1987', 'IS 1893:2016', 'IS 13920:2016',
  'IS 800:2007', 'IS 1343:2012', 'IS 12269:2013', 'IS 1489:2015',
  'IS 455:2015', 'IS 8112:2013', 'IS 1786:2008', 'IS 432:1982',
  'IS 383:2016', 'IS 2185:2013', 'IS 1077:1992', 'IS 12894:2010',
  'IS 1905:1987', 'IS 2250:1981', 'IS 2062:2011', 'IS 4926:2003',
  'IS 3620:1979', 'IS 15658:2006', 'IS 15622:2006', 'IS 2619:2003',
  'IS 2645:2003', 'IS 15477:2019', 'IS 15304:2003', 'IS 2202:1994',
  'IS 399:1963', 'IS 710:2019', 'IS 4984:2016', 'IS 3043:2018',
  'IS 1948:1961', 'IS 10262:2019', 'IS 1200', 'IS 1661:1972',
  'IS 2571:1970', 'IS 3861:1966'
];

// Kerala 2026 market rate bounds (min, max) for key materials
const RATE_BOUNDS = {
  cement: { min: 350, max: 450, unit: 'bag' },
  steel: { min: 65, max: 85, unit: 'kg' },
  concrete: { min: 4500, max: 8000, unit: 'cum' },
  sand: { min: 50, max: 100, unit: 'cft' },
  aggregate: { min: 35, max: 55, unit: 'cft' },
  blocks: { min: 10, max: 80, unit: 'nos' },
  bricks: { min: 8, max: 15, unit: 'nos' },
  tiles: { min: 40, max: 180, unit: 'sqft' },
  paint: { min: 200, max: 500, unit: 'liter' },
  waterproofing: { min: 250, max: 500, unit: 'sqm' },
};

/**
 * Validate AI response for IS code compliance and rate bounds
 * Returns cleaned response with warnings if issues found
 */
export function validateAIResponse(response, context = {}) {
  const warnings = [];
  let cleaned = response;

  // Check for invalid IS codes
  const isCodeRegex = /IS\s+\d{4}[:\d]*/gi;
  const foundCodes = cleaned.match(isCodeRegex) || [];
  foundCodes.forEach(code => {
    const normalized = code.replace(/\s+/g, ' ').trim();
    const isValid = VALID_IS_CODES.some(valid => valid.startsWith(normalized) || normalized.startsWith(valid));
    if (!isValid) {
      warnings.push(`⚠️ IS code "${code}" may be incorrect. Verify against IS code database.`);
      cleaned = cleaned.replace(code, `${code} [VERIFY]`);
    }
  });

  // Check for LEED references (removed from scope)
  if (cleaned.toLowerCase().includes('leed')) {
    warnings.push('⚠️ LEED rating system is not used in this project. Use GRIHA or IGBC instead.');
    cleaned = cleaned.replace(/LEED/gi, 'GRIHA/IGBC');
  }

  // Check rate bounds if rates are mentioned
  const rateRegex = /₹?\s*([\d,]+)\s*\/\s*(bag|kg|cum|cft|nos|sqft|sqm|liter)/gi;
  let match;
  while ((match = rateRegex.exec(cleaned)) !== null) {
    const rate = parseFloat(match[1].replace(/,/g, ''));
    const unit = match[2].toLowerCase();
    
    for (const [category, bounds] of Object.entries(RATE_BOUNDS)) {
      if (unit === bounds.unit && (rate < bounds.min * 0.5 || rate > bounds.max * 2)) {
        warnings.push(`⚠️ Rate ₹${rate}/${unit} seems outside normal range (₹${bounds.min}-₹${bounds.max}/${unit})`);
      }
    }
  }

  return { response: cleaned, warnings };
}

// ============ HELPER FUNCTIONS ============

function buildSystemPrompt(project, boqData, carbonData) {
  const projectInfo = project ? `
Project: ${project.name || 'Unnamed'}
Location: ${project.location?.district || 'Kerala'}
Built-up area: ${project.buildingParams?.builtUpArea || 'N/A'} sqm
Floors: ${project.buildingParams?.numFloors || 'N/A'}
Building type: ${project.buildingParams?.buildingType || 'Residential'}
` : 'No project configured yet.';

  return `You are EcoBuild AI, an expert civil engineering assistant for sustainable construction in Kerala, India.

Your expertise includes ALL these Indian Standards:

STRUCTURAL:
- IS 456:2000 - Plain and Reinforced Concrete (min grades, reinforcement, cover)
- IS 875 Part 1:1987 - Dead Loads (unit weights for materials)
- IS 875 Part 2:1987 - Imposed/Live Loads (occupancy types)
- IS 875 Part 3:2015 - Wind Loads (wind speeds, pressure coefficients)
- IS 1893:2016 - Earthquake Resistant Design (zone factors, response spectra)
- IS 13920:2016 - Ductile Detailing of RCC (hoops, confinement zones)
- IS 800:2007 - General Construction in Steel
- IS 1343:2012 - Prestressed Concrete

MATERIALS:
- IS 12269:2013 - OPC 53 Grade Cement
- IS 1489:2015 - PPC Fly Ash Cement
- IS 455:2015 - Portland Slag Cement
- IS 8112:2013 - OPC 43 Grade Cement
- IS 1786:2008 - High Strength Deformed Steel Bars (Fe415, Fe500, Fe550)
- IS 432:1982 - Mild Steel Bars for RCC
- IS 383:2016 - Coarse and Fine Aggregate
- IS 2185:2013 - Concrete Masonry Units (AAC, solid, hollow blocks)
- IS 1077:1992 - Burnt Clay Bricks
- IS 12894:2010 - Fly Ash Bricks
- IS 1905:1987 - Code of Practice for Masonry
- IS 2250:1981 - Masonry Mortar
- IS 2062:2011 - Structural Steel Plates
- IS 4926:2003 - Ready Mixed Concrete
- IS 3620:1979 - Laterite Stone
- IS 15658:2006 - Pre-cast Concrete Blocks

FINISHING & OTHERS:
- IS 15622:2006 - Ceramic/Vitrified Tiles
- IS 2619:2003 - Emulsion Paints
- IS 2645:2003 - Waterproofing Compounds
- IS 15477:2019 - Tile Adhesives
- IS 15304:2003 - Bituminous Membranes
- IS 2202:1994 - Flush Doors
- IS 399:1963 - Teak Wood
- IS 710:2019 - Marine Plywood
- IS 4984:2016 - HDPE Water Supply Pipes
- IS 3043:2018 - Earthing/Grounding
- IS 1948:1961 - Bamboo Products

Green Building: GRIHA v3.1, IGBC (India only - no LEED)
Kerala-specific: Laterite soil, high rainfall (2800mm/year), coastal exposure, Seismic Zone III

CRITICAL RULES:
1. NEVER invent IS code numbers - only use codes listed above
2. NEVER suggest rates outside ±25% of Kerala 2026 market rates
3. NEVER remove safety-critical items (cover blocks, binding wire, waterproofing)
4. NEVER change IS code minimum requirements
5. Always suggest PPC/PSC cement over OPC for Kerala (lower carbon, better durability)
6. Seismic Zone III requires minimum Fe415D steel, M20 concrete
7. For coastal areas, use PSC cement (IS 455) for corrosion resistance

Current project context:
${projectInfo}

${boqData ? `BoQ Summary: Total Rs ${(boqData.summary?.grandTotal || 0).toLocaleString()}` : ''}
${carbonData ? `Carbon: ${(carbonData.total || 0).toLocaleString()} kg CO2` : ''}

Guidelines:
- Always reference relevant IS codes when discussing structural matters
- Provide specific numbers and calculations when possible
- Consider Kerala's tropical climate in all recommendations
- Prioritize sustainable and eco-friendly options
- Be concise but thorough
- If unsure, acknowledge limitations and suggest consulting a licensed structural engineer`;
}

function parseFloorplanResponse(text) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.warn('Failed to parse floorplan JSON:', e);
  }
  return { error: 'Could not parse AI response', rooms: [], raw: text };
}

function generateFallbackResponse(question, project, boqData, carbonData) {
  const q = question.toLowerCase();
  if (q.includes('griha') || q.includes('sustainab') || q.includes('green')) {
    return 'For GRIHA certification, focus on: rainwater harvesting (+10 pts), solar water heater (+10 pts), energy efficiency (+28 pts max), and sustainable materials (+28 pts max). Kerala\'s climate is ideal for passive cooling strategies.';
  }
  if (q.includes('carbon') || q.includes('co2')) {
    return 'Embodied carbon in construction comes primarily from cement (~45%) and steel (~35%). Use PPC cement (35% less carbon than OPC), Fe500D steel (allows 15% reduction), and AAC blocks for significant carbon savings.';
  }
  if (q.includes('cost') || q.includes('budget')) {
    return 'Typical construction cost in Kerala (2026): Rs 1,600-2,200/sqft for residential. Use bulk purchasing (5-10% savings), PPC cement (5% cheaper), and standardized dimensions to reduce costs.';
  }
  return 'I can help with material selection, cost estimation, sustainability ratings, structural design, and Kerala building regulations. What would you like to know?';
}

function generateFallbackRecommendations(project, boq, carbon) {
  return `**Material Recommendations:**
1. **Use PPC Cement** - 35% lower embodied carbon than OPC, better durability in Kerala's humid climate
2. **AAC Blocks over Clay Bricks** - 50% lighter, better thermal insulation, faster construction
3. **Fe500D Steel** - Higher ductility for seismic Zone III, allows 15% less steel consumption

**Cost Optimization:**
- Bulk purchase cement and steel for 5-10% discount
- Use M-sand instead of river sand (Rs 58 vs Rs 85/cft)
- Standardize room dimensions to reduce material wastage

**Sustainability:**
- Add rainwater harvesting (mandatory in Kerala, +10 GRIHA points)
- Install solar water heater (+10 GRIHA points, 3-4 year ROI)
- Use fly ash concrete for 20% carbon reduction`;
}

export default {
  generateAIResponse,
  generateAIResponseStream,
  analyzeFloorplan,
  generateAIRecommendations,
  generateExecutiveSummary,
  compareMaterials
};

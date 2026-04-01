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
    return typeof response === 'string' ? response : response.message?.content || response;
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

Your expertise includes:
- Indian Standards: IS 456:2000 (RCC), IS 875 (Loads), IS 1893:2016 (Seismic), IS 10262:2019 (Mix Design)
- Green Building: GRIHA, IGBC, LEED rating systems
- Kerala-specific: Laterite soil, high rainfall (2800mm/year), coastal exposure, Seismic Zone III
- Material optimization using AHP (Analytical Hierarchy Process)
- Cost estimation with Kerala market rates (2026)
- Bill of Quantities (BoQ) preparation
- Sustainability metrics: embodied carbon, recycled content, lifecycle assessment

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

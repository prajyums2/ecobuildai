// AI BoQ Intelligence Service - Puter.js powered
// Validates quantities, suggests rates, and optimizes BoQ

import { puter } from '@heyputer/puter.js';
import { validateAIResponse } from './aiService';

const AI_MODEL = 'gemini-2.0-flash';

/**
 * AI Quantity Validator
 * Reviews calculated quantities and flags anomalies
 */
export async function validateBoQQuantities(project, boq) {
  const prompt = `You are an expert quantity surveyor reviewing a BoQ for a building in Kerala, India.

PROJECT:
- Location: ${project?.location?.district || 'Thrissur'}, Kerala
- Built-up area: ${project?.buildingParams?.builtUpArea || 0} sqm per floor
- Floors: ${project?.buildingParams?.numFloors || 1}
- Total area: ${(project?.buildingParams?.builtUpArea || 0) * (project?.buildingParams?.numFloors || 1)} sqm
- Soil: ${project?.geotechnical?.soilType || 'laterite'}
- Seismic zone: ${project?.buildingParams?.seismicZone || 'III'}

BOQ CATEGORIES:
${boq?.categories?.map(c => `- ${c.name}: ${c.items?.length || 0} items, Subtotal: Rs ${(c.subTotal || 0).toLocaleString()}`).join('\n')}

KEY QUANTITIES:
${boq?.categories?.flatMap(c => c.items?.map(i => `- ${i.description.substring(0, 60)}: ${i.quantity} ${i.unit}`).filter(Boolean) || []).slice(0, 30).join('\n')}

Review these quantities against Kerala construction norms (IS 1200, IS 456). Check:
1. Are concrete volumes reasonable for the building size?
2. Is steel quantity appropriate (typically 40-80 kg/sqm for residential)?
3. Are block quantities correct (typically 8-13 nos/sqm wall area)?
4. Any quantities that seem significantly over or under-estimated?

Respond with ONLY valid JSON:
{
  "validations": [
    {"category": "Concrete Work", "status": "ok|warning|error", "message": "Brief explanation"},
    ...
  ],
  "steelRatio": "calculated kg/sqm",
  "steelAssessment": "appropriate|low|high",
  "concreteRatio": "calculated cum/sqm",
  "concreteAssessment": "appropriate|low|high",
  "overallAssessment": "The quantities appear reasonable/overestimated/underestimated because..."
}`;

  try {
    const response = await puter.ai.chat(prompt, { model: AI_MODEL });
    const text = typeof response === 'string' ? response : response.message?.content || response;
    return parseJSON(text);
  } catch (error) {
    console.warn('AI quantity validation failed:', error.message);
    return {
      validations: [],
      overallAssessment: 'AI validation unavailable. Quantities calculated using IS code ratios.',
    };
  }
}

/**
 * AI Rate Intelligence
 * Suggests rates based on location, materials, and market conditions
 */
export async function getAIRates(project, materialSelections) {
  const prompt = `You are a construction cost estimator for Kerala, India (2026). Provide current market rates for the following materials.

LOCATION: ${project?.location?.district || 'Thrissur'}, Kerala
MATERIALS SELECTED:
${Object.entries(materialSelections || {}).map(([cat, mat]) => `- ${cat}: ${mat?.name || 'N/A'} @ Rs${mat?.rate || '?'}/${mat?.unit || '?'}`).join('\n') || 'No materials selected'}

For each selected material, confirm if the rate is:
- ACCURATE (within 10% of current market rate)
- HIGH (above market rate)
- LOW (below market rate)

Also suggest rates for these non-selected categories:
- Formwork (plywood/steel shuttering)
- Painting (interior emulsion, exterior weatherproof)
- Flooring (vitrified tiles, ceramic tiles, granite)
- Plumbing (CPVC pipes, UPVC pipes, sanitary fixtures)
- Electrical (wires, conduits, switches, DB)
- Doors (teak, flush, PVC, UPVC windows)
- Waterproofing

Respond with ONLY valid JSON:
{
  "selectedMaterials": {
    "cement": {"rate": 370, "unit": "bag", "assessment": "accurate|high|low", "marketRate": 380},
    ...
  },
  "otherCategories": {
    "formwork": {"rate": 580, "unit": "sqm"},
    "painting": {"rate": 305, "unit": "liter"},
    "flooring": {"rate": 140, "unit": "sqft"},
    "plumbing": {"rate": 135, "unit": "m"},
    "electrical": {"rate": 70, "unit": "m"},
    "doors": {"rate": 25000, "unit": "nos"},
    "waterproofing": {"rate": 385, "unit": "sqm"}
  },
  "notes": "Any market observations or rate adjustment suggestions"
}`;

  try {
    const response = await puter.ai.chat(prompt, { model: AI_MODEL });
    const text = typeof response === 'string' ? response : response.message?.content || response;
    return parseJSON(text);
  } catch (error) {
    console.warn('AI rate intelligence failed:', error.message);
    return null;
  }
}

/**
 * AI BoQ Optimization Report
 * Analyzes the complete BoQ and suggests savings
 */
export async function optimizeBoQ(project, boq, materialSelections) {
  const prompt = `You are an expert construction cost consultant analyzing a BoQ for a project in Kerala, India.

PROJECT: ${project?.name || 'Unnamed'}
Location: ${project?.location?.district || 'Thrissur'}, Kerala
Built-up: ${project?.buildingParams?.builtUpArea || 0} sqm × ${project?.buildingParams?.numFloors || 1} floors = ${(project?.buildingParams?.builtUpArea || 0) * (project?.buildingParams?.numFloors || 1)} sqm total

SELECTED MATERIALS:
${Object.entries(materialSelections || {}).map(([k, v]) => `- ${k}: ${v?.name} @ Rs${v?.rate}/${v?.unit}`).join('\n') || 'None selected'}

BOQ SUMMARY:
${boq?.categories?.map(c => `- ${c.name}: Rs ${(c.subTotal || 0).toLocaleString()}`).join('\n')}
Sub-Total: Rs ${(boq?.summary?.subTotal || 0).toLocaleString()}
Grand Total: Rs ${(boq?.summary?.grandTotal || 0).toLocaleString()}

Analyze and provide:
1. Cost per sqm assessment (is it within Kerala norms?)
2. Top 5 cost optimization opportunities with specific savings
3. Material alternatives that could reduce cost
4. Sustainability improvements (carbon reduction)
5. Bulk purchase recommendations
6. Any over-designed elements that could be value-engineered

Respond with ONLY valid JSON:
{
  "costPerSqm": 8619,
  "costAssessment": "within|above|below Kerala norms (typically Rs 1,600-2,200/sqft for residential)",
  "optimizations": [
    {
      "title": "Specific suggestion",
      "category": "Which BoQ category",
      "currentCost": 0,
      "potentialSavings": 0,
      "savingsPercent": 0,
      "description": "How to implement",
      "priority": "high|medium|low"
    }
  ],
  "totalPotentialSavings": 0,
  "sustainabilityTips": ["tip 1", "tip 2"],
  "summary": "Overall assessment paragraph"
}`;

  try {
    const response = await puter.ai.chat(prompt, { model: AI_MODEL });
    const text = typeof response === 'string' ? response : response.message?.content || response;
    return parseJSON(text);
  } catch (error) {
    console.warn('AI BoQ optimization failed:', error.message);
    return null;
  }
}

/**
 * AI Item Description Generator
 * Generates contextual item descriptions for BoQ
 */
export async function generateItemDescription(item, project, materialSelections) {
  const prompt = `Generate a professional BoQ item description for construction in Kerala, India.

ITEM: ${item?.description || ''}
QUANTITY: ${item?.quantity} ${item?.unit}
RATE: Rs ${item?.rate}/${item?.unit}

PROJECT CONTEXT:
- Location: ${project?.location?.district || 'Thrissur'}, Kerala
- Materials: ${Object.values(materialSelections || {}).map(m => m?.name).filter(Boolean).join(', ') || 'Standard'}
- Climate: Tropical monsoon (2800mm annual rainfall)
- Seismic: Zone III

Generate a description that:
1. References the specific materials used
2. Mentions relevant IS codes
3. Includes Kerala-specific considerations (monsoon, laterite soil, humidity)
4. Is professional and suitable for a tender document

Keep it concise (2-3 lines max).`;

  try {
    const response = await puter.ai.chat(prompt, { model: AI_MODEL });
    return typeof response === 'string' ? response : response.message?.content || response;
  } catch (error) {
    return item?.description || '';
  }
}

/**
 * Parse JSON from AI response
 */
function parseJSON(text) {
  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[1].trim()); } catch {}
    }
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try { return JSON.parse(objMatch[0]); } catch {}
    }
    return null;
  }
}

export default {
  validateBoQQuantities,
  getAIRates,
  optimizeBoQ,
  generateItemDescription,
};

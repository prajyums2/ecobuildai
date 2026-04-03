// EcoBuild AI Tool Execution Framework (MCP-like)
// Allows the AI assistant to perform actions on the project with user consent

import { puter } from '@heyputer/puter.js';
import { ecoBuildAPI } from './api';
import { generateBoQAsync } from '../utils/boqCalculator';

const AI_MODEL = 'gemini-2.0-flash';

/**
 * Tool definitions - what the AI can do
 */
export const TOOLS = {
  generate_boq: {
    name: 'generate_boq',
    description: 'Generate a Bill of Quantities (BoQ) for the current project with material rates and quantities',
    parameters: {
      type: 'object',
      properties: {
        confirm: { type: 'boolean', description: 'User has confirmed this action' }
      },
      required: ['confirm']
    },
    requiresConsent: true,
    consentMessage: 'Generate a new BoQ for your project? This will calculate all material quantities and costs.'
  },
  optimize_materials: {
    name: 'optimize_materials',
    description: 'Run AHP material optimization to select best materials based on sustainability, cost, and strength',
    parameters: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['sustainability', 'balanced', 'luxury'], description: 'Optimization priority' },
        confirm: { type: 'boolean', description: 'User has confirmed this action' }
      },
      required: ['mode', 'confirm']
    },
    requiresConsent: true,
    consentMessage: 'Run material optimization? This will analyze all available materials and select the best ones for your project.'
  },
  update_project_params: {
    name: 'update_project_params',
    description: 'Update building parameters like area, floors, height, etc.',
    parameters: {
      type: 'object',
      properties: {
        params: { type: 'object', description: 'Building parameters to update' },
        confirm: { type: 'boolean', description: 'User has confirmed this action' }
      },
      required: ['params', 'confirm']
    },
    requiresConsent: true,
    consentMessage: 'Update your project building parameters?'
  },
  get_material_info: {
    name: 'get_material_info',
    description: 'Get detailed information about a specific material including properties, rates, and IS codes',
    parameters: {
      type: 'object',
      properties: {
        material: { type: 'string', description: 'Material name or category' }
      },
      required: ['material']
    },
    requiresConsent: false
  },
  compare_materials: {
    name: 'compare_materials',
    description: 'Compare two materials across cost, carbon, strength, and durability',
    parameters: {
      type: 'object',
      properties: {
        materialA: { type: 'string', description: 'First material' },
        materialB: { type: 'string', description: 'Second material' }
      },
      required: ['materialA', 'materialB']
    },
    requiresConsent: false
  },
  calculate_carbon: {
    name: 'calculate_carbon',
    description: 'Calculate embodied carbon footprint for the current project',
    parameters: {
      type: 'object',
      properties: {
        confirm: { type: 'boolean', description: 'User has confirmed this action' }
      },
      required: ['confirm']
    },
    requiresConsent: true,
    consentMessage: 'Calculate the carbon footprint of your project?'
  },
  get_sustainability_score: {
    name: 'get_sustainability_score',
    description: 'Get GRIHA/IGBC/LEED sustainability scores for the current project',
    parameters: {
      type: 'object',
      properties: {
        confirm: { type: 'boolean', description: 'User has confirmed this action' }
      },
      required: ['confirm']
    },
    requiresConsent: true,
    consentMessage: 'Calculate sustainability scores for your project?'
  },
  export_report: {
    name: 'export_report',
    description: 'Export the project report as PDF or print',
    parameters: {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['pdf', 'print'], description: 'Export format' },
        confirm: { type: 'boolean', description: 'User has confirmed this action' }
      },
      required: ['format', 'confirm']
    },
    requiresConsent: true,
    consentMessage: 'Export your project report?'
  },
  navigate_to: {
    name: 'navigate_to',
    description: 'Navigate to a specific page in the application',
    parameters: {
      type: 'object',
      properties: {
        page: { type: 'string', enum: ['setup', 'optimizer', 'boq', 'reports', 'bim', 'dashboard'], description: 'Page to navigate to' }
      },
      required: ['page']
    },
    requiresConsent: false
  },
  get_project_summary: {
    name: 'get_project_summary',
    description: 'Get a complete summary of the current project including all parameters, selections, and results',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    requiresConsent: false
  },
};

/**
 * Tool execution engine
 */
export async function executeTool(toolName, params, projectContext, callbacks) {
  const tool = TOOLS[toolName];
  if (!tool) {
    return { error: `Unknown tool: ${toolName}` };
  }

  // Check consent requirement
  if (tool.requiresConsent && !params.confirm) {
    if (callbacks?.onConsentRequired) {
      callbacks.onConsentRequired({
        tool: toolName,
        message: tool.consentMessage,
        params: params
      });
    }
    return { pending: true, message: tool.consentMessage };
  }

  console.log(`[Tool] Executing: ${toolName}`, params);

  try {
    switch (toolName) {
      case 'generate_boq':
        return await executeGenerateBoQ(projectContext, callbacks);

      case 'optimize_materials':
        return await executeOptimizeMaterials(params.mode, projectContext, callbacks);

      case 'update_project_params':
        return await executeUpdateParams(params.params, projectContext, callbacks);

      case 'get_material_info':
        return await executeGetMaterialInfo(params.material, projectContext);

      case 'compare_materials':
        return await executeCompareMaterials(params.materialA, params.materialB, projectContext);

      case 'calculate_carbon':
        return await executeCalculateCarbon(projectContext, callbacks);

      case 'get_sustainability_score':
        return await executeGetSustainabilityScore(projectContext, callbacks);

      case 'export_report':
        return await executeExportReport(params.format, callbacks);

      case 'navigate_to':
        return await executeNavigate(params.page, callbacks);

      case 'get_project_summary':
        return await executeGetProjectSummary(projectContext);

      default:
        return { error: `Tool not implemented: ${toolName}` };
    }
  } catch (error) {
    console.error(`[Tool] Error executing ${toolName}:`, error);
    return { error: error.message || 'Tool execution failed' };
  }
}

/**
 * Tool: Generate BoQ
 */
async function executeGenerateBoQ(projectContext, callbacks) {
  callbacks?.onStatusChange('Generating BoQ...');
  const boq = await generateBoQAsync(projectContext.project);
  callbacks?.onStatusChange('BoQ generated successfully');
  callbacks?.onBoQGenerated?.(boq);
  return {
    success: true,
    message: `BoQ generated: Grand Total Rs ${(boq.summary?.grandTotal || 0).toLocaleString()}`,
    data: {
      subTotal: boq.summary?.subTotal,
      grandTotal: boq.summary?.grandTotal,
      categories: boq.categories?.length,
      items: boq.categories?.reduce((sum, c) => sum + (c.items?.length || 0), 0)
    }
  };
}

/**
 * Tool: Optimize Materials
 */
async function executeOptimizeMaterials(mode, projectContext, callbacks) {
  callbacks?.onStatusChange(`Running ${mode} material optimization...`);
  try {
    const response = await ecoBuildAPI.optimizeMaterials(
      mode,
      Object.keys(projectContext.project?.materialSelections || {}),
      projectContext.project?.location?.lat,
      projectContext.project?.location?.lon
    );
    callbacks?.onStatusChange('Material optimization complete');
    return {
      success: true,
      message: `Optimization complete (${mode} mode)`,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      message: 'Material optimization requires backend connection. Please use the Material Optimizer page.',
      data: null
    };
  }
}

/**
 * Tool: Update Project Parameters
 */
async function executeUpdateParams(params, projectContext, callbacks) {
  callbacks?.onStatusChange('Updating project parameters...');
  projectContext.updateBuildingParams?.(params);
  callbacks?.onStatusChange('Parameters updated');
  return {
    success: true,
    message: `Updated: ${Object.keys(params).join(', ')}`,
    data: params
  };
}

/**
 * Tool: Get Material Info
 */
async function executeGetMaterialInfo(material, projectContext) {
  try {
    const response = await ecoBuildAPI.getMaterials({ search: material, limit: 10 });
    const materials = response.data?.materials || [];
    if (materials.length === 0) {
      return { success: false, message: `No materials found matching "${material}"` };
    }
    return {
      success: true,
      message: `Found ${materials.length} materials matching "${material}"`,
      data: materials.slice(0, 5).map(m => ({
        name: m.name,
        category: m.category,
        rate: m.financial_properties?.cost_per_unit,
        unit: m.financial_properties?.unit_type,
        carbon: m.environmental_properties?.embodied_carbon,
        isCode: m.civil_properties?.is_code,
        grade: m.civil_properties?.structural_grade,
      }))
    };
  } catch (error) {
    return { success: false, message: `Failed to fetch material info: ${error.message}` };
  }
}

/**
 * Tool: Compare Materials
 */
async function executeCompareMaterials(matA, matB, projectContext) {
  try {
    const [resA, resB] = await Promise.all([
      ecoBuildAPI.getMaterials({ search: matA, limit: 1 }),
      ecoBuildAPI.getMaterials({ search: matB, limit: 1 })
    ]);
    const a = resA.data?.materials?.[0];
    const b = resB.data?.materials?.[0];
    if (!a || !b) {
      return { success: false, message: 'Could not find both materials' };
    }
    return {
      success: true,
      message: `Comparing ${a.name} vs ${b.name}`,
      data: {
        materialA: {
          name: a.name,
          rate: a.financial_properties?.cost_per_unit,
          carbon: a.environmental_properties?.embodied_carbon,
          strength: a.physical_properties?.compressive_strength,
          durability: a.civil_properties?.durability_years,
          recycled: a.environmental_properties?.recycled_content,
        },
        materialB: {
          name: b.name,
          rate: b.financial_properties?.cost_per_unit,
          carbon: b.environmental_properties?.embodied_carbon,
          strength: b.physical_properties?.compressive_strength,
          durability: b.civil_properties?.durability_years,
          recycled: b.environmental_properties?.recycled_content,
        }
      }
    };
  } catch (error) {
    return { success: false, message: `Comparison failed: ${error.message}` };
  }
}

/**
 * Tool: Calculate Carbon
 */
async function executeCalculateCarbon(projectContext, callbacks) {
  callbacks?.onStatusChange('Calculating carbon footprint...');
  const bp = projectContext.project?.buildingParams || {};
  const totalArea = (bp.builtUpArea || 0) * (bp.numFloors || 1);
  const materials = projectContext.project?.materialSelections || {};

  // Estimate quantities based on building area (simplified)
  const quantityEstimates = {
    cement: totalArea * 0.8, // bags per sqm
    steel: totalArea * 12, // kg per sqm
    concrete: totalArea * 0.12, // cum per sqm
    masonry: totalArea * 7, // nos per sqm
    aggregates: totalArea * 15, // cft per sqm
  };

  let totalCarbon = 0;
  const breakdown = [];
  Object.entries(materials).forEach(([cat, mat]) => {
    const qty = quantityEstimates[cat] || totalArea * 0.5;
    const carbonPerUnit = mat.carbon || 0;
    const carbon = carbonPerUnit * qty;
    totalCarbon += carbon;
    breakdown.push({ category: cat, material: mat.name, quantity: Math.round(qty), carbon: Math.round(carbon) });
  });

  callbacks?.onStatusChange('Carbon calculation complete');
  return {
    success: true,
    message: `Total embodied carbon: ${(totalCarbon / 1000).toFixed(1)} tonnes CO2`,
    data: { total: Math.round(totalCarbon), breakdown, perSqm: totalArea > 0 ? Math.round(totalCarbon / totalArea) : 0 }
  };
}

/**
 * Tool: Get Sustainability Score
 */
async function executeGetSustainabilityScore(projectContext, callbacks) {
  callbacks?.onStatusChange('Calculating sustainability scores...');
  const bp = projectContext.project?.buildingParams || {};
  const materials = projectContext.project?.materialSelections || {};

  let griha = 15;
  if (bp.hasRainwaterHarvesting) griha += 10;
  if (bp.hasSolarWaterHeater) griha += 10;
  if (bp.hasSTP) griha += 8;
  if (bp.sustainabilityPriority === 'high') griha += 12;
  else if (bp.sustainabilityPriority === 'medium') griha += 7;

  const recycledContent = Object.values(materials).reduce((sum, m) => sum + (m.recycled || 0), 0) / Math.max(1, Object.keys(materials).length);
  if (recycledContent > 20) griha += 5;

  callbacks?.onStatusChange('Sustainability scores calculated');
  return {
    success: true,
    message: `GRIHA: ${griha}/100 (${griha >= 64 ? '4-Star' : griha >= 50 ? '3-Star' : 'Needs improvement'})`,
    data: {
      griha,
      igbc: Math.min(100, griha + 5),
      leed: Math.min(100, Math.round(griha * 0.8)),
      recycledContent: Math.round(recycledContent),
      features: {
        rainwaterHarvesting: bp.hasRainwaterHarvesting,
        solarWaterHeater: bp.hasSolarWaterHeater,
        stp: bp.hasSTP,
      }
    }
  };
}

/**
 * Tool: Export Report
 */
async function executeExportReport(format, callbacks) {
  callbacks?.onStatusChange(`Exporting report as ${format}...`);
  if (format === 'print') {
    window.print();
  } else {
    window.print();
  }
  callbacks?.onStatusChange('Report exported');
  return { success: true, message: `Report exported as ${format}` };
}

/**
 * Tool: Navigate
 */
async function executeNavigate(page, callbacks) {
  const routes = {
    setup: '/setup',
    optimizer: '/optimizer',
    boq: '/boq',
    reports: '/reports',
    bim: '/bim',
    dashboard: '/dashboard',
  };
  const route = routes[page];
  if (route) {
    window.location.hash = route;
    callbacks?.onNavigate?.(route);
  }
  return { success: true, message: `Navigated to ${page}` };
}

/**
 * Tool: Get Project Summary
 */
async function executeGetProjectSummary(projectContext) {
  const p = projectContext.project || {};
  const bp = p.buildingParams || {};
  const ms = p.materialSelections || {};
  const totalArea = (bp.builtUpArea || 0) * (bp.numFloors || 1);

  return {
    success: true,
    message: `Project: ${p.name || 'Unnamed'} | ${totalArea} sqm | ${bp.numFloors || 0} floors`,
    data: {
      name: p.name,
      location: p.location?.district,
      builtUpArea: bp.builtUpArea,
      numFloors: bp.numFloors,
      totalArea,
      soilType: p.geotechnical?.soilType,
      seismicZone: bp.seismicZone,
      materials: Object.entries(ms).map(([k, v]) => ({
        category: k,
        name: v.name,
        rate: v.rate,
        unit: v.unit,
        carbon: v.carbon,
      })),
      sustainability: {
        priority: bp.sustainabilityPriority,
        rainwaterHarvesting: bp.hasRainwaterHarvesting,
        solarWaterHeater: bp.hasSolarWaterHeater,
      },
      workflow: p.workflow?.step || 0,
    }
  };
}

/**
 * AI Tool Caller - Uses Puter.js to decide which tool to call
 */
export async function aiToolCall(message, projectContext, chatHistory, callbacks) {
  const projectSummary = await executeGetProjectSummary(projectContext);

  const toolDefinitions = Object.entries(TOOLS).map(([name, tool]) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));

  const prompt = `You are an AI assistant for EcoBuild, a construction project management tool.

CURRENT PROJECT:
${JSON.stringify(projectSummary.data, null, 2)}

AVAILABLE TOOLS:
${JSON.stringify(toolDefinitions, null, 2)}

USER MESSAGE: "${message}"

Decide if you need to call a tool to help the user. If yes, respond with ONLY valid JSON:
{"tool": "tool_name", "params": {"param1": "value1"}, "reasoning": "Why this tool is needed"}

If no tool is needed, respond with:
{"tool": null, "response": "Your natural language response here"}

Rules:
- Only use tools that are defined above
- For actions that modify the project (generate_boq, optimize_materials, update_project_params), ALWAYS set confirm: false initially (the system will ask for user consent)
- For read-only tools (get_material_info, compare_materials, get_project_summary), you can call them directly
- Be specific with tool parameters`;

  try {
    const response = await puter.ai.chat(prompt, { model: AI_MODEL });
    const text = typeof response === 'string' ? response : response.message?.content || response;
    const parsed = parseJSON(text);

    if (parsed?.tool) {
      console.log('[AI Tool Call]', parsed.tool, parsed.params);
      const result = await executeTool(parsed.tool, { ...parsed.params, confirm: false }, projectContext, callbacks);
      return {
        toolCalled: parsed.tool,
        toolResult: result,
        reasoning: parsed.reasoning,
      };
    }

    return { response: parsed?.response || text };
  } catch (error) {
    console.warn('AI tool call failed:', error.message);
    return { response: 'I encountered an error processing your request. Please try again.' };
  }
}

function parseJSON(text) {
  try { return JSON.parse(text); } catch {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) { try { return JSON.parse(jsonMatch[1].trim()); } catch {} }
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) { try { return JSON.parse(objMatch[0]); } catch {} }
    return null;
  }
}

export default {
  TOOLS,
  executeTool,
  aiToolCall,
};

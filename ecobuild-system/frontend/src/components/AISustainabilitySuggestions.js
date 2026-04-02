import React, { useState, useEffect } from 'react';
import { FaSpinner, FaLeaf, FaCheck, FaTimes, FaLightbulb, FaWater, FaSun, FaRecycle, FaWind, FaBolt } from 'react-icons/fa';
import { puter } from '@heyputer/puter.js';

function AISustainabilitySuggestions({ project, boq, materialSelections, embodiedCarbon, sustainabilityScore }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applied, setApplied] = useState(new Set());

  useEffect(() => {
    if (!project || !boq) return;
    generateSuggestions();
  }, [project, boq]);

  const generateSuggestions = async () => {
    setLoading(true);
    setApplied(new Set());

    const prompt = `You are an expert sustainability consultant for green building construction in Kerala, India.

PROJECT: ${project?.name || 'Unnamed'}
Location: ${project?.location?.district || 'Thrissur'}, Kerala
Built-up: ${project?.buildingParams?.builtUpArea || 0} sqm × ${project?.buildingParams?.numFloors || 1} floors
Soil: ${project?.geotechnical?.soilType || 'laterite'}
Seismic: Zone ${project?.buildingParams?.seismicZone || 'III'}

SELECTED MATERIALS:
${Object.entries(materialSelections || {}).map(([k, v]) => `- ${k}: ${v?.name} @ Rs${v?.rate}/${v?.unit} | Carbon: ${v?.carbon || 'N/A'} | Recycled: ${v?.recycled || 0}%`).join('\n') || 'None'}

BOQ SUMMARY:
${boq?.categories?.map(c => `- ${c.name}: Rs ${(c.subTotal || 0).toLocaleString()}`).join('\n')}
Sub-Total: Rs ${(boq?.summary?.subTotal || 0).toLocaleString()}
Grand Total: Rs ${(boq?.summary?.grandTotal || 0).toLocaleString()}

SUSTAINABILITY SCORES:
- GRIHA: ${sustainabilityScore?.griha || 'N/A'}/100
- IGBC: ${sustainabilityScore?.igbc || 'N/A'}/100

EMBODIED CARBON: ${embodiedCarbon?.total?.toLocaleString() || 'N/A'} kg CO2

Provide 8-12 SPECIFIC, ACTIONABLE sustainability suggestions for this project. Each suggestion must include:
1. Category (water, energy, materials, waste, site, indoor)
2. Specific action with Kerala context
3. Expected impact (carbon reduction, cost savings, or points gained)
4. Implementation difficulty (easy/medium/hard)
5. Priority (high/medium/low)
6. Relevant IS code or green building standard reference
7. Estimated cost impact

Focus on:
- Rainwater harvesting (mandatory in Kerala)
- Solar water heater / solar panels
- Fly ash / slag cement (lower carbon)
- Recycled aggregates
- Natural ventilation (Kerala climate)
- Laterite stone (local material)
- Waste management
- Water-efficient fixtures
- Energy-efficient lighting/HVAC
- Green roof / terrace garden
- Composting
- Greywater recycling

Respond with ONLY valid JSON array:
[
  {
    "id": "s1",
    "category": "water|energy|materials|waste|site|indoor",
    "title": "Specific suggestion title",
    "description": "Detailed explanation with Kerala context",
    "impact": "Expected benefit (e.g., 'Save 15,000 liters/year, +10 GRIHA points')",
    "carbonReduction": "1200 kg CO2/year",
    "costImpact": "+Rs 45,000 initial, -Rs 8,000/year savings",
    "difficulty": "easy|medium|hard",
    "priority": "high|medium|low",
    "isCode": "Relevant IS code or standard",
    "paybackYears": 3.5
  }
]`;

    try {
      const response = await puter.ai.chat(prompt, { model: 'gpt-4.1-nano' });
      const text = typeof response === 'string' ? response : response.message?.content || response;
      const parsed = parseJSON(text);
      if (Array.isArray(parsed)) {
        setSuggestions(parsed);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('AI sustainability suggestions failed:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (id) => {
    setApplied(prev => new Set([...prev, id]));
  };

  const handleDismiss = (id) => {
    setApplied(prev => new Set([...prev, `dismissed_${id}`]));
  };

  const getCategoryIcon = (category) => {
    const icons = {
      water: FaWater,
      energy: FaSun,
      materials: FaRecycle,
      waste: FaLeaf,
      site: FaWind,
      indoor: FaBolt,
    };
    return icons[category] || FaLeaf;
  };

  const getCategoryColor = (category) => {
    const colors = {
      water: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
      energy: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
      materials: 'text-green-500 bg-green-50 dark:bg-green-900/20',
      waste: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20',
      site: 'text-teal-500 bg-teal-50 dark:bg-teal-900/20',
      indoor: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20',
    };
    return colors[category] || 'text-gray-500 bg-gray-50 dark:bg-gray-900/20';
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <FaSpinner className="animate-spin text-2xl text-primary mx-auto mb-3" />
        <p className="text-sm text-foreground-secondary">AI is generating sustainability suggestions...</p>
        <p className="text-xs text-foreground-muted mt-1">This analyzes your project for water, energy, materials, and waste optimization</p>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-8 text-foreground-secondary">
        <FaLeaf className="text-3xl text-foreground-muted mx-auto mb-3" />
        <p className="text-sm">No sustainability suggestions available. Try regenerating the report.</p>
      </div>
    );
  }

  const pendingCount = suggestions.filter(s => !applied.has(s.id) && !applied.has(`dismissed_${s.id}`)).length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground-secondary">{suggestions.length} suggestions found</span>
        <span className="text-green-600 dark:text-green-400 font-medium">{applied.size} applied/dismissed</span>
      </div>

      {/* Suggestions */}
      <div className="space-y-3">
        {suggestions.map((s) => {
          const isApplied = applied.has(s.id);
          const isDismissed = applied.has(`dismissed_${s.id}`);
          const isPending = !isApplied && !isDismissed;
          const Icon = getCategoryIcon(s.category);

          return (
            <div
              key={s.id}
              className={`rounded-lg border-2 transition-all ${
                isApplied ? 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10' :
                isDismissed ? 'border-gray-200 dark:border-gray-700 opacity-40' :
                'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700'
              }`}
            >
              <div className="p-4">
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getCategoryColor(s.category)}`}>
                    <Icon className="text-sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm text-foreground">{s.title}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        s.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        s.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {s.priority}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        s.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                        s.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {s.difficulty}
                      </span>
                    </div>
                    <p className="text-xs text-foreground-muted mt-1 capitalize">{s.category} • {s.isCode}</p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-foreground-secondary mb-3">{s.description}</p>

                {/* Impact Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                    <span className="text-foreground-muted block">Impact</span>
                    <span className="text-foreground font-medium">{s.impact}</span>
                  </div>
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                    <span className="text-foreground-muted block">Carbon</span>
                    <span className="text-green-600 dark:text-green-400 font-medium">{s.carbonReduction}</span>
                  </div>
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                    <span className="text-foreground-muted block">Cost</span>
                    <span className="text-foreground font-medium">{s.costImpact}</span>
                  </div>
                </div>

                {s.paybackYears && (
                  <p className="text-xs text-foreground-muted mb-3">
                    Payback: {s.paybackYears} years
                  </p>
                )}

                {/* Actions */}
                {isPending && (
                  <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => handleApply(s.id)}
                      className="flex-1 btn btn-primary text-xs py-1.5"
                    >
                      <FaCheck className="mr-1" /> Apply
                    </button>
                    <button
                      onClick={() => handleDismiss(s.id)}
                      className="flex-1 btn btn-outline text-xs py-1.5"
                    >
                      <FaTimes className="mr-1" /> Dismiss
                    </button>
                  </div>
                )}
                {isApplied && (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs font-medium">
                    <FaCheck /> Applied
                  </div>
                )}
                {isDismissed && (
                  <div className="flex items-center gap-2 text-gray-400 text-xs">
                    <FaTimes /> Dismissed
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function parseJSON(text) {
  try { return JSON.parse(text); } catch {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) { try { return JSON.parse(jsonMatch[1].trim()); } catch {} }
    const arrMatch = text.match(/\[[\s\S]*\]/);
    if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch {} }
    return null;
  }
}

export default AISustainabilitySuggestions;

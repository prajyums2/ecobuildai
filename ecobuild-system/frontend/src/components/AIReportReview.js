import React, { useState, useEffect } from 'react';
import { FaRobot, FaCheck, FaTimes, FaSpinner, FaLightbulb, FaArrowUp, FaArrowDown, FaExclamationTriangle, FaSyncAlt } from 'react-icons/fa';
import { puter } from '@heyputer/puter.js';

function AIReportReview({ boq, project, materialSelections, onApplyChanges }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [rejectedIds, setRejectedIds] = useState(new Set());
  const [error, setError] = useState(null);
  const hasAnalyzed = React.useRef(false);

  useEffect(() => {
    if (!boq || hasAnalyzed.current) return;
    hasAnalyzed.current = true;
    analyzeReport();
  }, []);

  const handleRefresh = () => {
    hasAnalyzed.current = false;
    setAppliedIds(new Set());
    setRejectedIds(new Set());
    analyzeReport();
  };

  const analyzeReport = async () => {
    setLoading(true);
    setSuggestions([]);
    setAppliedIds(new Set());
    setRejectedIds(new Set());
    hasAnalyzed.current = true;

    const prompt = `You are an expert construction cost consultant and quantity surveyor analyzing a BoQ for a project in Kerala, India.

PROJECT: ${project?.name || 'Unnamed'}
Location: ${project?.location?.district || 'Thrissur'}, Kerala
Built-up: ${project?.buildingParams?.builtUpArea || 0} sqm × ${project?.buildingParams?.numFloors || 1} floors
Soil: ${project?.geotechnical?.soilType || 'laterite'}
Seismic: Zone ${project?.buildingParams?.seismicZone || 'III'}

SELECTED MATERIALS:
${Object.entries(materialSelections || {}).map(([k, v]) => `- ${k}: ${v?.name} @ Rs${v?.rate}/${v?.unit}`).join('\n') || 'None'}

BOQ:
${boq?.categories?.map(c => `## ${c.name} (Rs ${(c.subTotal || 0).toLocaleString()})
${c.items?.map(i => `- ${i.description.substring(0, 80)}: ${i.quantity} ${i.unit} @ Rs${i.rate}/${i.unit} = Rs ${(parseFloat(i.quantity) * i.rate).toFixed(0)}`).join('\n')}`).join('\n\n')}

Sub-Total: Rs ${(boq?.summary?.subTotal || 0).toLocaleString()}
Grand Total: Rs ${(boq?.summary?.grandTotal || 0).toLocaleString()}

Analyze this BoQ and provide SPECIFIC, ACTIONABLE suggestions. For each suggestion, you must provide:
1. The exact BoQ category and item
2. The current value (rate or quantity)
3. The suggested new value
4. The reasoning
5. The estimated savings or improvement

CRITICAL RULES:
- Only suggest changes that are within ±25% of current values
- Never suggest removing safety-critical items (cover blocks, binding wire, waterproofing)
- Never suggest changing IS code requirements
- Focus on: rate optimization, quantity right-sizing, missing items, material alternatives
- Be specific with numbers
- Consider Kerala market rates (2026)

Respond with ONLY valid JSON array:
[
  {
    "id": "s1",
    "category": "Concrete Work",
    "item": "M25 grade RCC for slabs",
    "type": "rate_change|quantity_change|missing_item|optimization",
    "current": "7200",
    "suggested": "6500",
    "unit": "Rs/cum",
    "reasoning": "Fly ash concrete is typically 10-15% cheaper than standard M25",
    "impact": "Savings of Rs 31,500 (6.5%)",
    "priority": "high|medium|low",
    "confidence": 0.85
  }
]

Include at least 5-10 suggestions across different categories.`;

    try {
      const response = await puter.ai.chat(prompt, { model: 'gpt-4.1-nano' });
      const text = typeof response === 'string' ? response : response.message?.content || response;
      const parsed = parseJSON(text);
      if (Array.isArray(parsed)) {
        setSuggestions(parsed);
        setError(null);
      } else {
        setSuggestions([]);
        setError('AI response could not be parsed');
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
      setSuggestions([]);
      setError('AI service unavailable. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (suggestion) => {
    setAppliedIds(prev => new Set([...prev, suggestion.id]));
    if (onApplyChanges) {
      onApplyChanges(suggestion);
    }
  };

  const handleReject = (suggestion) => {
    setRejectedIds(prev => new Set([...prev, suggestion.id]));
  };

  const handleApplyAll = () => {
    const pending = suggestions.filter(s => !appliedIds.has(s.id) && !rejectedIds.has(s.id));
    pending.forEach(s => handleApply(s));
  };

  const handleRejectAll = () => {
    const pending = suggestions.filter(s => !appliedIds.has(s.id) && !rejectedIds.has(s.id));
    pending.forEach(s => handleReject(s));
  };

  const pendingCount = suggestions.filter(s => !appliedIds.has(s.id) && !rejectedIds.has(s.id)).length;
  const totalSavings = suggestions
    .filter(s => appliedIds.has(s.id) && s.impact)
    .reduce((sum, s) => {
      const match = s.impact?.match(/Rs\s*([\d,]+)/);
      return sum + (match ? parseInt(match[1].replace(/,/g, '')) : 0);
    }, 0);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center">
          <FaSpinner className="animate-spin text-3xl text-primary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">AI is analyzing your report...</h3>
          <p className="text-foreground-secondary">This may take 30-60 seconds. The AI is reviewing all BoQ items, material rates, and quantities.</p>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center">
          <FaRobot className="text-4xl text-foreground-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No suggestions available</h3>
          {error ? (
            <div>
              <p className="text-foreground-secondary mb-4">{error}</p>
              <button onClick={analyzeReport} className="btn btn-primary">
                <FaSyncAlt className="mr-2" /> Retry Analysis
              </button>
            </div>
          ) : (
            <p className="text-foreground-secondary">AI analysis could not generate suggestions. Try regenerating the BoQ first.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
              <FaRobot className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">AI Report Analysis</h3>
              <p className="text-sm text-foreground-secondary">{suggestions.length} suggestions found</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRefresh} className="btn btn-outline text-sm" title="Re-analyze report">
              <FaSyncAlt className="mr-1" /> Refresh
            </button>
            {pendingCount > 0 && (
            <div className="flex gap-2">
              <button onClick={handleApplyAll} className="btn btn-primary text-sm">
                <FaCheck className="mr-1" /> Apply All ({pendingCount})
              </button>
              <button onClick={handleRejectAll} className="btn btn-outline text-sm">
                <FaTimes className="mr-1" /> Reject All
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-xs text-green-600 dark:text-green-400">Applied</p>
            <p className="text-lg font-bold text-green-700 dark:text-green-300">{appliedIds.size}</p>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-xs text-red-600 dark:text-red-400">Rejected</p>
            <p className="text-lg font-bold text-red-700 dark:text-red-300">{rejectedIds.size}</p>
          </div>
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-xs text-yellow-600 dark:text-yellow-400">Pending</p>
            <p className="text-lg font-bold text-yellow-700 dark:text-yellow-300">{pendingCount}</p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-xs text-blue-600 dark:text-blue-400">Est. Savings</p>
            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">₹{totalSavings.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Suggestions */}
      <div className="space-y-4">
        {suggestions.map((s) => {
          const isApplied = appliedIds.has(s.id);
          const isRejected = rejectedIds.has(s.id);
          const isPending = !isApplied && !isRejected;

          return (
            <div
              key={s.id}
              className={`bg-white dark:bg-gray-800 rounded-xl border-2 transition-all ${
                isApplied ? 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10' :
                isRejected ? 'border-gray-200 dark:border-gray-700 opacity-50' :
                'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
              }`}
            >
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      s.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      s.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {s.priority}
                    </span>
                    <span className="text-xs text-foreground-muted bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {s.category}
                    </span>
                    <span className="text-xs text-foreground-muted bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {s.type?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.confidence && (
                      <span className="text-xs text-foreground-muted">
                        {Math.round(s.confidence * 100)}% confident
                      </span>
                    )}
                  </div>
                </div>

                {/* Item */}
                <h4 className="font-semibold text-foreground mb-2">{s.item}</h4>

                {/* Current vs Suggested */}
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-xs text-foreground-secondary mb-1">Current</p>
                    <p className="text-lg font-mono font-bold text-foreground">{s.current} <span className="text-sm font-normal text-foreground-muted">{s.unit}</span></p>
                  </div>
                  <div className={`p-3 rounded-lg ${isApplied ? 'bg-green-100 dark:bg-green-900/30' : 'bg-purple-50 dark:bg-purple-900/20'}`}>
                    <p className="text-xs text-foreground-secondary mb-1">Suggested</p>
                    <p className="text-lg font-mono font-bold text-purple-700 dark:text-purple-300">{s.suggested} <span className="text-sm font-normal text-foreground-muted">{s.unit}</span></p>
                  </div>
                </div>

                {/* Reasoning */}
                <div className="flex items-start gap-2 mb-3 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                  <FaLightbulb className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-foreground-secondary">{s.reasoning}</p>
                </div>

                {/* Impact */}
                {s.impact && (
                  <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-3">
                    {s.impact}
                  </p>
                )}

                {/* Actions */}
                {isPending && (
                  <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => handleApply(s)}
                      className="flex-1 btn btn-primary text-sm py-1.5"
                    >
                      <FaCheck className="mr-1" /> Accept
                    </button>
                    <button
                      onClick={() => handleReject(s)}
                      className="flex-1 btn btn-outline text-sm py-1.5"
                    >
                      <FaTimes className="mr-1" /> Reject
                    </button>
                  </div>
                )}
                {isApplied && (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
                    <FaCheck /> Applied
                  </div>
                )}
                {isRejected && (
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <FaTimes /> Rejected
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
  try { return JSON.parse(text); } catch (e) {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) { try { return JSON.parse(jsonMatch[1].trim()); } catch (e) {} }
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) { try { return JSON.parse(objMatch[0]); } catch (e) {} }
    const arrMatch = text.match(/\[[\s\S]*\]/);
    if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch (e) {} }
    return null;
  }
}

export default AIReportReview;

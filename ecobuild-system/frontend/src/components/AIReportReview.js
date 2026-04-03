import React, { useState, useEffect } from 'react';
import { FaRobot, FaCheck, FaTimes, FaSpinner, FaLightbulb, FaArrowUp, FaArrowDown, FaExclamationTriangle, FaSyncAlt } from 'react-icons/fa';
import { puter } from '@heyputer/puter.js';
import { parseJSON } from '../utils/jsonParser';

function AIReportReview({ boq, project, materialSelections, onApplyChanges }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [rejectedIds, setRejectedIds] = useState(new Set());
  const [error, setError] = useState(null);
  const hasAnalyzed = React.useRef(false);

  // Analyze when BoQ becomes available (only once)
  useEffect(() => {
    if (!boq || hasAnalyzed.current) return;
    hasAnalyzed.current = true;
    analyzeReport();
  }, [boq]);

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
    setError(null);

    const prompt = `You are an expert construction cost consultant analyzing a BoQ for Kerala, India.

PROJECT: ${project?.name || 'Unnamed'} | Location: ${project?.location?.district || 'Thrissur'} | Built-up: ${project?.buildingParams?.builtUpArea || 0} sqm × ${project?.buildingParams?.numFloors || 1} floors

SELECTED MATERIALS:
${Object.entries(materialSelections || {}).map(([k, v]) => `- ${k}: ${v?.name} @ Rs${v?.rate}/${v?.unit}`).join('\n') || 'None'}

BOQ:
${boq?.categories?.map(c => `${c.name}: Rs ${(c.subTotal || 0).toLocaleString()}`).join('\n')}
Sub-Total: Rs ${(boq?.summary?.subTotal || 0).toLocaleString()}
Grand Total: Rs ${(boq?.summary?.grandTotal || 0).toLocaleString()}

Provide 5-8 specific, actionable suggestions. Respond with ONLY valid JSON array:
[{"id":"s1","category":"Concrete Work","item":"M25 RCC slabs","type":"rate_change","current":"7200","suggested":"6500","unit":"Rs/cum","reasoning":"Fly ash concrete is cheaper","impact":"Savings of Rs 31,500","priority":"high","confidence":0.85}]

Rules: Within ±25% of current values. Never remove safety items. Focus on rate optimization, quantity right-sizing, material alternatives.`;

    try {
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AI request timed out')), 30000)
      );
      
      const response = await Promise.race([
        puter.ai.chat(prompt, { model: 'gemini-2.0-flash' }),
        timeout
      ]);
      
      const text = typeof response === 'string' ? response : response.message?.content || response;
      const parsed = parseJSON(text);
      
      if (Array.isArray(parsed) && parsed.length > 0) {
        setSuggestions(parsed);
        setError(null);
      } else {
        // Fallback suggestions
        setSuggestions(generateFallbackSuggestions(boq, materialSelections));
        setError(null);
      }
    } catch (error) {
      console.warn('AI analysis failed:', error.message);
      setSuggestions(generateFallbackSuggestions(boq, materialSelections));
      setError('AI service unavailable. Showing local recommendations.');
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

export default AIReportReview;

function generateFallbackSuggestions(boq, materialSelections) {
  const suggestions = [];
  const cats = boq?.categories || [];
  const subTotal = boq?.summary?.subTotal || 0;
  
  // Check each category for optimization opportunities
  cats.forEach(cat => {
    const catName = cat.name || '';
    const subTotal = cat.subTotal || 0;
    
    // Concrete: suggest fly ash concrete if not already using it
    if (catName.includes('Concrete') && subTotal > 300000) {
      suggestions.push({
        id: `s_concrete_${Date.now()}`,
        category: 'Concrete Work',
        item: 'M25 RCC concrete',
        type: 'rate_change',
        current: '5500',
        suggested: '5000',
        unit: 'Rs/cum',
        reasoning: 'Using PPC cement with fly ash can reduce concrete costs by 8-10% while improving durability in Kerala climate.',
        impact: `Potential savings of Rs ${Math.round(subTotal * 0.08).toLocaleString()}`,
        priority: 'high',
        confidence: 0.85
      });
    }
    
    // Steel: suggest bulk purchasing
    if (catName.includes('Steel') && subTotal > 200000) {
      suggestions.push({
        id: `s_steel_${Date.now()}`,
        category: 'Reinforcement Steel',
        item: 'TMT steel bars',
        type: 'optimization',
        current: '85',
        suggested: '78',
        unit: 'Rs/kg',
        reasoning: 'Bulk purchasing (1000+ kg) from direct distributors can save Rs 5-7/kg compared to retail rates.',
        impact: `Potential savings of Rs ${Math.round(subTotal * 0.06).toLocaleString()}`,
        priority: 'medium',
        confidence: 0.80
      });
    }
    
    // Flooring: suggest local alternatives
    if (catName.includes('Flooring') && subTotal > 300000) {
      suggestions.push({
        id: `s_flooring_${Date.now()}`,
        category: 'Flooring',
        item: 'Vitrified tiles',
        type: 'optimization',
        current: '140',
        suggested: '110',
        unit: 'Rs/sqft',
        reasoning: 'Consider Kota stone or IPS flooring for non-bedroom areas. Saves 20-30% while maintaining durability.',
        impact: `Potential savings of Rs ${Math.round(subTotal * 0.15).toLocaleString()}`,
        priority: 'medium',
        confidence: 0.75
      });
    }
    
    // Doors & Windows: suggest UPVC over teak
    if (catName.includes('Doors') && subTotal > 100000) {
      suggestions.push({
        id: `s_doors_${Date.now()}`,
        category: 'Doors & Windows',
        item: 'Teak wood doors',
        type: 'optimization',
        current: '8500',
        suggested: '6500',
        unit: 'Rs/nos',
        reasoning: 'UPVC or engineered wood doors for internal rooms can save 25% while being termite-proof and maintenance-free.',
        impact: `Potential savings of Rs ${Math.round(subTotal * 0.15).toLocaleString()}`,
        priority: 'low',
        confidence: 0.70
      });
    }
    
    // Electrical: suggest LED fixtures
    if (catName.includes('Electrical') && subTotal > 50000) {
      suggestions.push({
        id: `s_electrical_${Date.now()}`,
        category: 'Electrical Work',
        item: 'Wiring and fixtures',
        type: 'optimization',
        current: '55',
        suggested: '48',
        unit: 'Rs/m',
        reasoning: 'LED fixtures and modular switches from local brands (Havells, Anchor) can reduce electrical costs by 10-15%.',
        impact: `Potential savings of Rs ${Math.round(subTotal * 0.10).toLocaleString()}`,
        priority: 'low',
        confidence: 0.75
      });
    }
  });
  
  // General suggestion if no specific ones found
  if (suggestions.length === 0) {
    suggestions.push({
      id: `s_general_${Date.now()}`,
      category: 'General',
      item: 'Overall project',
      type: 'optimization',
      current: subTotal.toString(),
      suggested: Math.round(subTotal * 0.90).toString(),
      unit: 'Rs',
      reasoning: 'Consider phased procurement, bulk discounts, and local material alternatives to reduce overall project cost by 8-12%.',
      impact: `Potential savings of Rs ${Math.round(subTotal * 0.10).toLocaleString()}`,
      priority: 'medium',
      confidence: 0.70
    });
  }
  
  return suggestions;
}

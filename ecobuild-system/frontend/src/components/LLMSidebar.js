import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useProject } from '../context/ProjectContext';
import { FaTimes, FaPaperPlane, FaRobot, FaUser, FaLeaf, FaBuilding, FaSpinner, FaCheck, FaExclamationTriangle, FaBolt, FaShieldAlt, FaTools } from 'react-icons/fa';
import { generateAIResponse } from '../services/aiService';
import { aiToolCall, executeTool, TOOLS } from '../services/toolExecutor';

function LLMSidebar() {
  const { project, saveMaterialSelection, updateBuildingParams, completeMaterialsSelection, completeBOQGeneration } = useProject();
  
  const getWelcomeMessage = (proj) => {
    if (!proj || !proj.isConfigured) {
      return `Hello! Welcome to EcoBuild!

I'm your AI construction assistant with full project control. I can analyze materials, generate BoQs, calculate carbon footprints, and optimize your project.

**I can help you with:**
• Material selection and optimization
• Bill of Quantities generation
• Sustainability analysis (GRIHA/IGBC/LEED)
• Carbon footprint calculation
• Material comparisons
• Project parameter updates

**Try saying:**
• "Generate my BoQ"
• "What materials should I use?"
• "Compare OPC and PPC cement"
• "Calculate my carbon footprint"
• "Get sustainability score"

What would you like to know?`;
    }

    const materialCount = Object.keys(proj.materialSelections || {}).length;
    return `Welcome back to **${proj.name}**!

Project: ${(proj.buildingParams?.builtUpArea || 0) * (proj.buildingParams?.numFloors || 1)} sqm | ${proj.buildingParams?.numFloors || 1} floors | ${proj.location?.district || 'Kerala'}
Materials: ${materialCount} selected

**I can take actions for you:**
• Generate BoQ
• Optimize materials
• Calculate carbon & sustainability
• Compare materials
• Update project params

What would you like me to do?`;
  };
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [consentRequest, setConsentRequest] = useState(null);
  const [toolStatus, setToolStatus] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setMessages([{ role: 'assistant', content: getWelcomeMessage(project), timestamp: new Date() }]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, consentRequest, toolStatus]);

  useEffect(() => {
    if (project?.isConfigured && messages.length <= 1) {
      setMessages([{ role: 'assistant', content: getWelcomeMessage(project), timestamp: new Date() }]);
    }
  }, [project?.isConfigured]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleConsentResponse = async (approved) => {
    if (!consentRequest || !approved) {
      setConsentRequest(null);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Action cancelled. Let me know if you need anything else!',
        timestamp: new Date()
      }]);
      setIsLoading(false);
      return;
    }

    setConsentRequest(null);
    setToolStatus({ status: 'executing', message: 'Executing action...' });

    try {
      const result = await executeTool(
        consentRequest.tool,
        { ...consentRequest.params, confirm: true },
        { project, saveMaterialSelection, updateBuildingParams },
        {
          onStatusChange: (msg) => setToolStatus({ status: 'executing', message: msg }),
          onBoQGenerated: (boq) => {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `**BoQ Generated Successfully!**\n\n- Categories: ${boq.categories?.length}\n- Items: ${boq.categories?.reduce((s, c) => s + (c.items?.length || 0), 0)}\n- Sub-Total: Rs ${(boq.summary?.subTotal || 0).toLocaleString()}\n- GST (18%): Rs ${(boq.summary?.gstAmount || 0).toLocaleString()}\n- **Grand Total: Rs ${(boq.summary?.grandTotal || 0).toLocaleString()}**\n\nThe BoQ has been updated with your selected material rates. Check the Reports page for the full breakdown.`,
              timestamp: new Date()
            }]);
          },
          onNavigate: (route) => {
            window.location.hash = route;
          }
        }
      );

      setToolStatus(null);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.success ? result.message : `Action failed: ${result.message}`,
        timestamp: new Date()
      }]);
    } catch (error) {
      setToolStatus(null);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input, timestamp: new Date() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const chatHistory = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      
      const result = await aiToolCall(input, { project, saveMaterialSelection, updateBuildingParams }, chatHistory, {
        onConsentRequired: (req) => {
          setConsentRequest(req);
        },
        onStatusChange: (msg) => setToolStatus({ status: 'executing', message: msg }),
        onBoQGenerated: (boq) => {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `**BoQ Generated!**\n\n- Grand Total: **Rs ${(boq.summary?.grandTotal || 0).toLocaleString()}**\n- Categories: ${boq.categories?.length}\n- Items: ${boq.categories?.reduce((s, c) => s + (c.items?.length || 0), 0)}`,
            timestamp: new Date()
          }]);
        },
        onNavigate: (route) => window.location.hash = route,
      });

      if (result.toolCalled) {
        if (result.toolResult?.pending) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `I'd like to **${result.toolCalled.replace(/_/g, ' ')}** for your project.\n\n${result.toolResult.message}\n\nPlease confirm to proceed.`,
            timestamp: new Date()
          }]);
          setConsentRequest({
            tool: result.toolCalled,
            message: result.toolResult.message,
            params: result.toolResult.data || {}
          });
        } else if (result.toolResult?.success) {
          const toolResponse = formatToolResponse(result.toolCalled, result.toolResult);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: toolResponse,
            timestamp: new Date()
          }]);
        } else {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: result.toolResult?.message || 'Tool execution failed.',
            timestamp: new Date()
          }]);
        }
      } else {
        const response = await generateAIResponse(input, project, chatHistory);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I encountered a technical issue. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-6 bottom-6 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform z-50"
      >
        <FaRobot className="text-2xl" />
      </button>
    );
  }

  return (
    <div className="w-96 bg-background-card border-l border-border flex flex-col h-full animate-slide-in">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-background-secondary">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white">
            <FaRobot />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">EcoBuild AI</h3>
            <p className="text-xs text-foreground-muted">Full Project Control</p>
          </div>
        </div>
        <button onClick={() => setIsOpen(false)} className="btn btn-ghost p-2">
          <FaTimes />
        </button>
      </div>

      {/* Project Context */}
      {project?.isConfigured && (
        <div className="px-4 py-3 bg-background-tertiary border-b border-border">
          <div className="flex items-center gap-2 text-sm">
            <FaBuilding className="text-primary" />
            <span className="font-medium text-foreground">{project.name}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-foreground-secondary mt-1">
            <FaLeaf className="text-success" />
            <span>{Object.keys(project.materialSelections || {}).length} materials | {(project.buildingParams?.builtUpArea || 0) * (project.buildingParams?.numFloors || 1)} sqm</span>
          </div>
        </div>
      )}

      {/* Tool Status */}
      {toolStatus && (
        <div className="px-4 py-2 bg-primary/10 border-b border-primary/20">
          <div className="flex items-center gap-2 text-sm text-primary">
            <FaSpinner className="animate-spin" />
            <span>{toolStatus.message}</span>
          </div>
        </div>
      )}

      {/* Consent Request */}
      {consentRequest && (
        <div className="px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-2 mb-2">
            <FaShieldAlt className="text-yellow-600 dark:text-yellow-400 mt-1 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Action Requires Consent</p>
              <p className="text-xs text-foreground-secondary mt-1">{consentRequest.message}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => handleConsentResponse(true)}
              className="flex-1 btn btn-primary text-xs py-1.5"
            >
              <FaCheck className="mr-1" /> Confirm
            </button>
            <button
              onClick={() => handleConsentResponse(false)}
              className="flex-1 btn btn-outline text-xs py-1.5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user' ? 'bg-background-tertiary text-foreground' : 'bg-primary text-white'
            }`}>
              {msg.role === 'user' ? <FaUser className="text-xs" /> : <FaRobot className="text-xs" />}
            </div>
            <div className={`max-w-[80%] p-3 rounded-lg text-sm prose prose-sm max-w-none ${
              msg.role === 'user' 
                ? 'bg-primary text-white prose-invert' 
                : 'bg-background-tertiary text-foreground border border-border'
            }`}>
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        {isLoading && !consentRequest && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
              <FaRobot className="text-xs" />
            </div>
            <div className="bg-background-tertiary p-3 rounded-lg border border-border flex items-center gap-2">
              <FaSpinner className="animate-spin text-primary" />
              <span className="text-sm text-foreground-secondary">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-2 border-t border-border bg-background-secondary">
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: 'Generate BoQ', action: () => handleQuickAction('generate_boq') },
            { label: 'Optimize', action: () => handleQuickAction('optimize_materials') },
            { label: 'Carbon', action: () => handleQuickAction('calculate_carbon') },
            { label: 'Sustainability', action: () => handleQuickAction('get_sustainability_score') },
          ].map((qa, idx) => (
            <button
              key={idx}
              onClick={qa.action}
              disabled={isLoading || !project?.isConfigured}
              className="px-2.5 py-1 text-xs bg-background-tertiary hover:bg-background-secondary border border-border rounded-full text-foreground-secondary transition-colors disabled:opacity-50"
            >
              {qa.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-background-secondary">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything or say 'generate boq'..."
            disabled={isLoading || !!consentRequest}
            className="flex-1 input text-sm"
          />
          <button 
            type="submit"
            disabled={isLoading || !input.trim() || !!consentRequest}
            className="btn btn-primary px-4"
          >
            <FaPaperPlane />
          </button>
        </div>
      </form>
    </div>
  );

  function handleQuickAction(toolName) {
    if (!project?.isConfigured) return;
    
    const tool = TOOLS[toolName];
    if (!tool) return;

    setIsLoading(true);
    setMessages(prev => [...prev, {
      role: 'user',
      content: tool.name.replace(/_/g, ' '),
      timestamp: new Date()
    }]);

    setConsentRequest({
      tool: toolName,
      message: tool.consentMessage,
      params: toolName === 'optimize_materials' ? { mode: 'balanced' } : {}
    });
  }
}

function formatToolResponse(toolName, result) {
  switch (toolName) {
    case 'get_material_info':
      if (!result.data?.length) return result.message;
      return result.message + '\n\n' + result.data.map(m => 
        `**${m.name}** (${m.category})\n- Rate: Rs ${m.rate}/${m.unit}\n- Carbon: ${m.carbon} kg CO2\n- IS Code: ${m.isCode || 'N/A'}\n- Grade: ${m.grade || 'N/A'}`
      ).join('\n\n');

    case 'compare_materials':
      if (!result.data) return result.message;
      const { materialA, materialB } = result.data;
      return `**Comparison: ${materialA.name} vs ${materialB.name}**\n\n| Property | ${materialA.name} | ${materialB.name} |\n|----------|------------------|------------------|\n| Rate | Rs ${materialA.rate} | Rs ${materialB.rate} |\n| Carbon | ${materialA.carbon} kg | ${materialB.carbon} kg |\n| Strength | ${materialA.strength} MPa | ${materialB.strength} MPa |\n| Durability | ${materialA.durability} yrs | ${materialB.durability} yrs |\n| Recycled | ${materialA.recycled}% | ${materialB.recycled}% |`;

    case 'get_project_summary':
      if (!result.data) return result.message;
      const d = result.data;
      return `**Project: ${d.name}**\n\n- Location: ${d.location}\n- Area: ${d.totalArea} sqm (${d.numFloors} floors)\n- Soil: ${d.soilType} | Seismic: Zone ${d.seismicZone}\n\n**Materials:**\n${d.materials.map(m => `- ${m.category}: ${m.name} @ Rs ${m.rate}/${m.unit}`).join('\n') || 'None selected'}\n\n**Sustainability:**\n- Priority: ${d.sustainability?.priority}\n- Rainwater: ${d.sustainability?.rainwaterHarvesting ? 'Yes' : 'No'}\n- Solar: ${d.sustainability?.solarWaterHeater ? 'Yes' : 'No'}`;

    case 'calculate_carbon':
      if (!result.data) return result.message;
      return result.message + '\n\n' + (result.data.breakdown?.map(b => `- ${b.category}: ${b.carbon} kg CO2`).join('\n') || '') + `\n\nPer sqm: ${result.data.perSqm} kg CO2`;

    case 'get_sustainability_score':
      if (!result.data) return result.message;
      const s = result.data;
      return result.message + `\n\n- IGBC: ${s.igbc}/100\n- LEED: ${s.leed}/100\n- Recycled content: ${s.recycledContent}%\n\nFeatures:\n- Rainwater harvesting: ${s.features.rainwaterHarvesting ? 'Yes' : 'No'}\n- Solar water heater: ${s.features.solarWaterHeater ? 'Yes' : 'No'}\n- STP: ${s.features.stp ? 'Yes' : 'No'}`;

    case 'navigate_to':
      return result.message;

    default:
      return result.message || 'Action completed.';
  }
}

export default LLMSidebar;

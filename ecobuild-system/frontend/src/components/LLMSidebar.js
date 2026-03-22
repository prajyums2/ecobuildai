import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useProject } from '../context/ProjectContext';
import { FaTimes, FaPaperPlane, FaRobot, FaUser, FaLeaf, FaBuilding, FaSpinner } from 'react-icons/fa';
import { generateAIResponse } from '../services/aiService';

function LLMSidebar() {
  const { project } = useProject();
  
  // Define getWelcomeMessage first
  const getWelcomeMessage = (proj) => {
    if (!proj || !proj.isConfigured) {
      return `Hello! Welcome to EcoBuild! 👋

I'm your AI construction assistant, and I'm excited to help you build something amazing! Think of me as your sustainable construction expert.

**I can help you with:**
• Material selection optimized for your climate
• Cost estimation with local rates
• Sustainability strategies
• Foundation and structural advice
• GRIHA/IGBC/LEED rating guidance

**Ready to start?** You can ask me anything right now, or click "New Project" to configure your building and get personalized recommendations!

What would you like to know about sustainable construction?`;
    }

    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const materialCount = Object.keys(proj.materialSelections || {}).length;
    
    return `${timeGreeting}! Great to see you working on **${proj.name}**! 🏗️

I can see you have a ${proj.buildingParams?.buildingType || 'residential'} project (${proj.buildingParams?.builtUpArea} sqm) in ${proj.location?.district || 'Kerala'}.

**How can I assist you today?**

Ask me about:
• "What materials should I use?" - Get tailored recommendations
• "How much will this cost?" - Detailed cost breakdown
• "How can I improve sustainability?" - GRIHA/LEED tips
• "How can I reduce carbon footprint?" - Sustainability tips
• Or just tell me what you're thinking about!

${materialCount === 0 ? '💡 **Tip:** You haven\'t selected materials yet. Ask me for recommendations!' : `✅ You've selected ${materialCount} material categories`}`;
  };
  
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const messagesEndRef = useRef(null);

  // Set initial message after mount
  useEffect(() => {
    if (messages[0].content === '') {
      setMessages([{ role: 'assistant', content: getWelcomeMessage(project), timestamp: new Date() }]);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (project?.isConfigured && messages.length === 1) {
      setMessages([{
        role: 'assistant',
        content: getWelcomeMessage(project),
        timestamp: new Date()
      }]);
    }
  }, [project?.isConfigured]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { 
      role: 'user', 
      content: input,
      timestamp: new Date()
    };
    
    // Add user message immediately
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Pass chat history for context (last 10 messages)
      const chatHistory = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }));
      
      // Call the AI service
      const response = await generateAIResponse(input, project, chatHistory);
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I apologize, but I encountered a technical issue. Please try again in a moment.',
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
            <p className="text-xs text-foreground-muted">Your Construction Assistant</p>
          </div>
        </div>
        <button onClick={() => setIsOpen(false)} className="btn btn-ghost p-2">
          <FaTimes />
        </button>
      </div>

      {/* Project Context */}
      {project.isConfigured && (
        <div className="px-4 py-3 bg-background-tertiary border-b border-border">
          <div className="flex items-center gap-2 text-sm">
            <FaBuilding className="text-primary" />
            <span className="font-medium text-foreground">{project.name}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-foreground-secondary mt-1">
            <FaLeaf className="text-success" />
            <span>{Object.keys(project.materialSelections).length} materials selected</span>
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
        {isLoading && (
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

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-background-secondary">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about your project..."
            disabled={isLoading}
            className="flex-1 input text-sm"
          />
          <button 
            type="submit"
            disabled={isLoading || !input.trim()}
            className="btn btn-primary px-4"
          >
            <FaPaperPlane />
          </button>
        </div>
      </form>
    </div>
  );
}

export default LLMSidebar;
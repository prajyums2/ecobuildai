import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { EngineerProvider } from './context/EngineerContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import OnboardingTutorial from './components/OnboardingTutorial';
import Dashboard from './pages/Dashboard';
import MaterialOptimizer from './pages/MaterialOptimizer';
import BIMIntegration from './pages/BIMIntegration';
import Reports from './pages/Reports';
import ProjectSetup from './pages/ProjectSetup';
import Materials from './pages/Materials';
import ProjectManager from './pages/ProjectManager';
import EngineerProfile from './pages/EngineerProfile';
import Login from './pages/Login';
import Register from './pages/Register';
import LLMSidebar from './components/LLMSidebar';

function App() {
  const [showTutorial, setShowTutorial] = useState(false);
  const [aiSidebarOpen, setAiSidebarOpen] = useState(true);

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('ecobuild-tutorial-seen');
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }

    // Listen for AI assistant toggle event
    const handleToggleAI = () => {
      setAiSidebarOpen(prev => !prev);
    };

    window.addEventListener('toggleAIAssistant', handleToggleAI);
    return () => window.removeEventListener('toggleAIAssistant', handleToggleAI);
  }, []);

  const handleTutorialComplete = () => {
    setShowTutorial(false);
  };

  return (
    <AuthProvider>
      <EngineerProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected Routes */}
          <Route path="/*" element={
            <ProtectedRoute>
              <div className="flex h-screen bg-background text-foreground font-sans">
                {/* Onboarding Tutorial */}
                {showTutorial && (
                  <OnboardingTutorial onComplete={handleTutorialComplete} />
                )}

                <Sidebar />
                
                <div className="flex-1 flex flex-col overflow-hidden">
                  <Header />
                  
                  <div className="flex-1 flex overflow-hidden">
                    {/* Main Content */}
                    <main className="flex-1 overflow-y-auto p-6 bg-background">
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/setup" element={<ProjectSetup />} />
                        <Route path="/materials" element={<Materials />} />
                        <Route path="/optimizer" element={<MaterialOptimizer />} />
                        <Route path="/bim" element={<BIMIntegration />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/projects" element={<ProjectManager />} />
                        <Route path="/profile" element={<EngineerProfile />} />
                      </Routes>
                    </main>
                    
                    {/* Right LLM Sidebar */}
                    {aiSidebarOpen && <LLMSidebar />}
                  </div>
                </div>
              </div>
            </ProtectedRoute>
          } />
        </Routes>
      </EngineerProvider>
    </AuthProvider>
  );
}

export default App;

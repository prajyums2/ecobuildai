import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { FaSun, FaMoon, FaRobot, FaCog, FaBars, FaTimes, FaUser, FaSignOutAlt } from 'react-icons/fa';

function Header() {
  const { isDark, toggleTheme } = useTheme();
  const { project } = useProject();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleAIAssistant = () => {
    // Toggle AI sidebar visibility - this will be handled by a global state or event
    window.dispatchEvent(new CustomEvent('toggleAIAssistant'));
  };

  const handleSettings = () => {
    setShowSettings(!showSettings);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-background-secondary border-b border-border flex items-center justify-between px-6 no-print relative">
      {/* Left: Project Info */}
      <div className="flex items-center gap-4">
        {project?.name ? (
          <div>
            <h2 className="text-foreground font-semibold">{project.name}</h2>
            <p className="text-xs text-foreground-tertiary">
              {project.location?.district === 'thrissur' ? 'Thrissur, Kerala' : `${project.location?.lat?.toFixed(4) || 0}, ${project.location?.lon?.toFixed(4) || 0}`}
              {project.buildingParams?.totalBudget ? ` | Budget: ₹${project.buildingParams.totalBudget}L` : ''}
            </p>
          </div>
        ) : (
          <div>
            <h2 className="text-foreground font-semibold">No Project Configured</h2>
            <p className="text-xs text-foreground-tertiary">Click "New Project" to get started</p>
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="btn btn-ghost p-2"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <FaSun className="text-warning" /> : <FaMoon className="text-foreground-secondary" />}
        </button>

        {/* AI Assistant Toggle */}
        <button
          onClick={handleAIAssistant}
          className="btn btn-ghost p-2 text-primary"
          title="Toggle AI Assistant"
        >
          <FaRobot />
        </button>

        {/* Settings */}
        <div className="relative">
          <button 
            onClick={handleSettings}
            className="btn btn-ghost p-2"
            title="Settings"
          >
            <FaCog />
          </button>

          {/* Settings Dropdown */}
          {showSettings && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-background-card border border-border rounded-xl shadow-xl z-50">
              <div className="p-4">
                <h4 className="font-semibold text-foreground mb-3">Quick Settings</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground-secondary">Auto-save</span>
                    <button className="w-10 h-5 bg-primary rounded-full relative">
                      <span className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></span>
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground-secondary">Show Tutorials</span>
                    <button 
                      onClick={() => {
                        localStorage.removeItem('ecobuild-tutorial-seen');
                        window.location.reload();
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      Reset
                    </button>
                  </div>

                  <div className="border-t border-border pt-3">
                    <p className="text-xs text-foreground-muted mb-2">Optimization Preferences</p>
                    <select className="input text-sm w-full">
                      <option>Sustainability First</option>
                      <option>Cost Optimized</option>
                      <option>Balanced</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="btn btn-ghost p-2 flex items-center gap-2"
            title={user?.full_name || 'User'}
          >
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-semibold">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : <FaUser />}
            </div>
            <span className="hidden md:block text-sm text-foreground-secondary max-w-[100px] truncate">
              {user?.full_name || 'User'}
            </span>
          </button>

          {/* User Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-background-card border border-border rounded-xl shadow-xl z-50">
              <div className="p-4">
                <div className="mb-3 pb-3 border-b border-border">
                  <p className="font-semibold text-foreground">{user?.full_name}</p>
                  <p className="text-xs text-foreground-muted">{user?.email}</p>
                  {user?.company && (
                    <p className="text-xs text-foreground-secondary mt-1">{user?.company}</p>
                  )}
                </div>
                
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-error/10 rounded-lg transition-colors"
                >
                  <FaSignOutAlt />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="btn btn-ghost p-2 lg:hidden"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
        >
          {showMobileMenu ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      {/* Click outside to close menus */}
      {(showSettings || showUserMenu) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowSettings(false);
            setShowUserMenu(false);
          }}
        />
      )}
    </header>
  );
}

export default Header;

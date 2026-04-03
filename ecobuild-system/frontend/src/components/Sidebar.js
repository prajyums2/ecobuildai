import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useProject } from '../context/ProjectContext';
import { useEngineer } from '../context/EngineerContext';
import { 
  FaHome, 
  FaCog,
  FaLayerGroup, 
  FaCube, 
  FaFileAlt,
  FaLeaf,
  FaPlus,
  FaFolder,
  FaUser,
  FaBox,
  FaLock,
  FaChevronLeft,
  FaChevronRight,
} from 'react-icons/fa';

function Sidebar({ isCollapsed, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark } = useTheme();
  const { project, projects, currentProjectId, projectCount, isFeatureLocked } = useProject();
  const { engineer, isConfigured: isEngineerConfigured } = useEngineer();

  const mainMenuItems = [
    { path: '/', icon: FaHome, label: 'Dashboard', feature: null },
    { path: '/setup', icon: FaCog, label: 'Project Setup', feature: null },
    { path: '/materials', icon: FaBox, label: 'Materials DB', feature: 'materials' },
    { path: '/optimizer', icon: FaLayerGroup, label: 'Material Optimizer', feature: 'optimizer' },
    { path: '/bim', icon: FaCube, label: 'BIM Integration', feature: 'bim' },
    { path: '/reports', icon: FaFileAlt, label: 'Reports', feature: 'reports' },
  ];

  const isActive = (path) => location.pathname === path;

  const handleNav = (item) => {
    if (item.feature && isFeatureLocked(item.feature)) {
      return;
    }
    navigate(item.path);
  };

  return (
    <aside 
      className={`bg-background-secondary border-r border-border flex flex-col no-print h-full transition-all duration-300 ease-in-out relative ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-6 z-20 w-6 h-6 bg-background-secondary border border-border rounded-full flex items-center justify-center hover:bg-background-tertiary transition-colors shadow-sm"
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <FaChevronRight className="text-xs text-foreground-secondary" /> : <FaChevronLeft className="text-xs text-foreground-secondary" />}
      </button>

      {/* Logo */}
      <div className={`p-4 border-b border-border transition-all duration-300 ${isCollapsed ? 'px-2' : ''}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-primary text-white shadow-lg flex-shrink-0`}>
            <FaLeaf className="text-xl" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h1 className="text-lg font-bold text-foreground">EcoBuild</h1>
              <p className="text-xs text-foreground-muted">LCA Decision Support</p>
            </div>
          )}
        </div>
      </div>

      {/* Project Manager */}
      <button 
        onClick={() => navigate('/projects')}
        className={`w-full text-left border-b border-border transition-all duration-300 hover:bg-background-tertiary ${
          isCollapsed ? 'px-2 py-3' : 'px-4 py-3'
        } ${isActive('/projects') ? 'bg-primary/10 border-l-2 border-l-primary' : 'bg-background-tertiary/50'}`}
        title={isCollapsed ? 'Project Manager' : ''}
      >
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'}`}>
          <FaFolder className="text-primary flex-shrink-0" />
          {!isCollapsed && (
            <>
              <span className="text-xs text-foreground-muted font-medium">Project Manager</span>
              {projectCount > 1 && <span className="text-xs text-primary ml-auto">{projectCount} →</span>}
            </>
          )}
        </div>
        {!isCollapsed && (
          project?.name ? (
            <p className="text-sm font-semibold text-foreground truncate mt-1" title={project.name}>{project.name}</p>
          ) : (
            <p className="text-sm text-foreground-muted italic mt-1">Click to select project</p>
          )
        )}
      </button>

      {/* New Project Button */}
      <div className={`transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-4'}`}>
        <button
          onClick={() => navigate('/projects')}
          className={`btn btn-primary ${isCollapsed ? 'w-full justify-center p-2' : 'w-full justify-center'}`}
          title={isCollapsed ? 'New Project' : ''}
        >
          <FaPlus className={isCollapsed ? '' : 'mr-2'} />
          {!isCollapsed && (projectCount > 0 ? 'Switch Project' : 'New Project')}
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-2 px-2 space-y-1 overflow-y-auto overflow-x-hidden">
        {mainMenuItems.map((item) => {
          const locked = item.feature && isFeatureLocked(item.feature);
          return (
            <button
              key={item.path}
              onClick={() => handleNav(item)}
              className={`nav-item w-full text-left transition-all duration-300 ${
                isCollapsed ? 'justify-center px-2' : ''
              } ${isActive(item.path) ? 'bg-primary/10 border-l-2 border-primary' : ''} ${
                locked ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={locked}
              title={locked ? 'Complete previous step to unlock' : isCollapsed ? item.label : ''}
            >
              <item.icon className="text-lg flex-shrink-0" />
              {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
              {!isCollapsed && locked && <FaLock className="ml-auto text-xs" />}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`border-t border-border transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-4'}`}>
        {/* Engineer Profile */}
        <button 
          onClick={() => navigate('/profile')}
          className={`w-full text-left bg-background-tertiary rounded-lg transition-all duration-300 hover:bg-background-tertiary/80 ${
            isCollapsed ? 'p-2 flex justify-center' : 'p-3 mb-3'
          } ${isActive('/profile') ? 'ring-2 ring-primary' : ''}`}
          title={isCollapsed ? 'Engineer Profile' : ''}
        >
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'}`}>
            <FaUser className="text-primary flex-shrink-0" />
            {!isCollapsed && (
              <>
                <span className="text-xs text-foreground-muted font-medium">Engineer Profile</span>
              </>
            )}
          </div>
          {!isCollapsed && isEngineerConfigured && engineer.name && (
            <>
              <p className="text-xs font-semibold text-foreground truncate mt-1">{engineer.name}</p>
              {engineer.company && <p className="text-xs text-foreground-muted truncate">{engineer.company}</p>}
            </>
          )}
        </button>
        
        {!isCollapsed && (
          <div className="bg-background-tertiary rounded-lg p-3">
            <p className="text-xs text-foreground-tertiary mb-1">GEC Thrissur</p>
            <p className="text-xs text-primary font-mono">v1.0.0 | 140+ Suppliers</p>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;

import React from 'react';
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
  FaLock
} from 'react-icons/fa';

function Sidebar() {
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
    <aside className="w-64 bg-background-secondary border-r border-border flex flex-col no-print h-full">
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-primary text-white shadow-lg`}>
            <FaLeaf className="text-xl" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">EcoBuild</h1>
            <p className="text-xs text-foreground-muted">LCA Decision Support</p>
          </div>
        </div>
      </div>

      {/* Project Manager - Clickable Info Section */}
      <button 
        onClick={() => navigate('/projects')}
        className={`w-full text-left px-4 py-3 border-b border-border transition-colors hover:bg-background-tertiary ${isActive('/projects') ? 'bg-primary/10 border-l-2 border-l-primary' : 'bg-background-tertiary/50'}`}
      >
        <div className="flex items-center gap-2 text-xs text-foreground-muted mb-1">
          <FaFolder className="text-primary" />
          <span className="font-medium">Project Manager</span>
          {projectCount > 1 && (
            <span className="text-xs text-primary ml-auto">{projectCount} projects →</span>
          )}
        </div>
        {project?.name ? (
          <p className="text-sm font-semibold text-foreground truncate" title={project.name}>
            {project.name}
          </p>
        ) : (
          <p className="text-sm text-foreground-muted italic">Click to select project</p>
        )}
      </button>

      {/* New Project Button */}
      <div className="p-4">
        <button
          onClick={() => navigate('/projects')}
          className="btn btn-primary w-full justify-center"
        >
          <FaPlus className="mr-2" />
          {projectCount > 0 ? 'Switch Project' : 'New Project'}
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-2 px-3 space-y-1 overflow-y-auto">
        {mainMenuItems.map((item) => {
          const locked = item.feature && isFeatureLocked(item.feature);
          return (
            <button
              key={item.path}
              onClick={() => handleNav(item)}
              className={`nav-item w-full text-left ${isActive(item.path) ? 'bg-primary/10 border-l-2 border-primary' : ''} ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={locked}
              title={locked ? 'Complete previous step to unlock' : item.label}
            >
              <item.icon className="text-lg" />
              <span className="text-sm font-medium">{item.label}</span>
              {locked && <FaLock className="ml-auto text-xs" />}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-border">
        {/* Engineer Profile - Clickable Info Section */}
        <button 
          onClick={() => navigate('/profile')}
          className={`w-full text-left bg-background-tertiary rounded-lg p-3 mb-3 hover:bg-background-tertiary/80 transition-colors ${isActive('/profile') ? 'ring-2 ring-primary' : ''}`}
        >
          <div className="flex items-center gap-2 text-xs text-foreground-muted mb-1">
            <FaUser className="text-primary" />
            <span className="font-medium">Engineer Profile</span>
          </div>
          {isEngineerConfigured && engineer.name ? (
            <>
              <p className="text-xs font-semibold text-foreground truncate">{engineer.name}</p>
              {engineer.company && (
                <p className="text-xs text-foreground-muted truncate">{engineer.company}</p>
              )}
            </>
          ) : (
            <p className="text-xs text-foreground-muted italic">Click to setup profile</p>
          )}
        </button>
        
        <div className="bg-background-tertiary rounded-lg p-3">
          <p className="text-xs text-foreground-tertiary mb-1">GEC Thrissur</p>
          <p className="text-xs text-primary font-mono">v1.0.0 | 140+ Suppliers</p>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;

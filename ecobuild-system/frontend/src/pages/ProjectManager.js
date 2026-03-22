import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { 
  FaPlus, 
  FaTrash, 
  FaCopy, 
  FaCheck, 
  FaEdit,
  FaFolder,
  FaCalendarAlt,
  FaMapMarkerAlt
} from 'react-icons/fa';

function ProjectManager() {
  const { 
    projects, 
    currentProjectId, 
    createProject, 
    deleteProject, 
    duplicateProject, 
    switchProject 
  } = useProject();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const handleCreate = () => {
    if (newProjectName.trim()) {
      createProject(newProjectName.trim(), newProjectDesc.trim());
      setNewProjectName('');
      setNewProjectDesc('');
      setShowCreateModal(false);
    }
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to delete project "${name}"? This action cannot be undone.`)) {
      deleteProject(id);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Project Manager</h1>
          <p className="text-foreground-muted">Manage multiple construction projects</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          <FaPlus className="mr-2" />
          New Project
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-6">
          <h3 className="text-sm text-foreground-muted mb-2">Total Projects</h3>
          <p className="text-3xl font-bold text-foreground">{projects.length}</p>
        </div>
        <div className="card p-6">
          <h3 className="text-sm text-foreground-muted mb-2">Configured</h3>
          <p className="text-3xl font-bold text-green-600">
            {projects.filter(p => p.isConfigured).length}
          </p>
        </div>
        <div className="card p-6">
          <h3 className="text-sm text-foreground-muted mb-2">Active Project</h3>
          <p className="text-xl font-bold text-primary truncate">
            {projects.find(p => p.id === currentProjectId)?.name || 'None'}
          </p>
        </div>
      </div>

      {/* Project List */}
      <div className="card">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold">Your Projects</h2>
        </div>
        
        {projects.length === 0 ? (
          <div className="p-12 text-center">
            <div className="empty-state-icon mx-auto mb-6">
              <FaFolder className="text-3xl" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3">No Projects Yet</h3>
            <p className="text-foreground-secondary mb-6">
              Create your first project to start analyzing sustainable construction options.
            </p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
            >
              <FaPlus className="mr-2" />
              Create First Project
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {projects.map((proj) => (
              <div 
                key={proj.id}
                className={`p-6 hover:bg-background-tertiary/50 transition-colors ${
                  proj.id === currentProjectId ? 'bg-primary/5 border-l-4 border-primary' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {proj.id === currentProjectId && (
                        <span className="px-2 py-1 bg-primary text-white text-xs rounded">
                          Active
                        </span>
                      )}
                      {proj.isConfigured && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                          Configured
                        </span>
                      )}
                    </div>
                    
                    {editingId === proj.id ? (
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="input"
                          autoFocus
                        />
                        <button 
                          onClick={() => {
                            // Update name logic here if needed
                            setEditingId(null);
                          }}
                          className="btn btn-primary btn-sm"
                        >
                          <FaCheck />
                        </button>
                      </div>
                    ) : (
                      <h3 className="text-lg font-semibold text-foreground">{proj.name}</h3>
                    )}
                    
                    {proj.description && (
                      <p className="text-sm text-foreground-muted mb-2">{proj.description}</p>
                    )}
                    
                    <div className="flex gap-4 text-xs text-foreground-muted">
                      <span className="flex items-center gap-1">
                        <FaCalendarAlt />
                        Created: {formatDate(proj.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <FaMapMarkerAlt />
                        {proj.location.district || 'Not set'}
                      </span>
                      {proj.buildingParams.plotArea > 0 && (
                        <span>
                          {proj.buildingParams.plotArea} sqm
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {proj.id !== currentProjectId && (
                      <button
                        onClick={() => switchProject(proj.id)}
                        className="btn btn-secondary btn-sm"
                      >
                        Switch
                      </button>
                    )}
                    <button
                      onClick={() => duplicateProject(proj.id)}
                      className="btn btn-secondary btn-sm"
                      title="Duplicate"
                    >
                      <FaCopy />
                    </button>
                    <button
                      onClick={() => handleDelete(proj.id, proj.name)}
                      className="btn btn-secondary btn-sm text-red-600 hover:text-red-700"
                      title="Delete"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card w-full max-w-md m-4">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold">Create New Project</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Project Name *</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="input w-full"
                  placeholder="e.g., GEC Thrissur Academic Block"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="input w-full"
                  rows={3}
                  placeholder="Brief description of the project..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-2 justify-end">
              <button 
                onClick={() => setShowCreateModal(false)} 
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreate} 
                className="btn btn-primary"
                disabled={!newProjectName.trim()}
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectManager;
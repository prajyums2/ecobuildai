import React from 'react';
import { useProject } from '../context/ProjectContext';
import { FaCheck, FaLock, FaLockOpen, FaHome, FaBox, FaClipboardList, FaFileAlt, FaLightbulb } from 'react-icons/fa';

const workflowSteps = [
  { id: 0, key: 'start', label: 'Start', description: 'Create Project', icon: FaHome },
  { id: 1, key: 'setup', label: 'Setup', description: 'Project Details', icon: FaHome },
  { id: 2, key: 'materials', label: 'Materials', description: 'Select Materials', icon: FaBox },
  { id: 3, key: 'boq', label: 'BoQ', description: 'Generate Estimates', icon: FaClipboardList },
  { id: 4, key: 'reports', label: 'Reports', description: 'View Analysis', icon: FaFileAlt },
];

function WorkflowProgress() {
  const { project, isFeatureLocked, getWorkflowStep, switchProject, projects } = useProject();
  
  const currentStep = getWorkflowStep();
  
  // If no project, show start screen
  if (!project || currentStep === 0) {
    return (
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-6 mb-6">
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <FaLightbulb className="text-yellow-500" />
          Welcome to EcoBuild
        </h2>
        <p className="text-foreground-secondary mb-4">
          Start by creating a project to estimate material quantities, generate BoQ, and assess sustainability.
        </p>
        <div className="flex flex-wrap gap-2">
          {projects.length === 0 ? (
            <div className="text-center w-full py-4">
              <p className="text-foreground-secondary">No projects yet. Go to Project Setup to create one.</p>
            </div>
          ) : (
            projects.map(p => (
              <button
                key={p.id}
                onClick={() => switchProject(p.id)}
                className="btn btn-secondary"
              >
                {p.name}
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  const getStepStatus = (stepId) => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'current';
    return 'locked';
  };

  return (
    <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between overflow-x-auto">
        {workflowSteps.slice(1).map((step, index) => {
          const status = getStepStatus(step.id);
          const Icon = step.icon;
          const locked = status === 'locked';
          
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center min-w-[80px]">
                <div 
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center transition-all
                    ${status === 'completed' ? 'bg-success text-white' : ''}
                    ${status === 'current' ? 'bg-primary text-white ring-4 ring-primary/30 animate-pulse' : ''}
                    ${status === 'locked' ? 'bg-gray-200 dark:bg-gray-700 text-gray-400' : ''}
                  `}
                >
                  {status === 'completed' ? <FaCheck /> : <Icon />}
                </div>
                <span className={`text-xs mt-2 font-medium ${status === 'current' ? 'text-primary' : 'text-foreground-secondary'}`}>
                  {step.label}
                </span>
              </div>
              {index < workflowSteps.length - 2 && (
                <div className={`flex-1 h-1 mx-2 rounded ${step.id < currentStep ? 'bg-success' : 'bg-gray-200 dark:bg-gray-700'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      {/* Current Status Message */}
      <div className="mt-4 text-center">
        <p className="text-sm text-foreground-secondary">
          {currentStep === 1 && "Project created! Now select materials for your project."}
          {currentStep === 2 && "Materials selected! Generate BoQ to see cost estimates."}
          {currentStep === 3 && "BoQ generated! View detailed reports and sustainability analysis."}
          {currentStep === 4 && "All complete! You can modify any section."}
        </p>
      </div>
    </div>
  );
}

export default WorkflowProgress;

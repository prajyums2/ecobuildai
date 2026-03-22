import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import QuantitySurveyView from '../components/QuantitySurveyView';
import WorkflowProgress from '../components/WorkflowProgress';
import { FaPlus, FaArrowRight, FaLeaf, FaRupeeSign, FaChartLine, FaRecycle, FaCheckCircle, FaMapMarkerAlt } from 'react-icons/fa';

function Dashboard() {
  const navigate = useNavigate();
  const { project } = useProject();

  const analysisComplete = project && Object.values(project.analysisResults || {}).some(r => r !== null);

  // Show empty state if no project configured
  if (!project || !project.isConfigured) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="empty-state-icon mb-6">
            <FaPlus className="text-3xl" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Welcome to EcoBuild
          </h2>
          <p className="text-foreground-secondary mb-6">
            Start by creating a new project to begin your sustainable construction analysis. 
            Configure your location and building parameters to get started.
          </p>
          <button
            onClick={() => navigate('/setup')}
            className="btn btn-primary"
          >
            <FaPlus className="mr-2" />
            Create New Project
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Workflow Progress */}
      <WorkflowProgress />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Project Dashboard</h1>
          <p className="text-foreground-secondary mt-1 flex items-center gap-2">
            <FaMapMarkerAlt className="text-primary" />
            {project?.name || 'No Project'} | {project?.location?.district || `${project?.location?.lat?.toFixed(4) || 0}, ${project?.location?.lon?.toFixed(4) || 0}`}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/reports')}
            className="btn btn-secondary"
            disabled={!analysisComplete}
          >
            View Reports
          </button>
          <button
            onClick={() => navigate('/optimizer')}
            className="btn btn-primary"
          >
            Run Analysis
            <FaArrowRight className="ml-2" />
          </button>
        </div>
      </div>

      {/* Quantity Survey View (QSV) */}
      <QuantitySurveyView />

      {/* Quick Stats or Empty State */}
      {!analysisComplete ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <div className="empty-state-icon mx-auto mb-4">
              <FaChartLine className="text-3xl" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Analysis Results Yet
            </h3>
            <p className="text-foreground-secondary max-w-md mx-auto mb-6">
              Your project is configured. Run the material optimizer to see sustainability metrics, 
              cost analysis, and compliance results.
            </p>
            <button
              onClick={() => navigate('/optimizer')}
              className="btn btn-primary"
            >
              <FaArrowRight className="mr-2" />
              Start Material Optimization
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-4 gap-4">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-2">
                <FaLeaf className="text-primary text-xl" />
                <span className="badge badge-success">-{project.analysisResults.optimization?.carbonSavings || 0}%</span>
              </div>
              <div className="text-2xl font-bold text-foreground font-mono">
                {project.analysisResults.optimization?.totalCarbonSaved || 0}
              </div>
              <div className="text-sm text-foreground-secondary">Tons CO₂ Saved</div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between mb-2">
                <FaRupeeSign className="text-primary text-xl" />
                <span className="badge badge-success">-{project.analysisResults.optimization?.costSavings || 0}%</span>
              </div>
              <div className="text-2xl font-bold text-foreground font-mono">
                ₹{((project.analysisResults.optimization?.totalCostSaved || 0) / 100000).toFixed(1)}L
              </div>
              <div className="text-sm text-foreground-secondary">Cost Savings</div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between mb-2">
                <FaRecycle className="text-primary text-xl" />
                <span className="badge badge-success">+{project.analysisResults.optimization?.recycledContent || 0}%</span>
              </div>
              <div className="text-2xl font-bold text-foreground font-mono">
                {project.analysisResults.optimization?.recycledContent || 0}%
              </div>
              <div className="text-sm text-foreground-secondary">Recycled Content</div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between mb-2">
                <FaCheckCircle className="text-primary text-xl" />
                <span className="badge badge-success">High</span>
              </div>
              <div className="text-2xl font-bold text-foreground font-mono">
                {project.analysisResults.compliance?.summary?.compliancePercentage || 0}%
              </div>
              <div className="text-sm text-foreground-secondary">Compliance Score</div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-foreground">Recent Analysis Results</h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-2 gap-4">
                {project.analysisResults.optimization && (
                  <div className="p-4 bg-background-tertiary rounded-lg">
                    <h4 className="font-medium text-foreground mb-2">Material Optimization</h4>
                    <p className="text-sm text-foreground-secondary">
                      {Object.keys(project.materialSelections).length} materials optimized
                    </p>
                  </div>
                )}
                {project.analysisResults.compliance && (
                  <div className="p-4 bg-background-tertiary rounded-lg">
                    <h4 className="font-medium text-foreground mb-2">Compliance Check</h4>
                    <p className="text-sm text-foreground-secondary">
                      {project.analysisResults.compliance.summary?.passed || 0}/{project.analysisResults.compliance.summary?.totalChecks || 0} checks passed
                    </p>
                  </div>
                )}
                {project.analysisResults.environmental && (
                  <div className="p-4 bg-background-tertiary rounded-lg">
                    <h4 className="font-medium text-foreground mb-2">Environmental Data</h4>
                    <p className="text-sm text-foreground-secondary">
                      Rainfall: {project.analysisResults.environmental.climate?.rainfall_intensity_mm_year}mm/year
                    </p>
                  </div>
                )}
                {project.analysisResults.operationalCarbon && (
                  <div className="p-4 bg-background-tertiary rounded-lg">
                    <h4 className="font-medium text-foreground mb-2">Operational Carbon</h4>
                    <p className="text-sm text-foreground-secondary">
                      {project.analysisResults.operationalCarbon.annual_operational_carbon_kg} kg CO₂/year
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;
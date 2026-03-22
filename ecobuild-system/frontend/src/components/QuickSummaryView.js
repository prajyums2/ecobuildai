import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { FaArrowRight, FaLeaf, FaRupeeSign, FaCheckCircle, FaChartLine } from 'react-icons/fa';

function QuickSummaryView() {
  const navigate = useNavigate();
  const { project } = useProject();

  if (!project.isConfigured) return null;

  const hasResults = Object.values(project.analysisResults).some(r => r !== null);

  return (
    <div className="card mb-6 bg-gradient-to-r from-primary-bg to-background-tertiary border-primary">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg">
              <FaChartLine className="text-3xl" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Quick Summary View (QSV)</h3>
              <p className="text-foreground-secondary text-sm">
                {project.name} • {project.buildingParams.plotArea} sqm • {Object.keys(project.materialSelections).length} materials
              </p>
            </div>
          </div>

          {hasResults ? (
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="flex items-center gap-2 text-success mb-1">
                  <FaLeaf />
                  <span className="text-2xl font-bold font-mono">
                    {project.analysisResults.optimization?.carbon_reduction || 0}%
                  </span>
                </div>
                <p className="text-xs text-foreground-secondary">Carbon Saved</p>
              </div>

              <div className="text-center">
                <div className="flex items-center gap-2 text-success mb-1">
                  <FaRupeeSign />
                  <span className="text-2xl font-bold font-mono">
                    ₹{((project.analysisResults.optimization?.cost_savings || 0) / 100000).toFixed(1)}L
                  </span>
                </div>
                <p className="text-xs text-foreground-secondary">Cost Savings</p>
              </div>

              <div className="text-center">
                <div className="flex items-center gap-2 text-primary mb-1">
                  <FaCheckCircle />
                  <span className="text-2xl font-bold font-mono">
                    {project.analysisResults.compliance?.summary?.compliance_percentage || 0}%
                  </span>
                </div>
                <p className="text-xs text-foreground-secondary">Compliance</p>
              </div>

              <button
                onClick={() => navigate('/reports')}
                className="btn btn-primary"
              >
                View Full Report
                <FaArrowRight className="ml-2" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <p className="text-foreground-secondary">Run analysis to see results</p>
              <button
                onClick={() => navigate('/optimizer')}
                className="btn btn-primary"
              >
                Start Analysis
                <FaArrowRight className="ml-2" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default QuickSummaryView;
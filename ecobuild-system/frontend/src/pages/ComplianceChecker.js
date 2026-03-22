import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { ecoBuildAPI } from '../services/api';
import { FaClipboardCheck, FaSpinner, FaArrowRight, FaExclamationTriangle, FaCheckCircle, FaBuilding } from 'react-icons/fa';

function ComplianceChecker() {
  const navigate = useNavigate();
  const { project, updateAnalysisResults } = useProject();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!project || !project.isConfigured) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="empty-state-icon mb-6">
            <FaClipboardCheck className="text-3xl" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Configure Your Project First
          </h2>
          <p className="text-foreground-secondary mb-6">
            Set up your building parameters to check compliance with building regulations.
          </p>
          <button
            onClick={() => navigate('/setup')}
            className="btn btn-primary"
          >
            <FaArrowRight className="mr-2" />
            Go to Project Setup
          </button>
        </div>
      </div>
    );
  }

  const handleCheckCompliance = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await ecoBuildAPI.checkCompliance({
        plot_area_sqm: project.buildingParams.plotArea,
        building_footprint_sqm: project.buildingParams.builtUpArea / project.buildingParams.numFloors,
        total_built_up_area_sqm: project.buildingParams.builtUpArea,
        num_floors: project.buildingParams.numFloors,
        building_height_m: project.buildingParams.height,
        road_width_m: project.buildingParams.roadWidth,
        zone_type: 'residential',
        building_type: project.buildingClassification?.buildingType || 'residential_individual',
        front_setback_m: project.buildingParams.setbacks?.front || project.buildingParams.frontSetback || 0,
        rear_setback_m: project.buildingParams.setbacks?.rear || project.buildingParams.rearSetback || 0,
        side1_setback_m: project.buildingParams.setbacks?.side1 || project.buildingParams.side1Setback || 0,
        side2_setback_m: project.buildingParams.setbacks?.side2 || project.buildingParams.side2Setback || 0,
        num_parking_spaces: project.buildingParams.parkingProvided || project.buildingParams.parkingSpaces || 0,
        has_rainwater_harvesting: project.buildingParams.hasRainwaterHarvesting,
        has_solar_water_heater: project.buildingParams.hasSolarWaterHeater,
        has_sewage_treatment: project.buildingParams.hasSTP,
        num_units: project.buildingParams.numUnits || 1
      });

      setResults(response.data);
      updateAnalysisResults('compliance', response.data);
    } catch (err) {
      setError('Failed to check compliance. Please try again.');
      console.error('Compliance check error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Building Compliance Checker</h1>
          <p className="text-foreground-secondary mt-1">
            Building Rules Compliance | Setbacks | FAR | RWH
          </p>
        </div>
        <div className="flex gap-2">
          <span className="badge badge-info">IS 875</span>
          <span className="badge badge-info">NBC</span>
        </div>
      </div>

      {/* Project Parameters Display */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <FaBuilding />
            Project Parameters
          </h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-4 gap-4">
            <div className="p-3 bg-background-tertiary rounded-lg">
              <p className="text-xs text-foreground-secondary">Plot Area</p>
              <p className="font-mono font-semibold">{project.buildingParams.plotArea} sqm</p>
            </div>
            <div className="p-3 bg-background-tertiary rounded-lg">
              <p className="text-xs text-foreground-secondary">Built-up Area</p>
              <p className="font-mono font-semibold">{project.buildingParams.builtUpArea} sqm</p>
            </div>
            <div className="p-3 bg-background-tertiary rounded-lg">
              <p className="text-xs text-foreground-secondary">FAR</p>
              <p className="font-mono font-semibold">{(project.buildingParams.builtUpArea / project.buildingParams.plotArea).toFixed(2)}</p>
            </div>
            <div className="p-3 bg-background-tertiary rounded-lg">
              <p className="text-xs text-foreground-secondary">Road Width</p>
              <p className="font-mono font-semibold">{project.buildingParams.roadWidth} m</p>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleCheckCompliance}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? (
                <><FaSpinner className="animate-spin mr-2" /> Checking Compliance...</>
              ) : (
                <><FaClipboardCheck className="mr-2" /> Run Compliance Check</>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-error-bg border border-error rounded-lg text-error text-sm">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-4 gap-4">
            <div className="card p-6 text-center">
              <p className="text-3xl font-bold font-mono">{results.summary?.total_checks || 0}</p>
              <p className="text-sm text-foreground-secondary">Total Checks</p>
            </div>
            <div className="card p-6 text-center bg-success-bg">
              <p className="text-3xl font-bold font-mono text-success">{results.summary?.passed || 0}</p>
              <p className="text-sm text-foreground-secondary">Passed</p>
            </div>
            <div className="card p-6 text-center bg-error-bg">
              <p className="text-3xl font-bold font-mono text-error">{results.summary?.failed || 0}</p>
              <p className="text-sm text-foreground-secondary">Failed</p>
            </div>
            <div className="card p-6 text-center">
              <p className="text-3xl font-bold font-mono">{results.summary?.compliance_percentage || 0}%</p>
              <p className="text-sm text-foreground-secondary">Compliance</p>
            </div>
          </div>

          {/* Detailed Results */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-foreground">Detailed Compliance Report</h3>
            </div>
            <div className="card-body p-0">
              <table className="table">
                <thead>
                  <tr>
                    <th>Rule Code</th>
                    <th>Description</th>
                    <th>Requirement</th>
                    <th>Actual</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.compliance_results?.map((check, idx) => (
                    <tr key={idx}>
                      <td className="font-mono text-xs">{check.rule_code}</td>
                      <td>{check.description}</td>
                      <td className="text-foreground-secondary">{check.requirement}</td>
                      <td className="font-mono">{check.actual_value}</td>
                      <td>
                        {check.status === 'PASS' ? (
                          <span className="badge badge-success">PASS</span>
                        ) : check.status === 'FAIL' ? (
                          <span className="badge badge-error">FAIL</span>
                        ) : (
                          <span className="badge badge-warning">WARNING</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Critical Issues */}
          {results.critical_issues?.length > 0 && (
            <div className="card border-error">
              <div className="card-header bg-error-bg">
                <h3 className="font-semibold text-error flex items-center gap-2">
                  <FaExclamationTriangle />
                  Critical Issues Requiring Attention
                </h3>
              </div>
              <div className="card-body">
                <ul className="space-y-2">
                  {results.critical_issues.map((issue, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-error">
                      <FaExclamationTriangle className="mt-1 flex-shrink-0" />
                      <span>{issue.remarks}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Status */}
          <div className={`p-6 rounded-xl text-center font-bold text-lg ${
            results.summary?.overall_status === 'APPROVED' 
              ? 'bg-success-bg text-success' 
              : 'bg-warning-bg text-warning'
          }`}>
            {results.summary?.overall_status === 'APPROVED' ? (
              <><FaCheckCircle className="inline mr-2" /> PROJECT APPROVED FOR SUBMISSION</>
            ) : (
              <><FaExclamationTriangle className="inline mr-2" /> REQUIRES MODIFICATIONS</>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ComplianceChecker;
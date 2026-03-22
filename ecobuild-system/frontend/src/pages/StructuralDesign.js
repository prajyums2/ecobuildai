import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { ecoBuildAPI } from '../services/api';
import {
  FaCalculator,
  FaRulerCombined,
  FaBuilding,
  FaArrowRight,
  FaSpinner,
  FaCheck,
  FaTimes,
  FaInfoCircle,
  FaBalanceScale,
  FaCloud,
  FaLayerGroup,
  FaCubes,
  FaVectorSquare,
  FaExclamationTriangle,
  FaSave,
  FaBook
} from 'react-icons/fa';

const CONCRETE_GRADES = ['M15', 'M20', 'M25', 'M30', 'M35', 'M40'];
const STEEL_GRADES = ['Fe250', 'Fe415', 'Fe500', 'Fe550'];
const SEISMIC_ZONES = [
  { value: 'II', label: 'Zone II - Low Risk', factor: 0.10 },
  { value: 'III', label: 'Zone III - Moderate Risk', factor: 0.16 },
  { value: 'IV', label: 'Zone IV - High Risk', factor: 0.24 },
  { value: 'V', label: 'Zone V - Very High Risk', factor: 0.36 },
];
const OCCUPANCY_TYPES = [
  { value: 'residential', label: 'Residential', liveLoad: 2.0 },
  { value: 'commercial', label: 'Commercial/Office', liveLoad: 2.5 },
  { value: 'educational', label: 'Educational', liveLoad: 3.0 },
  { value: 'hospital', label: 'Hospital', liveLoad: 2.0 },
  { value: 'industrial', label: 'Industrial', liveLoad: 3.0 },
];

function StructuralDesign() {
  const navigate = useNavigate();
  const { project, updateAnalysisResults } = useProject();
  const [activeTab, setActiveTab] = useState('loads');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [isCodes, setIsCodes] = useState(null);
  const [citations, setCitations] = useState(null);

  const [buildingParams, setBuildingParams] = useState({
    numFloors: project?.buildingParams?.numFloors || 3,
    floorArea: project?.buildingParams?.builtUpArea || 200,
    floorHeight: 3.2,
    occupancy: 'educational',
    city: 'thrissur',
    seismicZone: 'III',
    structuralSystem: 'special_rc_frame',
    soilType: 'medium',
  });

  const [memberParams, setMemberParams] = useState({
    memberType: 'slab_one_way',
    span: 4,
    shortSpan: 4,
    longSpan: 5,
    thickness: 150,
    breadth: 300,
    depth: 450,
    height: 3,
    columnLoad: 800,
    columnBreadth: 300,
    columnDepth: 300,
    axialLoad: 800,
    moment: 20,
    shear: 50,
    concreteGrade: 'M20',
    steelGrade: 'Fe415',
    soilPressure: 100,
    liveLoad: 2.0,
    finishLoad: 0.5,
  });

  useEffect(() => {
    fetchIsCodes();
    fetchCitations();
    if (project?.analysisResults?.structural) {
      setResults(project.analysisResults.structural);
    }
  }, [project]);

  const fetchIsCodes = async () => {
    try {
      const response = await ecoBuildAPI.getISCodes();
      setIsCodes(response.data);
    } catch (error) {
      console.error('Failed to fetch IS codes:', error);
    }
  };

  const fetchCitations = async () => {
    try {
      const response = await ecoBuildAPI.getCitations();
      setCitations(response.data);
    } catch (error) {
      console.error('Failed to fetch citations:', error);
    }
  };

  const handleBuildingParamChange = (field, value) => {
    setBuildingParams(prev => ({ ...prev, [field]: value }));
  };

  const handleMemberParamChange = (field, value) => {
    setMemberParams(prev => ({ ...prev, [field]: value }));
  };

  const runFullAnalysis = async () => {
    setLoading(true);
    try {
      const response = await ecoBuildAPI.fullStructuralAnalysis({
        num_floors: buildingParams.numFloors,
        floor_area: buildingParams.floorArea,
        floor_height_m: buildingParams.floorHeight,
        occupancy: buildingParams.occupancy,
        city: buildingParams.city,
        lat: project?.location?.lat || 10.5,
        lon: project?.location?.lon || 76.2,
      });
      setResults(response.data);
      updateAnalysisResults('structural', response.data);
    } catch (error) {
      console.error('Failed to run analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const designMember = async () => {
    setLoading(true);
    try {
      const response = await ecoBuildAPI.designMember({
        member_type: memberParams.memberType,
        span: memberParams.span,
        short_span: memberParams.shortSpan,
        long_span: memberParams.longSpan,
        thickness: memberParams.thickness,
        breadth: memberParams.breadth,
        depth: memberParams.depth,
        height: memberParams.height,
        column_load: memberParams.columnLoad,
        column_breadth: memberParams.columnBreadth,
        column_depth: memberParams.columnDepth,
        axial_load: memberParams.axialLoad,
        moment: memberParams.moment,
        shear: memberParams.shear,
        concrete_grade: memberParams.concreteGrade,
        steel_grade: memberParams.steelGrade,
        soil_pressure: memberParams.soilPressure,
        live_load: memberParams.liveLoad,
        finish_load: memberParams.finishLoad,
      });
      setResults({ member: response.data });
    } catch (error) {
      console.error('Failed to design member:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderLoadInputs = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Number of Floors</label>
          <input
            type="number"
            value={buildingParams.numFloors}
            onChange={(e) => handleBuildingParamChange('numFloors', parseInt(e.target.value))}
            className="input w-full"
            min={1}
            max={20}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Floor Area (m²)</label>
          <input
            type="number"
            value={buildingParams.floorArea}
            onChange={(e) => handleBuildingParamChange('floorArea', parseFloat(e.target.value))}
            className="input w-full"
            min={50}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Floor Height (m)</label>
          <input
            type="number"
            value={buildingParams.floorHeight}
            onChange={(e) => handleBuildingParamChange('floorHeight', parseFloat(e.target.value))}
            className="input w-full"
            step={0.1}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Occupancy Type</label>
          <select
            value={buildingParams.occupancy}
            onChange={(e) => handleBuildingParamChange('occupancy', e.target.value)}
            className="input w-full"
          >
            {OCCUPANCY_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">City</label>
          <input
            type="text"
            value={buildingParams.city}
            onChange={(e) => handleBuildingParamChange('city', e.target.value.toLowerCase())}
            className="input w-full"
            placeholder="thrissur"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Seismic Zone</label>
          <select
            value={buildingParams.seismicZone}
            onChange={(e) => handleBuildingParamChange('seismicZone', e.target.value)}
            className="input w-full"
          >
            {SEISMIC_ZONES.map(zone => (
              <option key={zone.value} value={zone.value}>{zone.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Structural System</label>
          <select
            value={buildingParams.structuralSystem}
            onChange={(e) => handleBuildingParamChange('structuralSystem', e.target.value)}
            className="input w-full"
          >
            <option value="special_rc_frame">Special RC Frame (R=5)</option>
            <option value="ordinary_rc_frame">Ordinary RC Frame (R=3)</option>
            <option value="dual_system">Dual System (R=4)</option>
            <option value="shear_wall">Shear Wall (R=4)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Soil Type</label>
          <select
            value={buildingParams.soilType}
            onChange={(e) => handleBuildingParamChange('soilType', e.target.value)}
            className="input w-full"
          >
            <option value="rocky">Rocky</option>
            <option value="dense">Dense</option>
            <option value="medium">Medium</option>
            <option value="soft">Soft</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderMemberInputs = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">Member Type</label>
        <div className="grid grid-cols-4 gap-2">
          {[
            { id: 'slab_one_way', label: 'One-Way Slab', icon: FaLayerGroup },
            { id: 'slab_two_way', label: 'Two-Way Slab', icon: FaCubes },
            { id: 'beam', label: 'Beam', icon: FaRulerCombined },
            { id: 'column', label: 'Column', icon: FaBuilding },
            { id: 'footing', label: 'Foundation', icon: FaVectorSquare },
          ].map(type => (
            <button
              key={type.id}
              onClick={() => handleMemberParamChange('memberType', type.id)}
              className={`p-3 border rounded-lg text-center transition-colors ${
                memberParams.memberType === type.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <type.icon className="mx-auto mb-1 text-lg" />
              <span className="text-xs">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Span (m)</label>
          <input
            type="number"
            value={memberParams.span}
            onChange={(e) => handleMemberParamChange('span', parseFloat(e.target.value))}
            className="input w-full"
            step={0.5}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Thickness/Depth (mm)</label>
          <input
            type="number"
            value={memberParams.thickness}
            onChange={(e) => handleMemberParamChange('thickness', parseInt(e.target.value))}
            className="input w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Breadth (mm)</label>
          <input
            type="number"
            value={memberParams.breadth}
            onChange={(e) => handleMemberParamChange('breadth', parseInt(e.target.value))}
            className="input w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Depth (mm)</label>
          <input
            type="number"
            value={memberParams.depth}
            onChange={(e) => handleMemberParamChange('depth', parseInt(e.target.value))}
            className="input w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Concrete Grade</label>
          <select
            value={memberParams.concreteGrade}
            onChange={(e) => handleMemberParamChange('concreteGrade', e.target.value)}
            className="input w-full"
          >
            {CONCRETE_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Steel Grade</label>
          <select
            value={memberParams.steelGrade}
            onChange={(e) => handleMemberParamChange('steelGrade', e.target.value)}
            className="input w-full"
          >
            {STEEL_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        {memberParams.memberType === 'column' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Axial Load (kN)</label>
              <input
                type="number"
                value={memberParams.axialLoad}
                onChange={(e) => handleMemberParamChange('axialLoad', parseFloat(e.target.value))}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Moment (kN.m)</label>
              <input
                type="number"
                value={memberParams.moment}
                onChange={(e) => handleMemberParamChange('moment', parseFloat(e.target.value))}
                className="input w-full"
              />
            </div>
          </>
        )}
        {memberParams.memberType === 'footing' && (
          <div>
            <label className="block text-sm font-medium mb-1">Soil Bearing Capacity (kN/m²)</label>
            <input
              type="number"
              value={memberParams.soilPressure}
              onChange={(e) => handleMemberParamChange('soilPressure', parseFloat(e.target.value))}
              className="input w-full"
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderResults = () => {
    if (!results) return null;

    if (results.member) {
      const { member } = results;
      return (
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold">Member Design Result</h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-foreground-secondary">Member Type</p>
                  <p className="font-medium">{member.member_type}</p>
                </div>
                <div>
                  <p className="text-sm text-foreground-secondary">Dimensions</p>
                  <p className="font-medium">
                    {member.dimensions && Object.entries(member.dimensions).map(([k, v]) => `${k}: ${v}`).join(', ')}
                  </p>
                </div>
              </div>
              
              {member.design && (
                <div className="space-y-2">
                  <h4 className="font-medium">Reinforcement Details</h4>
                  {member.design.main_reinforcement && (
                    <div className="bg-background-tertiary p-3 rounded">
                      <p><strong>Main Steel:</strong> {
                        member.design.main_reinforcement.bar_dia_mm && 
                        `${member.design.main_reinforcement.bar_dia_mm}mm @ ${member.design.main_reinforcement.spacing_mm}mm c/c`
                      }</p>
                      <p><strong>Area Provided:</strong> {member.design.main_reinforcement.area_provided_mm2 || member.design.main_reinforcement.area_mm2_m}</p>
                    </div>
                  )}
                </div>
              )}
              
              {member.checks && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Checks</h4>
                  <div className="flex gap-4">
                    {member.checks.deflection && (
                      <span className={`badge ${member.checks.deflection.status === 'PASS' ? 'badge-success' : 'badge-error'}`}>
                        Deflection: {member.checks.deflection.status}
                      </span>
                    )}
                    {member.checks.shear && (
                      <span className={`badge ${member.checks.shear.status === 'PASS' ? 'badge-success' : 'badge-error'}`}>
                        Shear: {member.checks.shear.status}
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              <p className="text-xs text-foreground-secondary mt-4">
                IS Code: {member.is_code}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Summary Card */}
        <div className="card bg-gradient-to-r from-primary/10 to-transparent border-primary">
          <div className="card-body">
            <h3 className="font-bold text-lg mb-4">Structural Analysis Summary</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{results.building_parameters?.num_floors || buildingParams.numFloors}</p>
                <p className="text-sm text-foreground-secondary">Floors</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{results.building_parameters?.total_height_m?.toFixed(1) || (buildingParams.numFloors * buildingParams.floorHeight)}m</p>
                <p className="text-sm text-foreground-secondary">Height</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-success">{results.summary?.controlling_load || 'N/A'}</p>
                <p className="text-sm text-foreground-secondary">Controlling Load</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{results.summary?.total_dead_load_kn?.toFixed(0) || 0} kN</p>
                <p className="text-sm text-foreground-secondary">Total Dead Load</p>
              </div>
            </div>
          </div>
        </div>

        {/* Loads */}
        {results.loads && (
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold flex items-center gap-2">
                <FaCalculator /> Load Analysis (IS 875)
              </h3>
            </div>
            <div className="card-body">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Floor</th>
                    <th className="text-right py-2">Dead Load (kN/m²)</th>
                    <th className="text-right py-2">Live Load (kN/m²)</th>
                    <th className="text-right py-2">Total (kN/m²)</th>
                  </tr>
                </thead>
                <tbody>
                  {results.loads.floors?.slice(0, 5).map((floor, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-2">Floor {floor.floor}</td>
                      <td className="text-right">{floor.dead_load}</td>
                      <td className="text-right">{floor.imposed_load}</td>
                      <td className="text-right font-medium">{floor.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div className="bg-background-tertiary p-3 rounded">
                  <p className="text-xl font-bold">{results.loads.summary?.total_dead_load_kn?.toFixed(0)} kN</p>
                  <p className="text-sm text-foreground-secondary">Total Dead Load</p>
                </div>
                <div className="bg-background-tertiary p-3 rounded">
                  <p className="text-xl font-bold">{results.loads.summary?.total_live_load_kn?.toFixed(0)} kN</p>
                  <p className="text-sm text-foreground-secondary">Total Live Load</p>
                </div>
                <div className="bg-background-tertiary p-3 rounded">
                  <p className="text-xl font-bold">{results.loads.summary?.reduction_factor}</p>
                  <p className="text-sm text-foreground-secondary">Live Load Reduction</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Seismic */}
        {results.seismic && (
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold flex items-center gap-2">
                <FaBalanceScale /> Seismic Analysis (IS 1893:2016)
              </h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="bg-background-tertiary p-3 rounded text-center">
                  <p className="text-lg font-bold">{results.seismic.factors?.zone_factor_Z}</p>
                  <p className="text-xs text-foreground-secondary">Zone Factor (Z)</p>
                </div>
                <div className="bg-background-tertiary p-3 rounded text-center">
                  <p className="text-lg font-bold">{results.seismic.factors?.importance_factor_I}</p>
                  <p className="text-xs text-foreground-secondary">Importance (I)</p>
                </div>
                <div className="bg-background-tertiary p-3 rounded text-center">
                  <p className="text-lg font-bold">{results.seismic.factors?.response_reduction_R}</p>
                  <p className="text-xs text-foreground-secondary">Response Reduction (R)</p>
                </div>
                <div className="bg-background-tertiary p-3 rounded text-center">
                  <p className="text-lg font-bold">{results.seismic.factors?.time_period_T}s</p>
                  <p className="text-xs text-foreground-secondary">Time Period (T)</p>
                </div>
              </div>
              <div className="bg-primary/10 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-primary">{results.seismic.results?.base_shear_Vb_kn} kN</p>
                <p className="text-sm">Design Base Shear (Vb)</p>
                <p className="text-xs text-foreground-secondary mt-1">({results.seismic.results?.base_shear_percentage}% of building weight)</p>
              </div>
            </div>
          </div>
        )}

        {/* Wind */}
        {results.wind && (
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold flex items-center gap-2">
                <FaCloud /> Wind Load Analysis (IS 875 Part 3)
              </h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="bg-background-tertiary p-3 rounded text-center">
                  <p className="text-lg font-bold">{results.wind.factors?.basic_wind_speed_m_s} m/s</p>
                  <p className="text-xs text-foreground-secondary">Basic Wind Speed</p>
                </div>
                <div className="bg-background-tertiary p-3 rounded text-center">
                  <p className="text-lg font-bold">{results.wind.factors?.design_wind_speed_m_s} m/s</p>
                  <p className="text-xs text-foreground-secondary">Design Wind Speed</p>
                </div>
                <div className="bg-background-tertiary p-3 rounded text-center">
                  <p className="text-lg font-bold">{results.wind.results?.design_pressure_kNm2} kN/m²</p>
                  <p className="text-xs text-foreground-secondary">Design Pressure</p>
                </div>
                <div className="bg-background-tertiary p-3 rounded text-center">
                  <p className="text-lg font-bold">{results.wind.results?.max_wind_force_kn} kN</p>
                  <p className="text-xs text-foreground-secondary">Max Wind Force</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-foreground-secondary text-center">
          IS Codes: {results.loads?.summary?.is_code}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Structural Engineering</h1>
          <p className="text-foreground-secondary mt-1">
            IS 456, IS 875, IS 1893 | RCC Design Calculations
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('loads')}
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'loads'
              ? 'border-primary text-primary'
              : 'border-transparent text-foreground-secondary hover:text-foreground'
          }`}
        >
          <FaBuilding className="inline mr-2" />
          Building Analysis
        </button>
        <button
          onClick={() => setActiveTab('member')}
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'member'
              ? 'border-primary text-primary'
              : 'border-transparent text-foreground-secondary hover:text-foreground'
          }`}
        >
          <FaCubes className="inline mr-2" />
          Member Design
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'results'
              ? 'border-primary text-primary'
              : 'border-transparent text-foreground-secondary hover:text-foreground'
          }`}
        >
          <FaSave className="inline mr-2" />
          Results
        </button>
        <button
          onClick={() => setActiveTab('citations')}
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'citations'
              ? 'border-primary text-primary'
              : 'border-transparent text-foreground-secondary hover:text-foreground'
          }`}
        >
          <FaBook className="inline mr-2" />
          Citations
        </button>
      </div>

      {/* Content */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          {activeTab === 'loads' && (
            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold">Building Parameters</h3>
              </div>
              <div className="card-body">
                {renderLoadInputs()}
                <button
                  onClick={runFullAnalysis}
                  disabled={loading}
                  className="btn btn-primary w-full mt-4"
                >
                  {loading ? (
                    <FaSpinner className="animate-spin mr-2" />
                  ) : (
                    <FaCalculator className="mr-2" />
                  )}
                  Run Full Analysis
                </button>
              </div>
            </div>
          )}

          {activeTab === 'member' && (
            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold">Member Design Parameters</h3>
              </div>
              <div className="card-body">
                {renderMemberInputs()}
                <button
                  onClick={designMember}
                  disabled={loading}
                  className="btn btn-primary w-full mt-4"
                >
                  {loading ? (
                    <FaSpinner className="animate-spin mr-2" />
                  ) : (
                    <FaRulerCombined className="mr-2" />
                  )}
                  Design Member
                </button>
              </div>
            </div>
          )}

          {activeTab === 'results' && (
            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold">Analysis Results</h3>
              </div>
              <div className="card-body">
                {results ? renderResults() : (
                  <div className="text-center py-12 text-foreground-secondary">
                    <FaInfoCircle className="text-4xl mx-auto mb-4 opacity-50" />
                    <p>No analysis results yet.</p>
                    <p className="text-sm">Run analysis to see results here.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'citations' && (
            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold">Academic Citations</h3>
              </div>
              <div className="card-body">
                <p className="text-sm text-foreground-secondary mb-4">
                  The following academic papers provide technical background and validation for the IS code implementations used in this structural analysis system.
                </p>
                {citations && citations.bibliography ? (
                  <div className="space-y-6">
                    {Object.entries(citations.bibliography).map(([code, refs]) => (
                      <div key={code}>
                        <h4 className="font-semibold text-primary mb-2">{code}</h4>
                        <div className="space-y-3">
                          {refs.map((ref, idx) => (
                            <div key={idx} className="text-sm bg-background-secondary p-3 rounded">
                              <p className="font-medium">{ref}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-foreground-secondary">
                    <FaBook className="text-4xl mx-auto mb-4 opacity-50" />
                    <p>Loading citations...</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - IS Codes Reference */}
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold">IS Code Reference</h3>
            </div>
            <div className="card-body space-y-3">
              <div>
                <p className="text-xs font-medium text-foreground-secondary">SEISMIC ZONES</p>
                {SEISMIC_ZONES.map(z => (
                  <p key={z.value} className="text-sm">
                    <span className="font-medium">{z.value}</span>: Z={z.factor}
                  </p>
                ))}
              </div>
              <div>
                <p className="text-xs font-medium text-foreground-secondary mt-3">CONCRETE GRADES</p>
                <p className="text-sm">{CONCRETE_GRADES.join(', ')}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-foreground-secondary mt-3">STEEL GRADES</p>
                <p className="text-sm">{STEEL_GRADES.join(', ')}</p>
              </div>
            </div>
          </div>

          {results && activeTab !== 'results' && (
            <button
              onClick={() => setActiveTab('results')}
              className="btn btn-secondary w-full"
            >
              View Results <FaArrowRight className="ml-2" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default StructuralDesign;

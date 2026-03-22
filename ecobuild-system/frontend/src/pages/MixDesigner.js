import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { ecoBuildAPI } from '../services/api';
import { FaFlask, FaSpinner, FaArrowRight, FaInfoCircle } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CONCRETE_GRADES = ['M20', 'M25', 'M30', 'M35', 'M40'];
const EXPOSURE_CONDITIONS = [
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
  { value: 'very_severe', label: 'Very Severe' },
  { value: 'extreme', label: 'Extreme' },
];

function MixDesigner() {
  const navigate = useNavigate();
  const { project, updateAnalysisResults } = useProject();
  const [formData, setFormData] = useState({
    grade: 'M25',
    exposure: 'moderate',
    slump: 100,
    flyAshPercent: 30,
    recycledPercent: 25,
  });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!project || !project.isConfigured) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="empty-state-icon mb-6">
            <FaFlask className="text-3xl" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Configure Your Project First
          </h2>
          <p className="text-foreground-secondary mb-6">
            Set up your project to design concrete mixes optimized for Kerala's climate conditions.
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await ecoBuildAPI.designMix(
        formData.grade,
        formData.exposure,
        formData.slump,
        formData.flyAshPercent,
        formData.recycledPercent
      );

      setResults(response.data);
      updateAnalysisResults('mixDesign', {
        ...response.data,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      setError('Failed to design mix. Please try again.');
      console.error('Mix design error:', err);
    } finally {
      setLoading(false);
    }
  };

  const chartData = results ? [
    { name: 'Cement', conventional: results.conventional_mix?.cement_content || 380, sustainable: results.sustainable_mix?.cement_content || 266 },
    { name: 'Carbon', conventional: results.conventional_mix?.embodied_carbon || 380, sustainable: results.sustainable_mix?.embodied_carbon || 273 },
    { name: 'Cost (₹x100)', conventional: (results.conventional_mix?.cost_per_m3 || 4850) / 100, sustainable: (results.sustainable_mix?.cost_per_m3 || 4250) / 100 },
  ] : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Eco-Mix Designer</h1>
          <p className="text-foreground-secondary mt-1">
            IS 10262:2019 Compliant | Fly Ash & Recycled Aggregates | Kerala Climate Optimized
          </p>
        </div>
        <div className="flex gap-2">
          <span className="badge badge-info">IS 10262:2019</span>
          <span className="badge badge-info">IS 456:2000</span>
        </div>
      </div>

      {/* Input Form */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <FaFlask />
            Mix Design Parameters
          </h3>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground-secondary mb-2">
                Concrete Grade
              </label>
              <select
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                className="input"
              >
                {CONCRETE_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground-secondary mb-2">
                Exposure Condition
              </label>
              <select
                value={formData.exposure}
                onChange={(e) => setFormData({ ...formData, exposure: e.target.value })}
                className="input"
              >
                {EXPOSURE_CONDITIONS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground-secondary mb-2">
                Slump Required (mm)
              </label>
              <input
                type="number"
                value={formData.slump}
                onChange={(e) => setFormData({ ...formData, slump: parseInt(e.target.value) })}
                className="input"
                min="25"
                max="150"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground-secondary mb-2">
                Fly Ash Replacement: {formData.flyAshPercent}%
              </label>
              <input
                type="range"
                min="0"
                max="35"
                value={formData.flyAshPercent}
                onChange={(e) => setFormData({ ...formData, flyAshPercent: parseInt(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground-secondary mb-2">
                Recycled Aggregate: {formData.recycledPercent}%
              </label>
              <input
                type="range"
                min="0"
                max="40"
                value={formData.recycledPercent}
                onChange={(e) => setFormData({ ...formData, recycledPercent: parseInt(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full"
              >
                {loading ? (
                  <><FaSpinner className="animate-spin mr-2" /> Designing...</>
                ) : (
                  <><FaFlask className="mr-2" /> Calculate Mix</>
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-error-bg border border-error rounded-lg text-error text-sm">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="grid grid-cols-2 gap-6">
          {/* Conventional Mix */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-foreground">Conventional Mix</h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-background-tertiary rounded-lg">
                  <p className="text-xs text-foreground-secondary">Cement</p>
                  <p className="text-lg font-mono font-bold">{results.conventional_mix?.cement_content} kg/m³</p>
                </div>
                <div className="p-3 bg-background-tertiary rounded-lg">
                  <p className="text-xs text-foreground-secondary">Carbon</p>
                  <p className="text-lg font-mono font-bold text-error">{results.conventional_mix?.embodied_carbon} kg/m³</p>
                </div>
              </div>
              <p className="text-sm text-foreground-secondary">Cost: ₹{results.conventional_mix?.cost_per_m3}/m³</p>
            </div>
          </div>

          {/* Sustainable Mix */}
          <div className="card border-primary">
            <div className="card-header bg-primary-bg">
              <h3 className="font-semibold text-primary">Sustainable Mix</h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-background-tertiary rounded-lg">
                  <p className="text-xs text-foreground-secondary">OPC Cement</p>
                  <p className="text-lg font-mono font-bold">{results.sustainable_mix?.cement_content} kg/m³</p>
                </div>
                <div className="p-3 bg-background-tertiary rounded-lg">
                  <p className="text-xs text-foreground-secondary">Fly Ash</p>
                  <p className="text-lg font-mono font-bold text-primary">{results.sustainable_mix?.fly_ash_content} kg/m³</p>
                </div>
              </div>
              <p className="text-sm text-foreground-secondary">Cost: ₹{results.sustainable_mix?.cost_per_m3}/m³</p>
              <p className="text-sm text-primary mt-2">
                Recycled Content: {results.sustainable_mix?.recycled_content_percent}%
              </p>
            </div>
          </div>

          {/* Comparison Chart */}
          <div className="card col-span-2">
            <div className="card-header">
              <h3 className="font-semibold text-foreground">Performance Comparison</h3>
            </div>
            <div className="card-body">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                    <XAxis dataKey="name" stroke="var(--foreground-secondary)" />
                    <YAxis stroke="var(--foreground-secondary)" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--bg-card)', 
                        border: '1px solid var(--border-light)',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="conventional" fill="var(--foreground-muted)" name="Conventional" />
                    <Bar dataKey="sustainable" fill="var(--primary)" name="Sustainable" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {results.comparison && (
                <div className="grid grid-cols-4 gap-4 mt-6">
                  <div className="p-4 bg-primary-bg rounded-lg text-center">
                    <p className="text-sm text-foreground-secondary">Carbon Savings</p>
                    <p className="text-2xl font-mono font-bold text-primary">{results.comparison.carbon_reduction_percent}%</p>
                  </div>
                  <div className="p-4 bg-primary-bg rounded-lg text-center">
                    <p className="text-sm text-foreground-secondary">Cost Savings</p>
                    <p className="text-2xl font-mono font-bold text-primary">{results.comparison.cost_percent_change}%</p>
                  </div>
                  <div className="p-4 bg-primary-bg rounded-lg text-center">
                    <p className="text-sm text-foreground-secondary">Cement Reduction</p>
                    <p className="text-2xl font-mono font-bold text-primary">{results.comparison.cement_reduction_percent}%</p>
                  </div>
                  <div className="p-4 bg-primary-bg rounded-lg text-center">
                    <p className="text-sm text-foreground-secondary">W/C Ratio</p>
                    <p className="text-2xl font-mono font-bold text-primary">{results.sustainable_mix?.water_cement_ratio}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MixDesigner;
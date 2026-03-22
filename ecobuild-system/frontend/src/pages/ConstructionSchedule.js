import React, { useState, useEffect, useMemo } from 'react';
import { useProject } from '../context/ProjectContext';
import { 
  FaCalendarAlt, 
  FaProjectDiagram,
  FaClock,
  FaExclamationTriangle,
  FaCheckCircle,
  FaHardHat,
  FaTruck,
  FaHammer,
  FaChartBar,
  FaArrowRight,
  FaArrowLeft,
  FaExpandAlt,
  FaCompressAlt
} from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Kerala Construction Productivity Norms (IS 7272 / CPWD norms)
const PRODUCTIVITY_NORMS = {
  excavation: { sqm_per_day: 3.5, unit: 'm³', crew: ['1_excavator', '2_labour'] },
  pcc: { sqm_per_day: 2.5, unit: 'm³', crew: ['1_mason', '4_labour', '1_helper'] },
  reinforcement: { kg_per_day: 150, unit: 'kg', crew: ['2_bar_bender', '4_labour'] },
  formwork: { sqm_per_day: 8, unit: 'm²', crew: ['2_carpenter', '4_labour'] },
  concrete_pouring: { cum_per_day: 15, unit: 'm³', crew: ['1_foreman', '4_mason', '8_labour', '1_mixer'] },
  curing: { days: 7, unit: 'days', crew: ['1_labour'] },
  masonry: { sqm_per_day: 3.5, unit: 'm²', crew: ['2_mason', '4_labour'] },
  plastering: { sqm_per_day: 12, unit: 'm²', crew: ['2_mason', '3_labour'] },
  flooring: { sqm_per_day: 15, unit: 'm²', crew: ['3_tile_setter', '3_labour'] },
  painting: { sqm_per_day: 40, unit: 'm²', crew: ['2_painter', '1_helper'] },
  electrical: { points_per_day: 8, unit: 'points', crew: ['2_electrician', '1_helper'] },
  plumbing: { m_per_day: 20, unit: 'm', crew: ['2_plumber', '1_helper'] }
};

// Resource rates (₹/day)
const RESOURCE_RATES = {
  labour: 600,
  mason: 1200,
  carpenter: 1100,
  bar_bender: 1000,
  electrician: 1200,
  plumber: 1100,
  painter: 900,
  tile_setter: 1300,
  foreman: 1500,
  helper: 500,
  excavator: 8000, // per day rental
  mixer: 3000 // per day rental
};

function ConstructionSchedule() {
  const { project, analysisResults } = useProject();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('gantt'); // 'gantt', 'cpm', 'resources'
  const [selectedTask, setSelectedTask] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showCriticalPath, setShowCriticalPath] = useState(true);

  // Calculate durations based on actual quantities from BoQ
  useEffect(() => {
    const initSchedule = () => {
      setLoading(true);
      try {
        // Use default quantities if no BoQ data available
        generateScheduleFromQuantities();
      } catch (err) {
        console.error('Error generating schedule:', err);
        // Fallback to default schedule
        setTasks([]);
        setLoading(false);
      }
    };
    
    initSchedule();
  }, [project?.projectId, project?.isConfigured]);

  const generateScheduleFromQuantities = () => {
    const boq = analysisResults?.boq || {};
    const quantities = {
      excavation: boq.earthwork?.quantity || 200, // m³
      foundation_concrete: boq.concrete?.foundation || 30, // m³
      column_concrete: boq.concrete?.column || 25, // m³
      beam_slab_concrete: boq.concrete?.beam + boq.concrete?.slab || 40, // m³
      steel: boq.steel?.quantity || 5000, // kg
      formwork: boq.formwork?.quantity || 300, // m²
      masonry: boq.masonry?.aac_blocks ? boq.masonry.aac_blocks * 0.036 : 150, // m³ converted from blocks
      plastering: boq.plaster?.internal || 400, // m²
      flooring: project?.buildingParams?.builtUpArea * 0.7 || 350, // m² (70% of built up)
      painting: project?.buildingParams?.builtUpArea * 2.5 || 1000, // m² (2.5x floor area)
      electrical_points: Math.ceil((project?.buildingParams?.builtUpArea || 400) / 50) * 8, // approx 8 points per 50sqm
      plumbing: Math.ceil((project?.buildingParams?.builtUpArea || 400) / 100) * 30 // approx 30m per 100sqm
    };

    // Calculate durations based on productivity norms
    const calculatedTasks = [
      {
        id: 1,
        wbs: '1.1',
        name: 'Site Preparation & Mobilization',
        duration: 5,
        start: 0,
        end: 5,
        dependencies: [],
        resources: ['labour', 'excavator'],
        quantity: 1,
        unit: 'ls',
        productivity: '5 days',
        type: 'predecessor',
        critical: true
      },
      {
        id: 2,
        wbs: '2.1',
        name: 'Excavation for Foundation',
        duration: Math.ceil(quantities.excavation / PRODUCTIVITY_NORMS.excavation.sqm_per_day),
        start: 5,
        end: 5 + Math.ceil(quantities.excavation / PRODUCTIVITY_NORMS.excavation.sqm_per_day),
        dependencies: [1],
        resources: ['excavator', 'labour'],
        quantity: quantities.excavation,
        unit: 'm³',
        productivity: `${PRODUCTIVITY_NORMS.excavation.sqm_per_day} m³/day`,
        type: 'foundation',
        critical: true
      },
      {
        id: 3,
        wbs: '2.2',
        name: 'PCC for Foundation',
        duration: Math.ceil((quantities.foundation_concrete * 0.3) / PRODUCTIVITY_NORMS.pcc.sqm_per_day),
        start: null, // calculated by CPM
        end: null,
        dependencies: [2],
        resources: ['mason', 'labour', 'helper'],
        quantity: quantities.foundation_concrete * 0.3,
        unit: 'm³',
        productivity: `${PRODUCTIVITY_NORMS.pcc.sqm_per_day} m³/day`,
        type: 'foundation',
        critical: true
      },
      {
        id: 4,
        wbs: '2.3',
        name: 'Foundation Reinforcement',
        duration: Math.ceil((quantities.steel * 0.15) / PRODUCTIVITY_NORMS.reinforcement.kg_per_day),
        start: null,
        end: null,
        dependencies: [3],
        resources: ['bar_bender', 'labour'],
        quantity: quantities.steel * 0.15,
        unit: 'kg',
        productivity: `${PRODUCTIVITY_NORMS.reinforcement.kg_per_day} kg/day`,
        type: 'foundation',
        critical: true
      },
      {
        id: 5,
        wbs: '2.4',
        name: 'Foundation Formwork',
        duration: Math.ceil((quantities.formwork * 0.2) / PRODUCTIVITY_NORMS.formwork.sqm_per_day),
        start: null,
        end: null,
        dependencies: [4],
        resources: ['carpenter', 'labour'],
        quantity: quantities.formwork * 0.2,
        unit: 'm²',
        productivity: `${PRODUCTIVITY_NORMS.formwork.sqm_per_day} m²/day`,
        type: 'foundation',
        critical: true
      },
      {
        id: 6,
        wbs: '2.5',
        name: 'Foundation Concrete Pouring',
        duration: Math.ceil(quantities.foundation_concrete / PRODUCTIVITY_NORMS.concrete_pouring.cum_per_day),
        start: null,
        end: null,
        dependencies: [5],
        resources: ['foreman', 'mason', 'labour', 'mixer'],
        quantity: quantities.foundation_concrete,
        unit: 'm³',
        productivity: `${PRODUCTIVITY_NORMS.concrete_pouring.cum_per_day} m³/day`,
        type: 'foundation',
        critical: true
      },
      {
        id: 7,
        wbs: '2.6',
        name: 'Foundation Curing',
        duration: PRODUCTIVITY_NORMS.curing.days,
        start: null,
        end: null,
        dependencies: [6],
        resources: ['labour'],
        quantity: 7,
        unit: 'days',
        productivity: '7 days',
        type: 'foundation',
        critical: true
      },
      {
        id: 8,
        wbs: '3.1',
        name: 'Column Reinforcement (All Floors)',
        duration: Math.ceil((quantities.steel * 0.35) / PRODUCTIVITY_NORMS.reinforcement.kg_per_day),
        start: null,
        end: null,
        dependencies: [7],
        resources: ['bar_bender', 'labour'],
        quantity: quantities.steel * 0.35,
        unit: 'kg',
        productivity: `${PRODUCTIVITY_NORMS.reinforcement.kg_per_day} kg/day`,
        type: 'superstructure',
        critical: true
      },
      {
        id: 9,
        wbs: '3.2',
        name: 'Column Formwork (All Floors)',
        duration: Math.ceil((quantities.formwork * 0.35) / PRODUCTIVITY_NORMS.formwork.sqm_per_day),
        start: null,
        end: null,
        dependencies: [8],
        resources: ['carpenter', 'labour'],
        quantity: quantities.formwork * 0.35,
        unit: 'm²',
        productivity: `${PRODUCTIVITY_NORMS.formwork.sqm_per_day} m²/day`,
        type: 'superstructure',
        critical: true
      },
      {
        id: 10,
        wbs: '3.3',
        name: 'Column Concrete (All Floors)',
        duration: Math.ceil(quantities.column_concrete / PRODUCTIVITY_NORMS.concrete_pouring.cum_per_day),
        start: null,
        end: null,
        dependencies: [9],
        resources: ['foreman', 'mason', 'labour', 'mixer'],
        quantity: quantities.column_concrete,
        unit: 'm³',
        productivity: `${PRODUCTIVITY_NORMS.concrete_pouring.cum_per_day} m³/day`,
        type: 'superstructure',
        critical: true
      },
      {
        id: 11,
        wbs: '3.4',
        name: 'Beam & Slab Reinforcement',
        duration: Math.ceil((quantities.steel * 0.40) / PRODUCTIVITY_NORMS.reinforcement.kg_per_day),
        start: null,
        end: null,
        dependencies: [10],
        resources: ['bar_bender', 'labour'],
        quantity: quantities.steel * 0.40,
        unit: 'kg',
        productivity: `${PRODUCTIVITY_NORMS.reinforcement.kg_per_day} kg/day`,
        type: 'superstructure',
        critical: true
      },
      {
        id: 12,
        wbs: '3.5',
        name: 'Beam & Slab Formwork',
        duration: Math.ceil((quantities.formwork * 0.45) / PRODUCTIVITY_NORMS.formwork.sqm_per_day),
        start: null,
        end: null,
        dependencies: [11],
        resources: ['carpenter', 'labour'],
        quantity: quantities.formwork * 0.45,
        unit: 'm²',
        productivity: `${PRODUCTIVITY_NORMS.formwork.sqm_per_day} m²/day`,
        type: 'superstructure',
        critical: true
      },
      {
        id: 13,
        wbs: '3.6',
        name: 'Beam & Slab Concrete',
        duration: Math.ceil(quantities.beam_slab_concrete / PRODUCTIVITY_NORMS.concrete_pouring.cum_per_day),
        start: null,
        end: null,
        dependencies: [12],
        resources: ['foreman', 'mason', 'labour', 'mixer'],
        quantity: quantities.beam_slab_concrete,
        unit: 'm³',
        productivity: `${PRODUCTIVITY_NORMS.concrete_pouring.cum_per_day} m³/day`,
        type: 'superstructure',
        critical: true
      },
      {
        id: 14,
        wbs: '3.7',
        name: 'Deshuttering & Curing',
        duration: 14,
        start: null,
        end: null,
        dependencies: [13],
        resources: ['labour'],
        quantity: 14,
        unit: 'days',
        productivity: '14 days (min before deshuttering)',
        type: 'superstructure',
        critical: true
      },
      {
        id: 15,
        wbs: '4.1',
        name: 'Masonry Work (Block Walls)',
        duration: Math.ceil((quantities.masonry / 0.036 * 0.6) / PRODUCTIVITY_NORMS.masonry.sqm_per_day),
        start: null,
        end: null,
        dependencies: [14],
        resources: ['mason', 'labour'],
        quantity: quantities.masonry / 0.036 * 0.6,
        unit: 'm²',
        productivity: `${PRODUCTIVITY_NORMS.masonry.sqm_per_day} m²/day`,
        type: 'masonry',
        critical: false // Can have float
      },
      {
        id: 16,
        wbs: '5.1',
        name: 'Internal Plastering',
        duration: Math.ceil(quantities.plastering / PRODUCTIVITY_NORMS.plastering.sqm_per_day),
        start: null,
        end: null,
        dependencies: [15],
        resources: ['mason', 'labour'],
        quantity: quantities.plastering,
        unit: 'm²',
        productivity: `${PRODUCTIVITY_NORMS.plastering.sqm_per_day} m²/day`,
        type: 'finishing',
        critical: false
      },
      {
        id: 17,
        wbs: '5.2',
        name: 'Flooring Works',
        duration: Math.ceil(quantities.flooring / PRODUCTIVITY_NORMS.flooring.sqm_per_day),
        start: null,
        end: null,
        dependencies: [16],
        resources: ['tile_setter', 'labour'],
        quantity: quantities.flooring,
        unit: 'm²',
        productivity: `${PRODUCTIVITY_NORMS.flooring.sqm_per_day} m²/day`,
        type: 'finishing',
        critical: false
      },
      {
        id: 18,
        wbs: '5.3',
        name: 'Painting Works',
        duration: Math.ceil(quantities.painting / PRODUCTIVITY_NORMS.painting.sqm_per_day),
        start: null,
        end: null,
        dependencies: [17],
        resources: ['painter', 'helper'],
        quantity: quantities.painting,
        unit: 'm²',
        productivity: `${PRODUCTIVITY_NORMS.painting.sqm_per_day} m²/day`,
        type: 'finishing',
        critical: false
      },
      {
        id: 19,
        wbs: '6.1',
        name: 'Electrical Installation',
        duration: Math.ceil(quantities.electrical_points / PRODUCTIVITY_NORMS.electrical.points_per_day),
        start: null,
        end: null,
        dependencies: [14], // Parallel to plastering
        resources: ['electrician', 'helper'],
        quantity: quantities.electrical_points,
        unit: 'points',
        productivity: `${PRODUCTIVITY_NORMS.electrical.points_per_day} points/day`,
        type: 'services',
        critical: false
      },
      {
        id: 20,
        wbs: '6.2',
        name: 'Plumbing Installation',
        duration: Math.ceil(quantities.plumbing / PRODUCTIVITY_NORMS.plumbing.m_per_day),
        start: null,
        end: null,
        dependencies: [14], // Parallel to plastering
        resources: ['plumber', 'helper'],
        quantity: quantities.plumbing,
        unit: 'm',
        productivity: `${PRODUCTIVITY_NORMS.plumbing.m_per_day} m/day`,
        type: 'services',
        critical: false
      },
      {
        id: 21,
        wbs: '7.1',
        name: 'Final Inspection & Handover',
        duration: 5,
        start: null,
        end: null,
        dependencies: [18, 19, 20], // All finishing must complete
        resources: ['foreman'],
        quantity: 1,
        unit: 'ls',
        productivity: '5 days',
        type: 'handover',
        critical: true
      }
    ];

    // Perform CPM calculation
    try {
      const scheduledTasks = calculateCPM(calculatedTasks);
      setTasks(scheduledTasks);
    } catch (err) {
      console.error('CPM calculation error:', err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // Critical Path Method (CPM) Calculation
  const calculateCPM = (taskList) => {
    // Forward Pass - Calculate Early Start (ES) and Early Finish (EF)
    const tasksWithES = taskList.map(task => {
      if (task.dependencies.length === 0) {
        return { ...task, es: 0, ef: task.duration };
      }
      
      const depTasks = taskList.filter(t => task.dependencies.includes(t.id));
      const maxEF = Math.max(...depTasks.map(t => t.ef || 0));
      return { ...task, es: maxEF, ef: maxEF + task.duration };
    });

    // Backward Pass - Calculate Late Start (LS) and Late Finish (LF)
    const projectDuration = Math.max(...tasksWithES.map(t => t.ef));
    
    const tasksWithLS = [...tasksWithES].reverse().map(task => {
      const dependentTasks = tasksWithES.filter(t => t.dependencies.includes(task.id));
      
      if (dependentTasks.length === 0) {
        return { ...task, lf: projectDuration, ls: projectDuration - task.duration };
      }
      
      const minLS = Math.min(...dependentTasks.map(t => t.ls !== undefined ? t.ls : projectDuration));
      return { ...task, lf: minLS, ls: minLS - task.duration };
    }).reverse();

    // Calculate Float/Slack and determine Critical Path
    return tasksWithLS.map(task => {
      const totalFloat = task.ls - task.es;
      const freeFloat = task.dependencies.length === 0 ? 0 : 
        Math.min(...taskList
          .filter(t => task.dependencies.includes(t.id))
          .map(t => t.es - task.ef));
      
      return {
        ...task,
        totalFloat,
        freeFloat,
        start: task.es,
        end: task.ef,
        critical: totalFloat === 0 || task.critical
      };
    });
  };

  // Resource calculations
  const resourceUtilization = useMemo(() => {
    const maxDay = Math.max(...tasks.map(t => t.end));
    const dailyResources = [];

    for (let day = 0; day <= maxDay; day++) {
      const dayTasks = tasks.filter(t => t.start <= day && t.end > day);
      const resources = {};
      
      dayTasks.forEach(task => {
        task.resources.forEach(res => {
          const count = parseInt(res.split('_')[0]) || 1;
          resources[res] = (resources[res] || 0) + count;
        });
      });

      dailyResources.push({ day, ...resources });
    }

    return dailyResources;
  }, [tasks]);

  const projectDuration = tasks.length > 0 ? Math.max(...tasks.map(t => t.end)) : 0;
  const criticalTasks = tasks.filter(t => t.critical);
  const nonCriticalTasks = tasks.filter(t => !t.critical);

  // Gantt Chart Component
  const GanttChart = () => (
    <div className="overflow-x-auto">
      <div className="min-w-[1000px]">
        {/* Timeline Header */}
        <div className="flex mb-2 sticky top-0 bg-background z-10">
          <div className="w-16 shrink-0 text-xs font-bold text-foreground-muted p-2">WBS</div>
          <div className="w-64 shrink-0 text-xs font-bold text-foreground-muted p-2">Activity</div>
          <div className="w-16 shrink-0 text-xs font-bold text-foreground-muted p-2 text-center">Dur</div>
          <div className="w-20 shrink-0 text-xs font-bold text-foreground-muted p-2 text-center">ES</div>
          <div className="w-20 shrink-0 text-xs font-bold text-foreground-muted p-2 text-center">EF</div>
          <div className="w-20 shrink-0 text-xs font-bold text-foreground-muted p-2 text-center">TF</div>
          <div className="flex-1 flex">
            {Array.from({ length: Math.ceil(projectDuration / 7) + 1 }, (_, i) => (
              <div key={i} className="flex-1 text-center text-xs text-foreground-muted border-l border-border py-1 min-w-[40px]">
                W{i}
              </div>
            ))}
          </div>
        </div>

        {/* Task Bars */}
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center mb-1 group hover:bg-background-tertiary/30">
            <div className="w-16 shrink-0 text-xs text-foreground-muted p-2">{task.wbs}</div>
            <div className="w-64 shrink-0 text-xs text-foreground truncate p-2" title={task.name}>
              {task.name}
            </div>
            <div className="w-16 shrink-0 text-xs text-center p-2">{task.duration}d</div>
            <div className="w-20 shrink-0 text-xs text-center p-2">{task.es}</div>
            <div className="w-20 shrink-0 text-xs text-center p-2">{task.ef}</div>
            <div className="w-20 shrink-0 text-xs text-center p-2">
              <span className={task.totalFloat === 0 ? 'text-red-600 font-bold' : 'text-green-600'}>
                {task.totalFloat}d
              </span>
            </div>
            <div className="flex-1 relative h-8 bg-background-tertiary/50 rounded">
              {/* Task Bar */}
              <div
                className={`absolute h-6 top-1 rounded cursor-pointer transition-all hover:opacity-80 ${
                  task.critical ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{
                  left: `${(task.start / projectDuration) * 100}%`,
                  width: `${(task.duration / projectDuration) * 100}%`,
                  minWidth: '4px'
                }}
                onClick={() => setSelectedTask(task)}
                title={`${task.name} (${task.duration}d)`}
              >
                <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium truncate px-1">
                  {task.duration}d
                </span>
              </div>
              
              {/* Float Bar (for non-critical) */}
              {!task.critical && task.totalFloat > 0 && (
                <div
                  className="absolute h-6 top-1 rounded bg-yellow-200/50 border border-yellow-400 border-dashed"
                  style={{
                    left: `${(task.ef / projectDuration) * 100}%`,
                    width: `${(task.totalFloat / projectDuration) * 100}%`,
                    minWidth: '2px'
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground-muted">Calculating CPM Schedule...</p>
          <button 
            onClick={() => {
              setLoading(false);
              generateScheduleFromQuantities();
            }} 
            className="btn btn-primary mt-4"
          >
            Force Generate
          </button>
        </div>
      </div>
    );
  }

  if (!project?.isConfigured) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Construction Schedule</h1>
            <p className="text-foreground-muted mt-1">Critical Path Method scheduling</p>
          </div>
        </div>
        <div className="card p-12 text-center">
          <div className="empty-state-icon mx-auto mb-6">
            <FaCalendarAlt className="text-3xl" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">No Project Configured</h2>
          <p className="text-foreground-secondary mb-6 max-w-md mx-auto">
            Set up your project first to generate a construction schedule based on your quantities.
          </p>
          <button 
            onClick={() => window.location.href = '/setup'} 
            className="btn btn-primary"
          >
            Go to Project Setup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Construction Schedule (CPM)</h1>
          <p className="text-foreground-muted mt-1">Critical Path Method scheduling with resource allocation</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCriticalPath(!showCriticalPath)}
            className={`btn btn-sm ${showCriticalPath ? 'btn-primary' : 'btn-secondary'}`}
          >
            <FaProjectDiagram className="mr-2" />
            Critical Path
          </button>
          <div className="flex border border-border rounded-lg overflow-hidden">
            {['gantt', 'cpm', 'resources'].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-sm capitalize ${
                  viewMode === mode 
                    ? 'bg-primary text-white' 
                    : 'bg-background hover:bg-background-tertiary'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Project Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-foreground-muted mb-1">
            <FaCalendarAlt className="text-primary" />
            <span className="text-xs">Project Duration</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{projectDuration} days</p>
          <p className="text-xs text-foreground-muted">{(projectDuration / 30).toFixed(1)} months</p>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center gap-2 text-foreground-muted mb-1">
            <FaProjectDiagram className="text-red-500" />
            <span className="text-xs">Critical Activities</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{criticalTasks.length}</p>
          <p className="text-xs text-foreground-muted">of {tasks.length} total</p>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center gap-2 text-foreground-muted mb-1">
            <FaClock className="text-yellow-500" />
            <span className="text-xs">Non-Critical</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{nonCriticalTasks.length}</p>
          <p className="text-xs text-foreground-muted">with float/slack</p>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center gap-2 text-foreground-muted mb-1">
            <FaHardHat className="text-blue-500" />
            <span className="text-xs">Peak Resources</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {Math.max(...resourceUtilization.map(r => Object.values(r).slice(1).reduce((a, b) => a + b, 0)))}
          </p>
          <p className="text-xs text-foreground-muted">workers max</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 text-foreground-muted mb-1">
            <FaChartBar className="text-green-500" />
            <span className="text-xs">Completion</span>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {Math.round((tasks.filter(t => t.progress === 100).length / tasks.length) * 0)}%
          </p>
          <p className="text-xs text-foreground-muted">planned progress</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span>Critical Activity (TF=0)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span>Non-Critical Activity</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-200 border border-yellow-400 border-dashed rounded"></div>
          <span>Float/Slack (TF)</span>
        </div>
      </div>

      {/* View Content */}
      <div className="card">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            {viewMode === 'gantt' && 'Gantt Chart View'}
            {viewMode === 'cpm' && 'Critical Path Analysis'}
            {viewMode === 'resources' && 'Resource Loading'}
          </h2>
          <div className="flex gap-2">
            <button onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="p-2 hover:bg-background-tertiary rounded">
              <FaCompressAlt />
            </button>
            <button onClick={() => setZoomLevel(z => Math.min(2, z + 0.1))} className="p-2 hover:bg-background-tertiary rounded">
              <FaExpandAlt />
            </button>
          </div>
        </div>
        
        <div className="p-4" style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}>
          {viewMode === 'gantt' && <GanttChart />}
          
          {viewMode === 'cpm' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="card border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
                  <div className="p-4 border-b border-red-200 dark:border-red-800">
                    <h3 className="font-semibold text-red-800 dark:text-red-400">Critical Path Activities</h3>
                    <p className="text-xs text-red-700 dark:text-red-300">Any delay will delay the project</p>
                  </div>
                  <div className="p-4 space-y-2">
                    {criticalTasks.map(task => (
                      <div key={task.id} className="flex justify-between items-center p-2 bg-white dark:bg-red-900/20 rounded">
                        <div>
                          <span className="font-medium text-sm">{task.wbs} {task.name}</span>
                          <p className="text-xs text-foreground-muted">{task.duration} days | TF: {task.totalFloat}d</p>
                        </div>
                        <span className="text-xs font-bold text-red-600">ES: {task.es} EF: {task.ef}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/10">
                  <div className="p-4 border-b border-yellow-200 dark:border-yellow-800">
                    <h3 className="font-semibold text-yellow-800 dark:text-yellow-400">Activities with Float</h3>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">Can be delayed without impacting project</p>
                  </div>
                  <div className="p-4 space-y-2">
                    {nonCriticalTasks.slice(0, 5).map(task => (
                      <div key={task.id} className="flex justify-between items-center p-2 bg-white dark:bg-yellow-900/20 rounded">
                        <div>
                          <span className="font-medium text-sm">{task.wbs} {task.name}</span>
                          <p className="text-xs text-foreground-muted">{task.duration} days</p>
                        </div>
                        <span className="text-xs font-bold text-green-600">Float: {task.totalFloat}d</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'resources' && (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={resourceUtilization.slice(0, 60)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tickFormatter={(v) => `D${v}`} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="labour" stackId="a" fill="#3b82f6" name="Labour" />
                  <Bar dataKey="mason" stackId="a" fill="#f59e0b" name="Mason" />
                  <Bar dataKey="carpenter" stackId="a" fill="#10b981" name="Carpenter" />
                  <Bar dataKey="bar_bender" stackId="a" fill="#8b5cf6" name="Bar Bender" />
                </BarChart>
              </ResponsiveContainer>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['labour', 'mason', 'carpenter', 'bar_bender', 'electrician', 'plumber', 'painter'].map(role => {
                  const maxUsage = Math.max(...resourceUtilization.map(r => r[role] || 0));
                  return (
                    <div key={role} className="card p-3">
                      <p className="text-xs text-foreground-muted capitalize">{role.replace('_', ' ')}</p>
                      <p className="text-xl font-bold">{maxUsage}</p>
                      <p className="text-xs text-foreground-muted">max required</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selected Task Detail */}
      {selectedTask && (
        <div className="card border-2 border-primary">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h3 className="font-semibold">{selectedTask.wbs} {selectedTask.name}</h3>
            <button onClick={() => setSelectedTask(null)} className="text-foreground-muted hover:text-foreground">
              ×
            </button>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-foreground-muted">Duration</p>
              <p className="font-medium">{selectedTask.duration} days</p>
            </div>
            <div>
              <p className="text-xs text-foreground-muted">Early Start/Finish</p>
              <p className="font-medium">{selectedTask.es} / {selectedTask.ef}</p>
            </div>
            <div>
              <p className="text-xs text-foreground-muted">Late Start/Finish</p>
              <p className="font-medium">{selectedTask.ls} / {selectedTask.lf}</p>
            </div>
            <div>
              <p className="text-xs text-foreground-muted">Total Float</p>
              <p className={`font-medium ${selectedTask.totalFloat === 0 ? 'text-red-600' : 'text-green-600'}`}>
                {selectedTask.totalFloat} days
              </p>
            </div>
            <div>
              <p className="text-xs text-foreground-muted">Quantity</p>
              <p className="font-medium">{selectedTask.quantity?.toFixed(2)} {selectedTask.unit}</p>
            </div>
            <div>
              <p className="text-xs text-foreground-muted">Productivity</p>
              <p className="font-medium">{selectedTask.productivity}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-foreground-muted">Resources</p>
              <p className="font-medium">{selectedTask.resources.join(', ')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConstructionSchedule;
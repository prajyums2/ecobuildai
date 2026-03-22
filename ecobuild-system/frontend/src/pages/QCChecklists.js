import React, { useState, useEffect, useRef } from 'react';
import { useProject } from '../context/ProjectContext';
import { 
  FaCamera, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaExclamationTriangle,
  FaCloudUploadAlt,
  FaTrash,
  FaDownload,
  FaCalendar,
  FaUser,
  FaClipboardCheck
} from 'react-icons/fa';

const inspectionStages = [
  {
    id: 'foundation',
    name: 'Foundation Work',
    isCode: 'IS 456:2000, IS 1200',
    items: [
      { id: 'F1', description: 'Excavation dimensions as per drawing', criteria: 'Length, width, depth within ±50mm', critical: true },
      { id: 'F2', description: 'Soil bearing capacity verification', criteria: 'SBC ≥ design value (kN/m²)', critical: true },
      { id: 'F3', description: 'PCC thickness and grade', criteria: 'M10 grade, 100mm thick', critical: false },
      { id: 'F4', description: 'Footing reinforcement placement', criteria: 'Bar dia, spacing, cover (50mm min)', critical: true },
      { id: 'F5', description: 'Concrete pour quality', criteria: 'No segregation, proper compaction', critical: true }
    ]
  },
  {
    id: 'superstructure',
    name: 'Superstructure',
    isCode: 'IS 456:2000',
    items: [
      { id: 'S1', description: 'Column reinforcement - bar diameter', criteria: 'As per design (Fe 500D)', critical: true },
      { id: 'S2', description: 'Column reinforcement - spacing', criteria: 'Main bars ±10mm, ties @150mm c/c', critical: true },
      { id: 'S3', description: 'Concrete cover to reinforcement', criteria: '40mm min for columns, 25mm for beams', critical: true },
      { id: 'S4', description: 'Slab thickness', criteria: 'Design thickness ±10mm', critical: false },
      { id: 'S5', description: 'Beam depth and width', criteria: 'As per drawing ±15mm', critical: false }
    ]
  },
  {
    id: 'masonry',
    name: 'Masonry Work',
    isCode: 'IS 1905:1987',
    items: [
      { id: 'M1', description: 'Block quality - AAC blocks', criteria: '600x200x300mm, density 550-650 kg/m³', critical: false },
      { id: 'M2', description: 'Mortar mix proportion', criteria: '1:6 (cement:sand) for masonry', critical: true },
      { id: 'M3', description: 'Wall plumb and alignment', criteria: '±5mm per 3m height', critical: false },
      { id: 'M4', description: 'Damp proof course (DPC)', criteria: '40mm thick 1:2:4 concrete', critical: true },
      { id: 'M5', description: 'Curing of masonry', criteria: '7 days wet curing', critical: false }
    ]
  },
  {
    id: 'plastering',
    name: 'Plastering',
    isCode: 'IS 1661:1972',
    items: [
      { id: 'P1', description: 'Plaster thickness', criteria: '12mm internal, 20mm external ±3mm', critical: false },
      { id: 'P2', description: 'Mortar mix', criteria: '1:4 (cement:sand) for internal, 1:5 external', critical: true },
      { id: 'P3', description: 'Surface preparation', criteria: 'Hacked, cleaned, watered before plastering', critical: true },
      { id: 'P4', description: 'Plumb and levelness', criteria: '±3mm per 2m using straight edge', critical: false },
      { id: 'P5', description: 'Surface finish', criteria: 'Smooth, no cracks, no hollowness', critical: false }
    ]
  },
  {
    id: 'electrical',
    name: 'Electrical Work',
    isCode: 'IS 732:1989, IS 3043',
    items: [
      { id: 'E1', description: 'Conduit laying', criteria: 'Rigid PVC/MS conduit, proper supports @1m', critical: true },
      { id: 'E2', description: 'Wire gauge', criteria: 'As per load calculation, min 2.5 sq mm', critical: true },
      { id: 'E3', description: 'Earth electrode installation', criteria: 'Copper plate/rod, resistance < 5 ohms', critical: true },
      { id: 'E4', description: 'MCB/ELCB rating', criteria: 'As per circuit load, proper coordination', critical: true },
      { id: 'E5', description: 'Switch and outlet heights', criteria: 'Switch 1.2m, outlet 0.3m from FFL', critical: false }
    ]
  }
];

function QCChecklists() {
  const { project } = useProject();
  const [activeStage, setActiveStage] = useState('foundation');
  const [checklistData, setChecklistData] = useState({});
  const [initialized, setInitialized] = useState(false);
  const fileInputRef = useRef(null);
  const [currentItemForPhoto, setCurrentItemForPhoto] = useState(null);

  // Load from localStorage
  useEffect(() => {
    const init = () => {
      if (project?.id) {
        const saved = localStorage.getItem(`qc-checklists-${project.id}`);
        if (saved) {
          try {
            setChecklistData(JSON.parse(saved));
            setInitialized(true);
          } catch (e) {
            console.error('Error loading saved data:', e);
            initializeChecklists();
          }
        } else {
          // Reset and initialize for new project
          setInitialized(false);
          setChecklistData({});
          initializeChecklists();
        }
      } else {
        // No project ID, initialize with empty data
        initializeChecklists();
      }
    };
    
    init();
  }, [project?.id]);

  // Save to localStorage
  useEffect(() => {
    if (initialized && project?.id) {
      localStorage.setItem(`qc-checklists-${project.id}`, JSON.stringify(checklistData));
    }
  }, [checklistData, initialized, project?.id]);

  const initializeChecklists = () => {
    const initialData = {};
    inspectionStages.forEach(stage => {
      initialData[stage.id] = {};
      stage.items.forEach(item => {
        initialData[stage.id][item.id] = {
          status: null,
          notes: '',
          checkedBy: '',
          checkedDate: '',
          photos: []
        };
      });
    });
    setChecklistData(initialData);
    setInitialized(true);
  };

  const currentStage = inspectionStages.find(s => s.id === activeStage);

  const updateItemStatus = (itemId, status) => {
    setChecklistData(prev => ({
      ...prev,
      [activeStage]: {
        ...prev[activeStage],
        [itemId]: {
          ...prev[activeStage][itemId],
          status,
          checkedDate: new Date().toISOString().split('T')[0],
          checkedBy: 'Site Engineer' // Could be made editable
        }
      }
    }));
  };

  const updateItemNotes = (itemId, notes) => {
    setChecklistData(prev => ({
      ...prev,
      [activeStage]: {
        ...prev[activeStage],
        [itemId]: {
          ...prev[activeStage][itemId],
          notes
        }
      }
    }));
  };

  const handlePhotoClick = (itemId) => {
    setCurrentItemForPhoto(itemId);
    fileInputRef.current?.click();
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length || !currentItemForPhoto) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newPhoto = {
          id: Date.now() + Math.random(),
          dataUrl: event.target.result,
          name: file.name,
          timestamp: new Date().toISOString()
        };

        setChecklistData(prev => ({
          ...prev,
          [activeStage]: {
            ...prev[activeStage],
            [currentItemForPhoto]: {
              ...prev[activeStage][currentItemForPhoto],
              photos: [...prev[activeStage][currentItemForPhoto].photos, newPhoto]
            }
          }
        }));
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    e.target.value = '';
    setCurrentItemForPhoto(null);
  };

  const deletePhoto = (itemId, photoId) => {
    setChecklistData(prev => ({
      ...prev,
      [activeStage]: {
        ...prev[activeStage],
        [itemId]: {
          ...prev[activeStage][itemId],
          photos: prev[activeStage][itemId].photos.filter(p => p.id !== photoId)
        }
      }
    }));
  };

  const exportReport = () => {
    let report = `QC CHECKLIST REPORT\n`;
    report += `Project: ${project?.name || 'Unnamed'}\n`;
    report += `Date: ${new Date().toLocaleDateString()}\n\n`;

    inspectionStages.forEach(stage => {
      report += `\n${stage.name} (${stage.isCode})\n`;
      report += `${'='.repeat(stage.name.length)}\n`;
      
      stage.items.forEach(item => {
        const data = checklistData[stage.id]?.[item.id];
        if (data) {
          report += `\n${item.id}: ${item.description}\n`;
          report += `Status: ${data.status?.toUpperCase() || 'PENDING'}\n`;
          report += `Criteria: ${item.criteria}\n`;
          if (data.notes) report += `Notes: ${data.notes}\n`;
          if (data.checkedBy) report += `Checked By: ${data.checkedBy} on ${data.checkedDate}\n`;
          if (data.photos.length > 0) report += `Photos: ${data.photos.length} attached\n`;
        }
      });
    });

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `QC_Report_${project?.name || 'Project'}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const calculateProgress = () => {
    if (!checklistData[activeStage]) return { completed: 0, total: 0, percentage: 0 };
    const items = Object.values(checklistData[activeStage]);
    const completed = items.filter(item => item.status !== null).length;
    return { 
      completed, 
      total: items.length, 
      percentage: items.length > 0 ? (completed / items.length) * 100 : 0 
    };
  };

  const progress = calculateProgress();

  if (!project?.isConfigured) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">QC Checklists</h1>
            <p className="text-foreground-muted">Quality control inspection checklists</p>
          </div>
        </div>
        <div className="card p-12 text-center">
          <div className="empty-state-icon mx-auto mb-6">
            <FaClipboardCheck className="text-3xl" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">No Project Configured</h2>
          <p className="text-foreground-secondary mb-6 max-w-md mx-auto">
            Set up your project first to access quality control checklists.
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

  if (!initialized) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">QC Checklists</h1>
            <p className="text-foreground-muted">Quality control inspection checklists</p>
          </div>
        </div>
        <div className="card p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground-muted">Initializing checklists...</p>
          <button 
            onClick={() => initializeChecklists()} 
            className="btn btn-primary mt-4"
          >
            Force Initialize
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">QC Checklists</h1>
          <p className="text-foreground-muted">IS Code compliant quality control with photo documentation</p>
        </div>
        <button onClick={exportReport} className="btn btn-secondary">
          <FaDownload className="mr-2" />
          Export Report
        </button>
      </div>

      {/* Stage Selection */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {inspectionStages.map((stage) => {
          const stageProgress = checklistData[stage.id] ? 
            Object.values(checklistData[stage.id]).filter(i => i.status !== null).length / stage.items.length * 100 : 0;
          
          return (
            <button
              key={stage.id}
              onClick={() => setActiveStage(stage.id)}
              className={`px-4 py-3 rounded-lg border-2 text-left min-w-[200px] transition-all ${
                activeStage === stage.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <h3 className="font-semibold text-foreground">{stage.name}</h3>
              <p className="text-xs text-foreground-muted mt-1">{stage.isCode}</p>
              <div className="w-full bg-background-tertiary rounded-full h-1.5 mt-2">
                <div 
                  className="bg-primary h-1.5 rounded-full transition-all"
                  style={{ width: `${stageProgress}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="card p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-foreground">Inspection Progress</span>
          <span className="text-sm text-foreground-muted">{progress.completed}/{progress.total} items</span>
        </div>
        <div className="w-full bg-background-tertiary rounded-full h-3">
          <div 
            className="bg-primary h-3 rounded-full transition-all duration-300"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Checklist Items */}
      <div className="card">
        <div className="p-6 border-b border-border">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">{currentStage.name}</h2>
              <p className="text-sm text-foreground-muted">{currentStage.isCode}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-foreground-muted">Items</p>
              <p className="text-2xl font-bold text-foreground">{currentStage.items.length}</p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-border">
          {currentStage.items.map((item) => {
            const itemData = checklistData[activeStage]?.[item.id] || { status: null, notes: '', photos: [] };
            
            return (
              <div key={item.id} className="p-6 hover:bg-background-tertiary/50 transition-colors">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium text-foreground">{item.description}</h3>
                      {item.critical && (
                        <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded text-xs">
                          Critical
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground-muted mb-3">
                      <span className="font-medium">Criteria:</span> {item.criteria}
                    </p>
                    
                    {/* Status Buttons */}
                    <div className="flex gap-2 mb-3">
                      {['pass', 'fail', 'na'].map((status) => (
                        <button
                          key={status}
                          onClick={() => updateItemStatus(item.id, status)}
                          className={`px-3 py-1.5 rounded text-sm capitalize transition-colors ${
                            itemData.status === status
                              ? status === 'pass'
                                ? 'bg-green-500 text-white'
                                : status === 'fail'
                                ? 'bg-red-500 text-white'
                                : 'bg-gray-500 text-white'
                              : 'bg-background-tertiary hover:bg-background-tertiary/80'
                          }`}
                        >
                          {status === 'pass' && <FaCheckCircle className="inline mr-1" />}
                          {status === 'fail' && <FaTimesCircle className="inline mr-1" />}
                          {status}
                        </button>
                      ))}
                    </div>

                    {/* Notes */}
                    <textarea
                      placeholder="Add inspection notes..."
                      value={itemData.notes}
                      onChange={(e) => updateItemNotes(item.id, e.target.value)}
                      className="input text-sm w-full max-w-lg mb-3"
                      rows={2}
                    />

                    {/* Photos Grid */}
                    {itemData.photos.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 mt-3">
                        {itemData.photos.map((photo) => (
                          <div key={photo.id} className="relative group aspect-square">
                            <img 
                              src={photo.dataUrl} 
                              alt={photo.name}
                              className="w-full h-full object-cover rounded-lg border border-border"
                            />
                            <button
                              onClick={() => deletePhoto(item.id, photo.id)}
                              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <FaTrash size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Photo Upload */}
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => handlePhotoClick(item.id)}
                      className="btn btn-secondary btn-sm flex items-center gap-2"
                    >
                      <FaCamera />
                      Add Photos
                    </button>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />

                    {itemData.photos.length > 0 && (
                      <span className="text-xs text-foreground-muted">
                        {itemData.photos.length} photo(s)
                      </span>
                    )}

                    {itemData.checkedDate && (
                      <div className="text-xs text-foreground-muted text-right mt-2">
                        <div className="flex items-center gap-1">
                          <FaCalendar />
                          {itemData.checkedDate}
                        </div>
                        <div className="flex items-center gap-1">
                          <FaUser />
                          {itemData.checkedBy}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      {progress.percentage === 100 && (
        <div className="card bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
          <div className="p-6">
            <div className="flex items-start gap-3">
              <FaCheckCircle className="text-green-600 mt-1" />
              <div>
                <h3 className="font-semibold text-green-800 dark:text-green-400">Stage Complete</h3>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  All inspection items completed for {currentStage.name}. Ready to proceed.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QCChecklists;
import React, { createContext, useContext, useState, useEffect } from 'react';

const ProjectContext = createContext();

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load projects from localStorage on mount
  useEffect(() => {
    const savedProjects = localStorage.getItem('ecobuild-projects');
    const savedCurrentId = localStorage.getItem('ecobuild-current-project-id');
    
    if (savedProjects) {
      try {
        const parsed = JSON.parse(savedProjects);
        setProjects(parsed);
        if (savedCurrentId && parsed.find(p => p.id === savedCurrentId)) {
          setCurrentProjectId(savedCurrentId);
        } else if (parsed.length > 0) {
          setCurrentProjectId(parsed[0].id);
        }
      } catch (e) {
        console.error('Error loading projects:', e);
      }
    }
    setLoading(false);
  }, []);

  // Save projects to localStorage whenever they change
  useEffect(() => {
    if (!loading) {
      localStorage.setItem('ecobuild-projects', JSON.stringify(projects));
    }
  }, [projects, loading]);

  // Save current project ID
  useEffect(() => {
    if (currentProjectId && !loading) {
      localStorage.setItem('ecobuild-current-project-id', currentProjectId);
    }
  }, [currentProjectId, loading]);

  const createDefaultProject = () => ({
    id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: 'New Project',
    description: '',
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    
    // Location
    location: {
      lat: 10.5167,
      lon: 76.2167,
      district: 'thrissur',
      address: '',
      environmentalData: null
    },
    
    // Building Classification
    buildingClassification: {
      mainUse: 'residential',
      subType: 'individual',
      occupancyGroup: 'A-2',
      buildingType: 'residential_individual'
    },
    
    // Building Parameters
    buildingParams: {
      plotArea: 200,
      builtUpArea: 150,
      numFloors: 2,
      height: 6.4,
      basementFloors: 0,
      roadWidth: 6,
      roadType: 'public',
      frontageOnRoad: 10,
      setbacks: { front: 3, rear: 2, side1: 2, side2: 2 },
      parkingRequired: 2,
      parkingProvided: 2,
      visitorParking: 1,
      twoWheelerParking: 4,
      hasRainwaterHarvesting: true,
      hasSolarWaterHeater: false,
      hasSTP: false,
      totalBudget: 0,
      targetCarbon: 50,
      minRecycledContent: 10,
      // Structural Assumptions (per IS 456 / IS 875)
      slabThickness: 150, // mm - standard for residential
      beamDepth: 450, // mm - typical for spans up to 6m
      columnSize: 300, // mm - standard column dimension
      steelRatio: 100, // kg/m³ - typical for RCC framed structures (IS 456)
      wallThickness: 230, // mm - standard brick wall thickness
      floorHeight: 3.2, // m - typical floor height
      // Design Standards
      concreteGrade: 'm20', // IS 456:2000
      steelGrade: 'fe500', // IS 456:2000
      foundationType: 'isolated', // IS 1905:1987
      // Seismic & Wind (IS 1893:2016, IS 875 Part 3:2015)
      seismicZone: 'III', // Kerala is in Zone III
      windSpeed: 39, // m/s - Coastal Kerala
      // Loads (IS 875 Part 2:2015)
      liveLoad: 2, // kN/m² - Residential
      deadLoadFactor: 1.5, // IS 456:2000
      // Exposure Condition (IS 456 Table 3)
      exposureCondition: 'moderate',
      // Sustainability preferences
      sustainabilityPriority: 'high',
      maxTransportDistance: 50, // km
      recycledMaterialPreference: true
    },
    
    // Geotechnical
    geotechnical: {
      soilType: 'laterite',
      safeBearingCapacity: 150,
      cbrSubgrade: 8,
      groundwaterLevel: 4,
      sptNAtFoundation: 15,
      liquidLimit: 45,
      plasticLimit: 25,
      plasticityIndex: 18,
      recommendedFoundationType: 'isolated'
    },
    
    // Material Selections
    materialSelections: {},
    
    // Analysis Results
    analysisResults: {
      optimization: null,
      mixDesign: null,
      compliance: null,
      environmental: null,
      operationalCarbon: null,
      boq: null
    },
    
    // BIM Data - persists IFC file and extracted quantities
    bimData: {
      ifcFileName: null,
      ifcFileSize: null,
      quantities: null,
      materials: null,
      uploadedAt: null,
    },
    
    // Workflow Status - Tracks progress through the app
    workflow: {
      step: 0, // 0=Not Started, 1=Project Created, 2=Materials Selected, 3=BOQ Generated, 4=Reports Ready
      projectSetup: false,
      materialsSelected: false,
      boqGenerated: false,
      sustainabilityAssessed: false
    },
    
    isConfigured: false
  });

  const createProject = (name, description = '') => {
    const newProject = {
      ...createDefaultProject(),
      name,
      description,
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    setProjects(prev => [...prev, newProject]);
    setCurrentProjectId(newProject.id);
    return newProject.id;
  };

  const deleteProject = (projectId) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    
    // If we deleted the current project, switch to another one
    if (currentProjectId === projectId) {
      const remaining = projects.filter(p => p.id !== projectId);
      if (remaining.length > 0) {
        setCurrentProjectId(remaining[0].id);
      } else {
        setCurrentProjectId(null);
      }
    }
  };

  const duplicateProject = (projectId) => {
    const projectToClone = projects.find(p => p.id === projectId);
    if (!projectToClone) return;
    
    const clonedProject = {
      ...projectToClone,
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `${projectToClone.name} (Copy)`,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
    
    setProjects(prev => [...prev, clonedProject]);
    setCurrentProjectId(clonedProject.id);
  };

  const switchProject = (projectId) => {
    if (projects.find(p => p.id === projectId)) {
      setCurrentProjectId(projectId);
    }
  };

  const updateCurrentProject = (updates) => {
    if (!currentProjectId) return;
    
    setProjects(prev => prev.map(p => {
      if (p.id === currentProjectId) {
        return { 
          ...p, 
          ...updates, 
          lastModified: new Date().toISOString() 
        };
      }
      return p;
    }));
  };

  // Get current project - always return a default if no project exists
  const project = currentProjectId ? projects.find(p => p.id === currentProjectId) : (projects.length > 0 ? projects[0] : createDefaultProject());

  // Ensure project is never null
  const safeProject = project || createDefaultProject();

  // Wrapper functions for backward compatibility
  const updateProject = (updates) => updateCurrentProject(updates);
  
  const updateLocation = (location) => {
    updateCurrentProject({ location: { ...safeProject.location, ...location } });
  };

  const updateBuildingParams = (params) => {
    updateCurrentProject({ buildingParams: { ...safeProject.buildingParams, ...params } });
  };

  const updateBuildingClassification = (classification) => {
    updateCurrentProject({ buildingClassification: { ...safeProject.buildingClassification, ...classification } });
  };

  const updateGeotechnical = (geo) => {
    updateCurrentProject({ geotechnical: { ...safeProject.geotechnical, ...geo } });
  };

  const updateAnalysisResults = (key, data) => {
    updateCurrentProject({ 
      analysisResults: { ...safeProject.analysisResults, [key]: data } 
    });
  };

  const saveMaterialSelection = (category, material) => {
    setProjects(prev => prev.map(p => {
      if (p.id === currentProjectId) {
        let newSelections;
        if (category === 'batch' && typeof material === 'object') {
          newSelections = { ...p.materialSelections, ...material };
        } else {
          newSelections = { ...p.materialSelections, [category]: material };
        }
        return {
          ...p,
          materialSelections: newSelections,
          lastModified: new Date().toISOString()
        };
      }
      return p;
    }));
  };

  const updateBIMData = (bimData) => {
    updateCurrentProject({
      bimData: { ...safeProject.bimData, ...bimData }
    });
  };

  const calculateParkingRequirement = () => {
    const { buildingClassification, buildingParams } = project;
    let required = 0;
    
    switch(buildingClassification.mainUse) {
      case 'residential':
        if (buildingClassification.subType === 'individual') {
          required = 1;
        } else if (buildingClassification.subType === 'apartment') {
          required = Math.ceil(buildingParams.builtUpArea / 100);
        }
        break;
      case 'commercial':
        required = Math.ceil(buildingParams.builtUpArea / 50);
        break;
      case 'institutional':
        required = Math.ceil(buildingParams.builtUpArea / 100);
        break;
      case 'industrial':
        required = Math.ceil(buildingParams.builtUpArea / 200);
        break;
      default:
        required = 1;
    }
    
    return required;
  };

  if (loading) {
    return <div>Loading projects...</div>;
  }

  // Workflow management functions
  const updateWorkflow = (updates) => {
    updateCurrentProject({
      workflow: { ...safeProject.workflow, ...updates }
    });
  };
  
  const completeProjectSetup = () => {
    updateWorkflow({ 
      step: 1, 
      projectSetup: true 
    });
  };
  
  const completeMaterialsSelection = () => {
    updateWorkflow({ 
      step: 2, 
      materialsSelected: true 
    });
  };
  
  const completeBOQGeneration = () => {
    updateWorkflow({ 
      step: 3, 
      boqGenerated: true 
    });
  };
  
  const completeSustainability = () => {
    updateWorkflow({ 
      step: 4, 
      sustainabilityAssessed: true 
    });
  };
  
  // Check if a feature is available
  const isFeatureLocked = (feature) => {
    if (!safeProject) return true;
    const { workflow } = safeProject;
    
    switch (feature) {
      case 'materials':
        return workflow.step < 1; // Need project setup first
      case 'optimizer':
        return workflow.step < 1; // Need project setup first
      case 'bim':
        return workflow.step < 1;
      case 'boq':
        return workflow.step < 1; // Accessible after project setup
      case 'reports':
        return workflow.step < 1; // Accessible after project setup
      default:
        return false;
    }
  };
  
  const getWorkflowStep = () => {
    return safeProject?.workflow?.step || 0;
  };

  const hasProject = projects.length > 0;
  const isProjectConfigured = safeProject?.isConfigured || false;

  return (
    <ProjectContext.Provider value={{ 
      // New multi-project functions
      projects,
      currentProjectId,
      createProject,
      deleteProject,
      duplicateProject,
      switchProject,
      projectCount: projects.length,
      
      // Project status helpers
      hasProject,
      isProjectConfigured,
      
      // Workflow functions
      updateWorkflow,
      completeProjectSetup,
      completeMaterialsSelection,
      completeBOQGeneration,
      completeSustainability,
      isFeatureLocked,
      getWorkflowStep,
      
      // Backward compatible (uses safe project)
      project: safeProject,
      updateProject,
      updateLocation,
      updateBuildingParams,
      updateBuildingClassification,
      updateGeotechnical,
      updateAnalysisResults,
      saveMaterialSelection,
      updateBIMData,
      calculateParkingRequirement
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  return useContext(ProjectContext);
}

export default ProjectContext;
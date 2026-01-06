import { create } from 'zustand';

const useProjectsStore = create((set, get) => ({
    projects: [],
    currentProject: null,
    currentFloorPlan: null,
    floorPlans: [],
    isLoading: false,
    error: null,

    // Project actions
    setProjects: (projects) => set({ projects }),

    setCurrentProject: (project) => set({ currentProject: project }),

    addProject: (project) => set((state) => ({
        projects: [project, ...state.projects]
    })),

    updateProject: (projectId, updates) => set((state) => ({
        projects: state.projects.map(p =>
            p._id === projectId ? { ...p, ...updates } : p
        ),
        currentProject: state.currentProject?._id === projectId
            ? { ...state.currentProject, ...updates }
            : state.currentProject
    })),

    removeProject: (projectId) => set((state) => ({
        projects: state.projects.filter(p => p._id !== projectId),
        currentProject: state.currentProject?._id === projectId ? null : state.currentProject
    })),

    // Floor plan actions
    setFloorPlans: (floorPlans) => set({ floorPlans }),

    setCurrentFloorPlan: (floorPlan) => set({ currentFloorPlan: floorPlan }),

    addFloorPlan: (floorPlan) => set((state) => ({
        floorPlans: [...state.floorPlans, floorPlan]
    })),

    updateFloorPlan: (floorPlanId, updates) => set((state) => ({
        floorPlans: state.floorPlans.map(fp =>
            fp._id === floorPlanId ? { ...fp, ...updates } : fp
        ),
        currentFloorPlan: state.currentFloorPlan?._id === floorPlanId
            ? { ...state.currentFloorPlan, ...updates }
            : state.currentFloorPlan
    })),

    removeFloorPlan: (floorPlanId) => set((state) => ({
        floorPlans: state.floorPlans.filter(fp => fp._id !== floorPlanId),
        currentFloorPlan: state.currentFloorPlan?._id === floorPlanId ? null : state.currentFloorPlan
    })),

    // Loading and error states
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
    clearError: () => set({ error: null }),

    // Reset store
    reset: () => set({
        projects: [],
        currentProject: null,
        currentFloorPlan: null,
        floorPlans: [],
        isLoading: false,
        error: null
    })
}));

export default useProjectsStore;

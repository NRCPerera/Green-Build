import { useState, useCallback } from 'react';
import useProjectsStore from '../models/useProjectsStore';
import { projectApi } from '../services/projectService';

const useProjectsController = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const {
        projects,
        currentProject,
        floorPlans,
        currentFloorPlan,
        setProjects,
        setCurrentProject,
        addProject,
        updateProject: updateProjectInStore,
        removeProject,
        setFloorPlans,
        setCurrentFloorPlan,
        addFloorPlan,
        updateFloorPlan: updateFloorPlanInStore,
        removeFloorPlan
    } = useProjectsStore();

    // Fetch all projects
    const fetchProjects = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const response = await projectApi.getProjects(params);
            if (response.success) {
                setProjects(response.data.projects);
                return { success: true, projects: response.data.projects };
            }
            throw new Error(response.message || 'Failed to fetch projects');
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message;
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    }, [setProjects]);

    // Create new project
    const createProject = useCallback(async (projectData) => {
        setLoading(true);
        setError(null);
        try {
            const response = await projectApi.createProject(projectData);
            if (response.success) {
                addProject(response.data.project);
                return { success: true, project: response.data.project };
            }
            throw new Error(response.message || 'Failed to create project');
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message;
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    }, [addProject]);

    // Fetch single project
    const fetchProject = useCallback(async (projectId) => {
        setLoading(true);
        setError(null);
        try {
            const response = await projectApi.getProject(projectId);
            if (response.success) {
                setCurrentProject(response.data.project);
                setFloorPlans(response.data.project.floorPlans || []);
                return { success: true, project: response.data.project };
            }
            throw new Error(response.message || 'Failed to fetch project');
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message;
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    }, [setCurrentProject, setFloorPlans]);

    // Update project
    const updateProject = useCallback(async (projectId, updates) => {
        setLoading(true);
        setError(null);
        try {
            const response = await projectApi.updateProject(projectId, updates);
            if (response.success) {
                updateProjectInStore(projectId, response.data.project);
                return { success: true, project: response.data.project };
            }
            throw new Error(response.message || 'Failed to update project');
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message;
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    }, [updateProjectInStore]);

    // Delete project
    const deleteProject = useCallback(async (projectId) => {
        setLoading(true);
        setError(null);
        try {
            const response = await projectApi.deleteProject(projectId);
            if (response.success) {
                removeProject(projectId);
                return { success: true };
            }
            throw new Error(response.message || 'Failed to delete project');
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message;
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    }, [removeProject]);

    // Upload floor plan
    const uploadFloorPlan = useCallback(async (projectId, file, options = {}) => {
        setLoading(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('floorPlan', file);
            if (options.name) formData.append('name', options.name);
            if (options.description) formData.append('description', options.description);
            if (options.floorNumber) formData.append('floorNumber', options.floorNumber);
            if (options.scale) formData.append('scale', options.scale);
            if (options.wallHeight) formData.append('wallHeight', options.wallHeight);

            const response = await projectApi.uploadFloorPlan(projectId, formData, options.onProgress);
            if (response.success) {
                addFloorPlan(response.data.floorPlan);
                return {
                    success: true,
                    floorPlan: response.data.floorPlan,
                    costs: response.data.costs
                };
            }
            throw new Error(response.message || 'Failed to upload floor plan');
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message;
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    }, [addFloorPlan]);

    // Fetch floor plans for a project
    const fetchFloorPlans = useCallback(async (projectId) => {
        setLoading(true);
        setError(null);
        try {
            const response = await projectApi.getFloorPlans(projectId);
            if (response.success) {
                setFloorPlans(response.data.floorPlans);
                return { success: true, floorPlans: response.data.floorPlans };
            }
            throw new Error(response.message || 'Failed to fetch floor plans');
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message;
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    }, [setFloorPlans]);

    // Fetch single floor plan with costs
    const fetchFloorPlan = useCallback(async (projectId, floorPlanId) => {
        setLoading(true);
        setError(null);
        try {
            const response = await projectApi.getFloorPlan(projectId, floorPlanId);
            if (response.success) {
                setCurrentFloorPlan(response.data.floorPlan);
                return {
                    success: true,
                    floorPlan: response.data.floorPlan,
                    costs: response.data.costs
                };
            }
            throw new Error(response.message || 'Failed to fetch floor plan');
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message;
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    }, [setCurrentFloorPlan]);

    // Delete floor plan
    const deleteFloorPlan = useCallback(async (projectId, floorPlanId) => {
        setLoading(true);
        setError(null);
        try {
            const response = await projectApi.deleteFloorPlan(projectId, floorPlanId);
            if (response.success) {
                removeFloorPlan(floorPlanId);
                return { success: true };
            }
            throw new Error(response.message || 'Failed to delete floor plan');
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message;
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    }, [removeFloorPlan]);

    return {
        // State
        projects,
        currentProject,
        floorPlans,
        currentFloorPlan,
        loading,
        error,

        // Project actions
        fetchProjects,
        createProject,
        fetchProject,
        updateProject,
        deleteProject,
        setCurrentProject,

        // Floor plan actions
        uploadFloorPlan,
        fetchFloorPlans,
        fetchFloorPlan,
        deleteFloorPlan,
        setCurrentFloorPlan,

        // Utilities
        clearError: () => setError(null)
    };
};

export default useProjectsController;

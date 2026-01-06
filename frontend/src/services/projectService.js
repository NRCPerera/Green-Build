import api from '../models/api';

export const projectApi = {
    // Projects
    createProject: async (projectData) => {
        const response = await api.post('/api/projects', projectData);
        return response.data;
    },

    getProjects: async (params = {}) => {
        const response = await api.get('/api/projects', { params });
        return response.data;
    },

    getProject: async (projectId) => {
        const response = await api.get(`/api/projects/${projectId}`);
        return response.data;
    },

    updateProject: async (projectId, projectData) => {
        const response = await api.put(`/api/projects/${projectId}`, projectData);
        return response.data;
    },

    deleteProject: async (projectId) => {
        const response = await api.delete(`/api/projects/${projectId}`);
        return response.data;
    },

    getProjectSummary: async (projectId) => {
        const response = await api.get(`/api/projects/${projectId}/summary`);
        return response.data;
    },

    // Floor Plans
    uploadFloorPlan: async (projectId, formData, onUploadProgress) => {
        const response = await api.post(
            `/api/projects/${projectId}/floorplans`,
            formData,
            {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress,
                timeout: 120000
            }
        );
        return response.data;
    },

    getFloorPlans: async (projectId) => {
        const response = await api.get(`/api/projects/${projectId}/floorplans`);
        return response.data;
    },

    getFloorPlan: async (projectId, floorPlanId) => {
        const response = await api.get(`/api/projects/${projectId}/floorplans/${floorPlanId}`);
        return response.data;
    },

    updateFloorPlan: async (projectId, floorPlanId, data) => {
        const response = await api.put(`/api/projects/${projectId}/floorplans/${floorPlanId}`, data);
        return response.data;
    },

    deleteFloorPlan: async (projectId, floorPlanId) => {
        const response = await api.delete(`/api/projects/${projectId}/floorplans/${floorPlanId}`);
        return response.data;
    },

    reanalyzeFloorPlan: async (projectId, floorPlanId, params) => {
        const response = await api.post(
            `/api/projects/${projectId}/floorplans/${floorPlanId}/reanalyze`,
            params
        );
        return response.data;
    }
};

export default projectApi;

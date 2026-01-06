import api from '../models/api';

export const authApi = {
    register: async (userData) => {
        const response = await api.post('/api/auth/register', userData);
        return response.data;
    },

    login: async (credentials) => {
        const response = await api.post('/api/auth/login', credentials);
        return response.data;
    },

    getProfile: async () => {
        const response = await api.get('/api/auth/profile');
        return response.data;
    },

    updateProfile: async (profileData) => {
        const response = await api.put('/api/auth/profile', profileData);
        return response.data;
    },

    changePassword: async (passwordData) => {
        const response = await api.put('/api/auth/change-password', passwordData);
        return response.data;
    },

    verifyToken: async () => {
        const response = await api.get('/api/auth/verify');
        return response.data;
    },

    getAllUsers: async (params = {}) => {
        const response = await api.get('/api/auth/users', { params });
        return response.data;
    },

    updateUser: async (userId, userData) => {
        const response = await api.put(`/api/auth/users/${userId}`, userData);
        return response.data;
    },

    deleteUser: async (userId) => {
        const response = await api.delete(`/api/auth/users/${userId}`);
        return response.data;
    }
};

export default authApi;

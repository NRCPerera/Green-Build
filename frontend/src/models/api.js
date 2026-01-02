/**
 * =============================================================================
 * CENTRALIZED API SERVICE
 * =============================================================================
 * 
 * Axios instance with interceptors for all API communications.
 * Handles authentication, error handling, and request/response transformation.
 */

import axios from 'axios';

// =============================================================================
// CONFIGURATION
// =============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || '120000', 10);

// =============================================================================
// AXIOS INSTANCE
// =============================================================================

/**
 * Centralized Axios instance with pre-configured interceptors
 */
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
    },
});

// =============================================================================
// REQUEST INTERCEPTOR
// =============================================================================

api.interceptors.request.use(
    (config) => {
        // Add authorization token if available
        const token = localStorage.getItem('authToken');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Log requests in development
        if (import.meta.env.DEV) {
            console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
        }

        return config;
    },
    (error) => {
        console.error('[API Request Error]', error);
        return Promise.reject(error);
    }
);

// =============================================================================
// RESPONSE INTERCEPTOR
// =============================================================================

api.interceptors.response.use(
    (response) => {
        // Log responses in development
        if (import.meta.env.DEV) {
            console.log(`[API Response] ${response.status} ${response.config.url}`);
        }
        return response;
    },
    (error) => {
        // Handle different error scenarios
        if (error.response) {
            const status = error.response.status;

            switch (status) {
                case 401:
                    localStorage.removeItem('authToken');
                    break;
                case 403:
                    console.error('[API] Forbidden - insufficient permissions');
                    break;
                case 404:
                    console.error('[API] Resource not found');
                    break;
                case 500:
                    console.error('[API] Server error');
                    break;
                default:
                    console.error(`[API] Error ${status}`);
            }
        } else if (error.request) {
            console.error('[API] Network error - no response received');
        } else {
            console.error('[API] Request configuration error', error.message);
        }

        return Promise.reject(error);
    }
);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Parse API errors into user-friendly messages
 * @param {Error} error - The caught error object
 * @returns {string} Human-readable error message
 */
export const parseApiError = (error) => {
    if (axios.isAxiosError(error)) {
        // Server returned an error response
        if (error.response?.data?.message) {
            return error.response.data.message;
        }

        // Network connection failed
        if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
            return 'Cannot connect to the backend server. Please ensure it is running.';
        }

        // Request timed out
        if (error.code === 'ECONNABORTED') {
            return 'Request timed out. The server may be overloaded.';
        }

        // Server error
        if (error.response?.status >= 500) {
            return 'Server error occurred. Please try again later.';
        }
    }

    return 'An unexpected error occurred. Please try again.';
};

// =============================================================================
// MODULE-SPECIFIC API ENDPOINTS
// =============================================================================

/**
 * Quantity Takeoff API endpoints
 */
export const quantityApi = {
    /**
     * Upload floor plan and get quantity takeoff results
     * @param {File} imageFile - The floor plan image file
     * @param {number} scale - Scale in pixels per meter
     * @param {number} wallHeight - Wall height in meters
     * @returns {Promise} API response
     */
    uploadFloorPlan: async (imageFile, scale, wallHeight) => {
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('scale', scale.toString());
        formData.append('wallHeight', wallHeight.toString());

        return api.post('/api/upload-plan', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    /**
     * Get saved quantity takeoff by ID
     * @param {string} id - Takeoff ID
     * @returns {Promise} API response
     */
    getQuantityTakeoff: (id) => {
        return api.get(`/api/quantity-takeoff/${id}`);
    },
};

/**
 * Cost Prediction API endpoints
 */
export const costApi = {
    /**
     * Get cost prediction based on quantity data
     * @param {Object} input - Prediction input data
     * @returns {Promise} API response
     */
    predictCost: async (input) => {
        return api.post('/api/cost-prediction/predict', input);
    },

    /**
     * Get market indices for a region
     * @param {string} region - Region code
     * @returns {Promise} API response
     */
    getMarketIndices: (region) => {
        return api.get(`/api/cost-prediction/market-indices/${region}`);
    },
};

/**
 * Sustainability API endpoints
 */
export const sustainabilityApi = {
    /**
     * Calculate lifecycle cost and carbon footprint
     * @param {Object} input - Calculation input data
     * @returns {Promise} API response
     */
    calculate: async (input) => {
        return api.post('/api/sustainability/calculate', input);
    },

    /**
     * Get material carbon factors
     * @returns {Promise} API response
     */
    getMaterialFactors: () => {
        return api.get('/api/sustainability/material-factors');
    },
};

/**
 * Delay Forecast API endpoints
 */
export const delayApi = {
    /**
     * Predict project delays
     * @param {Object} input - Forecast input data
     * @returns {Promise} API response
     */
    predict: async (input) => {
        return api.post('/api/delay-forecast/predict', input);
    },

    /**
     * Get historical delay data
     * @param {string} region - Region code
     * @returns {Promise} API response
     */
    getHistoricalData: (region) => {
        return api.get(`/api/delay-forecast/historical/${region}`);
    },
};

export default api;

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || '120000', 10);

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }

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

api.interceptors.response.use(
    (response) => {
        if (import.meta.env.DEV) {
            console.log(`[API Response] ${response.status} ${response.config.url}`);
        }
        return response;
    },
    (error) => {
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

export const parseApiError = (error) => {
    if (axios.isAxiosError(error)) {
        if (error.response?.data?.userMessage) {
            return error.response.data.userMessage;
        }

        if (error.response?.data?.message) {
            return error.response.data.message;
        }

        if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
            return 'Cannot connect to the backend server. Please ensure it is running.';
        }

        if (error.code === 'ECONNABORTED') {
            return 'Request timed out. The server may be overloaded.';
        }

        if (error.response?.status >= 500) {
            return 'Server error occurred. Please try again later.';
        }
    }

    return 'An unexpected error occurred. Please try again.';
};

export const quantityApi = {
    uploadFloorPlan: async (imageFile, scale, wallHeight) => {
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('scale', scale.toString());
        formData.append('wallHeight', wallHeight.toString());

        return api.post('/api/upload-plan', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    getQuantityTakeoff: (id) => {
        return api.get(`/api/quantity-takeoff/${id}`);
    },
};

export const costApi = {
    predictCost: async (input) => {
        return api.post('/api/cost-prediction/pre-project', input);
    },

    getMarketIndices: (region) => {
        return api.get(`/api/cost-prediction/market-indices/${region}`);
    },

    getEconomicIndicators: ({ year, province, district }) => {
        return api.get('/api/economic-indicators', {
            params: {
                year,
                province,
                district,
            },
        });
    },
};

export const sustainabilityApi = {
    // Full analysis with all 3 models
    analyze: async (input) => {
        return api.post('/api/sustainability/analyze', input);
    },

    // Individual predictions
    predictScore: async (input) => {
        return api.post('/api/sustainability/predict-score', input);
    },

    predictLifecycle: async (input) => {
        return api.post('/api/sustainability/predict-lifecycle', input);
    },

    predictRisk: async (input) => {
        return api.post('/api/sustainability/predict-risk', input);
    },

    // Health check
    checkHealth: async () => {
        return api.get('/api/sustainability-ml-health');
    }
};

export const delayApi = {
    // Full prediction (regression + classification)
    predict: async (input) => {
        return api.post('/api/predict-delay', { data: input });
    },

    // Regression only - predict delay days
    predictRegression: async (input) => {
        return api.post('/api/predict-delay/regression', { data: input });
    },

    // Classification only - predict delay category
    predictClassification: async (input) => {
        return api.post('/api/predict-delay/classification', { data: input });
    },

    // Health check
    checkHealth: async () => {
        return api.get('/api/delay-ml-health');
    }
};

export default api;

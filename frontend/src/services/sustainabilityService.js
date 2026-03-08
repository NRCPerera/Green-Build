import axios from 'axios';
import config from '../config';

/**
 * Calls the backend proxy to calculate sustainability metrics.
 * 
 * @param {Object} data 
 * @param {number} data.area - Project Area
 * @param {number} data.lifespan - Building Lifespan
 * @param {string} data.material - Primary Material
 * @param {string} data.energyRating - Energy Rating
 * @param {number} data.renewablePercent - Renewable Energy Percentage
 * @returns {Promise<Object>} The sustainability analysis result
 */
export const calculateSustainability = async (data) => {
    try {
        const response = await axios.post(`${config.apiBaseUrl}/api/sustainability/calculate`, data);
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Calls the backend proxy to run the MILP material optimizer.
 * 
 * @param {Object} data 
 * @param {number} data.wall_area
 * @param {number} data.floor_area
 * @param {number} data.door_count
 * @param {number} data.window_count
 * @param {number} data.max_budget
 * @returns {Promise<Object>} Optimization results
 */
export const optimizeMaterials = async (data) => {
    try {
        const response = await axios.post(`${config.apiBaseUrl}/api/sustainability/optimize-materials`, data);
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Formats carbon values into tons or kg.
 * 
 * @param {number} kg - Carbon in kg
 * @returns {string} Formatted carbon string
 */
export const formatCarbon = (kg) => {
    if (kg >= 1000) {
        return `${(kg / 1000).toFixed(1)}t CO₂`;
    }
    return `${kg.toFixed(0)}kg CO₂`;
};

/**
 * Formats currency values into M (Millions) or K (Thousands).
 * 
 * @param {number} value - Currency in LKR
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value) => {
    if (value >= 1000000) {
        return `Rs. ${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
        return `Rs. ${(value / 1000).toFixed(1)}K`;
    }
    return `Rs. ${value.toFixed(0)}`;
};

export default {
    calculateSustainability,
    formatCarbon,
    formatCurrency
};

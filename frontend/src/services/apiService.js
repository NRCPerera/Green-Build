/**
 * API Service
 * 
 * Handles all communication with the backend API.
 * Centralizes HTTP requests and error handling.
 */

import axios from 'axios';
import config from '../config';

/**
 * Uploads a floor plan image and retrieves quantity takeoff results.
 * 
 * @param {File} imageFile - The floor plan image file to upload
 * @param {number} scale - Scale in pixels per meter
 * @param {number} wallHeight - Wall height in meters
 * @returns {Promise<Object>} API response with quantities and costs
 * @throws {Error} Network or server errors
 */
export const uploadFloorPlan = async (imageFile, scale, wallHeight) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('scale', scale);
    formData.append('wallHeight', wallHeight);

    const response = await axios.post(
        `${config.apiBaseUrl}/api/upload-plan`,
        formData,
        {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: config.requestTimeout
        }
    );

    return response.data;
};

/**
 * Parses API errors into user-friendly messages.
 * Handles different error types and provides appropriate feedback.
 * 
 * @param {Error} error - The caught error object
 * @returns {string} Human-readable error message
 */
export const parseApiError = (error) => {
    // Server returned an error response
    if (error.response?.data?.message) {
        return error.response.data.message;
    }

    // Network connection failed
    if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        return 'Cannot connect to the backend server. Please ensure it is running on port 5001.';
    }

    // Request timed out
    if (error.code === 'ECONNABORTED') {
        return 'Request timed out. The image may be too complex.';
    }

    // Default fallback message
    return 'Failed to process the floor plan';
};

export default {
    uploadFloorPlan,
    parseApiError
};

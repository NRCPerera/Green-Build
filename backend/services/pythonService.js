/**
 * Python ML Service Integration
 * 
 * This service handles communication with the Python-based machine learning
 * backend that performs quantity takeoff calculations using computer vision.
 */

const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const config = require('../config');

/**
 * Sends an image to the Python ML service for quantity calculation.
 * The service uses trained models to detect walls, doors, and windows
 * from floor plan images and returns measured quantities.
 * 
 * @param {string} filePath - Path to the uploaded image file
 * @param {number} scale - Scale factor in pixels per meter
 * @param {number} wallHeight - Wall height in meters
 * @returns {Promise<Object>} Quantity data from the ML service
 * @throws {Error} If the service is unavailable or processing fails
 */
const calculateQuantities = async (filePath, scale, wallHeight) => {
    const formData = new FormData();

    // Prepare the form data with the image and parameters
    formData.append('file', fs.createReadStream(filePath));
    formData.append('scale_ppm', scale.toString());
    formData.append('wall_height', wallHeight.toString());

    const response = await axios.post(
        `${config.pythonServiceUrl}/calculate-quantities`,
        formData,
        {
            headers: {
                ...formData.getHeaders()
            },
            timeout: 60000, // Allow up to 60 seconds for ML inference
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        }
    );

    return response.data;
};

/**
 * Checks the health status of the Python ML service.
 * Used to verify connectivity before processing requests.
 * 
 * @returns {Promise<string>} Health status of the service
 */
const checkHealth = async () => {
    try {
        const response = await axios.get(`${config.pythonServiceUrl}/health`, {
            timeout: 5000
        });
        return response.data.status || 'healthy';
    } catch (error) {
        return 'unavailable';
    }
};

/**
 * Generates 3D geometry data from a floor plan image.
 * The service extracts walls, doors, and windows as polygons
 * suitable for Three.js visualization.
 * 
 * @param {string} filePath - Path to the uploaded image file
 * @param {number} scale - Scale factor in pixels per meter
 * @param {number} wallHeight - Wall height in meters
 * @returns {Promise<Object>} 3D geometry data with walls, doors, windows
 * @throws {Error} If the service is unavailable or processing fails
 */
const generate3DGeometry = async (filePath, scale, wallHeight) => {
    const formData = new FormData();

    formData.append('file', fs.createReadStream(filePath));
    formData.append('scale_ppm', scale.toString());
    formData.append('wall_height', wallHeight.toString());

    const response = await axios.post(
        `${config.pythonServiceUrl}/generate-3d-geometry`,
        formData,
        {
            headers: {
                ...formData.getHeaders()
            },
            timeout: 60000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        }
    );

    return response.data;
};

module.exports = {
    calculateQuantities,
    checkHealth,
    generate3DGeometry
};

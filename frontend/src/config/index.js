/**
 * API Configuration
 * 
 * Centralized configuration for API endpoints and settings.
 */

const config = {
    // Backend server URL
    apiBaseUrl: 'https://green-build-i4ml.onrender.com',

    // Request timeout in milliseconds (2 minutes for ML processing)
    requestTimeout: 120000,

    // Maximum file size in MB
    maxFileSizeMb: 50
};

export default config;

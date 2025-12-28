/**
 * API Configuration
 * 
 * Centralized configuration for API endpoints and settings.
 */

const config = {
    // Backend server URL
    apiBaseUrl: 'http://localhost:5000',

    // Request timeout in milliseconds (2 minutes for ML processing)
    requestTimeout: 120000,

    // Maximum file size in MB
    maxFileSizeMb: 50
};

export default config;

/**
 * Application Configuration
 * 
 * This module centralizes all configuration settings for the application.
 * Environment variables take precedence over default values.
 */

require('dotenv').config();

const config = {
    // Server settings
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',

    // External service URLs
    pythonServiceUrl: process.env.PYTHON_SERVICE_URL || 'http://localhost:8000',
    frontendUrl: process.env.FRONTEND_URL || '*',

    // File upload settings
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: 50 * 1024 * 1024, // 50MB maximum file size
    allowedMimeTypes: [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/tiff',
        'image/bmp'
    ],

    // Cost estimation rates per square meter
    costRates: {
        wallPaintRatePerSqm: 15.00,      // Basic wall painting
        wallPlasterRatePerSqm: 25.00,    // Plastering work
        wallTilingRatePerSqm: 45.00,     // Wall tiling
        doorUnitCost: 350.00,            // Per door unit
        windowUnitCost: 250.00           // Per window unit
    }
};

module.exports = config;

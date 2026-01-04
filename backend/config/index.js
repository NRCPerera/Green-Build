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
    costMlServiceUrl: process.env.COST_ML_SERVICE_URL || 'http://localhost:8001',
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

    // Cost estimation rates for ML-detected items
    costRates: {
        wallPaintRatePerSqm: 15.00,      // Basic wall painting
        wallPlasterRatePerSqm: 25.00,    // Plastering work
        wallTilingRatePerSqm: 45.00,     // Wall tiling
        doorUnitCost: 350.00,            // Per door unit
        windowUnitCost: 250.00           // Per window unit
    },

    // Cost rates for manually-input items
    additionalRates: {
        // Electrical
        electricalOutlet: 25.00,         // Per outlet
        electricalSwitch: 20.00,         // Per switch
        lightFixture: 75.00,             // Per fixture

        // Plumbing
        sink: 150.00,                    // Per sink
        toilet: 300.00,                  // Per toilet
        shower: 400.00,                  // Per shower unit
        bathtub: 600.00,                 // Per bathtub

        // HVAC
        acUnit: 1200.00,                 // Per AC unit

        // Structural
        staircase: 2500.00,              // Per staircase

        // Flooring (per sq.m)
        flooringTile: 35.00,             // Tile flooring
        flooringWood: 65.00,             // Wood flooring
        flooringCarpet: 25.00,           // Carpet flooring

        // Ceiling (per sq.m)
        ceilingPlain: 15.00,             // Plain ceiling
        ceilingFalse: 35.00              // False ceiling
    }
};

module.exports = config;

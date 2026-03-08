/**
 * Application Configuration
 * 
 * This module centralizes all configuration settings for the application.
 * Environment variables take precedence over default values.
 */

require('dotenv').config();

const config = {
    // Server settings
    port: process.env.PORT || 5001,
    nodeEnv: process.env.NODE_ENV || 'development',

    // External service URLs
    pythonServiceUrl: process.env.PYTHON_SERVICE_URL || 'http://localhost:8000',
    costMlServiceUrl: process.env.COST_ML_SERVICE_URL || 'http://localhost:8085',
    delayMlServiceUrl: process.env.DELAY_ML_SERVICE_URL || 'http://localhost:8002',
    sustainabilityMlUrl: process.env.SUSTAINABILITY_ML_URL || 'http://localhost:8003',
    fredBaseUrl: process.env.FRED_BASE_URL || 'https://api.stlouisfed.org/fred',
    fredApiKey: process.env.FRED_API_KEY || '',
    frontendUrl: process.env.FRONTEND_URL || '*',

    economicIndicators: {
        requestTimeoutMs: parseInt(process.env.ECONOMIC_API_TIMEOUT_MS || '15000', 10),
        cacheTtlSeconds: parseInt(process.env.ECONOMIC_CACHE_TTL_SECONDS || '3600', 10),
        series: {
            inflation: process.env.FRED_SERIES_INFLATION || 'FPCPITOTLZGLKA',
            exchangeRateLkr: process.env.FRED_SERIES_EXCHANGE_LKR || 'EXSLUS',
            materialIndex: process.env.FRED_SERIES_MATERIAL_INDEX || 'DDOE01LKA086NWDB'
        }
    },

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

    // Cost estimation rates for ML-detected items (in LKR - Sri Lankan Rupees)
    costRates: {
        wallPaintRatePerSqm: 450.00,       // Basic wall painting per sq.m
        wallPlasterRatePerSqm: 850.00,     // Plastering work per sq.m
        wallTilingRatePerSqm: 2500.00,     // Wall tiling per sq.m
        doorUnitCost: 35000.00,            // Per door unit (standard wooden door)
        windowUnitCost: 25000.00           // Per window unit (aluminum/UPVC)
    },

    // Cost rates for manually-input items (in LKR)
    additionalRates: {
        // Electrical
        electricalOutlet: 1500.00,         // Per outlet (with wiring)
        electricalSwitch: 1200.00,         // Per switch (with wiring)
        lightFixture: 3500.00,             // Per fixture (standard LED)

        // Plumbing
        sink: 15000.00,                    // Per sink (stainless steel)
        toilet: 35000.00,                  // Per toilet (standard commode)
        shower: 25000.00,                  // Per shower unit
        bathtub: 85000.00,                 // Per bathtub

        // HVAC
        acUnit: 150000.00,                 // Per AC unit (1.5 ton split)

        // Structural
        staircase: 350000.00,              // Per staircase (concrete with railing)

        // Flooring (per sq.m)
        flooringTile: 3500.00,             // Tile flooring per sq.m
        flooringWood: 8500.00,             // Wood flooring per sq.m
        flooringCarpet: 2500.00,           // Carpet flooring per sq.m

        // Ceiling (per sq.m)
        ceilingPlain: 1200.00,             // Plain ceiling per sq.m
        ceilingFalse: 3500.00              // False ceiling per sq.m
    },

    // Currency setting
    currency: 'LKR'
};

module.exports = config;

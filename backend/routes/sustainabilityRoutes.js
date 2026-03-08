/**
 * Sustainability Prediction Routes
 * 
 * Routes for the Sustainability ML Service
 */

const express = require('express');
const axios = require('axios');
const config = require('../config');
const { calculateSustainability, optimizeMaterials } = require('../controllers/sustainabilityController');

const router = express.Router();

/**
 * POST /api/sustainability/calculate
 * Calculate sustainability metrics
 */
router.post('/api/sustainability/calculate', calculateSustainability);

/**
 * POST /api/sustainability/optimize-materials
 * Inverse Optimization - Auto-prescribe materials to minimise CO2
 */
router.post('/api/sustainability/optimize-materials', optimizeMaterials);

/**
 * GET /api/sustainability-ml-health
 * Check ML service health
 */
router.get('/api/sustainability-ml-health', async (req, res) => {
    try {
        const mlServiceUrl = config.sustainabilityMlUrl;

        const response = await axios.get(`${mlServiceUrl}/health`, {
            timeout: 5000
        });

        res.json({
            success: true,
            mlService: {
                status: response.data.status || 'healthy',
                mode: response.data.mode || 'unknown',
                modelsLoaded: response.data.models_loaded || false,
                url: mlServiceUrl
            }
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            error: 'ML service unavailable',
            message: error.message,
            mlServiceUrl: config.sustainabilityMlUrl
        });
    }
});

module.exports = router;

/**
 * Sustainability Prediction Routes
 * 
 * Routes for the Sustainability ML Service
 */

const express = require('express');
const axios = require('axios');
const {
    handleFullAnalysis,
    handleSustainabilityPrediction,
    handleLifecycleCostPrediction,
    handleRiskPrediction
} = require('../controllers/sustainabilityController');

const router = express.Router();

/**
 * POST /api/sustainability/analyze
 * Full analysis with all 3 models
 */
router.post('/api/sustainability/analyze', handleFullAnalysis);

/**
 * POST /api/sustainability/predict-score
 * Sustainability score prediction only
 */
router.post('/api/sustainability/predict-score', handleSustainabilityPrediction);

/**
 * POST /api/sustainability/predict-lifecycle
 * Lifecycle cost prediction only
 */
router.post('/api/sustainability/predict-lifecycle', handleLifecycleCostPrediction);

/**
 * POST /api/sustainability/predict-risk
 * Risk prediction only
 */
router.post('/api/sustainability/predict-risk', handleRiskPrediction);

/**
 * GET /api/sustainability-ml-health
 * Check ML service health
 */
router.get('/api/sustainability-ml-health', async (req, res) => {
    try {
        const mlServiceUrl = process.env.SUSTAINABILITY_ML_SERVICE_URL || 'http://localhost:8003';
        
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
            mlServiceUrl: process.env.SUSTAINABILITY_ML_SERVICE_URL || 'http://localhost:8003'
        });
    }
});

module.exports = router;

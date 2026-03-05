/**
 * Cost Overrun Prediction Routes
 * 
 * Routes for communicating with the Cost Overrun Prediction ML Service (FastAPI)
 * Mounted at /api/cost-prediction
 */

const express = require('express');
const axios = require('axios');
const config = require('../config');
const { 
    handlePreProjectPrediction, 
    handleInProgressPrediction 
} = require('../controllers/costPredictionController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/cost-prediction/pre-project
 * 
 * Predict cost overrun for a project at the planning stage
 * 
 * Request body: Project features as required by ML model
 * {
 *   "feature_a": 10,
 *   "feature_b": 5.2,
 *   "feature_c": "urban"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "predicted_cost_overrun_percentage": 12.37,
 *     "predicted_high_risk_project": 1,
 *     "risk_label": "HIGH",
 *     "model_version": "pre_project_v1"
 *   },
 *   "timestamp": "2026-03-06T..."
 * }
 */
router.post('/pre-project', handlePreProjectPrediction);

/**
 * POST /api/cost-prediction/in-progress
 * 
 * Predict cost overrun for a project already in progress
 * 
 * Request body: Project features as required by ML model
 * {
 *   "project_id": "P-1001",
 *   "feature_x": 73,
 *   "feature_y": 0.44,
 *   "feature_z": "yes"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "forecast_final_cost_overrun_pct_p50": 8.45,
 *     "risk_label": "MEDIUM",
 *     "model_version": "in_progress_v1"
 *   },
 *   "timestamp": "2026-03-06T..."
 * }
 */
router.post('/in-progress', handleInProgressPrediction);

/**
 * GET /api/cost-prediction/health
 * 
 * Check if the Cost Overrun ML service is available
 */
router.get('/health', async (req, res, next) => {
    try {
        const mlServiceUrl = process.env.COST_ML_SERVICE_URL || 'http://localhost:8080';
        
        const response = await axios.get(`${mlServiceUrl}/health`, {
            timeout: 5000
        });
        
        res.json({
            success: true,
            mlService: {
                status: response.data.status || 'healthy',
                service: response.data.service || 'Cost Overrun Prediction API',
                version: response.data.version || 'unknown',
                url: mlServiceUrl
            }
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            error: 'ML service unavailable',
            message: error.message,
            mlServiceUrl: process.env.COST_ML_SERVICE_URL || 'http://localhost:8080'
        });
    }
});

module.exports = router;

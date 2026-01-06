/**
 * Cost Overrun Prediction Routes
 * 
 * Routes for communicating with the Cost Overrun Prediction ML Service (FastAPI)
 */

const express = require('express');
const axios = require('axios');
const config = require('../config');
const { handleCostPrediction } = require('../controllers/costPredictionController');

const router = express.Router();

/**
 * POST /api/predict-cost-overrun
 * 
 * Predict cost overrun for a construction project
 * 
 * Request body:
 * {
 *   "data": {
 *     "project_size": 5000000,
 *     "duration_months": 18,
 *     "project_type": "Commercial",
 *     "location": "Urban",
 *     "contractor_experience": "High",
 *     ... (additional features as required by the ML model)
 *   }
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "prediction": {
 *     "predicted_cost_overrun_pct": 15.5,
 *     "overrun_probability": 0.78,
 *     "high_risk_label": true,
 *     "threshold": 0.5
 *   }
 * }
 */
router.post('/api/predict-cost-overrun', handleCostPrediction);

/**
 * GET /api/cost-ml-health
 * 
 * Check if the Cost Overrun ML service is available
 */
router.get('/api/cost-ml-health', async (req, res, next) => {
    try {
        const mlServiceUrl = process.env.COST_ML_SERVICE_URL || 'http://localhost:8080';
        
        const response = await axios.get(`${mlServiceUrl}/`, {
            timeout: 5000
        });
        
        res.json({
            success: true,
            mlService: {
                status: response.data.status || 'unknown',
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
            mlServiceUrl: process.env.COST_ML_SERVICE_URL || 'http://localhost:8001'
        });
    }
});

module.exports = router;

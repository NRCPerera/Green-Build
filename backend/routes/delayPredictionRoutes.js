/**
 * Delay Prediction Routes
 * 
 * Routes for communicating with the Delay Prediction ML Service (FastAPI)
 */

const express = require('express');
const axios = require('axios');
const config = require('../config');
const {
    handleDelayPrediction,
    handleDelayRegressionPrediction,
    handleDelayClassificationPrediction
} = require('../controllers/delayPredictionController');

const router = express.Router();

/**
 * POST /api/predict-delay
 * 
 * Full delay prediction - combines regression (delay days) and classification (delay category)
 * 
 * Request body:
 * {
 *   "data": {
 *     "District": "Colombo",
 *     "Project_Type": "Commercial Building",
 *     "Contractor_ICTAD_Grade": "CIDA 1",
 *     "Contract_Value_LKR": 500000000,
 *     "Planned_Duration_Days": 365,
 *     ... (additional features as required by the ML model)
 *   }
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "prediction_type": "full",
 *   "regression_result": {
 *     "predicted_delay_days": 45.5,
 *     "delay_severity": "Moderate Delay (31-60 days)"
 *   },
 *   "classification_result": {
 *     "predicted_category": "Minor Delay",
 *     "category_index": 1,
 *     "confidence": 0.6234,
 *     "class_probabilities": { ... }
 *   }
 * }
 */
router.post('/api/predict-delay', handleDelayPrediction);

/**
 * POST /api/predict-delay/regression
 * 
 * Predict delay days only (regression)
 */
router.post('/api/predict-delay/regression', handleDelayRegressionPrediction);

/**
 * POST /api/predict-delay/classification
 * 
 * Predict delay category only (classification)
 * 
 * Categories:
 * - On-Time: 0 days delay
 * - Minor Delay: 1-60 days
 * - Major Delay: 61-180 days
 * - Critical Delay: >180 days
 */
router.post('/api/predict-delay/classification', handleDelayClassificationPrediction);

/**
 * GET /api/delay-ml-health
 * 
 * Check if the Delay Prediction ML service is available
 */
router.get('/api/delay-ml-health', async (req, res, next) => {
    try {
        const mlServiceUrl = process.env.DELAY_ML_SERVICE_URL || 'http://localhost:8081';

        const response = await axios.get(`${mlServiceUrl}/health`, {
            timeout: 5000
        });

        res.json({
            success: true,
            mlService: {
                status: response.data.status || 'unknown',
                mode: response.data.mode || 'unknown',
                predictor_loaded: response.data.predictor_loaded || false,
                url: mlServiceUrl
            }
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            error: 'ML service unavailable',
            message: error.message,
            mlServiceUrl: process.env.DELAY_ML_SERVICE_URL || 'http://localhost:8081'
        });
    }
});

module.exports = router;

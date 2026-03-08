/**
 * Cost Overrun Prediction Routes
 * 
 * Routes for communicating with the Cost Overrun Prediction ML Service (FastAPI)
 * M * Mounted at /api/cost-prediction
 */

const express = require('express');
const axios = require('axios');
const config = require('../config');
const {
    handlePreProjectPrediction,
    handleInProgressPrediction,
    savePrediction,
    getLatestPrediction,
    getPredictionHistory,
    getPredictionById,
    updatePrediction,
    deletePrediction,
    recordActualOutcome,
    handleMonteCarloPrediction
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
 * POST /api/cost-prediction/monte-carlo
 * 
 * Predict cost overrun utilizing a Monte Carlo Simulation by wrapping the standard prediction model.
 */
router.post('/monte-carlo', handleMonteCarloPrediction);

/**
 * POST /api/cost-prediction/save
 * 
 * Save a cost prediction to database
 * 
 * Request body:
 * {
 *   "projectId": "65abc123...",
 *   "input": { ...26 fields },
 *   "prediction": { predicted_cost_overrun_pct, predicted_high_risk_class, ... },
 *   "topRiskFactors": [...],
 *   "riskScorecard": [...],
 *   "scenarioName": "Baseline",
 *   "notes": "Initial estimate",
 *   "tags": ["budget", "q1-2026"]
 * }
 */
router.post('/save', authenticate, savePrediction);

/**
 * GET /api/cost-prediction/latest/:projectId
 * 
 * Get the most recent/latest prediction for a project
 */
router.get('/latest/:projectId', authenticate, getLatestPrediction);

/**
 * GET /api/cost-prediction/history/:projectId
 * 
 * Get all saved predictions for a project
 * 
 * Query params:
 *   - limit: max results (default 50)
 *   - skip: pagination offset
 *   - tags: filter by tags (comma-separated)
 *   - riskLevel: filter by risk level (low, medium, high, critical)
 */
router.get('/history/:projectId', authenticate, getPredictionHistory);

/**
 * GET /api/cost-prediction/:predictionId
 * 
 * Get a single prediction by ID
 */
router.get('/:predictionId', authenticate, getPredictionById);

/**
 * PUT /api/cost-prediction/:predictionId
 * 
 * Update prediction metadata (scenario name, notes, tags)
 */
router.put('/:predictionId', authenticate, updatePrediction);

/**
 * DELETE /api/cost-prediction/:predictionId
 * 
 * Delete a prediction
 */
router.delete('/:predictionId', authenticate, deletePrediction);

/**
 * POST /api/cost-prediction/:predictionId/actual
 * 
 * Record actual outcome for accuracy tracking
 * 
 * Request body:
 * {
 *   "actualCostOverrunPct": 12.5,
 *   "actualFinalCost": 50000000,
 *   "notes": "Project completed"
 * }
 */
router.post('/:predictionId/actual', authenticate, recordActualOutcome);

/**
 * GET /api/cost-prediction/health
 * 
 * Check if the Cost Overrun ML service is available
 */
router.get('/health', async (req, res, next) => {
    try {
        const mlServiceUrl = process.env.COST_ML_SERVICE_URL || 'http://localhost:8085';

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
            mlServiceUrl: process.env.COST_ML_SERVICE_URL || 'http://localhost:8085'
        });
    }
});

module.exports = router;

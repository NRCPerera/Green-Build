/**
 * Cost Prediction Controller
 * 
 * Handles business logic for cost overrun predictions
 * Connects to FastAPI ML service with two endpoints:
 * - /predict/pre-project: For initial project cost predictions
 * - /predict/in-progress: For ongoing project cost forecasts
 */

const axios = require('axios');

/**
 * Handle pre-project cost overrun prediction
 * POST /api/cost-prediction/pre-project
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handlePreProjectPrediction = async (req, res) => {
    try {
        const features = req.body;

        // Validate request data
        if (!features || typeof features !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Invalid request',
                message: 'Request body must contain project features'
            });
        }

        // Get ML service URL from environment or use default
        const mlServiceUrl = process.env.COST_ML_SERVICE_URL || 'http://localhost:8080';

        console.log(`[Pre-Project Prediction] Sending request to: ${mlServiceUrl}/predict/pre-project`);
        console.log(`[Pre-Project Prediction] Features:`, JSON.stringify(features, null, 2));

        // Call the FastAPI ML service
        const response = await axios.post(
            `${mlServiceUrl}/predict/pre-project`,
            features,
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        console.log(`[Pre-Project Prediction] ML service response:`, response.data);

        res.json({
            success: true,
            data: response.data,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[Pre-Project Prediction] Error:', error.message);

        if (error.response) {
            const status = error.response.status;
            const detail = error.response.data?.detail || error.message;

            return res.status(status).json({
                success: false,
                error: 'ML service error',
                message: detail,
                statusCode: status
            });
        } else if (error.request) {
            return res.status(503).json({
                success: false,
                error: 'ML service unavailable',
                message: 'Could not connect to the ML service. Please ensure it is running on port 8080.',
                mlServiceUrl: process.env.COST_ML_SERVICE_URL || 'http://localhost:8080'
            });
        } else {
            return res.status(500).json({
                success: false,
                error: 'Prediction failed',
                message: error.message
            });
        }
    }
};

/**
 * Handle in-progress project cost overrun prediction
 * POST /api/cost-prediction/in-progress
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleInProgressPrediction = async (req, res) => {
    try {
        const features = req.body;

        // Validate request data
        if (!features || typeof features !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Invalid request',
                message: 'Request body must contain project features'
            });
        }

        // Get ML service URL from environment or use default
        const mlServiceUrl = process.env.COST_ML_SERVICE_URL || 'http://localhost:8080';

        console.log(`[In-Progress Prediction] Sending request to: ${mlServiceUrl}/predict/in-progress`);
        console.log(`[In-Progress Prediction] Features:`, JSON.stringify(features, null, 2));

        // Call the FastAPI ML service
        const response = await axios.post(
            `${mlServiceUrl}/predict/in-progress`,
            features,
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        console.log(`[In-Progress Prediction] ML service response:`, response.data);

        res.json({
            success: true,
            data: response.data,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[In-Progress Prediction] Error:', error.message);

        if (error.response) {
            const status = error.response.status;
            const detail = error.response.data?.detail || error.message;

            return res.status(status).json({
                success: false,
                error: 'ML service error',
                message: detail,
                statusCode: status
            });
        } else if (error.request) {
            return res.status(503).json({
                success: false,
                error: 'ML service unavailable',
                message: 'Could not connect to the ML service. Please ensure it is running on port 8080.',
                mlServiceUrl: process.env.COST_ML_SERVICE_URL || 'http://localhost:8080'
            });
        } else {
            return res.status(500).json({
                success: false,
                error: 'Prediction failed',
                message: error.message
            });
        }
    }
};

module.exports = {
    handlePreProjectPrediction,
    handleInProgressPrediction
};

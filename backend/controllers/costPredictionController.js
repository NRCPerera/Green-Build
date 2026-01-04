/**
 * Cost Prediction Controller
 * 
 * Handles business logic for cost overrun predictions
 */

const axios = require('axios');

/**
 * Handle cost overrun prediction request
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const handleCostPrediction = async (req, res, next) => {
    try {
        const { data } = req.body;

        // Validate request data
        if (!data || typeof data !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Invalid request',
                message: 'Request body must contain a "data" object with project features'
            });
        }

        // Get ML service URL from environment or use default
        const mlServiceUrl = process.env.COST_ML_SERVICE_URL || 'http://localhost:8001';

        console.log(`[Cost Prediction] Sending request to ML service: ${mlServiceUrl}`);
        console.log(`[Cost Prediction] Project data:`, JSON.stringify(data, null, 2));

        // Call the FastAPI ML service
        const response = await axios.post(
            `${mlServiceUrl}/predict/raw`,
            { data },
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30 second timeout
            }
        );

        console.log(`[Cost Prediction] ML service response:`, response.data);

        // Return the prediction results
        res.json({
            success: true,
            prediction: {
                predicted_cost_overrun_pct: response.data.predicted_cost_overrun_pct,
                overrun_probability: response.data.overrun_probability,
                high_risk_label: response.data.high_risk_label,
                threshold: response.data.threshold
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[Cost Prediction] Error:', error.message);

        // Handle different error types
        if (error.response) {
            // ML service returned an error response
            const status = error.response.status;
            const detail = error.response.data?.detail || error.message;

            return res.status(status).json({
                success: false,
                error: 'ML service error',
                message: detail,
                statusCode: status
            });
        } else if (error.request) {
            // Request was made but no response received
            return res.status(503).json({
                success: false,
                error: 'ML service unavailable',
                message: 'Could not connect to the ML service. Please ensure it is running.',
                mlServiceUrl: process.env.COST_ML_SERVICE_URL || 'http://localhost:8001'
            });
        } else {
            // Something else went wrong
            return res.status(500).json({
                success: false,
                error: 'Prediction failed',
                message: error.message
            });
        }
    }
};

module.exports = {
    handleCostPrediction
};

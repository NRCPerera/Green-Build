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
        const { data, explain = false, top_n = 6 } = req.body;

        // Validate request data
        if (!data || typeof data !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Invalid request',
                message: 'Request body must contain a "data" object with project features'
            });
        }

        // Get ML service URL from environment or use default
        const mlServiceUrl = process.env.COST_ML_SERVICE_URL || 'http://localhost:8080';

        console.log(`[Cost Prediction] Sending request to ML service: ${mlServiceUrl}`);
        console.log(`[Cost Prediction] Project data:`, JSON.stringify(data, null, 2));

        // Call the FastAPI ML service (new /predict endpoint with optional SHAP)
        const response = await axios.post(
            `${mlServiceUrl}/predict`,
            { data, explain, top_n },
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000 
            }
        );

        console.log(`[Cost Prediction] ML service response:`, response.data);
        const prediction = response.data?.prediction || response.data;

        res.json({
            success: true,
            prediction: {
                predicted_cost_overrun_pct: prediction.predicted_cost_overrun_pct,
                overrun_probability: prediction.overrun_probability,
                high_risk_label: prediction.high_risk_label,
                threshold: prediction.threshold,
                shap_explanation: prediction.shap_explanation ?? null
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[Cost Prediction] Error:', error.message);

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
                message: 'Could not connect to the ML service. Please ensure it is running.',
                mlServiceUrl: process.env.COST_ML_SERVICE_URL || 'http://localhost:8001'
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
    handleCostPrediction
};

/**
 * Cost Prediction Controller
 * 
 * Handles business logic for cost overrun predictions
 * C * Connects to FastAPI ML service with two endpoints:
 * - /predict/pre-project: For initial project cost predictions
 * - /predict/in-progress: For ongoing project cost forecasts
 */

const axios = require('axios');

const buildPreProjectResponse = (raw = {}) => {
    const predictedCostOverrunPct =
        raw.predicted_cost_overrun_pct ?? raw.predicted_cost_overrun_percentage ?? null;
    const predictedHighRiskClass =
        raw.predicted_high_risk_class ?? raw.predicted_high_risk_project ?? null;
    const predictedHighRiskProbability =
        raw.predicted_high_risk_probability ?? raw.overrun_probability ?? null;

    const topRiskFactors = Array.isArray(raw.top_risk_factors)
        ? raw.top_risk_factors
            .map((item) => ({
                feature: item?.feature,
                impact: item?.impact,
            }))
            .filter((item) => typeof item.feature === 'string' && Number.isFinite(Number(item.impact)))
        : [];

    const riskScorecard = Array.isArray(raw.risk_scorecard)
        ? raw.risk_scorecard
            .map((item) => ({
                feature: item?.feature,
                feature_value: item?.feature_value,
                impact: item?.impact,
                status: item?.status,
            }))
            .filter((item) => typeof item.feature === 'string')
        : [];

    const sanitized = {
        predicted_cost_overrun_pct: predictedCostOverrunPct,
        predicted_high_risk_class: predictedHighRiskClass,
        predicted_high_risk_probability: predictedHighRiskProbability,
        top_risk_factors: topRiskFactors,
        risk_scorecard: riskScorecard,
        model_version: raw.model_version ?? null,
    };

    return Object.fromEntries(
        Object.entries(sanitized).filter(([, value]) => value !== null && value !== undefined)
    );
};

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
        const mlServiceUrl = process.env.COST_ML_SERVICE_URL || 'http://localhost:8085';

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

        const sanitizedData = buildPreProjectResponse(response.data);
        console.log(`[Pre-Project Prediction] ML service response (sanitized):`, sanitizedData);

        res.json({
            success: true,
            data: sanitizedData,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[Pre-Project Prediction] Error:', error.message);
        console.error('[Pre-Project Prediction] Full error:', error);
        console.error('[Pre-Project Prediction] Error code:', error.code);
        console.error('[Pre-Project Prediction] Error response:', error.response?.data);

        if (error.response) {
            const status = error.response.status;
            const detail = error.response.data?.detail || error.response.data || error.message;

            return res.status(status).json({
                success: false,
                error: 'ML service error',
                message: typeof detail === 'string' ? detail : JSON.stringify(detail),
                statusCode: status
            });
        } else if (error.request) {
            console.error('[Pre-Project Prediction] Request was made but no response received');
            return res.status(503).json({
                success: false,
                error: 'ML service unavailable',
                message: `Could not connect to the ML service at ${process.env.COST_ML_SERVICE_URL || 'http://localhost:8085'}. Error: ${error.code || error.message}`,
                mlServiceUrl: process.env.COST_ML_SERVICE_URL || 'http://localhost:8085'
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
        const mlServiceUrl = process.env.COST_ML_SERVICE_URL || 'http://localhost:8085';

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
                message: 'Could not connect to the ML service. Please ensure it is running on port 8085.',
                mlServiceUrl: process.env.COST_ML_SERVICE_URL || 'http://localhost:8085'
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

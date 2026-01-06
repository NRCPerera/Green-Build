/**
 * Sustainability Prediction Controller
 * 
 * Handles communication with the Sustainability ML Service
 */

const axios = require('axios');

// Get ML service URL from environment or use default
const getMLServiceUrl = () => process.env.SUSTAINABILITY_ML_SERVICE_URL || 'http://localhost:8003';

/**
 * Handle full sustainability analysis (all 3 models)
 */
const handleFullAnalysis = async (req, res) => {
    try {
        const inputData = req.body;

        if (!inputData || typeof inputData !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Invalid request',
                message: 'Request body must contain analysis input data'
            });
        }

        const mlServiceUrl = getMLServiceUrl();
        console.log(`[Full Analysis] Sending request to ML service: ${mlServiceUrl}`);

        const response = await axios.post(
            `${mlServiceUrl}/predict/full-analysis`,
            inputData,
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000
            }
        );

        res.json({
            success: true,
            data: response.data,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        handleMLServiceError(error, res, 'Full analysis');
    }
};

/**
 * Handle sustainability score prediction
 */
const handleSustainabilityPrediction = async (req, res) => {
    try {
        const inputData = req.body;

        if (!inputData || typeof inputData !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Invalid request',
                message: 'Request body must contain sustainability input data'
            });
        }

        const mlServiceUrl = getMLServiceUrl();
        console.log(`[Sustainability] Sending request to ML service: ${mlServiceUrl}`);

        const response = await axios.post(
            `${mlServiceUrl}/predict/sustainability`,
            inputData,
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000
            }
        );

        res.json({
            success: true,
            data: response.data,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        handleMLServiceError(error, res, 'Sustainability prediction');
    }
};

/**
 * Handle lifecycle cost prediction
 */
const handleLifecycleCostPrediction = async (req, res) => {
    try {
        const inputData = req.body;

        if (!inputData || typeof inputData !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Invalid request',
                message: 'Request body must contain lifecycle cost input data'
            });
        }

        const mlServiceUrl = getMLServiceUrl();
        console.log(`[Lifecycle Cost] Sending request to ML service: ${mlServiceUrl}`);

        const response = await axios.post(
            `${mlServiceUrl}/predict/lifecycle-cost`,
            inputData,
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000
            }
        );

        res.json({
            success: true,
            data: response.data,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        handleMLServiceError(error, res, 'Lifecycle cost prediction');
    }
};

/**
 * Handle risk prediction
 */
const handleRiskPrediction = async (req, res) => {
    try {
        const inputData = req.body;

        if (!inputData || typeof inputData !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Invalid request',
                message: 'Request body must contain risk prediction input data'
            });
        }

        const mlServiceUrl = getMLServiceUrl();
        console.log(`[Risk Prediction] Sending request to ML service: ${mlServiceUrl}`);

        const response = await axios.post(
            `${mlServiceUrl}/predict/risk`,
            inputData,
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000
            }
        );

        res.json({
            success: true,
            data: response.data,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        handleMLServiceError(error, res, 'Risk prediction');
    }
};

/**
 * Common error handler for ML service errors
 */
const handleMLServiceError = (error, res, context) => {
    console.error(`[${context}] Error:`, error.message);

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
            message: 'Could not connect to the Sustainability ML service. Please ensure it is running on port 8003.',
            mlServiceUrl: getMLServiceUrl()
        });
    } else {
        return res.status(500).json({
            success: false,
            error: 'Prediction failed',
            message: error.message
        });
    }
};

module.exports = {
    handleFullAnalysis,
    handleSustainabilityPrediction,
    handleLifecycleCostPrediction,
    handleRiskPrediction
};

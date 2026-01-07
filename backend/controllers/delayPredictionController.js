/**
 * Delay Prediction Controller
 * 
 * Handles business logic for construction delay predictions
 */

const axios = require('axios');

/**
 * Handle delay prediction request (Full - both regression and classification)
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const handleDelayPrediction = async (req, res, next) => {
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
        const mlServiceUrl = process.env.DELAY_ML_SERVICE_URL || 'http://localhost:8081';

        console.log(`[Delay Prediction] Sending request to ML service: ${mlServiceUrl}`);
        console.log(`[Delay Prediction] Project data:`, JSON.stringify(data, null, 2));

        // Call the FastAPI ML service - Full prediction endpoint
        const response = await axios.post(
            `${mlServiceUrl}/predict`,
            { data },
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        console.log(`[Delay Prediction] ML service response:`, response.data);

        const result = response.data;

        res.json({
            success: true,
            prediction_type: result.prediction_type,
            regression_result: result.regression_result,
            classification_result: result.classification_result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[Delay Prediction] Error:', error.message);

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
                message: 'Could not connect to the Delay Prediction ML service. Please ensure it is running.',
                mlServiceUrl: process.env.DELAY_ML_SERVICE_URL || 'http://localhost:8081'
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
 * Handle delay regression prediction request (predict delay days only)
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const handleDelayRegressionPrediction = async (req, res, next) => {
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

        const mlServiceUrl = process.env.DELAY_ML_SERVICE_URL || 'http://localhost:8081';

        console.log(`[Delay Regression] Sending request to ML service: ${mlServiceUrl}`);

        const response = await axios.post(
            `${mlServiceUrl}/predict/regression`,
            { data },
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        console.log(`[Delay Regression] ML service response:`, response.data);

        const result = response.data;

        res.json({
            success: true,
            prediction_type: 'regression',
            regression_result: result.regression_result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[Delay Regression] Error:', error.message);

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
                message: 'Could not connect to the Delay Prediction ML service. Please ensure it is running.',
                mlServiceUrl: process.env.DELAY_ML_SERVICE_URL || 'http://localhost:8081'
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
 * Handle delay classification prediction request (predict delay category only)
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const handleDelayClassificationPrediction = async (req, res, next) => {
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

        const mlServiceUrl = process.env.DELAY_ML_SERVICE_URL || 'http://localhost:8081';

        console.log(`[Delay Classification] Sending request to ML service: ${mlServiceUrl}`);

        const response = await axios.post(
            `${mlServiceUrl}/predict/classification`,
            { data },
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        console.log(`[Delay Classification] ML service response:`, response.data);

        const result = response.data;

        res.json({
            success: true,
            prediction_type: 'classification',
            classification_result: result.classification_result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[Delay Classification] Error:', error.message);

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
                message: 'Could not connect to the Delay Prediction ML service. Please ensure it is running.',
                mlServiceUrl: process.env.DELAY_ML_SERVICE_URL || 'http://localhost:8081'
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
    handleDelayPrediction,
    handleDelayRegressionPrediction,
    handleDelayClassificationPrediction
};

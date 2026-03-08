/**
 * Delay Prediction Controller
 * 
 * Handles business logic for construction delay predictions.
 * 
 * Responsibilities:
 * - Input validation and sanitization
 * - Feature engineering logging for audit trail
 * - Forwarding to ML service and transforming responses
 * - Error handling with descriptive messages
 * 
 * Delay Categories (from Stacking Ensemble training):
 * - No Delay: 0 days
 * - Minor Delay: 1-30 days
 * - Major Delay: 31-90 days
 * - Critical Delay: >90 days
 */

const axios = require('axios');
const config = require('../config');

// Feature definitions matching the ML model training scripts
const NUMERIC_FEATURES = [
    'Floors', 'Contractor_Experience_Years', 'Contractor_Previous_Projects',
    'Contractor_Past_Delay_Rate', 'Labour_Pool_Size', 'Labour_Assigned_To_Project',
    'Planned_Duration_Days', 'Weather_Impact_Days', 'Design_Change_Orders',
    'Material_Delivery_Delay_Days', 'Payment_Delay_Days'
];

const CATEGORICAL_FEATURES = [
    'Project_Type', 'Province', 'District', 'Location',
    'Contractor_ICTAD_Grade', 'Start_Season', 'Payment_Delay_History'
];

const ALL_FEATURES = [...NUMERIC_FEATURES, ...CATEGORICAL_FEATURES];

/**
 * Validate and sanitize prediction input data
 * Ensures all features are present with correct types
 * 
 * @param {Object} data - Raw input from client
 * @returns {Object} { valid: boolean, sanitized: Object, warnings: string[] }
 */
function validatePredictionInput(data) {
    const warnings = [];
    const sanitized = { ...data };

    // Check for required numeric features and coerce types
    for (const feature of NUMERIC_FEATURES) {
        if (sanitized[feature] !== undefined) {
            const numVal = Number(sanitized[feature]);
            if (isNaN(numVal)) {
                warnings.push(`Feature '${feature}' has non-numeric value '${sanitized[feature]}', defaulting to 0`);
                sanitized[feature] = 0;
            } else {
                sanitized[feature] = numVal;
            }
        }
    }

    // Check for required categorical features
    for (const feature of CATEGORICAL_FEATURES) {
        if (sanitized[feature] !== undefined && typeof sanitized[feature] !== 'string') {
            sanitized[feature] = String(sanitized[feature]);
            warnings.push(`Feature '${feature}' coerced to string`);
        }
    }

    // Range validation for common fields
    if (sanitized.Contractor_Past_Delay_Rate !== undefined) {
        if (sanitized.Contractor_Past_Delay_Rate < 0 || sanitized.Contractor_Past_Delay_Rate > 1) {
            warnings.push('Contractor_Past_Delay_Rate should be between 0 and 1');
            sanitized.Contractor_Past_Delay_Rate = Math.max(0, Math.min(1, sanitized.Contractor_Past_Delay_Rate));
        }
    }

    if (sanitized.Floors !== undefined && sanitized.Floors < 1) {
        warnings.push('Floors must be at least 1');
        sanitized.Floors = 1;
    }

    return { valid: true, sanitized, warnings };
}

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

        // Validate and sanitize input
        const validation = validatePredictionInput(data);
        if (validation.warnings.length > 0) {
            console.log(`[Delay Prediction] Input warnings:`, validation.warnings);
        }

        // Get ML service URL from environment or use default
        const mlServiceUrl = config.delayMlServiceUrl;

        console.log(`[Delay Prediction] Sending request to ML service: ${mlServiceUrl}`);
        console.log(`[Delay Prediction] Features sent: ${Object.keys(validation.sanitized).join(', ')}`);

        // Call the FastAPI ML service - Full prediction endpoint
        const response = await axios.post(
            `${mlServiceUrl}/predict`,
            { data: validation.sanitized },
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        console.log(`[Delay Prediction] ML service response received`);

        const result = response.data;

        res.json({
            success: true,
            prediction_type: result.prediction_type,
            regression_result: result.regression_result,
            classification_result: result.classification_result,
            input_warnings: validation.warnings.length > 0 ? validation.warnings : undefined,
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
                mlServiceUrl: config.delayMlServiceUrl
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

        const validation = validatePredictionInput(data);
        const mlServiceUrl = config.delayMlServiceUrl;

        console.log(`[Delay Regression] Sending request to ML service: ${mlServiceUrl}`);

        const response = await axios.post(
            `${mlServiceUrl}/predict/regression`,
            { data: validation.sanitized },
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        console.log(`[Delay Regression] ML service response received`);

        const result = response.data;

        res.json({
            success: true,
            prediction_type: 'regression',
            regression_result: result.regression_result,
            input_warnings: validation.warnings.length > 0 ? validation.warnings : undefined,
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
                mlServiceUrl: config.delayMlServiceUrl
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

        const validation = validatePredictionInput(data);
        const mlServiceUrl = config.delayMlServiceUrl;

        console.log(`[Delay Classification] Sending request to ML service: ${mlServiceUrl}`);

        const response = await axios.post(
            `${mlServiceUrl}/predict/classification`,
            { data: validation.sanitized },
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        console.log(`[Delay Classification] ML service response received`);

        const result = response.data;

        res.json({
            success: true,
            prediction_type: 'classification',
            classification_result: result.classification_result,
            input_warnings: validation.warnings.length > 0 ? validation.warnings : undefined,
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
                mlServiceUrl: config.delayMlServiceUrl
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

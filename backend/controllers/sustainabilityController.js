/**
 * Sustainability Prediction Controller
 * 
 * Handles communication with the Sustainability ML Service (Flask)
 */

const axios = require('axios');

// Get ML service URL from environment or use default
const getMLServiceUrl = () => process.env.SUSTAINABILITY_ML_SERVICE_URL || 'http://localhost:8003';

/**
 * Handle full sustainability analysis (all 3 models)
 * Maps React frontend data to Flask backend format
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

        // Map React frontend field names to Flask backend format
        const flaskData = {
            Area_SQFT: parseFloat(inputData.areaSqft || inputData.Area_SQFT || 2000),
            Floors: parseInt(inputData.floors || inputData.Floors || 2),
            Design_Completeness: parseFloat(inputData.designCompleteness || inputData.Design_Completeness || 80),
            Contractor_Experience: parseFloat(inputData.contractorExperienceYears || inputData.contractorExperience || inputData.Contractor_Experience || 10)
        };

        console.log(`[Full Analysis] Mapped data:`, flaskData);

        const response = await axios.post(
            `${mlServiceUrl}/predict`,
            flaskData,
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000
            }
        );

        // Map Flask response back to frontend expected format
        if (response.data.success) {
            const data = response.data.data;

            res.json({
                success: true,
                data: {
                    // Sustainability
                    sustainability_score: data.sustainability_score,
                    sustainability_interpretation: data.sustainability_rating,

                    // Lifecycle Cost
                    lifecycle_cost_millions_lkr: data.lifecycle_cost_millions,
                    lifecycle_cost_lkr: data.lifecycle_cost_lkr,
                    lifecycle_interpretation: `Estimated ${data.lifecycle_cost_millions}M LKR total lifecycle cost`,

                    // Risk
                    is_high_risk: data.is_high_risk,
                    risk_probability: data.risk_probability,
                    risk_level: data.risk_level,
                    risk_recommendations: data.smart_suggestions || [],

                    // Analysis details
                    analysis_details: data.analysis_details,

                    // Financials & Engineering
                    financials: data.financials,
                    engineering: data.engineering,
                    cost_breakdown: data.cost_breakdown,
                    smart_suggestions: data.smart_suggestions,

                    // NEW: SHAP Explainability & Confidence Intervals
                    shap_analysis: data.shap_analysis || {},
                    confidence_intervals: data.confidence_intervals || {},

                    // Mode
                    mode: data.mode
                },
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(400).json({
                success: false,
                error: response.data.error || 'Analysis failed'
            });
        }

    } catch (error) {
        handleMLServiceError(error, res, 'Full analysis');
    }
};

/**
 * Handle feature importance request (proxies to ML service)
 */
const handleFeatureImportance = async (req, res) => {
    try {
        const mlServiceUrl = getMLServiceUrl();
        const response = await axios.get(
            `${mlServiceUrl}/feature-importance`,
            { timeout: 10000 }
        );
        res.json(response.data);
    } catch (error) {
        handleMLServiceError(error, res, 'Feature importance');
    }
};

/**
 * Handle sustainability score prediction
 */
const handleSustainabilityPrediction = async (req, res) => {
    // Delegate to full analysis - Flask handles all predictions together
    return handleFullAnalysis(req, res);
};

/**
 * Handle lifecycle cost prediction
 */
const handleLifecycleCostPrediction = async (req, res) => {
    // Delegate to full analysis - Flask handles all predictions together
    return handleFullAnalysis(req, res);
};

/**
 * Handle risk prediction
 */
const handleRiskPrediction = async (req, res) => {
    // Delegate to full analysis - Flask handles all predictions together
    return handleFullAnalysis(req, res);
};

/**
 * Common error handler for ML service errors
 */
const handleMLServiceError = (error, res, context) => {
    console.error(`[${context}] Error:`, error.message);

    if (error.response) {
        const status = error.response.status;
        const detail = error.response.data?.error || error.message;

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
    handleRiskPrediction,
    handleFeatureImportance
};

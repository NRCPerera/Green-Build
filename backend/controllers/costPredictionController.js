/**
 * Cost Prediction Controller
 * 
 * Handles business logic for cost overrun predictions
 * C * Connects to FastAPI ML service with two endpoints:
 * - /predict/pre-project: For initial project cost predictions
 * - /predict/in-progress: For ongoing project cost forecasts
 */

const axios = require('axios');
const CostPrediction = require('../models/CostPrediction');
const Project = require('../models/Project');

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

/**
 * Save a cost prediction to the database
 * POST /api/cost-prediction/save
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const savePrediction = async (req, res) => {
    console.log('[savePrediction] Received request');
    console.log('[savePrediction] User ID:', req.userId);
    console.log('[savePrediction] Request body keys:', Object.keys(req.body));
    
    try {
        const { projectId, input, prediction, topRiskFactors, riskScorecard, scenarioName, notes, tags, isBaseline } = req.body;
        
        console.log('[savePrediction] Extracted data:', {
            projectId,
            hasInput: !!input,
            hasPrediction: !!prediction,
            topRiskFactorsCount: (topRiskFactors || []).length,
            riskScorecardCount: (riskScorecard || []).length,
            scenarioName,
            tagsCount: (tags || []).length
        });

        // Validate required fields
        if (!projectId || !input || !prediction) {
            console.error('[savePrediction] Missing required fields:', { projectId: !!projectId, input: !!input, prediction: !!prediction });
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                message: 'projectId, input, and prediction are required'
            });
        }

        console.log('[savePrediction] Searching for project:', { projectId, userId: req.userId });
        
        // Verify project exists and user owns it
        const project = await Project.findOne({ _id: projectId, owner: req.userId });
        
        if (!project) {
            console.error('[savePrediction] Project not found or unauthorized:', { projectId, userId: req.userId });
            return res.status(404).json({
                success: false,
                error: 'Project not found',
                message: 'Project not found or you do not have permission to access it'
            });
        }
        
        console.log('[savePrediction] Project found:', project.name);

        // Create cost prediction document
        const costPrediction = new CostPrediction({
            project: projectId,
            createdBy: req.userId,
            input,
            prediction,
            topRiskFactors: topRiskFactors || [],
            riskScorecard: riskScorecard || [],
            scenarioName: scenarioName || 'Baseline Prediction',
            notes: notes || '',
            tags: tags || [],
            isBaseline: isBaseline || false
        });
        
        console.log('[savePrediction] Saving prediction document...');

        await costPrediction.save();
        
        console.log('[savePrediction] Prediction saved with ID:', costPrediction._id);
        console.log('[savePrediction] Updating project reference...');

        // Add reference to project
        await Project.findByIdAndUpdate(
            projectId,
            { $push: { costPredictions: costPrediction._id } }
        );
        
        console.log('[savePrediction] Project updated');

        console.log(`[Cost Prediction] Successfully saved: ${costPrediction.scenarioName} for project ${project.name}`);

        res.status(201).json({
            success: true,
            message: 'Cost prediction saved successfully',
            data: { prediction: costPrediction }
        });

    } catch (error) {
        console.error('[Cost Prediction] Save error:', error.message);
        console.error('[Cost Prediction] Stack trace:', error.stack);
        res.status(500).json({
            success: false,
            error: 'Failed to save prediction',
            message: error.message
        });
    }
};

/**
 * Get the latest/most recent cost prediction for a project
 * GET /api/cost-prediction/latest/:projectId
 */
const getLatestPrediction = async (req, res) => {
    try {
        const { projectId } = req.params;

        // Verify project exists and user owns it
        const project = await Project.findOne({ _id: projectId, owner: req.userId });
        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found',
                message: 'Project not found or you do not have permission to access it'
            });
        }

        // Find the latest prediction (most recent baseline or any prediction)
        const latestPrediction = await CostPrediction.findOne({
            project: projectId,
            createdBy: req.userId
        })
        .sort({ createdAt: -1 })
        .limit(1);

        if (!latestPrediction) {
            return res.status(404).json({
                success: false,
                error: 'No predictions found',
                message: 'No cost predictions found for this project'
            });
        }

        res.status(200).json({
            success: true,
            data: { prediction: latestPrediction }
        });

    } catch (error) {
        console.error('[Cost Prediction] Get latest error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch latest prediction',
            message: error.message
        });
    }
};

/**
 * Get all cost predictions for a project
 * GET /api/cost-prediction/history/:projectId
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getPredictionHistory = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { limit = 50, skip = 0, tags, riskLevel } = req.query;

        // Verify project exists and user owns it
        const project = await Project.findOne({ _id: projectId, owner: req.userId });
        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found',
                message: 'Project not found or you do not have permission to access it'
            });
        }

        // Build query filters
        const query = { project: projectId };
        if (tags) {
            query.tags = { $in: tags.split(',') };
        }
        if (riskLevel) {
            query.riskLevel = riskLevel;
        }

        const predictions = await CostPrediction.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip))
            .populate('createdBy', 'name email');

        const total = await CostPrediction.countDocuments(query);

        res.json({
            success: true,
            data: {
                predictions,
                total,
                project: {
                    _id: project._id,
                    name: project.name
                }
            }
        });

    } catch (error) {
        console.error('[Cost Prediction] Get history error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch prediction history',
            message: error.message
        });
    }
};

/**
 * Get a single cost prediction by ID
 * GET /api/cost-prediction/:predictionId
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getPredictionById = async (req, res) => {
    try {
        const { predictionId } = req.params;

        const prediction = await CostPrediction.findById(predictionId)
            .populate('project', 'name projectCode')
            .populate('createdBy', 'name email');

        if (!prediction) {
            return res.status(404).json({
                success: false,
                error: 'Prediction not found',
                message: 'Cost prediction not found'
            });
        }

        // Verify user owns the project
        const project = await Project.findOne({ _id: prediction.project._id, owner: req.userId });
        if (!project) {
            return res.status(403).json({
                success: false,
                error: 'Access denied',
                message: 'You do not have permission to access this prediction'
            });
        }

        res.json({
            success: true,
            data: { prediction }
        });

    } catch (error) {
        console.error('[Cost Prediction] Get by ID error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch prediction',
            message: error.message
        });
    }
};

/**
 * Update a cost prediction (scenario name, notes, tags)
 * PUT /api/cost-prediction/:predictionId
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updatePrediction = async (req, res) => {
    try {
        const { predictionId } = req.params;
        const { scenarioName, notes, tags, isBaseline, usedForBudget } = req.body;

        const prediction = await CostPrediction.findById(predictionId);

        if (!prediction) {
            return res.status(404).json({
                success: false,
                error: 'Prediction not found',
                message: 'Cost prediction not found'
            });
        }

        // Verify user owns the project
        const project = await Project.findOne({ _id: prediction.project, owner: req.userId });
        if (!project) {
            return res.status(403).json({
                success: false,
                error: 'Access denied',
                message: 'You do not have permission to update this prediction'
            });
        }

        // Update allowed fields
        if (scenarioName !== undefined) prediction.scenarioName = scenarioName;
        if (notes !== undefined) prediction.notes = notes;
        if (tags !== undefined) prediction.tags = tags;
        if (isBaseline !== undefined) prediction.isBaseline = isBaseline;
        if (usedForBudget !== undefined) prediction.usedForBudget = usedForBudget;

        await prediction.save();

        console.log(`[Cost Prediction] Updated: ${prediction.scenarioName}`);

        res.json({
            success: true,
            message: 'Prediction updated successfully',
            data: { prediction }
        });

    } catch (error) {
        console.error('[Cost Prediction] Update error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update prediction',
            message: error.message
        });
    }
};

/**
 * Delete a cost prediction
 * DELETE /api/cost-prediction/:predictionId
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deletePrediction = async (req, res) => {
    try {
        const { predictionId } = req.params;

        const prediction = await CostPrediction.findById(predictionId);

        if (!prediction) {
            return res.status(404).json({
                success: false,
                error: 'Prediction not found',
                message: 'Cost prediction not found'
            });
        }

        // Verify user owns the project
        const project = await Project.findOne({ _id: prediction.project, owner: req.userId });
        if (!project) {
            return res.status(403).json({
                success: false,
                error: 'Access denied',
                message: 'You do not have permission to delete this prediction'
            });
        }

        // Remove reference from project
        await Project.findByIdAndUpdate(
            prediction.project,
            { $pull: { costPredictions: predictionId } }
        );

        // Delete the prediction
        await CostPrediction.findByIdAndDelete(predictionId);

        console.log(`[Cost Prediction] Deleted: ${prediction.scenarioName}`);

        res.json({
            success: true,
            message: 'Prediction deleted successfully'
        });

    } catch (error) {
        console.error('[Cost Prediction] Delete error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete prediction',
            message: error.message
        });
    }
};

/**
 * Record actual outcome for a prediction
 * POST /api/cost-prediction/:predictionId/actual
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const recordActualOutcome = async (req, res) => {
    try {
        const { predictionId } = req.params;
        const { actualCostOverrunPct, actualFinalCost, notes } = req.body;

        if (actualCostOverrunPct === undefined && actualFinalCost === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                message: 'Either actualCostOverrunPct or actualFinalCost is required'
            });
        }

        const prediction = await CostPrediction.findById(predictionId);

        if (!prediction) {
            return res.status(404).json({
                success: false,
                error: 'Prediction not found',
                message: 'Cost prediction not found'
            });
        }

        // Verify user owns the project
        const project = await Project.findOne({ _id: prediction.project, owner: req.userId });
        if (!project) {
            return res.status(403).json({
                success: false,
                error: 'Access denied',
                message: 'You do not have permission to update this prediction'
            });
        }

        // Record actual outcome
        prediction.actualOutcome = {
            actualCostOverrunPct: actualCostOverrunPct || null,
            actualFinalCost: actualFinalCost || null,
            recordedAt: new Date(),
            notes: notes || ''
        };

        await prediction.save();

        console.log(`[Cost Prediction] Recorded actual outcome for: ${prediction.scenarioName}`);

        res.json({
            success: true,
            message: 'Actual outcome recorded successfully',
            data: { 
                prediction,
                predictionError: prediction.predictionError
            }
        });

    } catch (error) {
        console.error('[Cost Prediction] Record outcome error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to record actual outcome',
            message: error.message
        });
    }
};

module.exports = {
    handlePreProjectPrediction,
    handleInProgressPrediction,
    savePrediction,
    getLatestPrediction,
    getPredictionHistory,
    getPredictionById,
    updatePrediction,
    deletePrediction,
    recordActualOutcome
};

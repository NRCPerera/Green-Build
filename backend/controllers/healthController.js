/**
 * Health Check Controller
 * 
 * Handles health monitoring endpoints for the application.
 * Provides system status and connectivity information.
 */

const pythonService = require('../services/pythonService');
const config = require('../config');

/**
 * Returns the health status of the backend and connected services.
 * This endpoint is used for monitoring and load balancer health checks.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getHealth = async (req, res) => {
    const pythonServiceStatus = await pythonService.checkHealth();

    res.json({
        status: 'healthy',
        service: 'Green Build Backend',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        python_ml_service: pythonServiceStatus,
        python_service_url: config.pythonServiceUrl
    });
};

/**
 * Returns basic API information and available endpoints.
 * Serves as the root endpoint documentation.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getApiInfo = (req, res) => {
    res.json({
        message: 'Green Build Construction Estimation API',
        version: '1.0.0',
        endpoints: {
            health: 'GET /api/health',
            upload: 'POST /api/upload-plan'
        }
    });
};

module.exports = {
    getHealth,
    getApiInfo
};

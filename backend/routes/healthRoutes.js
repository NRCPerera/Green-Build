/**
 * Health Check Routes
 * 
 * Defines routes for system health monitoring and API information.
 */

const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

// Root endpoint provides basic API information
router.get('/', healthController.getApiInfo);

// Health check endpoint for monitoring systems
router.get('/api/health', healthController.getHealth);

module.exports = router;

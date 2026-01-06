/**
 * Route Index
 * 
 * Aggregates all route modules and exports them for use in the main server file.
 */

const healthRoutes = require('./healthRoutes');
const uploadRoutes = require('./uploadRoutes');
const costPredictionRoutes = require('./costPredictionRoutes');
const authRoutes = require('./authRoutes');

module.exports = {
    healthRoutes,
    uploadRoutes,
    costPredictionRoutes,
    authRoutes
};


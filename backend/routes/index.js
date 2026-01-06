/**
 * Route Index
 * 
 * Aggregates all route modules and exports them for use in the main server file.
 */

const healthRoutes = require('./healthRoutes');
const uploadRoutes = require('./uploadRoutes');
const costPredictionRoutes = require('./costPredictionRoutes');
const authRoutes = require('./authRoutes');
const projectRoutes = require('./projectRoutes');
const floorPlanRoutes = require('./floorPlanRoutes');

module.exports = {
    healthRoutes,
    uploadRoutes,
    costPredictionRoutes,
    authRoutes,
    projectRoutes,
    floorPlanRoutes
};



/**
 * Route Index
 * 
 * Aggregates all route modules and exports them for use in the main server file.
 */

const healthRoutes = require('./healthRoutes');
const uploadRoutes = require('./uploadRoutes');
const costPredictionRoutes = require('./costPredictionRoutes');
const sustainabilityRoutes = require('./sustainabilityRoutes');

module.exports = {
    healthRoutes,
    uploadRoutes,
    costPredictionRoutes,
    sustainabilityRoutes
};

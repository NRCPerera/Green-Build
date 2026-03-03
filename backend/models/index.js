/**
 * Models Index
 * 
 * Central export point for all MongoDB models.
 */

const User = require('./User');
const Project = require('./Project');
const FloorPlan = require('./FloorPlan');
const BOQReport = require('./BOQReport');
const Rate = require('./Rate');
const DelayPrediction = require('./DelayPrediction');
const SustainabilityAnalysis = require('./SustainabilityAnalysis');

// Legacy models (keeping for backward compatibility)
const { calculateCosts } = require('./costModel');
const { createUploadRecord, updateUploadWithResults, getUploadById } = require('./fileModel');

module.exports = {
    // MongoDB Models
    User,
    Project,
    FloorPlan,
    BOQReport,
    Rate,
    DelayPrediction,
    SustainabilityAnalysis,

    // Legacy utility functions
    calculateCosts,
    createUploadRecord,
    updateUploadWithResults,
    getUploadById
};

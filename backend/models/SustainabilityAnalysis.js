/**
 * Sustainability Analysis Schema
 * 
 * Stores sustainability analysis results from the ML service.
 * Captures input parameters, sustainability score, lifecycle cost,
 * and risk assessment for historical tracking and comparison.
 */

const mongoose = require('mongoose');

const sustainabilityAnalysisSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // ── Input Features (sent to ML service) ──────────────────────
    input: {
        // Building parameters
        areaSqft: { type: Number },
        floors: { type: Number },

        // Energy & carbon
        energyKwhYear: { type: Number },
        embodiedCo2Tons: { type: Number },
        operationalCo2Tons: { type: Number },
        energyEfficiency: { type: Number },
        energyEfficiencyPerSqft: { type: Number },

        // Cost metrics
        costPerSqftForSustainability: { type: Number },
        energyCo2ImpactRelativeToCost: { type: Number },
        constructionCostPerSqft: { type: Number },
        maintenanceCostPerYear: { type: Number },

        // Risk input features
        designCompleteness: { type: Number },
        projectComplexityScore: { type: Number },
        changeOrderFrequency: { type: Number },
        inflationRate: { type: Number },
        interestRate: { type: Number },
        contractorExperienceYears: { type: Number }
    },

    // ── Sustainability Score Result ──────────────────────────────
    sustainabilityScore: {
        type: Number,
        min: 0,
        max: 100
    },
    sustainabilityRating: {
        type: String,
        trim: true
    },

    // ── Lifecycle Cost Result ────────────────────────────────────
    lifecycleCostMillions: {
        type: Number
    },
    lifecycleCostLkr: {
        type: Number
    },

    // ── Risk Assessment Result ───────────────────────────────────
    isHighRisk: {
        type: Boolean
    },
    riskProbability: {
        type: Number,
        min: 0,
        max: 1
    },
    riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high']
    },
    riskRecommendations: [{
        type: String
    }],

    // ── Analysis Details (computed features from ML) ─────────────
    analysisDetails: {
        type: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

sustainabilityAnalysisSchema.index({ project: 1, createdAt: -1 });
sustainabilityAnalysisSchema.index({ createdBy: 1 });

const SustainabilityAnalysis = mongoose.model('SustainabilityAnalysis', sustainabilityAnalysisSchema);

module.exports = SustainabilityAnalysis;

/**
 * Delay Prediction Schema
 * 
 * Stores construction delay prediction results from the ML service.
 * Captures both the input features and prediction outputs for
 * historical tracking and analytics.
 */

const mongoose = require('mongoose');

const delayPredictionSchema = new mongoose.Schema({
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
        // Categorical
        district: { type: String, trim: true },
        projectType: { type: String, trim: true },
        contractorGrade: { type: String, trim: true },

        // Numeric
        projectAreaSqM: { type: Number },
        floors: { type: Number },
        contractorExperienceYears: { type: Number },
        contractorPastDelayRate: { type: Number },
        contractorPreviousProjects: { type: Number },
        laborAvailability: { type: Number },
        materialDeliveryDelayDays: { type: Number },
        paymentDelayHistory: { type: Number },
        financialIssues: { type: Number },
        weatherImpactDays: { type: Number },
        plannedDurationDays: { type: Number }
    },

    // ── Regression Result ────────────────────────────────────────
    regressionResult: {
        predictedDelayDays: { type: Number },
        delaySeverity: { type: String }
    },

    // ── Classification Result ────────────────────────────────────
    classificationResult: {
        predictedCategory: {
            type: String,
            enum: ['On-Time', 'Minor Delay', 'Major Delay', 'Critical Delay']
        },
        confidence: { type: Number },
        classProbabilities: {
            type: Map,
            of: Number
        }
    },

    // ── Computed / Derived ───────────────────────────────────────
    riskLevel: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical']
    },
    plannedCompletionDate: { type: Date },
    predictedCompletionDate: { type: Date },
    predictedDelayMonths: { type: Number },

    // ── Confidence Interval ──────────────────────────────────────
    confidenceInterval: {
        earliest: { type: Date },
        latest: { type: Date }
    },

    // ── Scenarios ────────────────────────────────────────────────
    scenarios: {
        bestCase: {
            delayDays: { type: Number },
            probability: { type: Number }
        },
        mostLikely: {
            delayDays: { type: Number },
            probability: { type: Number }
        },
        worstCase: {
            delayDays: { type: Number },
            probability: { type: Number }
        }
    },

    // ── Recommendations ──────────────────────────────────────────
    recommendations: [{ type: String }],

    // ── Metadata ─────────────────────────────────────────────────
    source: {
        type: String,
        enum: ['ml_prediction', 'mock_prediction'],
        default: 'ml_prediction'
    }
}, {
    timestamps: true
});

delayPredictionSchema.index({ project: 1, createdAt: -1 });
delayPredictionSchema.index({ createdBy: 1 });

const DelayPrediction = mongoose.model('DelayPrediction', delayPredictionSchema);

module.exports = DelayPrediction;

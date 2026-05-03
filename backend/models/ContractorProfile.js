/**
 * Contractor Profile Model
 * 
 * Stores historical contractor performance metrics by CIDA grade
 * Used to enrich cost prediction requests with real historical averages
 */

const mongoose = require('mongoose');

const contractorProfileSchema = new mongoose.Schema({
    // ── Identity ──────────────────────────────────
    cida_grade: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        enum: ['C1', 'C2', 'C3', 'C4', 'C5'],
        trim: true
    },

    // ── Performance Metrics ───────────────────────
    avg_overrun_pct: {
        type: Number,
        required: true,
        min: 0
        // Historical average cost overrun percentage for this grade
    },
    high_risk_rate: {
        type: Number,
        required: true,
        min: 0,
        max: 1
        // Proportion of projects that exceeded high-risk threshold
    },
    avg_change_order_freq: {
        type: Number,
        required: true,
        min: 0
        // Average number of change orders per project
    },
    avg_time_overrun_months: {
        type: Number,
        required: true,
        min: 0
        // Average schedule delay in months
    },
    projects_count: {
        type: Number,
        required: true,
        min: 0
        // Number of historical projects used to calculate metrics
    },

    // ── Audit ─────────────────────────────────────
    last_updated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

const ContractorProfile = mongoose.model('ContractorProfile', contractorProfileSchema);

module.exports = ContractorProfile;

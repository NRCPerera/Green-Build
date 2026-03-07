/**
 * Rate Schema
 * 
 * Dynamic rate storage for BOQ pricing.
 * Supports material-specific rates, date-based versioning,
 * and CSV bulk imports. Historical rates are preserved.
 */

const mongoose = require('mongoose');

const rateSchema = new mongoose.Schema({
    // ── Identity ──────────────────────────────────
    section: {
        type: String,
        required: [true, 'Section is required'],
        enum: {
            values: [
                'earthworks',
                'concrete_works',
                'masonry_works',
                'finishes',
                'doors_windows',
                'mep_works'
            ],
            message: '{VALUE} is not a valid BOQ section'
        }
    },
    itemCode: {
        type: String,
        required: [true, 'Item code is required'],
        uppercase: true,
        trim: true
    },
    itemName: {
        type: String,
        required: [true, 'Item name is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },

    // ── Pricing ───────────────────────────────────
    unit: {
        type: String,
        required: [true, 'Unit is required']
    },
    materialType: {
        type: String,
        default: 'standard',
        trim: true,
        lowercase: true
    },
    rate: {
        type: Number,
        required: [true, 'Rate is required'],
        min: [0, 'Rate cannot be negative']
    },
    currency: {
        type: String,
        default: 'LKR'
    },

    // ── Versioning ────────────────────────────────
    effectiveDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    expiryDate: {
        type: Date,
        default: null
    },
    version: {
        type: Number,
        default: 1
    },

    // ── Audit ─────────────────────────────────────
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    source: {
        type: String,
        enum: ['manual', 'csv_import', 'system_default'],
        default: 'manual'
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Compound index for fast rate lookups
rateSchema.index({ section: 1, itemCode: 1, materialType: 1, effectiveDate: -1 });
rateSchema.index({ isActive: 1, effectiveDate: -1 });
rateSchema.index({ section: 1, isActive: 1 });

const Rate = mongoose.model('Rate', rateSchema);

module.exports = Rate;

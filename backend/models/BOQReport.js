/**
 * BOQ Report Schema
 * 
 * Bill of Quantities Report - stores the complete cost estimation
 * generated from floor plan analysis.
 */

const mongoose = require('mongoose');

const boqItemSchema = new mongoose.Schema({
    category: {
        type: String,
        required: true,
        enum: ['walls', 'doors', 'windows', 'electrical', 'plumbing', 'hvac', 'flooring', 'ceiling', 'structural', 'other']
    },
    itemName: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    unit: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    unitRate: {
        type: Number,
        required: true,
        min: 0
    },
    totalCost: {
        type: Number,
        required: true,
        min: 0
    },
    source: {
        type: String,
        enum: ['ml-detected', 'manual-input', 'calculated'],
        default: 'ml-detected'
    },
    notes: {
        type: String
    }
}, { _id: true });

const boqReportSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    floorPlan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FloorPlan',
        required: true
    },
    generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reportNumber: {
        type: String,
        unique: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    items: [boqItemSchema],
    summary: {
        totalMLDetectedCost: { type: Number, default: 0 },
        totalManualInputCost: { type: Number, default: 0 },
        subtotal: { type: Number, default: 0 },
        contingencyPercent: { type: Number, default: 10 },
        contingencyAmount: { type: Number, default: 0 },
        overheadPercent: { type: Number, default: 15 },
        overheadAmount: { type: Number, default: 0 },
        profitPercent: { type: Number, default: 10 },
        profitAmount: { type: Number, default: 0 },
        grandTotal: { type: Number, default: 0 },
        currency: { type: String, default: 'LKR' }
    },
    finishType: {
        type: String,
        enum: ['basic', 'standard', 'premium', 'luxury', 'custom'],
        default: 'standard'
    },
    estimates: {
        basic: { type: Number, default: 0 },
        standard: { type: Number, default: 0 },
        premium: { type: Number, default: 0 }
    },
    costOverrunPrediction: {
        isPredicted: { type: Boolean, default: false },
        predictedAt: { type: Date },
        riskLevel: { type: String, enum: ['low', 'medium', 'high', 'very-high'] },
        overrunProbability: { type: Number },
        predictedOverrunPercent: { type: Number },
        riskFactors: [{
            factor: { type: String },
            impact: { type: String },
            score: { type: Number }
        }]
    },
    status: {
        type: String,
        enum: ['draft', 'final', 'approved', 'revised', 'archived'],
        default: 'draft'
    },
    version: {
        type: Number,
        default: 1
    },
    previousVersion: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BOQReport'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: {
        type: Date
    },
    notes: {
        type: String,
        maxlength: [5000, 'Notes cannot exceed 5000 characters']
    }
}, {
    timestamps: true
});

boqReportSchema.pre('save', async function (next) {
    if (!this.reportNumber) {
        const count = await mongoose.model('BOQReport').countDocuments();
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        this.reportNumber = `BOQ-${year}${month}-${String(count + 1).padStart(5, '0')}`;
    }
    next();
});

boqReportSchema.index({ project: 1, status: 1 });
boqReportSchema.index({ generatedBy: 1 });
boqReportSchema.index({ reportNumber: 1 });

const BOQReport = mongoose.model('BOQReport', boqReportSchema);

module.exports = BOQReport;

/**
 * Project Schema
 * 
 * Defines the structure for construction project documents in MongoDB.
 * Each project can have multiple floor plans and BOQ analyses.
 */

const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Project name is required'],
        trim: true,
        maxlength: [200, 'Project name cannot exceed 200 characters']
    },
    projectCode: {
        type: String,
        trim: true,
        maxlength: [50, 'Project code cannot exceed 50 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    client: {
        name: { type: String, trim: true },
        email: { type: String, trim: true },
        phone: { type: String, trim: true },
        company: { type: String, trim: true }
    },
    location: {
        address: { type: String, trim: true },
        city: { type: String, trim: true },
        province: { type: String, trim: true },
        district: { type: String, trim: true },
        state: { type: String, trim: true },
        country: { type: String, trim: true, default: 'Sri Lanka' },
        postalCode: { type: String, trim: true }
    },
    projectType: {
        type: String,
        enum: ['residential', 'commercial', 'industrial', 'institutional', 'infrastructure', 'mixed-use', 'apartment', 'other'],
        default: 'residential'
    },
    status: {
        type: String,
        enum: ['draft', 'active', 'on-hold', 'completed', 'cancelled', 'in-progress', 'review', 'archived'],
        default: 'draft'
    },
    priority: {
        type: String,
        enum: ['high', 'medium', 'low'],
        default: 'medium'
    },
    contractorGrade: {
        type: String,
        trim: true
    },
    constructionPeriod: {
        type: Number,
        min: 0
    },
    floors: {
        type: Number,
        min: 0
    },
    areaSQFT: {
        type: Number,
        min: 0
    },
    startDate: {
        type: Date
    },
    expectedEndDate: {
        type: Date
    },
    actualEndDate: {
        type: Date
    },
    budget: {
        estimated: { type: Number, default: 0 },
        actual: { type: Number, default: 0 },
        currency: { type: String, default: 'LKR' }
    },
    floorPlans: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FloorPlan'
    }],
    boqReports: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BOQReport'
    }],
    costPredictions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CostPrediction'
    }],
    tags: [{
        type: String,
        trim: true
    }],
    notes: {
        type: String,
        maxlength: [5000, 'Notes cannot exceed 5000 characters']
    }
}, {
    timestamps: true
});

projectSchema.index({ owner: 1, status: 1 });
projectSchema.index({ name: 'text', description: 'text' });

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;

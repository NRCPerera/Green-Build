/**
 * Floor Plan Schema
 * 
 * Stores uploaded floor plan images and their ML analysis results.
 */

const mongoose = require('mongoose');

const floorPlanSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: [true, 'Floor plan name is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    floorNumber: {
        type: Number,
        default: 0
    },
    originalFilename: {
        type: String,
        required: true
    },
    storedFilename: {
        type: String,
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number
    },
    mimeType: {
        type: String
    },
    imageWidth: {
        type: Number
    },
    imageHeight: {
        type: Number
    },
    scale: {
        pixelsPerMeter: { type: Number, default: 50 },
        userDefined: { type: Boolean, default: false }
    },
    wallHeight: {
        type: Number,
        default: 3.0
    },
    mlAnalysis: {
        isProcessed: { type: Boolean, default: false },
        processedAt: { type: Date },
        isValidFloorPlan: { type: Boolean },
        validationConfidence: { type: Number },
        walls: {
            detectedLength: { type: Number },
            lengthMeters: { type: Number },
            surfaceArea: { type: Number },
            netSurfaceArea: { type: Number }
        },
        doors: {
            count: { type: Number, default: 0 },
            totalArea: { type: Number, default: 0 }
        },
        windows: {
            count: { type: Number, default: 0 },
            totalArea: { type: Number, default: 0 }
        },
        rooms: [{
            id: { type: String },
            type: { type: String },
            area: { type: Number },
            perimeter: { type: Number }
        }],
        processingTime: { type: Number },
        modelVersions: {
            wallDetection: { type: String },
            objectDetection: { type: String },
            roomSegmentation: { type: String }
        }
    },

    // User-confirmed detections (post ML review)
    confirmedDetections: {
        isConfirmed: { type: Boolean, default: false },
        confirmedAt: { type: Date },
        confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        walls: {
            totalLengthM: { type: Number },
            grossArea: { type: Number },
            netArea: { type: Number },
            heightM: { type: Number }
        },
        doors: [{
            id: { type: String },
            type: { type: String, default: 'wooden' },
            width: { type: Number },
            height: { type: Number },
            materialType: { type: String, default: 'standard' },
            status: { type: String, enum: ['approved', 'edited', 'deleted', 'added'], default: 'approved' }
        }],
        windows: [{
            id: { type: String },
            type: { type: String, default: 'aluminium' },
            width: { type: Number },
            height: { type: Number },
            materialType: { type: String, default: 'standard' },
            status: { type: String, enum: ['approved', 'edited', 'deleted', 'added'], default: 'approved' }
        }],
        rooms: [{
            id: { type: String },
            type: { type: String },
            area: { type: Number },
            flooringMaterial: { type: String, default: 'ceramic_tile' },
            ceilingType: { type: String, default: 'plain' }
        }],
        additionalInputs: {
            type: mongoose.Schema.Types.Mixed
        }
    },
    manualInputs: {
        electrical: {
            outlets: { type: Number, default: 0 },
            switches: { type: Number, default: 0 },
            lightFixtures: { type: Number, default: 0 }
        },
        plumbing: {
            sinks: { type: Number, default: 0 },
            toilets: { type: Number, default: 0 },
            showers: { type: Number, default: 0 },
            bathtubs: { type: Number, default: 0 }
        },
        hvac: {
            acUnits: { type: Number, default: 0 }
        },
        structural: {
            staircases: { type: Number, default: 0 }
        },
        flooring: {
            tileArea: { type: Number, default: 0 },
            woodArea: { type: Number, default: 0 },
            carpetArea: { type: Number, default: 0 }
        },
        ceiling: {
            plainArea: { type: Number, default: 0 },
            falseArea: { type: Number, default: 0 }
        }
    },
    visualizations: {
        wallMask: { type: String },
        detectionOverlay: { type: String },
        roomSegmentation: { type: String }
    },
    costEstimates: {
        basicFinish: { type: Number, default: 0 },
        standardFinish: { type: Number, default: 0 },
        premiumFinish: { type: Number, default: 0 },
        breakdown: {
            wallPaint: { type: Number, default: 0 },
            wallPlaster: { type: Number, default: 0 },
            wallTiling: { type: Number, default: 0 },
            doors: { type: Number, default: 0 },
            windows: { type: Number, default: 0 },
            flooring: { type: Number, default: 0 }
        },
        currency: { type: String, default: 'LKR' },
        calculatedAt: { type: Date }
    },
    costPrediction: {
        predictedOverrunPct: { type: Number },
        highRisk: { type: Boolean },
        riskLabel: { type: String },
        predictedAt: { type: Date }
    },
    sustainabilityAnalysis: {
        carbonFootprint: { type: Number },
        sustainabilityScore: { type: Number },
        analyzedAt: { type: Date }
    },
    status: {
        type: String,
        enum: ['uploaded', 'processing', 'detected', 'confirmed', 'boq_generated', 'failed', 'archived'],
        default: 'uploaded'
    },
    errorMessage: {
        type: String
    }
}, {
    timestamps: true
});

floorPlanSchema.index({ project: 1, floorNumber: 1 });
floorPlanSchema.index({ uploadedBy: 1 });

const FloorPlan = mongoose.model('FloorPlan', floorPlanSchema);

module.exports = FloorPlan;

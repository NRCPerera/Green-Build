/**
 * Cost Prediction Schema
 * 
 * Stores cost overrun prediction results from the ML service.
 * Captures both input features and prediction outputs for
 * historical tracking, scenario analysis, and accuracy measurement.
 */

const mongoose = require('mongoose');

const costPredictionSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // ── Input Features (sent to ML service) ──────────────────────
    input: {
        // Categorical Features
        Project_Type: { type: String, trim: true },
        Province: { type: String, trim: true },
        District: { type: String, trim: true },
        CIDA_Grade: { type: String, trim: true },
        Season: { type: String, trim: true },

        // Project Details (Numeric)
        Floors: { type: Number },
        Area_SQFT: { type: Number },
        Rate_per_SQFT: { type: Number },
        Initial_Value: { type: Number },

        // Timeline Fields
        Year_of_Tender: { type: Number },
        Start_Month: { type: Number },
        Start_Quarter: { type: Number },
        Start_Weekday: { type: Number },
        Initial_Period_Months: { type: Number },

        // Economic Indicators
        Inflation_Rate: { type: Number },
        Exchange_Rate_LKR: { type: Number },
        Material_Index: { type: Number },
        Project_Size_Index: { type: Number },
        Economic_Risk_Index: { type: Number },

        // Risk & Experience Factors
        Contractor_Experience_Years: { type: Number },
        Change_Order_Freq: { type: Number },
        Complexity_Score: { type: Number },
        Design_Completeness: { type: Number },
        Design_Risk_Score: { type: Number },
        Contractor_Risk_Score: { type: Number },
        Weather_Risk_Score: { type: Number }
    },

    // ── ML Prediction Results ────────────────────────────────────
    prediction: {
        predicted_cost_overrun_pct: { type: Number },
        predicted_high_risk_class: { type: Number }, // 0 = Low Risk, 1 = High Risk
        predicted_high_risk_probability: { type: Number }, // 0.0 to 1.0
        model_version: { type: String }
    },

    // ── Risk Analysis (SHAP Explainability) ──────────────────────
    topRiskFactors: [{
        feature: { type: String },
        impact: { type: Number }
    }],

    riskScorecard: [{
        feature: { type: String },
        feature_value: { type: mongoose.Schema.Types.Mixed },
        impact: { 
            type: String,
            enum: ['High', 'Medium', 'Low']
        },
        status: { type: String }
    }],

    // ── Computed / Derived Fields ────────────────────────────────
    riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
    },

    // User-defined scenario metadata
    scenarioName: {
        type: String,
        trim: true,
        default: 'Baseline Prediction',
        maxlength: [100, 'Scenario name cannot exceed 100 characters']
    },

    // User notes about this prediction
    notes: {
        type: String,
        trim: true,
        maxlength: [2000, 'Notes cannot exceed 2000 characters']
    },

    // Tags for categorization/filtering
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],

    // ── Actual Outcome (for accuracy tracking) ───────────────────
    actualOutcome: {
        actualCostOverrunPct: { type: Number },
        actualFinalCost: { type: Number },
        recordedAt: { type: Date },
        notes: { type: String, trim: true }
    },

    // ── Metadata ─────────────────────────────────────────────────
    mlServiceResponse: {
        type: mongoose.Schema.Types.Mixed
    },
    
    isBaseline: {
        type: Boolean,
        default: false
    },

    // Track if this prediction was used for budgeting
    usedForBudget: {
        type: Boolean,
        default: false
    }

}, {
    timestamps: true // Automatically adds createdAt and updatedAt
});

// ── Indexes for Performance ──────────────────────────────────────
costPredictionSchema.index({ project: 1, createdAt: -1 });
costPredictionSchema.index({ createdBy: 1 });
costPredictionSchema.index({ 'prediction.predicted_high_risk_class': 1 });
costPredictionSchema.index({ riskLevel: 1 });
costPredictionSchema.index({ tags: 1 });
costPredictionSchema.index({ isBaseline: 1 });

// ── Virtual Fields ───────────────────────────────────────────────
costPredictionSchema.virtual('predictionError').get(function() {
    if (this.actualOutcome?.actualCostOverrunPct != null && this.prediction?.predicted_cost_overrun_pct != null) {
        return Math.abs(this.actualOutcome.actualCostOverrunPct - this.prediction.predicted_cost_overrun_pct);
    }
    return null;
});

// ── Instance Methods ─────────────────────────────────────────────
costPredictionSchema.methods.calculateRiskLevel = function() {
    const overrunPct = this.prediction?.predicted_cost_overrun_pct || 0;
    const probability = this.prediction?.predicted_high_risk_probability || 0;

    if (overrunPct > 20 || probability > 0.8) return 'critical';
    if (overrunPct > 15 || probability > 0.6) return 'high';
    if (overrunPct > 10 || probability > 0.4) return 'medium';
    return 'low';
};

// ── Pre-save Hook ────────────────────────────────────────────────
costPredictionSchema.pre('save', async function() {
    // Auto-calculate risk level if not set
    if (!this.riskLevel) {
        this.riskLevel = this.calculateRiskLevel();
    }
});

const CostPrediction = mongoose.model('CostPrediction', costPredictionSchema);

module.exports = CostPrediction;

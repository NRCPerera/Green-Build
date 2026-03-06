import { useState, useEffect } from 'react';
import useDelayController from '../../../controllers/useDelayController';

/**
 * Delay Forecast View
 * 
 * ML-powered construction delay prediction with:
 * - Regression: Predicts total delay days
 * - Classification: Categorizes delay severity (On-Time, Minor, Major, Critical)
 */
const DelayForecastView = ({ project, onBack }) => {
    const [formValues, setFormValues] = useState({
        // ==========================================
        // DISPLAY-ONLY FIELDS (Not sent to ML model)
        // ==========================================
        projectName: 'Green Tower Complex',
        clientName: 'ABC Developers Ltd.',
        projectStartDate: '2026-02-01',
        siteLocation: 'Colombo 03, Near Independence Square',
        projectManager: 'John Silva',
        contractValue: 100000000,
        plannedDurationMonths: 12,

        // ==========================================
        // ML MODEL INPUT FIELDS (Sent to prediction API)
        // These MUST match the trained model's feature names
        // ==========================================
        // Location and Project
        province: 'Western',
        district: 'Colombo',
        projectType: 'House',  // Options: House, Single-family homes
        contractorGrade: 'M1', // Options: M1, M2, M3, M4, M5

        // Project Metrics (numeric)
        projectArea: 500,           // Project_Area_SqM
        floors: 3,                   // Floors

        // Contractor Info
        contractorExperience: 10,    // Contractor_Experience_Years
        contractorPastDelayRate: 0.15,  // Contractor_Past_Delay_Rate (0-1)
        contractorPreviousProjects: 15, // Contractor_Previous_Projects

        // Risk Factors
        laborAvailability: 3.5,      // Labor_Availability (1-5)
        materialDeliveryDelay: 5,    // Material_Delivery_Delay_Days
        paymentDelayHistory: 10,     // Payment_Delay_History (days)
        financialIssues: 0,          // Financial_Issues (0 or 1)
        weatherImpactDays: 25,       // Weather_Impact_Days
    });

    const {
        loading,
        error,
        forecast,
        hasForecast,
        mlServiceStatus,
        predictDelay,
        checkMlHealth,
        clearForecast,
        getCategoryColor,
        getCategoryBgColor,
        formatDelayDays,
    } = useDelayController();

    // Check ML service health on mount
    useEffect(() => {
        checkMlHealth();
    }, [checkMlHealth]);

    // Pre-fill form with project data
    useEffect(() => {
        if (project) {
            const getProvince = (location) => {
                if (typeof location === 'object' && location.province) return location.province;
                return 'Western';
            };

            const getDistrict = (location) => {
                if (typeof location === 'object' && location.district) return location.district;
                return 'Colombo';
            };

            const getLocation = (location) => {
                if (typeof location === 'string') return location;
                const addressParts = [location?.address, location?.city, location?.district, location?.province].filter(Boolean);
                return addressParts.join(', ');
            };

            const budget = typeof project.budget === 'number' ? project.budget : (project.budget?.estimated || 0);
            const clientName = project.clientName || project.client?.name || '';

            setFormValues(prev => ({
                ...prev,
                projectName: project.name || prev.projectName,
                clientName: clientName || prev.clientName,
                projectStartDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : prev.projectStartDate,
                siteLocation: getLocation(project.location) || prev.siteLocation,
                contractValue: budget || prev.contractValue,
                province: getProvince(project.location),
                district: getDistrict(project.location),
                projectType: project.projectType === 'residential' ? 'House' : prev.projectType,
            }));
        }
    }, [project]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        await predictDelay(formValues);
    };

    const handleReset = () => {
        clearForecast();
    };

    // Province-District mapping for Sri Lanka
    const provinceDistrictMap = {
        'Western': ['Colombo', 'Gampaha', 'Kalutara'],
        'Central': ['Kandy', 'Matale', 'Nuwara Eliya'],
        'Southern': ['Galle', 'Matara', 'Hambantota'],
        'Northern': ['Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu'],
        'Eastern': ['Batticaloa', 'Ampara', 'Trincomalee'],
        'North Western': ['Kurunegala', 'Puttalam'],
        'North Central': ['Anuradhapura', 'Polonnaruwa'],
        'Uva': ['Badulla', 'Monaragala'],
        'Sabaragamuwa': ['Ratnapura', 'Kegalle']
    };

    const provinces = Object.keys(provinceDistrictMap);

    // Get districts based on selected province
    const availableDistricts = provinceDistrictMap[formValues.province] || [];

    // Handle province change - reset district to first of new province
    const handleProvinceChange = (newProvince) => {
        const newDistricts = provinceDistrictMap[newProvince] || [];
        setFormValues({
            ...formValues,
            province: newProvince,
            district: newDistricts[0] || ''
        });
    };

    const projectTypes = [
        'House', 'Single-family homes'
    ];

    const contractorGrades = [
        'M1', 'M2', 'M3', 'M4', 'M5'
    ];

    return (
        <div className="space-y-6">
            {/* Module Header */}
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-200 hover:bg-blue-500/30 transition-colors"
                                title="Back to Project"
                            >
                                ←
                            </button>
                        )}
                        <span className="text-4xl">⏱️</span>
                        <div>
                            <h2 className="text-2xl font-bold text-white">
                                Delay Prediction{project ? ` - ${project.name}` : ' Module'}
                            </h2>
                            <p className="text-gray-400 mt-1">
                                AI-powered construction delay forecasting for Sri Lanka projects
                            </p>
                        </div>
                    </div>
                    {/* ML Service Status Indicator */}
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${mlServiceStatus?.mlService?.status === 'healthy'
                            ? 'bg-green-500 animate-pulse'
                            : 'bg-red-500'
                            }`} />
                        <span className="text-sm text-gray-400">
                            ML Service: {mlServiceStatus?.mlService?.status || 'Checking...'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                    <p className="text-red-400">⚠️ {error}</p>
                    <p className="text-gray-400 text-sm mt-1">Using mock predictions as fallback.</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Input Form */}
                <div className="lg:col-span-1">
                    <form onSubmit={handleSubmit} className="bg-dark-800/50 border border-white/5 rounded-2xl p-6 space-y-5">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            📋 Project Parameters
                        </h3>

                        {/* Province */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Province</label>
                            <select
                                value={formValues.province}
                                onChange={(e) => handleProvinceChange(e.target.value)}
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {provinces.map((p) => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>

                        {/* District - Filtered by Province */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">District</label>
                            <select
                                value={formValues.district}
                                onChange={(e) => setFormValues({ ...formValues, district: e.target.value })}
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {availableDistricts.map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                Showing districts in {formValues.province} Province
                            </p>
                        </div>

                        {/* Project Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Project Type</label>
                            <select
                                value={formValues.projectType}
                                onChange={(e) => setFormValues({ ...formValues, projectType: e.target.value })}
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {projectTypes.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>

                        {/* Contractor Grade */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Contractor ICTAD Grade</label>
                            <select
                                value={formValues.contractorGrade}
                                onChange={(e) => setFormValues({ ...formValues, contractorGrade: e.target.value })}
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {contractorGrades.map((g) => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                        </div>

                        {/* Project Area */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Project Area (sq.m)
                            </label>
                            <input
                                type="number"
                                value={formValues.projectArea}
                                onChange={(e) => setFormValues({ ...formValues, projectArea: parseInt(e.target.value) || 0 })}
                                min="50"
                                step="50"
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Floors */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Number of Floors
                            </label>
                            <input
                                type="number"
                                value={formValues.floors}
                                onChange={(e) => setFormValues({ ...formValues, floors: parseInt(e.target.value) || 1 })}
                                min="1"
                                max="50"
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Divider for Timeline Section */}
                        <div className="border-t border-white/10 pt-4">
                            <h4 className="text-sm font-semibold text-blue-400 mb-3">📅 Project Timeline</h4>
                        </div>

                        {/* Project Start Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Project Start Date
                            </label>
                            <input
                                type="date"
                                value={formValues.projectStartDate}
                                onChange={(e) => setFormValues({ ...formValues, projectStartDate: e.target.value })}
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Planned Duration */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Planned Duration (months)
                            </label>
                            <input
                                type="number"
                                value={formValues.plannedDurationMonths}
                                onChange={(e) => setFormValues({ ...formValues, plannedDurationMonths: parseInt(e.target.value) || 1 })}
                                min="1"
                                max="120"
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Estimated project completion time without delays
                            </p>
                        </div>

                        {/* Divider for Risk Factors Section */}
                        <div className="border-t border-white/10 pt-4">
                            <h4 className="text-sm font-semibold text-orange-400 mb-3">⚠️ Risk Factors</h4>
                        </div>

                        {/* Contractor Experience */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Contractor Experience (years)
                            </label>
                            <input
                                type="range"
                                value={formValues.contractorExperience}
                                onChange={(e) => setFormValues({ ...formValues, contractorExperience: parseInt(e.target.value) })}
                                min="1"
                                max="30"
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>1 year</span>
                                <span className="text-blue-400 font-medium">{formValues.contractorExperience} years</span>
                                <span>30 years</span>
                            </div>
                        </div>

                        {/* Contractor Past Delay Rate */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Contractor Past Delay Rate
                            </label>
                            <input
                                type="range"
                                value={formValues.contractorPastDelayRate}
                                onChange={(e) => setFormValues({ ...formValues, contractorPastDelayRate: parseFloat(e.target.value) })}
                                min="0"
                                max="1"
                                step="0.05"
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>0%</span>
                                <span className="text-blue-400 font-medium">{(formValues.contractorPastDelayRate * 100).toFixed(0)}%</span>
                                <span>100%</span>
                            </div>
                        </div>

                        {/* Contractor Previous Projects */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Contractor Previous Projects
                            </label>
                            <input
                                type="number"
                                value={formValues.contractorPreviousProjects}
                                onChange={(e) => setFormValues({ ...formValues, contractorPreviousProjects: parseInt(e.target.value) || 0 })}
                                min="0"
                                max="100"
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Labor Availability */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Labor Availability (1-5)
                            </label>
                            <input
                                type="range"
                                value={formValues.laborAvailability}
                                onChange={(e) => setFormValues({ ...formValues, laborAvailability: parseFloat(e.target.value) })}
                                min="1"
                                max="5"
                                step="0.5"
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>Scarce</span>
                                <span className="text-blue-400 font-medium">{formValues.laborAvailability}</span>
                                <span>Abundant</span>
                            </div>
                        </div>

                        {/* Material Delivery Delay */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Material Delivery Delay (days)
                            </label>
                            <input
                                type="number"
                                value={formValues.materialDeliveryDelay}
                                onChange={(e) => setFormValues({ ...formValues, materialDeliveryDelay: parseInt(e.target.value) || 0 })}
                                min="0"
                                max="60"
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Payment Delay History */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Payment Delay History (days)
                            </label>
                            <input
                                type="number"
                                value={formValues.paymentDelayHistory}
                                onChange={(e) => setFormValues({ ...formValues, paymentDelayHistory: parseInt(e.target.value) || 0 })}
                                min="0"
                                max="90"
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Financial Issues */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Financial Issues
                            </label>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="financialIssues"
                                        checked={formValues.financialIssues === 0}
                                        onChange={() => setFormValues({ ...formValues, financialIssues: 0 })}
                                        className="w-4 h-4 text-blue-500"
                                    />
                                    <span className="text-gray-300">No</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="financialIssues"
                                        checked={formValues.financialIssues === 1}
                                        onChange={() => setFormValues({ ...formValues, financialIssues: 1 })}
                                        className="w-4 h-4 text-red-500"
                                    />
                                    <span className="text-gray-300">Yes</span>
                                </label>
                            </div>
                        </div>

                        {/* Weather Impact Days */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Expected Weather Impact (days)
                            </label>
                            <input
                                type="number"
                                value={formValues.weatherImpactDays}
                                onChange={(e) => setFormValues({ ...formValues, weatherImpactDays: parseInt(e.target.value) || 0 })}
                                min="0"
                                max="90"
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Expected days of weather-related delays
                            </p>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className={`
                                w-full px-6 py-3 rounded-xl font-semibold transition-all
                                ${loading
                                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-400 hover:to-purple-400'
                                }
                            `}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Predicting...
                                </span>
                            ) : '🔮 Predict Delay'}
                        </button>

                        {hasForecast && (
                            <button
                                type="button"
                                onClick={handleReset}
                                className="w-full px-6 py-3 rounded-xl font-semibold transition-all
                                         bg-gray-700 text-gray-300 hover:bg-gray-600"
                            >
                                Reset
                            </button>
                        )}
                    </form>
                </div>

                {/* Results */}
                <div className="lg:col-span-2">
                    {hasForecast ? (
                        <div className="space-y-6">
                            {/* Mock Data Indicator */}
                            {forecast.source === 'mock_prediction' && (
                                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
                                    <p className="text-yellow-400 text-sm">⚠️ Using mock prediction (ML service may be unavailable)</p>
                                </div>
                            )}

                            {/* Key Metrics */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {/* Predicted Delay Days */}
                                <div className="bg-dark-800/50 border border-white/5 rounded-xl p-5 text-center">
                                    <p className="text-sm text-gray-400 mb-2">Predicted Delay</p>
                                    <p className="text-3xl font-bold text-orange-400">
                                        {Math.round(forecast.predictedDelayDays)}
                                    </p>
                                    <p className="text-sm text-gray-500">days</p>
                                </div>

                                {/* Delay Category */}
                                <div className={`border rounded-xl p-5 text-center ${getCategoryBgColor(forecast.predictedCategory)}`}>
                                    <p className="text-sm text-gray-400 mb-2">Category</p>
                                    <p className={`text-lg font-bold ${getCategoryColor(forecast.predictedCategory)}`}>
                                        {forecast.predictedCategory}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {(forecast.categoryConfidence * 100).toFixed(0)}% confidence
                                    </p>
                                </div>

                                {/* Risk Level */}
                                <div className="bg-dark-800/50 border border-white/5 rounded-xl p-5 text-center">
                                    <p className="text-sm text-gray-400 mb-2">Risk Level</p>
                                    <p className={`text-xl font-bold ${forecast.riskLevel === 'Critical' ? 'text-red-500' :
                                        forecast.riskLevel === 'High' ? 'text-orange-400' :
                                            forecast.riskLevel === 'Medium' ? 'text-yellow-400' : 'text-green-400'
                                        }`}>
                                        {forecast.riskLevel}
                                    </p>
                                </div>

                                {/* Completion Date */}
                                <div className="bg-dark-800/50 border border-white/5 rounded-xl p-5 text-center">
                                    <p className="text-sm text-gray-400 mb-2">Expected Completion</p>
                                    <p className="text-lg font-bold text-white">
                                        {new Date(forecast.predictedCompletionDate).toLocaleDateString('en-GB', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric'
                                        })}
                                    </p>
                                </div>
                            </div>

                            {/* Class Probabilities */}
                            <div className="bg-dark-800/50 border border-white/5 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">📊 Category Probabilities</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {Object.entries(forecast.classProbabilities || {}).map(([category, probability]) => (
                                        <div key={category} className="text-center">
                                            <div className="relative h-24 w-24 mx-auto">
                                                <svg className="transform -rotate-90 w-24 h-24">
                                                    <circle
                                                        className="text-gray-700"
                                                        strokeWidth="8"
                                                        stroke="currentColor"
                                                        fill="transparent"
                                                        r="36"
                                                        cx="48"
                                                        cy="48"
                                                    />
                                                    <circle
                                                        className={getCategoryColor(category).replace('text-', 'text-')}
                                                        strokeWidth="8"
                                                        strokeLinecap="round"
                                                        stroke="currentColor"
                                                        fill="transparent"
                                                        r="36"
                                                        cx="48"
                                                        cy="48"
                                                        strokeDasharray={`${probability * 226} 226`}
                                                    />
                                                </svg>
                                                <span className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${getCategoryColor(category)}`}>
                                                    {(probability * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-400 mt-2">{category}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Scenario Analysis */}
                            <div className="bg-dark-800/50 border border-white/5 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">📈 Scenario Analysis</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
                                        <span className="text-xs text-green-400 font-medium">Best Case</span>
                                        <p className="text-xl font-bold text-green-400 mt-2">
                                            {formatDelayDays(forecast.scenarios?.bestCase?.delayDays || 0)}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {((forecast.scenarios?.bestCase?.probability || 0) * 100).toFixed(0)}% chance
                                        </p>
                                    </div>
                                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-center">
                                        <span className="text-xs text-blue-400 font-medium">Most Likely</span>
                                        <p className="text-xl font-bold text-blue-400 mt-2">
                                            {formatDelayDays(forecast.scenarios?.mostLikely?.delayDays || 0)}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {((forecast.scenarios?.mostLikely?.probability || 0) * 100).toFixed(0)}% chance
                                        </p>
                                    </div>
                                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
                                        <span className="text-xs text-red-400 font-medium">Worst Case</span>
                                        <p className="text-xl font-bold text-red-400 mt-2">
                                            {formatDelayDays(forecast.scenarios?.worstCase?.delayDays || 0)}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {((forecast.scenarios?.worstCase?.probability || 0) * 100).toFixed(0)}% chance
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Recommendations */}
                            <div className="bg-dark-800/50 border border-white/5 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">💡 Recommendations</h3>
                                <div className="space-y-3">
                                    {forecast.recommendations?.map((rec, index) => (
                                        <div key={index} className="flex items-start gap-3 p-3 bg-dark-700/50 rounded-lg">
                                            <span className="text-blue-400">{index + 1}.</span>
                                            <p className="text-gray-300">{rec}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Timeline */}
                            <div className="bg-dark-800/50 border border-white/5 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">📅 Project Timeline</h3>
                                <div className="relative">
                                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-700" />

                                    {/* Project Start Date */}
                                    <div className="relative pl-10 pb-6">
                                        <div className="absolute left-2.5 w-3 h-3 rounded-full bg-green-500" />
                                        <p className="text-sm text-gray-400">Project Start</p>
                                        <p className="text-white font-medium">
                                            {new Date(forecast.projectStartDate).toLocaleDateString('en-GB', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    </div>

                                    {/* Planned Completion (without delays) */}
                                    <div className="relative pl-10 pb-6">
                                        <div className="absolute left-2.5 w-3 h-3 rounded-full bg-blue-500" />
                                        <p className="text-sm text-gray-400">Planned Completion</p>
                                        <p className="text-white font-medium">
                                            {new Date(forecast.plannedCompletionDate).toLocaleDateString('en-GB', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            ({forecast.plannedDurationMonths} months from start)
                                        </p>
                                    </div>

                                    {/* Predicted Completion (with delays) */}
                                    <div className="relative pl-10">
                                        <div className={`absolute left-2.5 w-3 h-3 rounded-full ${forecast.predictedDelayDays > 60 ? 'bg-red-500' :
                                                forecast.predictedDelayDays > 0 ? 'bg-orange-500' : 'bg-green-500'
                                            }`} />
                                        <p className="text-sm text-gray-400">Predicted Completion</p>
                                        <p className="text-white font-medium">
                                            {new Date(forecast.predictedCompletionDate).toLocaleDateString('en-GB', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </p>
                                        {forecast.predictedDelayDays > 0 ? (
                                            <div className="mt-2 p-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                                                <p className="text-orange-400 text-sm font-medium">
                                                    ⏰ +{Math.round(forecast.predictedDelayDays)} days delay
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    Total duration: {Math.round((forecast.plannedDurationDays + forecast.predictedDelayDays) / 30)} months
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="mt-2 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                                                <p className="text-green-400 text-sm font-medium">
                                                    ✅ On schedule
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-96 flex flex-col items-center justify-center bg-dark-800/50 border border-white/5 rounded-2xl">
                            <span className="text-6xl mb-6">🔮</span>
                            <h3 className="text-xl font-semibold text-white mb-2">No Prediction Yet</h3>
                            <p className="text-gray-400 text-center max-w-md">
                                Configure your project parameters and click "Predict Delay" to get
                                AI-powered delay forecasts using our trained machine learning model.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DelayForecastView;

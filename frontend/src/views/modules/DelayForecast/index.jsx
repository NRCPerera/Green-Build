import { useState, useEffect } from 'react';
import useDelayController from '../../../controllers/useDelayController';

/**
 * Delay Forecast View
 * 
 * ML-powered construction delay prediction with:
 * - Regression: Predicts total delay days
 * - Classification: Categorizes delay severity (On-Time, Minor, Major, Critical)
 */
const DelayForecastView = () => {
    const [formValues, setFormValues] = useState({
        // Location and Project
        district: 'Colombo',
        projectType: 'Commercial Building',
        contractorGrade: 'CIDA 1',

        // Project Metrics
        contractValue: 100000000,
        landArea: 10000,
        plannedDurationMonths: 12,

        // Risk Factors
        weatherImpactScore: 2.5,
        contractorExperience: 10,
        laborAvailability: 3.0,
        materialCostIndex: 100,
        inflationRate: 0.08,
        rainfall: 150,
        equipmentAvailability: 3.5,
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        await predictDelay(formValues);
    };

    const handleReset = () => {
        clearForecast();
    };

    // District options for Sri Lanka
    const districts = [
        'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
        'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
        'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
        'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
        'Monaragala', 'Ratnapura', 'Kegalle'
    ];

    const projectTypes = [
        'Commercial Building', 'Residential Building', 'Industrial Building',
        'Infrastructure', 'Road Construction', 'Bridge Construction',
        'Water Supply Project', 'Government Building', 'Educational Building',
        'Healthcare Facility', 'Mixed Use Development'
    ];

    const contractorGrades = [
        'CIDA 1', 'CIDA 2', 'CIDA 3', 'CIDA 4', 'CIDA 5',
        'CIDA 6', 'CIDA 7', 'CIDA 8', 'CIDA 9', 'CIDA 10'
    ];

    return (
        <div className="space-y-6">
            {/* Module Header */}
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <span className="text-4xl">⏱️</span>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Delay Prediction Module</h2>
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

                        {/* District */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">District</label>
                            <select
                                value={formValues.district}
                                onChange={(e) => setFormValues({ ...formValues, district: e.target.value })}
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {districts.map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
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

                        {/* Contract Value */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Contract Value (LKR)
                            </label>
                            <input
                                type="number"
                                value={formValues.contractValue}
                                onChange={(e) => setFormValues({ ...formValues, contractValue: parseInt(e.target.value) || 0 })}
                                min="1000000"
                                step="1000000"
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                {(formValues.contractValue / 1000000).toFixed(1)}M LKR
                            </p>
                        </div>

                        {/* Planned Duration */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Planned Duration (months)
                            </label>
                            <input
                                type="number"
                                value={formValues.plannedDurationMonths}
                                onChange={(e) => setFormValues({ ...formValues, plannedDurationMonths: parseInt(e.target.value) || 12 })}
                                min="1"
                                max="120"
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
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

                        {/* Weather Impact */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Weather Impact Score (1-5)
                            </label>
                            <input
                                type="range"
                                value={formValues.weatherImpactScore}
                                onChange={(e) => setFormValues({ ...formValues, weatherImpactScore: parseFloat(e.target.value) })}
                                min="1"
                                max="5"
                                step="0.5"
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>Low</span>
                                <span className="text-blue-400 font-medium">{formValues.weatherImpactScore}</span>
                                <span>High</span>
                            </div>
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

                                    <div className="relative pl-10 pb-6">
                                        <div className="absolute left-2.5 w-3 h-3 rounded-full bg-green-500" />
                                        <p className="text-sm text-gray-400">Today</p>
                                        <p className="text-white font-medium">{new Date().toLocaleDateString()}</p>
                                    </div>

                                    <div className="relative pl-10 pb-6">
                                        <div className="absolute left-2.5 w-3 h-3 rounded-full bg-blue-500" />
                                        <p className="text-sm text-gray-400">Planned Completion</p>
                                        <p className="text-white font-medium">
                                            {new Date(forecast.plannedCompletionDate).toLocaleDateString()}
                                        </p>
                                    </div>

                                    <div className="relative pl-10">
                                        <div className={`absolute left-2.5 w-3 h-3 rounded-full ${forecast.predictedDelayDays > 60 ? 'bg-red-500' :
                                                forecast.predictedDelayDays > 0 ? 'bg-orange-500' : 'bg-green-500'
                                            }`} />
                                        <p className="text-sm text-gray-400">Predicted Completion</p>
                                        <p className="text-white font-medium">
                                            {new Date(forecast.predictedCompletionDate).toLocaleDateString()}
                                        </p>
                                        {forecast.predictedDelayDays > 0 && (
                                            <p className="text-orange-400 text-sm mt-1">
                                                +{Math.round(forecast.predictedDelayDays)} days delay
                                            </p>
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

import { useState } from 'react';
import useSustainabilityController from '../../../controllers/useSustainabilityController';

/**
 * Sustainability Analysis View
 * 
 * Provides input forms for all 3 ML models:
 * 1. Sustainability Score Model
 * 2. Lifecycle Cost Model  
 * 3. Risk Prediction Model
 */
const SustainabilityView = () => {
    // Form state with all model features
    const [formData, setFormData] = useState({
        // Sustainability Score Features
        energyKwhYear: 15000,
        embodiedCo2Tons: 45,
        operationalCo2Tons: 12,
        energyEfficiency: 75,
        energyEfficiencyPerSqft: 0.85,
        costPerSqftForSustainability: 250,
        energyCo2ImpactRelativeToCost: 0.15,
        
        // Lifecycle Cost Features
        constructionCostPerSqft: 12000,
        maintenanceCostPerYear: 150000,
        
        // Risk Prediction Features
        designCompleteness: 85,
        projectComplexityScore: 50,
        changeOrderFrequency: 2,
        inflationRate: 6.5,
        interestRate: 12,
        contractorExperienceYears: 10
    });

    const {
        loading,
        error,
        result,
        hasResult,
        mlServiceStatus,
        analyzeProject,
        clearResults,
        formatCurrencyLKR,
        getRiskColor,
        getScoreColor
    } = useSustainabilityController();

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await analyzeProject(formData);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-dark-800/50 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <span className="text-4xl">🌱</span>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Sustainability Analysis</h2>
                            <p className="text-gray-400 mt-1">
                                ML-powered sustainability score, lifecycle cost & risk prediction
                            </p>
                        </div>
                    </div>
                    {/* ML Service Status */}
                    {mlServiceStatus && (
                        <div className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                            mlServiceStatus.status === 'healthy' || mlServiceStatus.status === 'ok'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        }`}>
                            {mlServiceStatus.status === 'healthy' || mlServiceStatus.status === 'ok'
                                ? '🟢 ML Service Online' 
                                : '🟡 ML Service Unavailable'}
                        </div>
                    )}
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                    <p className="text-red-400">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Input Form */}
                <div className="lg:col-span-2 space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* Sustainability Score Inputs */}
                        <div className="bg-dark-800/50 border border-white/5 rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <span className="text-green-400">🌍</span> Sustainability Score Inputs
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Energy Consumption (kWh/year)</label>
                                    <input
                                        type="number"
                                        name="energyKwhYear"
                                        value={formData.energyKwhYear}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Embodied CO₂ (tons)</label>
                                    <input
                                        type="number"
                                        name="embodiedCo2Tons"
                                        value={formData.embodiedCo2Tons}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Operational CO₂ (tons/year)</label>
                                    <input
                                        type="number"
                                        name="operationalCo2Tons"
                                        value={formData.operationalCo2Tons}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Energy Efficiency (0-100)</label>
                                    <input
                                        type="number"
                                        name="energyEfficiency"
                                        value={formData.energyEfficiency}
                                        onChange={handleInputChange}
                                        min="0"
                                        max="100"
                                        className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Energy Efficiency per sqft</label>
                                    <input
                                        type="number"
                                        name="energyEfficiencyPerSqft"
                                        value={formData.energyEfficiencyPerSqft}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Cost per sqft for Sustainability (LKR)</label>
                                    <input
                                        type="number"
                                        name="costPerSqftForSustainability"
                                        value={formData.costPerSqftForSustainability}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm text-gray-400 mb-2">Energy CO₂ Impact Relative to Cost</label>
                                    <input
                                        type="number"
                                        name="energyCo2ImpactRelativeToCost"
                                        value={formData.energyCo2ImpactRelativeToCost}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Lifecycle Cost Inputs */}
                        <div className="bg-dark-800/50 border border-white/5 rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <span className="text-blue-400">💰</span> Lifecycle Cost Inputs
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Construction Cost per sqft (LKR)</label>
                                    <input
                                        type="number"
                                        name="constructionCostPerSqft"
                                        value={formData.constructionCostPerSqft}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Maintenance Cost per Year (LKR)</label>
                                    <input
                                        type="number"
                                        name="maintenanceCostPerYear"
                                        value={formData.maintenanceCostPerYear}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Risk Prediction Inputs */}
                        <div className="bg-dark-800/50 border border-white/5 rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <span className="text-yellow-400">⚠️</span> Risk Prediction Inputs
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Design Completeness (%)</label>
                                    <input
                                        type="number"
                                        name="designCompleteness"
                                        value={formData.designCompleteness}
                                        onChange={handleInputChange}
                                        min="0"
                                        max="100"
                                        className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Project Complexity Score (0-100)</label>
                                    <input
                                        type="number"
                                        name="projectComplexityScore"
                                        value={formData.projectComplexityScore}
                                        onChange={handleInputChange}
                                        min="0"
                                        max="100"
                                        className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Change Order Frequency</label>
                                    <input
                                        type="number"
                                        name="changeOrderFrequency"
                                        value={formData.changeOrderFrequency}
                                        onChange={handleInputChange}
                                        step="0.1"
                                        min="0"
                                        className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Inflation Rate (%)</label>
                                    <input
                                        type="number"
                                        name="inflationRate"
                                        value={formData.inflationRate}
                                        onChange={handleInputChange}
                                        step="0.1"
                                        className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Interest Rate (%)</label>
                                    <input
                                        type="number"
                                        name="interestRate"
                                        value={formData.interestRate}
                                        onChange={handleInputChange}
                                        step="0.1"
                                        className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Contractor Experience (years)</label>
                                    <input
                                        type="number"
                                        name="contractorExperienceYears"
                                        value={formData.contractorExperienceYears}
                                        onChange={handleInputChange}
                                        min="0"
                                        className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex gap-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`
                                    flex-1 px-6 py-4 rounded-xl font-semibold transition-all duration-200
                                    ${loading
                                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-400 hover:to-emerald-400 shadow-lg shadow-green-500/20'
                                    }
                                `}
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Analyzing with ML Models...
                                    </span>
                                ) : '🚀 Run Full Analysis'}
                            </button>
                            {hasResult && (
                                <button
                                    type="button"
                                    onClick={clearResults}
                                    className="px-6 py-4 rounded-xl font-semibold bg-dark-700 text-gray-400 hover:bg-dark-600 transition-all"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Results Panel */}
                <div className="space-y-6">
                    {hasResult ? (
                        <>
                            {/* Sustainability Score */}
                            <div className="bg-dark-800/50 border border-green-500/20 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <span>🌍</span> Sustainability Score
                                </h3>
                                <div className="text-center">
                                    <p className={`text-5xl font-bold ${getScoreColor(result.sustainabilityScore)}`}>
                                        {result.sustainabilityScore?.toFixed(1)}
                                    </p>
                                    <p className="text-gray-400 mt-2">out of 100</p>
                                    <p className={`mt-3 text-sm ${getScoreColor(result.sustainabilityScore)}`}>
                                        {result.sustainabilityInterpretation}
                                    </p>
                                </div>
                            </div>

                            {/* Lifecycle Cost */}
                            <div className="bg-dark-800/50 border border-blue-500/20 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <span>💰</span> Lifecycle Cost
                                </h3>
                                <div className="text-center">
                                    <p className="text-3xl font-bold text-blue-400">
                                        {result.lifecycleCostMillions?.toFixed(2)}M
                                    </p>
                                    <p className="text-gray-400 mt-2">LKR (Sri Lankan Rupees)</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {formatCurrencyLKR(result.lifecycleCostLkr || 0)}
                                    </p>
                                    <p className="mt-3 text-sm text-blue-400">
                                        {result.lifecycleInterpretation}
                                    </p>
                                </div>
                            </div>

                            {/* Risk Assessment */}
                            <div className={`bg-dark-800/50 border rounded-2xl p-6 ${
                                result.riskLevel === 'high' ? 'border-red-500/30' :
                                result.riskLevel === 'medium' ? 'border-yellow-500/30' :
                                'border-green-500/30'
                            }`}>
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <span>⚠️</span> Risk Assessment
                                </h3>
                                <div className="text-center mb-4">
                                    <p className={`text-3xl font-bold capitalize ${getRiskColor(result.riskLevel)}`}>
                                        {result.riskLevel}
                                    </p>
                                    <p className="text-gray-400 mt-2">
                                        Probability: {(result.riskProbability * 100)?.toFixed(1)}%
                                    </p>
                                </div>
                                
                                {result.riskRecommendations?.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-white/10">
                                        <p className="text-sm text-gray-400 mb-2">Recommendations:</p>
                                        <ul className="space-y-2">
                                            {result.riskRecommendations.map((rec, index) => (
                                                <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                                                    <span className="text-green-400 mt-0.5">•</span>
                                                    {rec}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* Timestamp */}
                            <div className="text-center text-xs text-gray-500">
                                Analysis completed: {new Date(result.timestamp).toLocaleString()}
                            </div>
                        </>
                    ) : (
                        <div className="bg-dark-800/50 border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[400px]">
                            <div className="text-6xl mb-4">📊</div>
                            <h3 className="text-xl font-semibold text-white mb-2">No Analysis Yet</h3>
                            <p className="text-gray-400 text-center">
                                Fill in the project parameters and click <br />
                                <strong className="text-green-400">Run Full Analysis</strong> to get predictions.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SustainabilityView;

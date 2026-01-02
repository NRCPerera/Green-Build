import { useState } from 'react';
import useCostController from '../../../controllers/useCostController';

const CostPredictionView = () => {
    const [formValues, setFormValues] = useState({
        projectDurationMonths: 12,
        complexityScore: 5,
        contractorGrade: 'B',
        weatherRiskFactor: 0.3,
    });

    const {
        loading,
        error,
        quantityData,
        prediction,
        hasQuantityData,
        hasPrediction,
        predictCost,
        clearPrediction,
        getRiskColor,
    } = useCostController();

    const handleSubmit = async (e) => {
        e.preventDefault();
        await predictCost(formValues);
    };

    return (
        <div className="space-y-6">
            {/* Module Header */}
            <div className="bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-4">
                    <span className="text-4xl">💰</span>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Cost Prediction Module</h2>
                        <p className="text-gray-400 mt-1">
                            ML-powered cost overrun prediction with risk analysis.
                        </p>
                    </div>
                </div>
            </div>

            {/* Dependency Check */}
            {!hasQuantityData ? (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
                    <div className="flex items-center gap-4">
                        <span className="text-2xl">⚠️</span>
                        <div>
                            <p className="text-yellow-400 font-medium">Quantity Data Required</p>
                            <p className="text-gray-400 text-sm mt-1">
                                Please complete the Quantity Takeoff (Module 1) first. Cost predictions require
                                wall area and item counts from floor plan analysis.
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
                        <p className="text-primary-400">
                            Using: Wall Area {quantityData?.wallNetSurfaceAreaM2?.toFixed(1)} m²,
                            {quantityData?.itemCounts?.doors || 0} doors,
                            {quantityData?.itemCounts?.windows || 0} windows
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Input Form */}
                <div className="lg:col-span-1">
                    <form onSubmit={handleSubmit} className="bg-dark-800/50 border border-white/5 rounded-2xl p-6 space-y-5">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">Inputs</span>
                            Prediction Parameters
                        </h3>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Project Duration (months)
                            </label>
                            <input
                                type="number"
                                value={formValues.projectDurationMonths}
                                onChange={(e) => setFormValues({ ...formValues, projectDurationMonths: parseInt(e.target.value) || 12 })}
                                min="1"
                                max="60"
                                disabled={!hasQuantityData}
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                         focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Complexity Score (1-10)
                            </label>
                            <input
                                type="range"
                                value={formValues.complexityScore}
                                onChange={(e) => setFormValues({ ...formValues, complexityScore: parseInt(e.target.value) })}
                                min="1"
                                max="10"
                                disabled={!hasQuantityData}
                                className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>Simple</span>
                                <span className="text-yellow-400 font-medium">{formValues.complexityScore}</span>
                                <span>Complex</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Contractor Grade
                            </label>
                            <select
                                value={formValues.contractorGrade}
                                onChange={(e) => setFormValues({ ...formValues, contractorGrade: e.target.value })}
                                disabled={!hasQuantityData}
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                         focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50"
                            >
                                <option value="A">Grade A - Top Tier</option>
                                <option value="B">Grade B - Experienced</option>
                                <option value="C">Grade C - Standard</option>
                                <option value="D">Grade D - Basic</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Weather Risk Factor
                            </label>
                            <input
                                type="range"
                                value={formValues.weatherRiskFactor * 100}
                                onChange={(e) => setFormValues({ ...formValues, weatherRiskFactor: parseInt(e.target.value) / 100 })}
                                min="0"
                                max="100"
                                disabled={!hasQuantityData}
                                className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>Low</span>
                                <span className="text-yellow-400 font-medium">{(formValues.weatherRiskFactor * 100).toFixed(0)}%</span>
                                <span>High</span>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                <p className="text-sm text-red-400">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !hasQuantityData}
                            className={`
                w-full px-6 py-3 rounded-xl font-semibold transition-all duration-200
                ${loading || !hasQuantityData
                                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-400 hover:to-orange-400'
                                }
              `}
                        >
                            {loading ? 'Predicting...' : 'Predict Cost Overrun'}
                        </button>
                    </form>
                </div>

                {/* Results */}
                <div className="lg:col-span-2">
                    {hasPrediction ? (
                        <div className="space-y-6">
                            {/* Key Metrics */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className={`bg-dark-800/50 border rounded-xl p-5 text-center ${getRiskColor(prediction.riskLevel)}`}>
                                    <p className="text-sm text-gray-400 mb-2">Risk Level</p>
                                    <p className="text-3xl font-bold">{prediction.riskLevel}</p>
                                </div>
                                <div className="bg-dark-800/50 border border-white/5 rounded-xl p-5 text-center">
                                    <p className="text-sm text-gray-400 mb-2">Predicted Overrun</p>
                                    <p className={`text-3xl font-bold ${prediction.predictedOverrunPercentage > 10 ? 'text-red-400' : 'text-green-400'}`}>
                                        {prediction.predictedOverrunPercentage}%
                                    </p>
                                </div>
                                <div className="bg-dark-800/50 border border-white/5 rounded-xl p-5 text-center">
                                    <p className="text-sm text-gray-400 mb-2">Risk Score</p>
                                    <p className="text-3xl font-bold text-white">{prediction.riskScore}/100</p>
                                    <div className="w-full h-1.5 bg-dark-700 rounded-full mt-2 overflow-hidden">
                                        <div
                                            className={`h-full transition-all ${prediction.riskScore > 60 ? 'bg-red-500' : prediction.riskScore > 30 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                            style={{ width: `${prediction.riskScore}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* SHAP Values */}
                            <div className="bg-dark-800/50 border border-white/5 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">📊 Feature Importance (SHAP)</h3>
                                <div className="space-y-3">
                                    {prediction.shapValues?.map((shap, index) => (
                                        <div key={index} className="flex items-center gap-4">
                                            <span className="w-40 text-sm text-gray-400">{shap.feature}</span>
                                            <div className="flex-1 h-4 bg-dark-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${shap.contribution > 0 ? 'bg-red-500/70' : 'bg-green-500/70'}`}
                                                    style={{ width: `${Math.min(100, Math.abs(shap.contribution) * 10)}%` }}
                                                />
                                            </div>
                                            <span className={`text-sm font-medium w-16 text-right ${shap.contribution > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                                {shap.contribution > 0 ? '+' : ''}{shap.contribution?.toFixed(1)}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Recommendations */}
                            <div className="bg-dark-800/50 border border-white/5 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">💡 Recommendations</h3>
                                <ul className="space-y-3">
                                    {prediction.recommendations?.map((rec, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <span className="text-primary-400 mt-0.5">•</span>
                                            <span className="text-gray-300">{rec}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <div className="h-96 flex flex-col items-center justify-center bg-dark-800/50 border border-white/5 rounded-2xl">
                            <div className="w-20 h-20 mb-6 rounded-full bg-dark-700 flex items-center justify-center">
                                <span className="text-4xl">📈</span>
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">No Prediction Yet</h3>
                            <p className="text-gray-400 text-center max-w-md">
                                {hasQuantityData
                                    ? 'Configure the parameters and click "Predict" to see cost overrun analysis.'
                                    : 'Complete the Quantity Takeoff module first to enable cost prediction.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CostPredictionView;

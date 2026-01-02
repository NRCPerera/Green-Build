/**
 * =============================================================================
 * DELAY FORECAST MODULE VIEW
 * =============================================================================
 * 
 * Module 4: Timeline & Delays
 * REQUIRES: Quantity data from Module 1
 */

import { useState } from 'react';
import useDelayController from '../../../controllers/useDelayController';

const DelayForecastView = () => {
    const [formValues, setFormValues] = useState({
        contractorGrade: 'B',
        plannedDurationMonths: 12,
        resourceAvailability: 80,
        permitStatus: 'Approved',
        siteAccessibility: 7,
    });

    const {
        loading,
        error,
        hasQuantityData,
        forecast,
        hasForecast,
        predictDelay,
        getProbabilityColor,
        getRiskLevel,
        formatDelay,
    } = useDelayController();

    const handleSubmit = async (e) => {
        e.preventDefault();
        await predictDelay(formValues);
    };

    return (
        <div className="space-y-6">
            {/* Module Header */}
            <div className="bg-gradient-to-r from-blue-500/10 to-transparent border border-blue-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-4">
                    <span className="text-4xl">⏱️</span>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Delay Forecast Module</h2>
                        <p className="text-gray-400 mt-1">
                            ML-powered delay prediction with scenario analysis.
                        </p>
                    </div>
                </div>
            </div>

            {/* Dependency Check */}
            {!hasQuantityData && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
                    <p className="text-yellow-400 font-medium">⚠️ Quantity Data Required</p>
                    <p className="text-gray-400 text-sm mt-1">Complete Module 1 first.</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Input Form */}
                <div className="lg:col-span-1">
                    <form onSubmit={handleSubmit} className="bg-dark-800/50 border border-white/5 rounded-2xl p-6 space-y-5">
                        <h3 className="text-lg font-semibold text-white">Forecast Parameters</h3>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Contractor Grade</label>
                            <select
                                value={formValues.contractorGrade}
                                onChange={(e) => setFormValues({ ...formValues, contractorGrade: e.target.value })}
                                disabled={!hasQuantityData}
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                         focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                                <option value="A">Grade A - 5% avg delay</option>
                                <option value="B">Grade B - 12% avg delay</option>
                                <option value="C">Grade C - 22% avg delay</option>
                                <option value="D">Grade D - 35% avg delay</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Planned Duration (months)</label>
                            <input
                                type="number"
                                value={formValues.plannedDurationMonths}
                                onChange={(e) => setFormValues({ ...formValues, plannedDurationMonths: parseInt(e.target.value) || 12 })}
                                min="1"
                                max="60"
                                disabled={!hasQuantityData}
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                         focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Resource Availability (%)</label>
                            <input
                                type="range"
                                value={formValues.resourceAvailability}
                                onChange={(e) => setFormValues({ ...formValues, resourceAvailability: parseInt(e.target.value) })}
                                min="0"
                                max="100"
                                disabled={!hasQuantityData}
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>0%</span>
                                <span className="text-blue-400 font-medium">{formValues.resourceAvailability}%</span>
                                <span>100%</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Permit Status</label>
                            <select
                                value={formValues.permitStatus}
                                onChange={(e) => setFormValues({ ...formValues, permitStatus: e.target.value })}
                                disabled={!hasQuantityData}
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                         focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                                <option value="Approved">Approved ✓</option>
                                <option value="Pending">Pending...</option>
                                <option value="Not Applied">Not Applied</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Site Accessibility (1-10)</label>
                            <input
                                type="range"
                                value={formValues.siteAccessibility}
                                onChange={(e) => setFormValues({ ...formValues, siteAccessibility: parseInt(e.target.value) })}
                                min="1"
                                max="10"
                                disabled={!hasQuantityData}
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>Poor</span>
                                <span className="text-blue-400 font-medium">{formValues.siteAccessibility}</span>
                                <span>Excellent</span>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !hasQuantityData}
                            className={`
                w-full px-6 py-3 rounded-xl font-semibold transition-all
                ${loading || !hasQuantityData
                                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-400 hover:to-cyan-400'
                                }
              `}
                        >
                            {loading ? 'Predicting...' : 'Forecast Delays'}
                        </button>
                    </form>
                </div>

                {/* Results */}
                <div className="lg:col-span-2">
                    {hasForecast ? (
                        <div className="space-y-6">
                            {/* Key Metrics */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-dark-800/50 border border-white/5 rounded-xl p-5 text-center">
                                    <p className="text-sm text-gray-400 mb-2">Delay Probability</p>
                                    <p className={`text-3xl font-bold ${getProbabilityColor(forecast.delayProbability)}`}>
                                        {(forecast.delayProbability * 100).toFixed(0)}%
                                    </p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full mt-2 inline-block
                    ${getRiskLevel(forecast.delayProbability) === 'High' ? 'bg-red-500/20 text-red-400' :
                                            getRiskLevel(forecast.delayProbability) === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                                'bg-green-500/20 text-green-400'}`}>
                                        {getRiskLevel(forecast.delayProbability)} Risk
                                    </span>
                                </div>
                                <div className="bg-dark-800/50 border border-white/5 rounded-xl p-5 text-center">
                                    <p className="text-sm text-gray-400 mb-2">Predicted Delay</p>
                                    <p className="text-3xl font-bold text-orange-400">{formatDelay(forecast.predictedDelayMonths)}</p>
                                </div>
                                <div className="bg-dark-800/50 border border-white/5 rounded-xl p-5 text-center">
                                    <p className="text-sm text-gray-400 mb-2">Completion Date</p>
                                    <p className="text-xl font-bold text-white">
                                        {new Date(forecast.predictedCompletionDate).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            {/* Scenario Analysis */}
                            <div className="bg-dark-800/50 border border-white/5 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">📊 Scenario Analysis</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
                                        <span className="text-xs text-green-400 font-medium">Best Case</span>
                                        <p className="text-xl font-bold text-green-400 mt-2">{formatDelay(forecast.scenarios.bestCase.delayMonths)}</p>
                                        <p className="text-xs text-gray-500">{(forecast.scenarios.bestCase.probability * 100).toFixed(0)}% chance</p>
                                    </div>
                                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-center">
                                        <span className="text-xs text-blue-400 font-medium">Most Likely</span>
                                        <p className="text-xl font-bold text-blue-400 mt-2">{formatDelay(forecast.scenarios.mostLikely.delayMonths)}</p>
                                        <p className="text-xs text-gray-500">{(forecast.scenarios.mostLikely.probability * 100).toFixed(0)}% chance</p>
                                    </div>
                                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
                                        <span className="text-xs text-red-400 font-medium">Worst Case</span>
                                        <p className="text-xl font-bold text-red-400 mt-2">{formatDelay(forecast.scenarios.worstCase.delayMonths)}</p>
                                        <p className="text-xs text-gray-500">{(forecast.scenarios.worstCase.probability * 100).toFixed(0)}% chance</p>
                                    </div>
                                </div>
                            </div>

                            {/* Delay Drivers */}
                            <div className="bg-dark-800/50 border border-white/5 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">⚡ Delay Drivers</h3>
                                <div className="space-y-3">
                                    {forecast.delayDrivers?.map((driver, index) => (
                                        <div key={index} className="flex items-center gap-4">
                                            <span className="w-40 text-sm text-gray-400">{driver.factor}</span>
                                            <div className="flex-1 h-3 bg-dark-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${driver.mitigatable ? 'bg-blue-500' : 'bg-gray-500'}`}
                                                    style={{ width: `${Math.min(100, driver.days * 3)}%` }}
                                                />
                                            </div>
                                            <span className="text-sm font-medium text-white w-16 text-right">{driver.days} days</span>
                                            {driver.mitigatable && (
                                                <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">Mitigatable</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-96 flex flex-col items-center justify-center bg-dark-800/50 border border-white/5 rounded-2xl">
                            <span className="text-5xl mb-6">📅</span>
                            <h3 className="text-xl font-semibold text-white mb-2">No Forecast Yet</h3>
                            <p className="text-gray-400 text-center max-w-md">
                                Configure parameters and run the forecast.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DelayForecastView;

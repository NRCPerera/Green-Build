/**
 * =============================================================================
 * SUSTAINABILITY MODULE VIEW
 * =============================================================================
 * 
 * Module 3: Lifecycle & Carbon Analysis
 * REQUIRES: Quantity data from Module 1
 */

import { useState } from 'react';
import useSustainabilityController from '../../../controllers/useSustainabilityController';

const SustainabilityView = () => {
    const [formValues, setFormValues] = useState({
        buildingLifespanYears: 50,
        energyEfficiencyRating: 'B',
        renewableEnergyPercentage: 20,
    });

    const {
        loading,
        error,
        hasQuantityData,
        quantityData,
        result,
        hasResult,
        materials,
        addMaterial,
        removeMaterial,
        calculateSustainability,
        formatCarbon,
        formatCurrency,
    } = useSustainabilityController();

    const handleAddMaterial = () => {
        addMaterial({
            type: 'Concrete',
            quantity: 1000,
            unit: 'kg',
            recycledContent: 0,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await calculateSustainability(formValues);
    };

    return (
        <div className="space-y-6">
            {/* Module Header */}
            <div className="bg-gradient-to-r from-green-500/10 to-transparent border border-green-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-4">
                    <span className="text-4xl">🌱</span>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Sustainability Analysis</h2>
                        <p className="text-gray-400 mt-1">
                            Lifecycle cost and carbon footprint analysis with Pareto optimization.
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
                                Please complete the Quantity Takeoff (Module 1) first.
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4">
                    <p className="text-primary-400">
                        Building area: {quantityData?.wallNetSurfaceAreaM2?.toFixed(1)} m²
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Input Form */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Materials */}
                    <div className="bg-dark-800/50 border border-white/5 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Materials</h3>
                            <button
                                onClick={handleAddMaterial}
                                disabled={!hasQuantityData}
                                className="px-3 py-1.5 bg-primary-500/20 text-primary-400 text-sm rounded-lg 
                         hover:bg-primary-500/30 transition-colors disabled:opacity-50"
                            >
                                + Add Material
                            </button>
                        </div>

                        {materials.length > 0 ? (
                            <div className="space-y-2">
                                {materials.map((material) => (
                                    <div key={material.id} className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg">
                                        <div>
                                            <p className="text-white text-sm">{material.type}</p>
                                            <p className="text-gray-500 text-xs">{material.quantity} {material.unit}</p>
                                        </div>
                                        <button
                                            onClick={() => removeMaterial(material.id)}
                                            className="text-red-400 hover:text-red-300 text-sm"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm text-center py-4">No materials added</p>
                        )}
                    </div>

                    {/* Parameters */}
                    <form onSubmit={handleSubmit} className="bg-dark-800/50 border border-white/5 rounded-2xl p-6 space-y-5">
                        <h3 className="text-lg font-semibold text-white">Parameters</h3>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Building Lifespan (years)
                            </label>
                            <input
                                type="number"
                                value={formValues.buildingLifespanYears}
                                onChange={(e) => setFormValues({ ...formValues, buildingLifespanYears: parseInt(e.target.value) || 50 })}
                                min="10"
                                max="100"
                                disabled={!hasQuantityData}
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                         focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Energy Efficiency Rating
                            </label>
                            <select
                                value={formValues.energyEfficiencyRating}
                                onChange={(e) => setFormValues({ ...formValues, energyEfficiencyRating: e.target.value })}
                                disabled={!hasQuantityData}
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                         focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                            >
                                <option value="A+">A+ (Highest)</option>
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                                <option value="D">D (Lowest)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Renewable Energy (%)
                            </label>
                            <input
                                type="range"
                                value={formValues.renewableEnergyPercentage}
                                onChange={(e) => setFormValues({ ...formValues, renewableEnergyPercentage: parseInt(e.target.value) })}
                                min="0"
                                max="100"
                                disabled={!hasQuantityData}
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>0%</span>
                                <span className="text-green-400 font-medium">{formValues.renewableEnergyPercentage}%</span>
                                <span>100%</span>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !hasQuantityData}
                            className={`
                w-full px-6 py-3 rounded-xl font-semibold transition-all duration-200
                ${loading || !hasQuantityData
                                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-400 hover:to-emerald-400'
                                }
              `}
                        >
                            {loading ? 'Calculating...' : 'Calculate Sustainability'}
                        </button>
                    </form>
                </div>

                {/* Results */}
                <div className="lg:col-span-2">
                    {hasResult ? (
                        <div className="space-y-6">
                            {/* Key Metrics */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-dark-800/50 border border-green-500/20 rounded-xl p-5 text-center">
                                    <p className="text-sm text-gray-400 mb-2">Lifecycle Cost</p>
                                    <p className="text-2xl font-bold text-green-400">{formatCurrency(result.lifecycleCost)}</p>
                                </div>
                                <div className="bg-dark-800/50 border border-blue-500/20 rounded-xl p-5 text-center">
                                    <p className="text-sm text-gray-400 mb-2">Carbon Footprint</p>
                                    <p className="text-2xl font-bold text-blue-400">{formatCarbon(result.carbonFootprint)}</p>
                                </div>
                                <div className="bg-dark-800/50 border border-yellow-500/20 rounded-xl p-5 text-center">
                                    <p className="text-sm text-gray-400 mb-2">Sustainability Score</p>
                                    <p className="text-2xl font-bold text-yellow-400">{result.sustainabilityScore}/100</p>
                                </div>
                            </div>

                            {/* Pareto Frontier */}
                            <div className="bg-dark-800/50 border border-white/5 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">📊 Pareto Frontier</h3>
                                <div className="space-y-3">
                                    {result.paretoFrontier?.map((point) => (
                                        <div key={point.id} className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg">
                                            <span className="text-white font-medium">{point.label}</span>
                                            <div className="flex gap-6">
                                                <span className="text-gray-400">{formatCurrency(point.cost)}</span>
                                                <span className="text-gray-400">{formatCarbon(point.carbon)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Recommendations */}
                            <div className="bg-dark-800/50 border border-white/5 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">💡 Recommendations</h3>
                                <ul className="space-y-3">
                                    {result.recommendations?.map((rec, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <span className="text-green-400 mt-0.5">•</span>
                                            <span className="text-gray-300">{rec}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <div className="h-96 flex flex-col items-center justify-center bg-dark-800/50 border border-white/5 rounded-2xl">
                            <div className="w-20 h-20 mb-6 rounded-full bg-dark-700 flex items-center justify-center">
                                <span className="text-4xl">🌍</span>
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">No Analysis Yet</h3>
                            <p className="text-gray-400 text-center max-w-md">
                                Add materials and configure parameters to see sustainability analysis.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SustainabilityView;

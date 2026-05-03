import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import CostImpactCard from './CostImpactCard';
import DonutChart from './charts/DonutChart';
import RadarChart from './charts/RadarChart';
import CostDistributionChart from './charts/CostDistributionChart';
import RiskLineChart from './charts/RiskLineChart';
import { formatCurrency } from '../utils/projectUtils';
import { getOptimalValue, OPTIMAL_VALUES } from '../utils/formUtils';

const SavePredictionBar = ({ project, projectId, formValues, predictionData, savingPrediction, onSave, isMonteCarlo, monteCarloResult }) => {
    const [scenarioName, setScenarioName] = useState('');

    const handleSave = async () => {
        try {
            if (!projectId) {
                alert('❌ Error: No project selected.');
                return;
            }

            if (!predictionData && !monteCarloResult) {
                alert('❌ Error: No prediction available to save.');
                return;
            }

            const timestamp = new Date().toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            const finalScenarioName = scenarioName.trim() || `${isMonteCarlo ? 'Simulation' : 'Prediction'} - ${timestamp}`;

            let saveData;
            if (isMonteCarlo && monteCarloResult) {
                const isMCHighRisk = (monteCarloResult.prediction_summary?.risk_level || '').includes('High');
                saveData = {
                    scenarioName: finalScenarioName,
                    notes: `Monte Carlo (${monteCarloResult.num_successful_simulations} sims), ${isMCHighRisk ? 'HIGH' : 'LOW'} Risk, ${monteCarloResult.mean}% Expected Overrun`,
                    tags: ['monte-carlo', isMCHighRisk ? 'high-risk' : 'low-risk']
                };
            } else {
                const isHighRisk = predictionData?.predicted_high_risk_class === true || predictionData?.predicted_high_risk_class === 1;
                saveData = {
                    scenarioName: finalScenarioName,
                    notes: `${isHighRisk ? 'HIGH' : 'LOW'} Risk, ${predictionData?.predicted_cost_overrun_pct?.toFixed(1)}% Overrun`,
                    tags: [isHighRisk ? 'high-risk' : 'low-risk']
                };
            }

            const result = await onSave(projectId, formValues, saveData, isMonteCarlo ? monteCarloResult : undefined);

            if (result.success) {
                alert('✅ Saved successfully!');
                setScenarioName('');
            } else {
                alert(`❌ Failed to save: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('❌ Save error:', error);
            alert(`❌ Error saving: ${error.message || 'Unknown error'}`);
        }
    };

    if (!project) return null;

    const colorScheme = isMonteCarlo
        ? { gradient: 'from-emerald-600/20 via-teal-500/15 to-cyan-500/20', border: 'border-emerald-500/30', bg: 'bg-emerald-500/20', icon: 'text-emerald-400', text: 'text-emerald-200/70', ring: 'focus:ring-emerald-500', button: 'from-emerald-500 to-teal-600 hover:shadow-emerald-500/25' }
        : { gradient: 'from-green-600/20 via-emerald-500/15 to-teal-500/20', border: 'border-green-500/30', bg: 'bg-green-500/20', icon: 'text-green-400', text: 'text-green-200/70', ring: 'focus:ring-green-500', button: 'from-green-500 to-emerald-600 hover:shadow-green-500/25' };

    return (
        <div className={`bg-gradient-to-r ${colorScheme.gradient} ${colorScheme.border} border rounded-xl p-4`}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${colorScheme.bg} flex items-center justify-center`}>
                        <svg className={`w-5 h-5 ${colorScheme.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-white">Save This {isMonteCarlo ? 'Simulation Scenario' : 'Prediction'}</h4>
                        <p className={`text-xs ${colorScheme.text}`}>{isMonteCarlo ? 'Store Monte Carlo results for historical tracking' : 'Store for historical tracking and scenario comparison'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
                    <input
                        type="text"
                        value={scenarioName}
                        onChange={(e) => setScenarioName(e.target.value)}
                        className={`px-3 py-2 bg-dark-700/80 border border-white/10 rounded-lg text-sm text-white focus:outline-none ${colorScheme.ring} w-full md:w-64`}
                        placeholder={`Scenario Name (e.g., ${isMonteCarlo ? 'Worst Case Inflation' : 'Best Case Design'})`}
                    />
                    <button
                        onClick={handleSave}
                        disabled={savingPrediction}
                        className={`px-5 py-2.5 bg-gradient-to-r ${colorScheme.button} text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap`}
                    >
                        {savingPrediction ? (
                            <>
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Saving...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                </svg>
                                Save
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

const PredictionResults = ({ prediction, formValues, projectId, savePrediction, savingPrediction, onClearPrediction }) => {
    const riskFlag = prediction?.predicted_high_risk_class;
    const isHighRisk = riskFlag === true || riskFlag === 1;
    const overrunPct = prediction?.predicted_cost_overrun_pct;
    const probabilityValue = prediction?.predicted_high_risk_probability ?? null;
    const hasProbability = typeof probabilityValue === 'number';
    const topRiskFactors = Array.isArray(prediction?.top_risk_factors) ? prediction.top_risk_factors : [];
    const initialBudget = Number(formValues.Initial_Value) || 0;
    const projectedFinalCost = initialBudget > 0 && overrunPct != null
        ? initialBudget * (1 + Number(overrunPct) / 100)
        : null;
    const projectedOverrunAmount = projectedFinalCost != null ? projectedFinalCost - initialBudget : null;

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/90 via-slate-900/90 to-slate-800/90 p-6 shadow-xl shadow-black/20">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-6 border-b border-white/5 pb-6">
                    <div>
                        <h3 className="text-2xl font-bold text-white flex items-center gap-2">Cost Overrun Prediction</h3>
                        <p className="text-sm text-slate-400 mt-2 max-w-3xl leading-relaxed">
                            This prediction considers your project characteristics, contractor experience, and current economic indicators. The model estimates a {isHighRisk ? 'severe warning' : 'healthy outlook'} regarding cost escalation.
                        </p>
                        <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Generated: {new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-xs font-semibold text-emerald-300">ML-Validated</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
                    <div>
                        <p className="text-sm font-medium text-gray-400 mb-1">Expected Overrun</p>
                        <p className="text-3xl font-bold text-white">{overrunPct != null ? `${overrunPct.toFixed(2)}%` : 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-400 mb-1">Overrun Probability</p>
                        <p className="text-xl font-bold text-white mt-1">{hasProbability ? `${(probabilityValue * 100).toFixed(1)}%` : 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-400 mb-1">Risk Level</p>
                        <div className="mt-1 inline-flex items-center">
                            <span className={`px-4 py-1.5 rounded-lg text-sm font-bold border ${isHighRisk ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-green-500/20 text-green-400 border-green-500/30'}`}>
                                {prediction?.risk_label || (isHighRisk ? 'High Risk' : 'Low Risk')}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <SavePredictionBar
                project={{}}
                projectId={projectId}
                formValues={formValues}
                predictionData={prediction}
                savingPrediction={savingPrediction}
                onSave={savePrediction}
                isMonteCarlo={false}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-xl border border-blue-500/20 bg-gradient-to-b from-blue-500/10 to-transparent">
                    <h4 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-2">Initial Budget</h4>
                    <p className="text-lg font-medium text-white">{initialBudget > 0 ? `LKR ${formatCurrency(initialBudget / 1000000)}M` : 'N/A'}</p>
                    {initialBudget > 0 && <p className="text-xs text-slate-400 mt-1">LKR {formatCurrency(initialBudget, 0)}</p>}
                </div>
                <div className="p-5 rounded-xl border border-amber-500/20 bg-gradient-to-b from-amber-500/10 to-transparent">
                    <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-2">Predicted Final Cost</h4>
                    <p className="text-lg font-medium text-white">{projectedFinalCost != null ? `LKR ${formatCurrency(projectedFinalCost / 1000000)}M` : 'N/A'}</p>
                    {projectedFinalCost != null && <p className="text-xs text-slate-400 mt-1">LKR {formatCurrency(projectedFinalCost, 0)}</p>}
                </div>
                <div className="p-5 rounded-xl border border-red-500/20 bg-gradient-to-b from-red-500/10 to-transparent">
                    <h4 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-2">Projected Overrun Amount</h4>
                    <p className="text-lg font-medium text-white">{projectedOverrunAmount != null ? `LKR ${formatCurrency(projectedOverrunAmount / 1000000)}M` : 'N/A'}</p>
                    {projectedOverrunAmount != null && <p className="text-xs text-slate-400 mt-1">LKR {formatCurrency(projectedOverrunAmount, 0)}</p>}
                </div>
            </div>

            <div className="p-5 rounded-xl border border-white/5 bg-dark-800/80">
                <h4 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">Key Factors Influencing This Prediction</h4>
                <div className="flex flex-wrap gap-2">
                    {topRiskFactors.slice(0, 3).map((factor, idx) => (
                        <span key={idx} className="px-3 py-1.5 rounded-lg bg-dark-700/80 border border-white/10 text-sm font-medium text-gray-200 flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${idx === 0 ? 'bg-red-400' : idx === 1 ? 'bg-orange-400' : 'bg-blue-400'}`}></span>
                            {factor.feature.replace(/_/g, ' ')}
                        </span>
                    ))}
                    {topRiskFactors.length === 0 && <span className="text-sm text-gray-500 italic">Drivers calculation not returned from model.</span>}
                </div>
            </div>

            {topRiskFactors.length > 0 && <DonutChart topRiskFactors={topRiskFactors} />}
            {topRiskFactors.length > 0 && <RadarChart topRiskFactors={topRiskFactors} />}
            {projectedFinalCost != null && <CostDistributionChart projectedFinalCost={projectedFinalCost} initialBudget={initialBudget} overrunPct={overrunPct} />}
            {topRiskFactors.length > 0 && <RiskLineChart topRiskFactors={topRiskFactors} />}

            {topRiskFactors.length > 0 && (
                <div className="bg-dark-800/70 border border-green-500/20 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                        <span className="text-green-400">🎯</span>
                        Low Risk Target Parameters
                    </h3>
                    <p className="text-sm text-gray-400 mb-4">Adjust these high-impact parameters to reduce your cost overrun risk</p>
                    <div className="space-y-3">
                        {topRiskFactors.slice(0, 5).map((factor, idx) => {
                            const featureName = factor.feature;
                            const currentValue = formValues[featureName];
                            const optimal = getOptimalValue(featureName, currentValue, OPTIMAL_VALUES);
                            if (!optimal) return null;
                            const isNumeric = typeof currentValue === 'number';
                            const needsImprovement = optimal.direction !== 'optimal';
                            return (
                                <div key={`optimal-${idx}`} className="p-4 bg-dark-700/50 rounded-lg border border-green-500/10">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-green-300 mb-1">{featureName.replace(/_/g, ' ')}</h4>
                                            <p className="text-xs text-gray-400">{optimal.description}</p>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded ${needsImprovement ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' : 'bg-green-500/20 text-green-300 border border-green-500/40'}`}>
                                            {(Number(factor.impact) || 0).toFixed(4)} impact
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mt-3">
                                        <div className="p-2 bg-dark-800/50 rounded border border-red-500/20">
                                            <p className="text-xs text-gray-400 mb-1">Current Value</p>
                                            <p className="text-sm font-bold text-red-300">{isNumeric ? Number(currentValue).toFixed(1) : currentValue || 'N/A'}</p>
                                        </div>
                                        <div className="p-2 bg-dark-800/50 rounded border border-green-500/20">
                                            <p className="text-xs text-gray-400 mb-1">Target (Low Risk)</p>
                                            <p className="text-sm font-bold text-green-300">{optimal.target}</p>
                                        </div>
                                    </div>
                                    {needsImprovement && (
                                        <div className="mt-2 flex items-center gap-2 text-xs">
                                            <span className={`px-2 py-1 rounded ${optimal.direction === 'increase' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'}`}>
                                                {optimal.direction === 'increase' ? '↑ Increase' : '↓ Decrease'}
                                            </span>
                                            <span className="text-gray-400">Est. risk reduction: <span className="text-green-400 font-semibold">-{optimal.riskReduction}%</span></span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <p className="text-xs text-green-300">💡 <span className="font-semibold">Pro Tip:</span> Implementing these optimizations could potentially reduce your cost overrun risk by <span className="font-bold"> 15-30%</span>, depending on how many factors you improve.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button onClick={onClearPrediction} className="px-6 py-3 rounded-xl font-semibold bg-dark-700 border border-white/10 text-gray-300 hover:border-white/20 transition-all">Clear Prediction</button>
                <button onClick={() => window.location.reload()} className="px-6 py-3 rounded-xl font-semibold bg-dark-700 border border-white/10 text-gray-300 hover:border-white/20 transition-all">Reset Form</button>
            </div>
        </div>
    );
};

const MonteCarloResults = ({ monteCarloResult, formValues, projectId, savePrediction, savingPrediction }) => {
    const histogramChartData = monteCarloResult?.histogram?.counts?.map((count, i) => {
        const start = Number(monteCarloResult.histogram.bins?.[i]);
        const end = Number(monteCarloResult.histogram.bins?.[i + 1]);
        const fallbackEnd = Number.isFinite(start) ? start + 0.1 : null;
        const safeEnd = Number.isFinite(end) ? end : fallbackEnd;

        return {
            count,
            val: start,
            binLabel: Number.isFinite(start) ? start.toFixed(2) : '-',
            binRange: Number.isFinite(start) && Number.isFinite(safeEnd)
                ? `${start.toFixed(2)}% - ${safeEnd.toFixed(2)}%`
                : 'N/A'
        };
    }) || [];

    return (
        <div className="space-y-4 mb-8">
            <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/90 via-slate-900/90 to-slate-800/90 p-6 shadow-xl shadow-black/20">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-6 border-b border-white/5 pb-6">
                    <div>
                        <h3 className="text-2xl font-bold text-white flex items-center gap-2">Cost Overrun Prediction</h3>
                        <p className="text-sm text-slate-400 mt-2 max-w-3xl leading-relaxed">
                            {monteCarloResult.explanation || `Based on the current project parameters and economic conditions, the system predicts a probabilistic boundary for cost implications.`}
                        </p>
                    </div>
                    <div className="text-right">
                        <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-600">
                            {monteCarloResult.num_successful_simulations} Iterations Simulated
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
                    <div>
                        <p className="text-sm font-medium text-gray-400 mb-1">Expected Overrun</p>
                        <p className="text-3xl font-bold text-white">{monteCarloResult.prediction_summary?.expected_overrun || `${monteCarloResult.mean}%`}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-400 mb-1">Confidence Range (90%)</p>
                        <p className="text-xl font-bold text-white mt-1">{monteCarloResult.prediction_summary?.confidence_range || `${monteCarloResult.confidence_interval[0]}% – ${monteCarloResult.confidence_interval[1]}%`}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-400 mb-1">Risk Level</p>
                        <div className="mt-1 inline-flex items-center">
                            <span className={`px-4 py-1.5 rounded-lg text-sm font-bold border ${(monteCarloResult.prediction_summary?.risk_level || '').includes('High') ? 'bg-red-500/20 text-red-400 border-red-500/30' : (monteCarloResult.prediction_summary?.risk_level || '').includes('Moderate') ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                                {monteCarloResult.prediction_summary?.risk_level || 'Evaluated'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {monteCarloResult.cost_summary && (
                <CostImpactCard
                    costSummary={monteCarloResult.cost_summary}
                    riskLevel={monteCarloResult.prediction_summary?.risk_level}
                    formInitialValue={Number(formValues.Initial_Value) || 0}
                />
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-xl border border-green-500/20 bg-gradient-to-b from-green-500/10 to-transparent">
                    <h4 className="text-sm font-bold text-green-400 uppercase tracking-wider mb-2">Best Case</h4>
                    <p className="text-lg font-medium text-white">{monteCarloResult.scenario_analysis?.best_case || `Cost overrun could be as low as ${monteCarloResult.p10}%`}</p>
                </div>
                <div className="p-5 rounded-xl border border-blue-500/20 bg-gradient-to-b from-blue-500/10 to-transparent">
                    <h4 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-2">Most Likely</h4>
                    <p className="text-lg font-medium text-white">{monteCarloResult.scenario_analysis?.most_likely || `Expected cost overrun around ${monteCarloResult.mean}%`}</p>
                </div>
                <div className="p-5 rounded-xl border border-red-500/20 bg-gradient-to-b from-red-500/10 to-transparent">
                    <h4 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-2">Worst Case</h4>
                    <p className="text-lg font-medium text-white">{monteCarloResult.scenario_analysis?.worst_case || `Cost overrun could reach up to ${monteCarloResult.p90}%`}</p>
                </div>
            </div>

            <div className="p-5 rounded-xl border border-white/5 bg-dark-800/80">
                <h4 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">Key Factors Influencing This Prediction</h4>
                <div className="flex flex-wrap gap-2">
                    {(monteCarloResult.risk_drivers || Object.keys(monteCarloResult.sensitivities).slice(0, 3)).map((driver, idx) => (
                        <span key={idx} className="px-3 py-1.5 rounded-lg bg-dark-700/80 border border-white/10 text-sm font-medium text-gray-200 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                            {driver.replace(/_/g, ' ')}
                        </span>
                    ))}
                </div>
            </div>

            <div className="p-5 rounded-xl border border-white/5 bg-dark-800/80">
                <h4 className="text-sm font-semibold text-gray-300 mb-6 uppercase tracking-wider">Distribution of Predicted Outcomes</h4>
                <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={histogramChartData} margin={{ top: 20, right: 30, left: 0, bottom: 12 }}>
                            <XAxis dataKey="binLabel" interval="preserveStartEnd" minTickGap={32} tickFormatter={(v) => v} stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: '#334155' }} />
                            <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: '#334155' }} />
                            <RechartsTooltip
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                                itemStyle={{ color: '#60a5fa' }}
                                formatter={(val) => [val, 'Simulations']}
                                labelFormatter={(_, payload) => {
                                    const range = payload?.[0]?.payload?.binRange;
                                    return `Overrun Range: ${range || 'N/A'}`;
                                }}
                                cursor={{ fill: '#334155', opacity: 0.4 }}
                            />
                            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <ReferenceLine x={`${Number(monteCarloResult.p50).toFixed(2)}`} stroke="#60a5fa" strokeDasharray="3 3" label={{ position: 'top', value: `Expected (P50)`, fill: '#93c5fd', fontSize: 11 }} />
                            <ReferenceLine x={`${Number(monteCarloResult.p90).toFixed(2)}`} stroke="#f87171" strokeDasharray="3 3" label={{ position: 'top', value: `Worst Case (P90)`, fill: '#fca5a5', fontSize: 11 }} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 flex justify-between text-xs text-slate-500 pt-3 border-t border-slate-700/50">
                    <span>← Lower Cost Overrun</span>
                    <span>Higher Cost Overrun →</span>
                </div>
            </div>

            {monteCarloResult.recommendations && monteCarloResult.recommendations.length > 0 && (
                <div className="p-5 rounded-xl border border-white/5 bg-dark-800/80">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">
                        <span>📋</span> Recommended Actions
                    </h4>
                    <ul className="space-y-3">
                        {monteCarloResult.recommendations.map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-3 bg-dark-700/50 p-3 rounded-lg border border-white/5">
                                <div className="mt-0.5 text-blue-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <p className="text-sm text-gray-300 leading-relaxed">{rec}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <SavePredictionBar
                project={{}}
                projectId={projectId}
                formValues={formValues}
                predictionData={null}
                savingPrediction={savingPrediction}
                onSave={savePrediction}
                isMonteCarlo={true}
                monteCarloResult={monteCarloResult}
            />
        </div>
    );
};

export { PredictionResults, MonteCarloResults };

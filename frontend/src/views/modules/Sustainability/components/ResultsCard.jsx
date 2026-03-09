import React, { useState, useMemo } from 'react';
import { Tooltip, Switch, Alert, Slider, Button } from 'antd';
import { InfoCircleOutlined, SafetyCertificateFilled, RobotOutlined, DownloadOutlined } from '@ant-design/icons';
import LccHeatmapTower from './LccHeatmapTower';

const ResultsCard = ({ result, formatCurrency, formatCarbon, inputs }) => {
    // Toggles
    const [compareMode, setCompareMode] = useState(true);

    if (!result) return null;

    const currentScore = result.sustainabilityScore;
    const isOptimal = currentScore >= 80;

    // AI Optimization data derived from pareto frontier
    const optimalPoint = result.aiOptimization;
    const greenPoint = result.paretoFrontier?.find(p => p.name === 'Green') || result.paretoFrontier?.[2];

    // Get Base vs Optimized metrics
    const baseLcc = result.lifecycleCost || 0;
    const baseCo2 = result.carbonFootprint || 0;

    const optLcc = optimalPoint ? optimalPoint.optimizedLccLkr : baseLcc;
    const optCo2 = greenPoint ? greenPoint.carbon : baseCo2;

    const savedLkr = baseLcc - optLcc;
    const savedCo2 = baseCo2 - optCo2;

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-emerald-400';
        if (score >= 60) return 'text-blue-400';
        if (score >= 40) return 'text-yellow-400';
        return 'text-red-400';
    };

    return (
        <div className="bg-dark-800/50 border border-white/5 rounded-2xl overflow-hidden">
            {/* ── HEADER ── */}
            <div className="bg-dark-900/50 px-6 py-5 border-b border-white/5 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        📊 Intelligence Report
                        {isOptimal && (
                            <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full border border-emerald-500/30 flex items-center gap-1">
                                <SafetyCertificateFilled /> Platinum Standard
                            </span>
                        )}
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                        Comparative analysis of your current design vs AI-Optimized alternatives
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-dark-800 p-2 rounded-xl border border-white/5 shadow-inner">
                    <span className={`text-sm font-semibold transition-colors ${!compareMode ? 'text-white' : 'text-gray-500'}`}>Current Only</span>
                    <Switch
                        checked={compareMode}
                        onChange={setCompareMode}
                        className={compareMode ? 'bg-indigo-500' : 'bg-gray-600'}
                    />
                    <span className={`text-sm font-semibold flex items-center gap-1 transition-colors ${compareMode ? 'text-indigo-400' : 'text-gray-500'}`}>
                        <RobotOutlined /> AI Compare
                    </span>
                </div>
            </div>


            <div className="p-6 grid grid-cols-1 gap-8">
                {/* ── METRICS OVERVIEW & HEATMAP ── */}
                <div className="space-y-6">
                    {/* Score Ring */}
                    <div className="flex items-center gap-6 p-5 bg-dark-800 border border-white/5 rounded-2xl shadow-lg relative overflow-hidden">
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>

                        <div className="relative w-28 h-28 flex-shrink-0">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="56" cy="56" r="48" fill="none" className="stroke-dark-600" strokeWidth="8" />
                                <circle
                                    cx="56"
                                    cy="56"
                                    r="48"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    strokeDasharray={`${(currentScore / 100) * 301.59} 301.59`}
                                    className={`${getScoreColor(currentScore)} drop-shadow-lg transition-all duration-1000 ease-out`}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={`text-3xl font-black ${getScoreColor(currentScore)}`}>{Math.round(currentScore)}</span>
                                <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Score</span>
                            </div>
                        </div>

                        <div className="flex-grow z-10">
                            <h3 className="text-white font-bold text-lg">Overall Sustainability</h3>
                            <p className="text-gray-400 text-sm mt-1 leading-relaxed">
                                {currentScore >= 80 ? 'Excellent performance. Highly likely to receive Platinum Green Building Certification.' :
                                    currentScore >= 60 ? 'Good performance. Consider AI recommendations to reach Platinum tier.' :
                                        'Below standard. High long-term costs and environmental impact identified.'}
                            </p>
                        </div>
                    </div>

                    {/* Financial & Environmental split */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Financial Box */}
                        <div className={`p-5 rounded-2xl border transition-all duration-500 ${compareMode ? 'bg-dark-800 border-indigo-500/30' : 'bg-dark-800/50 border-white/5'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Lifecycle Cost</h4>
                                <Tooltip title="Total projected cost over 50 years including initial construction and maintenance">
                                    <InfoCircleOutlined className="text-gray-600 cursor-help" />
                                </Tooltip>
                            </div>

                            {/* Current Value */}
                            <div className="mb-3">
                                <span className="text-sm text-gray-400 mr-2">Current:</span>
                                <span className="text-xl font-bold text-white">
                                    {formatCurrency ? formatCurrency(baseLcc) : `Rs. ${baseLcc.toLocaleString()}`}
                                </span>
                            </div>

                            {/* AI Optimized Value */}
                            {compareMode && (
                                <div className="border-t border-white/10 pt-3 relative">
                                    <span className="text-sm font-semibold text-indigo-400 flex items-center gap-1 mb-1">
                                        <RobotOutlined /> AI Optimal
                                    </span>
                                    <span className="text-xl font-bold text-indigo-300">
                                        {formatCurrency ? formatCurrency(optLcc) : `Rs. ${optLcc.toLocaleString()}`}
                                    </span>
                                    {savedLkr > 0 && (
                                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] rounded-md font-bold uppercase tracking-wider">
                                            Save {formatCurrency ? formatCurrency(savedLkr) : `Rs. ${savedLkr.toLocaleString()}`}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Environmental Box */}
                        <div className={`p-5 rounded-2xl border transition-all duration-500 ${compareMode ? 'bg-dark-800 border-emerald-500/30' : 'bg-dark-800/50 border-white/5'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Carbon Footprint</h4>
                                <Tooltip title="Combined embodied carbon of materials and 50-year operational CO2 emissions.">
                                    <InfoCircleOutlined className="text-gray-600 cursor-help" />
                                </Tooltip>
                            </div>

                            <div className="mb-3">
                                <span className="text-sm text-gray-400 mr-2">Current:</span>
                                <span className="text-xl font-bold text-white">
                                    {formatCarbon ? formatCarbon(baseCo2) : `${baseCo2} kg CO2`}
                                </span>
                            </div>

                            {compareMode && (
                                <div className="border-t border-white/10 pt-3 relative">
                                    <span className="text-sm font-semibold text-emerald-400 flex items-center gap-1 mb-1">
                                        <RobotOutlined /> AI Optimal
                                    </span>
                                    <span className="text-xl font-bold text-emerald-300">
                                        {formatCarbon ? formatCarbon(optCo2) : `${optCo2} kg CO2`}
                                    </span>
                                    {savedCo2 > 0 && (
                                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] rounded-md font-bold uppercase tracking-wider">
                                            Reduce {formatCarbon ? formatCarbon(savedCo2) : `${savedCo2} kg CO2`}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {compareMode && optimalPoint && (
                        <Alert
                            message="Optimal Configuration Found"
                            description={<span className="text-sm">Switching primary material to <strong className="text-indigo-400">{optimalPoint.recommendedMaterial}</strong> achieves a better balance between cost and sustainability.</span>}
                            type="info"
                            showIcon
                            className="bg-indigo-500/10 border-indigo-500/30 text-indigo-300 rounded-xl"
                            icon={<RobotOutlined className="text-indigo-400 text-lg" />}
                        />
                    )}

                    {/* ── FULL WIDTH HEATMAP (Below Metrics) ── */}
                    <div className="relative mt-4">
                        <LccHeatmapTower
                            cidaBoq={result.cidaBoq || []}
                            optBoq={compareMode ? (optimalPoint?.optimizedCidaBoq || result.cidaBoq || []) : null}
                            savedLkr={compareMode ? savedLkr : 0}
                            savingsPct={compareMode && savedLkr > 0 ? ((savedLkr / baseLcc) * 100).toFixed(1) : 0}
                            formatCurrency={formatCurrency}
                            primaryMaterial={inputs.primaryMaterial}
                            aiData={{ recommendedMaterial: optimalPoint?.recommendedMaterial || 'Unknown' }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResultsCard;

import React from 'react';
import {
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ZAxis
} from 'recharts';

const ParetoChart = ({ paretoFrontier, formatCurrency, formatCarbon }) => {
    if (!paretoFrontier || paretoFrontier.length === 0) return null;

    // The backend provides a list of points. We want to highlight the 'optimal' point
    // which is already marked as `is_optimal: true` in the backend response.
    const data = paretoFrontier;

    // Custom tooltip for the scatter plot
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-dark-800 border border-white/10 p-4 rounded-xl shadow-xl">
                    <p className="text-white font-semibold mb-2">{data.name}</p>
                    <div className="space-y-1 text-sm">
                        <p className="text-gray-300">
                            <span className="text-gray-500 w-24 inline-block">Cost:</span>
                            <span className="text-blue-400 font-mono">{formatCurrency ? formatCurrency(data.cost) : `Rs. ${data.cost.toLocaleString()}`}</span>
                        </p>
                        <p className="text-gray-300">
                            <span className="text-gray-500 w-24 inline-block">Carbon:</span>
                            <span className="text-orange-400 font-mono">{formatCarbon ? formatCarbon(data.carbon) : `${data.carbon} kg`}</span>
                        </p>
                        {data.name === 'Green' && (
                            <div className="mt-2 pt-2 border-t border-white/10 text-emerald-400 text-xs font-semibold flex items-center gap-1">
                                <span>⭐</span> Recommended Optimal Trade-off
                            </div>
                        )}
                        {data.name === 'Balanced' && (
                            <div className="mt-2 pt-2 border-t border-white/10 text-blue-400 text-xs font-semibold flex items-center gap-1">
                                <span>📍</span> Current Project Scope
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-dark-800/50 border border-white/5 rounded-2xl p-6">
            <div className="mb-6 flex items-start justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        ⚖️ Pareto Optimization Curve
                    </h3>
                    <p className="text-gray-400 text-sm mt-1">
                        Trade-off analysis between <span className="text-blue-400 font-medium">Lifecycle Cost</span> and
                        <span className="text-orange-400 font-medium"> Carbon Footprint</span> across alternative designs.
                    </p>
                </div>

                <div className="flex flex-col gap-2 text-xs">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-400" />
                        <span className="text-gray-300">AI Optimal</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-blue-500 border-2 border-dark-800" />
                        <span className="text-gray-300">Current Scenario</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-dark-600 border border-white/20" />
                        <span className="text-gray-300">Alternatives</span>
                    </div>
                </div>
            </div>

            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                            type="number"
                            dataKey="carbon"
                            name="Carbon"
                            domain={['dataMin - 10', 'dataMax + 10']}
                            tickFormatter={(val) => `${val.toFixed(1)}t`}
                            stroke="#6b7280"
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            type="number"
                            dataKey="cost"
                            name="Cost"
                            domain={['dataMin * 0.9', 'dataMax * 1.1']}
                            tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`}
                            stroke="#6b7280"
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <ZAxis type="number" range={[60, 200]} />
                        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }} />
                        <Scatter data={data}>
                            {data.map((entry, index) => {
                                let fillColor = '#475569'; // default slate for alternatives
                                let strokeColor = 'rgba(255,255,255,0.1)';
                                let strokeWidth = 1;

                                if (entry.name === 'Green') {
                                    fillColor = '#34d399'; // emerald-400
                                    strokeColor = '#059669';
                                    strokeWidth = 2;
                                } else if (entry.name === 'Balanced') {
                                    fillColor = '#3b82f6'; // blue-500
                                    strokeColor = '#1e3a8a';
                                    strokeWidth = 2;
                                }

                                return (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={fillColor}
                                        stroke={strokeColor}
                                        strokeWidth={strokeWidth}
                                    />
                                );
                            })}
                        </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ParetoChart;

import { useMemo } from 'react';

const RadarChart = ({ topRiskFactors }) => {
    const { parameters, centerX, centerY, maxRadius, angleStep } = useMemo(() => {
        const params = topRiskFactors.slice(0, 6);
        const maxImpact = params.length > 0
            ? Math.max(...params.map(item => Number(item.impact) || 0), 0.0001)
            : 1;
        return { parameters: params.map(p => ({ ...p, normalizedImpact: Math.min((Number(p.impact) || 0) / maxImpact, 1) })), centerX: 250, centerY: 200, maxRadius: 150, angleStep: (2 * Math.PI) / params.length };
    }, [topRiskFactors]);

    if (parameters.length === 0) return null;

    return (
        <div className="bg-dark-800/70 border border-white/5 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-cyan-400">⚡</span>
                Parameter Risk Radar
            </h3>
            <div className="w-full flex items-center justify-center">
                <svg width="100%" height="400" viewBox="0 0 500 400" className="max-w-lg">
                    <defs>
                        <radialGradient id="radarGradient">
                            <stop offset="0%" style={{ stopColor: '#06b6d4', stopOpacity: 0.3 }} />
                            <stop offset="100%" style={{ stopColor: '#0891b2', stopOpacity: 0.1 }} />
                        </radialGradient>
                    </defs>

                    {[0.2, 0.4, 0.6, 0.8, 1.0].map((scale, idx) => (
                        <circle
                            key={`circle-${idx}`}
                            cx={centerX}
                            cy={centerY}
                            r={maxRadius * scale}
                            fill="none"
                            stroke="#ffffff10"
                            strokeWidth="1"
                        />
                    ))}

                    {parameters.map((param, idx) => {
                        const angle = -Math.PI / 2 + idx * angleStep;
                        return (
                            <line
                                key={`line-${idx}`}
                                x1={centerX}
                                y1={centerY}
                                x2={centerX + maxRadius * Math.cos(angle)}
                                y2={centerY + maxRadius * Math.sin(angle)}
                                stroke="#ffffff15"
                                strokeWidth="1"
                            />
                        );
                    })}

                    <polygon
                        points={parameters.map((param, idx) => {
                            const angle = -Math.PI / 2 + idx * angleStep;
                            const r = maxRadius * param.normalizedImpact;
                            return `${centerX + r * Math.cos(angle)},${centerY + r * Math.sin(angle)}`;
                        }).join(' ')}
                        fill="url(#radarGradient)"
                        stroke="#06b6d4"
                        strokeWidth="3"
                        strokeLinejoin="round"
                    />

                    {parameters.map((param, idx) => {
                        const angle = -Math.PI / 2 + idx * angleStep;
                        const r = maxRadius * param.normalizedImpact;
                        const x = centerX + r * Math.cos(angle);
                        const y = centerY + r * Math.sin(angle);
                        const labelR = maxRadius + 40;
                        const labelX = centerX + labelR * Math.cos(angle);
                        const labelY = centerY + labelR * Math.sin(angle);

                        return (
                            <g key={`point-${idx}`}>
                                <circle cx={x} cy={y} r="6" fill="#06b6d4" stroke="#fff" strokeWidth="2" />
                                <text x={labelX} y={labelY} textAnchor="middle" fontSize="11" fontWeight="600" fill="#9ca3af">
                                    {param.feature.replace(/_/g, ' ').substring(0, 15)}
                                </text>
                                <text x={labelX} y={labelY + 12} textAnchor="middle" fontSize="10" fill="#06b6d4">
                                    {(param.normalizedImpact * 100).toFixed(0)}%
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
            <p className="text-xs text-center text-gray-400 mt-2">
                Normalized impact scores across top {parameters.length} risk parameters
            </p>
        </div>
    );
};

export default RadarChart;

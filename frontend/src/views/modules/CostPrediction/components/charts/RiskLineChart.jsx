import { useMemo } from 'react';

const RiskLineChart = ({ topRiskFactors }) => {
    const { maxImpact, points } = useMemo(() => {
        const factors = topRiskFactors.slice(0, 10);
        const max = factors.length > 0
            ? Math.max(...factors.map(item => Number(item.impact) || 0), 0.0001)
            : 1;

        const pts = factors.map((item, idx) => {
            const impact = Number(item.impact) || 0;
            const x = 50 + (idx * 900) / (factors.length - 1 || 1);
            const y = 220 - ((impact / max) * 200);
            return { x, y, feature: item.feature, impact };
        });

        return { maxImpact: max, points: pts };
    }, [topRiskFactors]);

    if (points.length === 0) return null;

    return (
        <div className="bg-dark-800/70 border border-white/5 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Top Risk Factors Diagram</h3>
            <div className="w-full h-64 relative">
                <svg width="100%" height="100%" viewBox="0 0 1000 250" preserveAspectRatio="xMidYMid meet" className="bg-dark-700/30 rounded-lg">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                        <line key={`grid-${i}`} x1="50" y1={220 - (i * 40)} x2="950" y2={220 - (i * 40)} stroke="#ffffff10" strokeWidth="1" strokeDasharray="4" />
                    ))}

                    {[0, 1, 2, 3, 4, 5].map((i) => (
                        <text key={`y-label-${i}`} x="35" y={225 - (i * 40)} textAnchor="end" fontSize="11" fill="#9ca3af">
                            {((i * maxImpact) / 5).toFixed(2)}
                        </text>
                    ))}

                    <line x1="50" y1="220" x2="950" y2="220" stroke="#ffffff30" strokeWidth="2" />
                    <line x1="50" y1="20" x2="50" y2="220" stroke="#ffffff30" strokeWidth="2" />

                    {points.length > 1 && (
                        <polyline
                            points={points.map(p => `${p.x},${p.y}`).join(' ')}
                            fill="none"
                            stroke="url(#lineGradient)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    )}

                    <defs>
                        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" style={{ stopColor: '#f59e0b', stopOpacity: 1 }} />
                            <stop offset="50%" style={{ stopColor: '#fbbf24', stopOpacity: 1 }} />
                            <stop offset="100%" style={{ stopColor: '#fcd34d', stopOpacity: 1 }} />
                        </linearGradient>
                    </defs>

                    {points.map((pt, idx) => (
                        <g key={`point-${idx}`}>
                            <circle cx={pt.x} cy={pt.y} r="5" fill="#f59e0b" stroke="#fff" strokeWidth="2" />
                            <text x={pt.x} y="240" textAnchor="middle" fontSize="10" fill="#9ca3af">
                                {pt.feature.substring(0, 12)}
                            </text>
                        </g>
                    ))}
                </svg>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                {points.slice(0, 5).map((pt, idx) => (
                    <div key={`legend-${idx}`} className="p-2 bg-dark-700/50 rounded border border-white/10">
                        <p className="text-gray-300 font-medium truncate">{pt.feature}</p>
                        <p className="text-amber-400 font-semibold">{pt.impact.toFixed(4)}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RiskLineChart;

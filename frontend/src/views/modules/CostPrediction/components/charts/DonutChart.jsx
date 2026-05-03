import { useMemo } from 'react';

const DonutChart = ({ topRiskFactors }) => {
    const { segments, categories, totalImpact } = useMemo(() => {
        const cats = {
            Design: { count: 0, impact: 0, color: 'url(#designGradient)', cssColor: 'bg-blue-500' },
            Material: { count: 0, impact: 0, color: 'url(#materialGradient)', cssColor: 'bg-orange-500' },
            Economic: { count: 0, impact: 0, color: 'url(#economicGradient)', cssColor: 'bg-green-500' },
            Contractor: { count: 0, impact: 0, color: 'url(#contractorGradient)', cssColor: 'bg-purple-500' },
            Other: { count: 0, impact: 0, color: 'url(#otherGradient)', cssColor: 'bg-pink-500' }
        };

        topRiskFactors.forEach(factor => {
            const feature = factor.feature.toLowerCase();
            const impact = Number(factor.impact) || 0;

            if (feature.includes('design') || feature.includes('complexity')) {
                cats.Design.count++;
                cats.Design.impact += impact;
            } else if (feature.includes('material') || feature.includes('equipment')) {
                cats.Material.count++;
                cats.Material.impact += impact;
            } else if (feature.includes('economic') || feature.includes('inflation') || feature.includes('exchange')) {
                cats.Economic.count++;
                cats.Economic.impact += impact;
            } else if (feature.includes('contractor') || feature.includes('experience')) {
                cats.Contractor.count++;
                cats.Contractor.impact += impact;
            } else {
                cats.Other.count++;
                cats.Other.impact += impact;
            }
        });

        const total = Object.values(cats).reduce((sum, cat) => sum + cat.impact, 0);

        let currentAngle = -90;
        const centerX = 200;
        const centerY = 160;
        const radius = 100;
        const innerRadius = 60;

        const segs = Object.entries(cats).map(([name, data]) => {
            if (data.impact === 0) return null;

            const percentage = (data.impact / total) * 100;
            const angle = (percentage / 100) * 360;
            const endAngle = currentAngle + angle;

            const startRadians = (currentAngle * Math.PI) / 180;
            const endRadians = (endAngle * Math.PI) / 180;

            const x1Outer = centerX + radius * Math.cos(startRadians);
            const y1Outer = centerY + radius * Math.sin(startRadians);
            const x2Outer = centerX + radius * Math.cos(endRadians);
            const y2Outer = centerY + radius * Math.sin(endRadians);
            const x1Inner = centerX + innerRadius * Math.cos(startRadians);
            const y1Inner = centerY + innerRadius * Math.sin(startRadians);
            const x2Inner = centerX + innerRadius * Math.cos(endRadians);
            const y2Inner = centerY + innerRadius * Math.sin(endRadians);

            const largeArc = angle > 180 ? 1 : 0;

            const midAngle = currentAngle + angle / 2;
            const midRadians = (midAngle * Math.PI) / 180;
            const labelRadius = (radius + innerRadius) / 2;
            const labelX = centerX + labelRadius * Math.cos(midRadians);
            const labelY = centerY + labelRadius * Math.sin(midRadians);

            const result = { name, data, percentage, path: `M ${x1Outer} ${y1Outer} A ${radius} ${radius} 0 ${largeArc} 1 ${x2Outer} ${y2Outer} L ${x2Inner} ${y2Inner} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x1Inner} ${y1Inner} Z`, labelX, labelY, showLabel: percentage > 8 };
            currentAngle = endAngle;
            return result;
        }).filter(Boolean);

        return { segments: segs, categories: cats, totalImpact: total };
    }, [topRiskFactors]);

    return (
        <div className="bg-dark-800/70 border border-white/5 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-purple-400">📊</span>
                Risk Distribution by Category
            </h3>
            <div className="w-full flex items-center justify-center">
                <svg width="100%" height="320" viewBox="0 0 400 320" className="max-w-md">
                    <defs>
                        <linearGradient id="designGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 0.9 }} />
                            <stop offset="100%" style={{ stopColor: '#1e40af', stopOpacity: 1 }} />
                        </linearGradient>
                        <linearGradient id="materialGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style={{ stopColor: '#f59e0b', stopOpacity: 0.9 }} />
                            <stop offset="100%" style={{ stopColor: '#dc2626', stopOpacity: 1 }} />
                        </linearGradient>
                        <linearGradient id="economicGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 0.9 }} />
                            <stop offset="100%" style={{ stopColor: '#059669', stopOpacity: 1 }} />
                        </linearGradient>
                        <linearGradient id="contractorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style={{ stopColor: '#8b5cf6', stopOpacity: 0.9 }} />
                            <stop offset="100%" style={{ stopColor: '#6d28d9', stopOpacity: 1 }} />
                        </linearGradient>
                        <linearGradient id="otherGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style={{ stopColor: '#ec4899', stopOpacity: 0.9 }} />
                            <stop offset="100%" style={{ stopColor: '#be185d', stopOpacity: 1 }} />
                        </linearGradient>
                    </defs>

                    {segments.map(seg => (
                        <g key={seg.name}>
                            <path
                                d={seg.path}
                                fill={seg.data.color}
                                stroke="#1f2937"
                                strokeWidth="2"
                                className="hover:opacity-80 transition-opacity cursor-pointer"
                            />
                            {seg.showLabel && (
                                <text
                                    x={seg.labelX}
                                    y={seg.labelY}
                                    textAnchor="middle"
                                    fontSize="13"
                                    fontWeight="bold"
                                    fill="#fff"
                                >
                                    {seg.percentage.toFixed(0)}%
                                </text>
                            )}
                        </g>
                    ))}

                    <text x="200" y="155" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#fff">
                        {topRiskFactors.length}
                    </text>
                    <text x="200" y="175" textAnchor="middle" fontSize="12" fill="#9ca3af">
                        Total Risks
                    </text>
                </svg>
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {Object.entries(categories).map(([name, data]) => {
                    if (data.count === 0) return null;
                    const percentage = totalImpact > 0 ? ((data.impact / totalImpact) * 100).toFixed(1) : 0;
                    return (
                        <div key={name} className="p-2 bg-dark-700/50 rounded border border-white/10 flex items-center gap-2">
                            <div className={`w-3 h-3 ${data.cssColor} rounded-full`}></div>
                            <div>
                                <p className="text-gray-300 font-medium">{name}</p>
                                <p className="text-gray-400">{data.count} factor{data.count > 1 ? 's' : ''} • {percentage}%</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default DonutChart;

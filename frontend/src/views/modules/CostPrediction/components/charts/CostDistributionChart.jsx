import { formatCurrency } from '../../utils/projectUtils';

const CostDistributionChart = ({ projectedFinalCost, initialBudget, overrunPct }) => {
    if (projectedFinalCost == null) return null;

    const mean = projectedFinalCost;
    const stdDev = mean * 0.15;
    const minCost = mean - 3 * stdDev;
    const maxCost = mean + 3 * stdDev;
    const range = maxCost - minCost;

    const points = [];
    for (let i = 0; i <= 100; i++) {
        const x = minCost + (i / 100) * range;
        const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2));
        const y = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
        points.push({ x, y });
    }

    const maxY = Math.max(...points.map(p => p.y));

    const getX = (value) => 80 + ((value - minCost) / range) * 640;

    return (
        <div className="bg-dark-800/70 border border-white/5 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-yellow-400">📈</span>
                Cost Distribution & Confidence Intervals
            </h3>
            <div className="w-full h-80">
                <svg width="100%" height="100%" viewBox="0 0 800 320" preserveAspectRatio="xMidYMid meet">
                    <defs>
                        <linearGradient id="distributionGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style={{ stopColor: '#fbbf24', stopOpacity: 0.6 }} />
                            <stop offset="100%" style={{ stopColor: '#f59e0b', stopOpacity: 0.2 }} />
                        </linearGradient>
                    </defs>

                    {[0, 1, 2, 3, 4, 5].map((i) => (
                        <line key={`dist-grid-${i}`} x1="80" y1={40 + (i * 45)} x2="720" y2={40 + (i * 45)} stroke="#ffffff08" strokeWidth="1" strokeDasharray="4" />
                    ))}

                    <rect x={getX(mean - 2 * stdDev)} y="45" width={getX(mean + 2 * stdDev) - getX(mean - 2 * stdDev)} height="220" fill="#3b82f6" opacity="0.1" />
                    <rect x={getX(mean - stdDev)} y="45" width={getX(mean + stdDev) - getX(mean - stdDev)} height="220" fill="#3b82f6" opacity="0.15" />

                    <path
                        d={points.map((p, idx) => {
                            const px = 80 + ((p.x - minCost) / range) * 640;
                            const py = 265 - ((p.y / maxY) * 220);
                            return `${idx === 0 ? 'M' : 'L'} ${px} ${py}`;
                        }).join(' ') + ' L 720 265 L 80 265 Z'}
                        fill="url(#distributionGradient)"
                        stroke="#fbbf24"
                        strokeWidth="2"
                    />

                    <line x1={getX(mean)} y1="45" x2={getX(mean)} y2="265" stroke="#ef4444" strokeWidth="3" strokeDasharray="6" />
                    <text x={getX(mean)} y="30" textAnchor="middle" fontSize="12" fontWeight="600" fill="#ef4444">
                        Predicted: LKR {(mean / 1000000).toFixed(2)}M
                    </text>

                    <text x={getX(mean - stdDev)} y="280" textAnchor="middle" fontSize="10" fill="#60a5fa">-1σ</text>
                    <text x={getX(mean + stdDev)} y="280" textAnchor="middle" fontSize="10" fill="#60a5fa">+1σ</text>
                    <text x={getX(mean - 2 * stdDev)} y="295" textAnchor="middle" fontSize="10" fill="#60a5fa">-2σ</text>
                    <text x={getX(mean + 2 * stdDev)} y="295" textAnchor="middle" fontSize="10" fill="#60a5fa">+2σ</text>

                    <line x1={getX(initialBudget)} y1="45" x2={getX(initialBudget)} y2="265" stroke="#10b981" strokeWidth="2" strokeDasharray="4" />
                    <text x={getX(initialBudget)} y="315" textAnchor="middle" fontSize="11" fontWeight="600" fill="#10b981">
                        Initial: LKR {(initialBudget / 1000000).toFixed(2)}M
                    </text>

                    <line x1="80" y1="265" x2="720" y2="265" stroke="#ffffff30" strokeWidth="2" />
                    <line x1="80" y1="45" x2="80" y2="265" stroke="#ffffff30" strokeWidth="2" />
                </svg>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-center">
                    <p className="text-gray-400">Most Likely Range</p>
                    <p className="text-yellow-400 font-semibold">±{((projectedFinalCost * 0.15) / 1000000).toFixed(2)}M (1σ)</p>
                    <p className="text-gray-500 text-[10px]">68% confidence</p>
                </div>
                <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded text-center">
                    <p className="text-gray-400">Expected Range</p>
                    <p className="text-blue-400 font-semibold">±{((projectedFinalCost * 0.30) / 1000000).toFixed(2)}M (2σ)</p>
                    <p className="text-gray-500 text-[10px]">95% confidence</p>
                </div>
                <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-center">
                    <p className="text-gray-400">Budget Variance</p>
                    <p className="text-red-400 font-semibold">{overrunPct?.toFixed(1)}%</p>
                    <p className="text-gray-500 text-[10px]">From initial</p>
                </div>
            </div>
        </div>
    );
};

export default CostDistributionChart;

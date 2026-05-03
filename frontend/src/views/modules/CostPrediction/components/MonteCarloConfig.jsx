import { MC_VARIABLES } from '../constants';

const MonteCarloConfig = ({ mcRanges, numSimulations, onRangeChange, onNumSimulationsChange, onToggle, onSliderSensitivity }) => (
    <div className="space-y-4 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 transition-all">
        <div className="flex justify-between items-start">
            <p className="text-xs text-emerald-200/70 max-w-[70%]">Define ranges for uncertain variables. The system will run simulations to predict probabilistic outcomes.</p>
            <div className="flex flex-col items-end gap-2">
                <button
                    type="button"
                    onClick={() => onToggle(false)}
                    className="px-3 py-1 text-xs font-medium rounded bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 transition-all"
                >
                    Hide
                </button>
                <label className="text-[10px] text-gray-400">Number of Simulations</label>
                <select
                    value={numSimulations}
                    onChange={(e) => onNumSimulationsChange(Number(e.target.value))}
                    className="bg-dark-700 border border-white/10 text-white text-xs rounded px-2 py-1 outline-none"
                >
                    <option value={300}>300</option>
                    <option value={500}>500</option>
                    <option value={1000}>1000 (Default)</option>
                </select>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            {Object.entries(MC_VARIABLES).map(([key, label]) => (
                <div key={key} className="p-2 border border-white/5 bg-dark-800/50 rounded-lg">
                    <p className="text-[10px] font-semibold text-gray-400 mb-1">{label}</p>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={mcRanges[key].min}
                            onChange={(e) => onRangeChange(key, 'min', e.target.value)}
                            className="w-full px-2 py-1 bg-dark-700 border border-white/10 rounded text-xs text-white"
                            placeholder="Min"
                        />
                        <span className="text-gray-500 text-xs">-</span>
                        <input
                            type="number"
                            value={mcRanges[key].max}
                            onChange={(e) => onRangeChange(key, 'max', e.target.value)}
                            className="w-full px-2 py-1 bg-dark-700 border border-white/10 rounded text-xs text-white"
                            placeholder="Max"
                        />
                    </div>
                    {key === 'Complexity_Score' && (
                        <div className="mt-2">
                            <p className="text-[9px] text-gray-500 mb-1">Max Complexity Sensitivity Slider (Trigger 300 Sims)</p>
                            <input
                                type="range" min="1" max="10" step="1"
                                value={mcRanges[key].max}
                                onChange={(e) => onSliderSensitivity(e.target.value)}
                                className="w-full h-1 bg-dark-600 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    )}
                </div>
            ))}
        </div>
    </div>
);

const FormFooter = ({ validationErrors, error, predictionMode, loading, monteCarloLoading, onSubmit, onMonteCarlo, onClearPrediction, onReset }) => (
    <>
        {validationErrors.length > 0 && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm font-semibold text-red-400 mb-2">⚠️ Please fix the following errors:</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-red-300">
                    {validationErrors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                    ))}
                </ul>
            </div>
        )}

        {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm">
                <p className="text-red-400">{error}</p>
            </div>
        )}

        {predictionMode === 'monte-carlo' && (
            <div className="border-t border-white/[0.06] pt-4 mt-6">
                <p className="text-[11px] uppercase tracking-widest text-emerald-400/70 font-semibold flex items-center gap-1.5"><span>🎲</span> Uncertainty Simulation Configurations</p>
            </div>
        )}

        <div className="pt-3">
            {predictionMode === 'single' ? (
                <button
                    type="submit"
                    disabled={loading}
                    className={`w-full px-6 py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 ${loading
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white hover:shadow-lg hover:shadow-amber-500/25 hover:scale-[1.01] active:scale-[0.99]'
                    }`}
                    style={loading ? {} : { backgroundSize: '200% 100%', animation: 'gradientShift 3s ease infinite' }}
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg> Predicting...</span>
                    ) : '🚀 Predict Cost Overrun (Point Estimate)'}
                </button>
            ) : (
                <button
                    type="button"
                    onClick={onMonteCarlo}
                    disabled={monteCarloLoading}
                    className={`w-full px-6 py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 ${monteCarloLoading
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 text-white hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-[1.01] active:scale-[0.99]'
                    }`}
                    style={monteCarloLoading ? {} : { backgroundSize: '200% 100%', animation: 'gradientShift 3s ease infinite' }}
                >
                    {monteCarloLoading ? (
                        <span className="flex items-center justify-center gap-2"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg> Running Simulations...</span>
                    ) : '🎲 Run Monte Carlo Risk Analysis'}
                </button>
            )}
        </div>
    </>
);

export { MonteCarloConfig, FormFooter };

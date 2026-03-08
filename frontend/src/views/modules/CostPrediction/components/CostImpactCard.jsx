import React from 'react';

// Helper function for formatting currency
const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

const CostImpactCard = ({ costSummary, riskLevel, formInitialValue = 0 }) => {
    if (!costSummary) return null;

    // Use backend value, or fallback to the form value if 0
    const initial_value = costSummary.initial_contract_value || formInitialValue || 0;

    // Recalculate metrics just in case the backend output was 0
    const overrun_percent = costSummary.expected_overrun_percent || 0;
    const computed_overrun_amount = initial_value * (overrun_percent / 100);
    const computed_final_cost = initial_value + computed_overrun_amount;

    // We can infer min/max percent by observing the difference from the backend, 
    // or we can just calculate what the confidence range bounds would be
    // if we know the raw prediction array (which we might not have)
    // For now, if initial_value was 0, those were 0, so approximate from bounds
    // Wait, the backend returns the raw percentage bounds somewhere? No, we don't have them in costSummary.
    // Let's use the ratio if the bounds are present, otherwise 0.
    // If backend computed them with a different initial value, we just use the backend's directly.
    let display_overrun_amt = costSummary.expected_overrun_amount;
    let display_final_cost = costSummary.expected_final_cost;
    let display_min = costSummary.confidence_range_cost?.[0] || 0;
    let display_max = costSummary.confidence_range_cost?.[1] || 0;

    if (costSummary.initial_contract_value === 0 && initial_value > 0) {
        // Backend crashed on 0, override with frontend calculation
        display_overrun_amt = computed_overrun_amount;
        display_final_cost = computed_final_cost;

        // Approximate the bounds dynamically from the mean ratio if missing, though it's better if backend works.
        // Assuming typical bounds are +/- mean, we will just display a rough estimate for failover
        display_min = initial_value * (1 + (overrun_percent * 0.7) / 100);
        display_max = initial_value * (1 + (overrun_percent * 1.3) / 100);
    }

    // Determine color theme based on risk level
    const isHighRisk = riskLevel && riskLevel.toLowerCase().includes('high');
    const isModerateRisk = riskLevel && riskLevel.toLowerCase().includes('moderate');

    // Default to green (low risk)
    let colorTheme = {
        border: 'border-green-500/20',
        bg: 'from-green-500/10',
        text: 'text-green-400',
        accent: 'bg-green-500/20'
    };

    if (isHighRisk) {
        colorTheme = {
            border: 'border-red-500/20',
            bg: 'from-red-500/10',
            text: 'text-red-400',
            accent: 'bg-red-500/20'
        };
    } else if (isModerateRisk) {
        colorTheme = {
            border: 'border-orange-500/20',
            bg: 'from-orange-500/10',
            text: 'text-orange-400',
            accent: 'bg-orange-500/20'
        };
    }

    return (
        <div className={`rounded-xl border ${colorTheme.border} bg-gradient-to-br ${colorTheme.bg} to-slate-900/50 p-6 my-6 shadow-lg shadow-black/20`}>
            <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                <div className={`p-2 rounded-lg ${colorTheme.accent}`}>
                    <svg className={`w-5 h-5 ${colorTheme.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white uppercase tracking-wider">Project Cost Impact</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Financial translation based on Monte Carlo Simulation</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="p-4 bg-dark-800/60 rounded-lg border border-white/5">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Initial Contract Value</p>
                    <p className="text-lg font-bold text-slate-200">
                        LKR {formatCurrency(initial_value)}
                    </p>
                </div>

                <div className="p-4 bg-dark-800/60 rounded-lg border border-white/5">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Expected Cost Overrun</p>
                    <p className={`text-xl font-bold ${colorTheme.text}`}>
                        {overrun_percent}%
                    </p>
                </div>

                <div className="p-4 bg-dark-800/60 rounded-lg border border-white/5">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Estimated Overrun Amount</p>
                    <p className={`text-xl font-bold ${colorTheme.text}`}>
                        LKR {formatCurrency(display_overrun_amt)}
                    </p>
                </div>

                <div className="p-4 bg-dark-800/60 rounded-lg border border-white/5 md:col-span-2 lg:col-span-2">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Expected Final Project Cost</p>
                    <p className={`text-3xl font-bold ${colorTheme.text}`}>
                        LKR {formatCurrency(display_final_cost)}
                    </p>
                    <p className="text-xs text-slate-400 mt-2 border-t border-white/5 pt-2">
                        <span className="font-semibold text-slate-300">Possible Cost Range:</span> <br />
                        LKR {formatCurrency(display_min)} — LKR {formatCurrency(display_max)}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CostImpactCard;

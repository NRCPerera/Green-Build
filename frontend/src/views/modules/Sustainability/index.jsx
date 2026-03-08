/**
 * Sustainability Module — Main View
 * ==================================
 * Independent sustainability analysis module.
 * Works without a plan upload — user enters project details manually.
 *
 * Architecture:
 *  - API calls  → services/sustainabilityService.js
 *  - Metrics    → components/ResultsCard.jsx
 *  - Pareto     → components/ParetoChart.jsx
 *  - Advice     → components/Recommendations.jsx
 */

import { useState } from 'react';
import { calculateSustainability, formatCarbon, formatCurrency } from '../../../services/sustainabilityService';
import ResultsCard from './components/ResultsCard';
import ParetoChart from './components/ParetoChart';
import Recommendations from './components/Recommendations';

// ── Constants ──────────────────────────────────
const MATERIAL_OPTIONS = [
    { value: 'Brick', label: 'Brick (Traditional)', kgPerM2: 180 },
    { value: 'Cement Block', label: 'Cement Block', kgPerM2: 140 },
    { value: 'Concrete', label: 'Concrete', kgPerM2: 150 },
    { value: 'Pre-cast', label: 'Pre-cast Panels', kgPerM2: 130 },
];

// Energy ratings: UI shows letters, API receives numeric efficiency value
const ENERGY_RATING_OPTIONS = [
    { value: '1.0', label: 'A — High-end', desc: 'Solar + Full LED + Inverter AC' },
    { value: '0.8', label: 'B — Mid-range', desc: 'Partial Solar + LED Lighting' },
    { value: '0.6', label: 'C — Standard', desc: 'No Solar + Normal Appliances' },
];

// Sri Lankan brand suggestions based on GBCSL best practices
const BRAND_SUGGESTIONS = [
    { name: 'Alumex', product: 'Double-Glazed Aluminium Windows', reason: 'Reduces heat gain by 40% — helps achieve Platinum energy rating' },
    { name: 'Kelani Cables', product: 'Energy-Efficient Wiring Systems', reason: 'Low-resistance cabling reduces operational energy loss by 15%' },
    { name: 'Tokyo Super Eco', product: 'Low-Carbon Cement', reason: 'Reduces embodied CO₂ by 30% compared to OPC cement' },
    { name: 'Lanka Tiles', product: 'Cool Roof Tiles', reason: 'Reflects solar heat, reducing cooling load by up to 25%' },
    { name: 'Rocell', product: 'Water-Efficient Sanitary Fittings', reason: 'Dual-flush systems save up to 40% water usage annually' },
    { name: 'Fentons', product: 'Solar PV Panels (Tier-1)', reason: 'SLSEA approved panels with 25-year warranty for renewable energy credits' },
];

// Material-specific 50-year maintenance plan
const MAINTENANCE_PLANS = {
    'Brick': [
        { year: 'Every 5 years', task: 'External repaint and waterproofing treatment' },
        { year: 'Every 10 years', task: 'Inspect for structural cracks and mortar repointing' },
        { year: 'Every 15 years', task: 'Plumbing and MEP system overhaul' },
        { year: 'Every 25 years', task: 'Major renovation — roof retiling and wall replastering' },
        { year: 'At 50 years', task: 'Full structural assessment and reinforcement audit' },
    ],
    'Cement Block': [
        { year: 'Every 5 years', task: 'External paint and damp-proofing' },
        { year: 'Every 10 years', task: 'Check for hairline cracks and seal expansion joints' },
        { year: 'Every 20 years', task: 'MEP system upgrade and waterproofing renewal' },
        { year: 'At 50 years', task: 'Structural integrity assessment' },
    ],
    'Concrete': [
        { year: 'Every 10 years', task: 'Surface treatment and anti-carbonation coating' },
        { year: 'Every 20 years', task: 'Structural audit — check for rebar corrosion and spalling' },
        { year: 'Every 25 years', task: 'MEP and plumbing system overhaul' },
        { year: 'At 50 years', task: 'Comprehensive structural reinforcement assessment' },
    ],
    'Pre-cast': [
        { year: 'Every 10 years', task: 'Joint sealant replacement and panel inspection' },
        { year: 'Every 15 years', task: 'Connection bolt tightening and corrosion check' },
        { year: 'Every 25 years', task: 'Panel realignment and MEP upgrade' },
        { year: 'At 50 years', task: 'Full panel condition survey and structural assessment' },
    ],
};

const SustainabilityView = () => {
    // ── Manual project inputs (independent of Quantity Takeoff) ──
    const [projectArea, setProjectArea] = useState(200);
    const [buildingLifespan, setBuildingLifespan] = useState(50);
    const [primaryMaterial, setPrimaryMaterial] = useState('Brick');
    const [energyRating, setEnergyRating] = useState('0.8');   // numeric: A=1.0, B=0.8, C=0.6, D=0.4
    const [renewablePct, setRenewablePct] = useState(20);

    // ── Additional materials list ──
    const [materials, setMaterials] = useState([]);

    // ── UI state ──
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);

    const addMaterial = () => {
        const matConfig = MATERIAL_OPTIONS.find((m) => m.value === primaryMaterial) || MATERIAL_OPTIONS[0];
        const dynamicQty = Math.round(projectArea * matConfig.kgPerM2);
        setMaterials((prev) => [
            ...prev,
            { id: Date.now(), type: primaryMaterial, quantity: dynamicQty, unit: 'kg', recycledContent: 0 },
        ]);
    };

    const removeMaterial = (id) => {
        setMaterials((prev) => prev.filter((m) => m.id !== id));
    };

    // ── Submit handler ──
    const handleRunAnalysis = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await calculateSustainability({
                area: projectArea,
                lifespan: buildingLifespan,
                material: primaryMaterial,
                energyRating: energyRating,
                renewablePercent: renewablePct,
            });

            // The new backend wraps the response in { success, data }
            console.log("====> [FRONTEND] Raw API Response Received from Node Backend:");
            console.log(JSON.stringify(response, null, 2));

            if (response.success && response.data) {
                setResult(response.data);
            } else {
                setResult(response);
            }
        } catch (err) {
            const msg =
                err.response?.data?.message ||
                err.response?.data?.detail ||
                err.message ||
                'Failed to run analysis';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">

            {/* ── Module Header ── */}
            <div className="bg-gradient-to-r from-green-500/10 to-transparent border border-green-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-4">
                    <span className="text-4xl">🌱</span>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Sustainability Analysis</h2>
                        <p className="text-gray-400 mt-1">
                            Analysis based on <span className="text-green-400 font-medium">GBCSL Rating System v2.0</span> and{' '}
                            <span className="text-green-400 font-medium">CIDA Material Price Index 2024/25</span>
                        </p>
                    </div>
                    <span className="ml-auto px-3 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full border border-green-500/30">
                        Independent Mode
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ════════════════════════════════════════════
                    LEFT COLUMN — INPUT FORM
                   ════════════════════════════════════════════ */}
                <div className="lg:col-span-1 space-y-6">

                    {/* ── Manual Project Inputs ── */}
                    <div className="bg-dark-800/50 border border-green-500/20 rounded-2xl p-6 space-y-5">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">Manual</span>
                            Project Inputs
                        </h3>

                        {/* Project Area */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Project Area (m²)
                            </label>
                            <input
                                type="number"
                                value={projectArea}
                                onChange={(e) => setProjectArea(parseFloat(e.target.value) || 0)}
                                min="1"
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white
                                           focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </div>

                        {/* Building Lifespan */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Building Lifespan (years)
                            </label>
                            <input
                                type="number"
                                value={buildingLifespan}
                                onChange={(e) => setBuildingLifespan(parseInt(e.target.value) || 50)}
                                min="10"
                                max="100"
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white
                                           focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </div>

                        {/* Primary Material */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Primary Material Type
                            </label>
                            <select
                                value={primaryMaterial}
                                onChange={(e) => setPrimaryMaterial(e.target.value)}
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white
                                           focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                                {MATERIAL_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* ── Materials List ── */}
                    <div className="bg-dark-800/50 border border-white/5 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Materials</h3>
                            <button
                                onClick={addMaterial}
                                className="px-3 py-1.5 bg-primary-500/20 text-primary-400 text-sm rounded-lg
                                           hover:bg-primary-500/30 transition-colors"
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

                    {/* ── Analysis Parameters & Submit ── */}
                    <form onSubmit={handleRunAnalysis} className="bg-dark-800/50 border border-white/5 rounded-2xl p-6 space-y-5">
                        <h3 className="text-lg font-semibold text-white">Parameters</h3>

                        {/* Energy Rating */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                                Energy Efficiency Rating
                                <span className="relative group cursor-help">
                                    <span className="text-base">ℹ️</span>
                                    <span className="absolute left-6 -top-1 z-50 hidden group-hover:block
                                                      w-64 p-3 bg-dark-700 border border-white/10 rounded-xl
                                                      text-xs text-gray-300 shadow-lg">
                                        <strong className="text-green-400">A:</strong> Solar panels + Full LED + Inverter AC<br />
                                        <strong className="text-blue-400">B:</strong> Partial solar + LED lighting<br />
                                        <strong className="text-yellow-400">C:</strong> No solar + normal appliances
                                    </span>
                                </span>
                            </label>
                            <select
                                value={energyRating}
                                onChange={(e) => setEnergyRating(e.target.value)}
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white
                                           focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                                {ENERGY_RATING_OPTIONS.map((opt, idx) => (
                                    <option key={idx} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                            {/* Helper text */}
                            <p className="mt-2 text-xs text-gray-500">
                                {ENERGY_RATING_OPTIONS.find((o) => o.value === energyRating)?.desc || ''}
                            </p>
                        </div>

                        {/* Renewable Energy */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Renewable Energy (%)
                            </label>
                            <input
                                type="range"
                                value={renewablePct}
                                onChange={(e) => setRenewablePct(parseInt(e.target.value))}
                                min="0"
                                max="100"
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>0%</span>
                                <span className="text-green-400 font-medium">{renewablePct}%</span>
                                <span>100%</span>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                <p className="text-sm text-red-400">{error}</p>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full px-6 py-3 rounded-xl font-semibold transition-all duration-200 cursor-pointer
                                ${loading
                                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-400 hover:to-emerald-400'
                                }`}
                        >
                            {loading ? 'Running Analysis...' : '🌱 Run Sustainability Analysis'}
                        </button>
                    </form>
                </div>

                {/* ════════════════════════════════════════════
                    RIGHT COLUMN — RESULTS
                   ════════════════════════════════════════════ */}
                <div className="lg:col-span-2">
                    {result ? (
                        <div className="space-y-6">
                            <ResultsCard
                                result={result}
                                formatCurrency={formatCurrency}
                                formatCarbon={formatCarbon}
                                inputs={{
                                    projectArea,
                                    buildingLifespan,
                                    primaryMaterial,
                                    energyRating,
                                    renewablePct
                                }}
                            />
                            <ParetoChart
                                paretoFrontier={result.paretoFrontier}
                                formatCurrency={formatCurrency}
                                formatCarbon={formatCarbon}
                            />
                            <Recommendations
                                recommendations={result.recommendations}
                                brandSuggestions={BRAND_SUGGESTIONS}
                            />

                            {/* ── 50-Year Maintenance Plan ── */}
                            {MAINTENANCE_PLANS[primaryMaterial] && (
                                <div className="bg-dark-800/50 border border-white/5 rounded-2xl p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">
                                        🔧 50-Year Maintenance Plan — {primaryMaterial}
                                    </h3>
                                    <div className="space-y-2">
                                        {MAINTENANCE_PLANS[primaryMaterial].map((item, idx) => (
                                            <div key={idx} className="flex items-start gap-3 p-3 bg-dark-700/50 rounded-lg">
                                                <span className="text-xs text-green-400 font-semibold whitespace-nowrap min-w-[100px]">
                                                    {item.year}
                                                </span>
                                                <span className="text-sm text-gray-300">{item.task}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-96 flex flex-col items-center justify-center bg-dark-800/50 border border-white/5 rounded-2xl">
                            <div className="w-20 h-20 mb-6 rounded-full bg-dark-700 flex items-center justify-center">
                                <span className="text-4xl">🌍</span>
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">No Analysis Yet</h3>
                            <p className="text-gray-400 text-center max-w-md">
                                Enter your project area, select materials, and click
                                <strong className="text-green-400"> "Run Sustainability Analysis" </strong>
                                to see lifecycle cost and carbon footprint results.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SustainabilityView;
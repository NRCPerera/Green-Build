import { useState } from 'react';
import { CONTRACTOR_PROFILES, CIDA_GRADES, PROJECT_TYPES, SEASONS, provinceDistrictMap } from '../constants';
import { parseFloatOrEmpty, parseIntOrEmpty } from '../utils/formUtils';

const FormHeader = ({ error, isFormExpanded, onToggleExpand, onBack, projectName }) => (
    <div className="flex items-center justify-between sticky top-0 bg-dark-800/95 backdrop-blur-md pb-3 z-10">
        <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 text-xs font-semibold rounded-full border border-amber-500/30">⚡ Inputs</span>
            <h3 className="text-lg font-semibold text-white">Project Parameters</h3>
        </div>
        <div className="flex items-center gap-2">
            {error && <span className="text-xs text-red-400">{error}</span>}
            <button
                type="button"
                onClick={onToggleExpand}
                className="p-2 hover:bg-yellow-500/10 rounded-lg transition-colors border border-white/10 text-yellow-300"
                title={isFormExpanded ? 'Minimize Form' : 'Expand Form'}
            >
                {isFormExpanded ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                )}
            </button>
        </div>
    </div>
);

const ModeSelectorTabs = ({ predictionMode, onModeChange }) => (
    <div className="flex bg-dark-700/50 p-1 rounded-xl border border-white/5 backdrop-blur-md mb-2">
        <button
            type="button"
            onClick={() => onModeChange('single')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${predictionMode === 'single' ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30 shadow-lg' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
        >
            🎯 Point Estimate
        </button>
        <button
            type="button"
            onClick={() => onModeChange('monte-carlo')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${predictionMode === 'monte-carlo' ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/30 shadow-lg' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
        >
            🎲 Risk Analysis (Sim)
        </button>
    </div>
);

const ProjectClassificationSection = ({ formValues, project, availableDistricts, isFormExpanded, onChange }) => {
    const contractorProfile = formValues.CIDA_Grade && CONTRACTOR_PROFILES[formValues.CIDA_Grade];
    const isLowTier = ['C4', 'C5'].includes(formValues.CIDA_Grade);

    return (
        <>
            <div className="border-t border-white/[0.06] pt-4">
                <p className="text-[11px] uppercase tracking-widest text-amber-400/70 font-semibold mb-3 flex items-center gap-1.5"><span>🏗️</span> Project Classification</p>
            </div>
            <div className={`grid ${isFormExpanded ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2'} gap-3`}>
                <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-400 mb-1">Type of Project {project && <span className="text-xs text-gray-500">(from project)</span>}</label>
                    <select
                        value={formValues.Project_Type}
                        onChange={onChange('Project_Type')}
                        disabled={!!project}
                        className={`w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 ${project ? 'opacity-60 cursor-not-allowed' : ''}`}
                        required
                    >
                        <option value="">Select Project Type</option>
                        {PROJECT_TYPES.map(pt => (
                            <option key={pt.value} value={pt.value}>{pt.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Province {project && <span className="text-xs text-gray-500">(from project)</span>}</label>
                    <select
                        value={formValues.Province}
                        onChange={onChange('Province')}
                        disabled={!!project}
                        className={`w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 ${project ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                        <option value="">Select Province</option>
                        {Object.keys(provinceDistrictMap).map(province => (
                            <option key={province} value={province}>{province}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">District {project && <span className="text-xs text-gray-500">(from project)</span>}</label>
                    <select
                        value={formValues.District}
                        onChange={onChange('District')}
                        disabled={!!project}
                        className={`w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 ${project ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                        <option value="">Select District</option>
                        {availableDistricts.map(district => (
                            <option key={district} value={district}>{district}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Season of Start</label>
                    <select
                        value={formValues.Season}
                        onChange={onChange('Season')}
                        className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        required
                    >
                        <option value="">Select Season</option>
                        {SEASONS.map(season => (
                            <option key={season.value} value={season.value}>{season.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Year of Tender</label>
                    <input
                        type="number"
                        min="2015"
                        max={new Date().getFullYear()}
                        step="1"
                        value={formValues.Year_of_Tender}
                        onChange={onChange('Year_of_Tender', parseIntOrEmpty)}
                        className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        required
                    />
                </div>
                <div className="relative">
                    <label className="block text-xs font-medium text-gray-400 mb-1">CIDA Grade</label>
                    <select
                        value={formValues.CIDA_Grade}
                        onChange={onChange('CIDA_Grade')}
                        className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        required
                    >
                        <option value="">Select CIDA Grade</option>
                        {CIDA_GRADES.map(grade => (
                            <option key={grade.value} value={grade.value}>{grade.label}</option>
                        ))}
                    </select>
                </div>
            </div>
        </>
    );
};

const ProjectDetailsSection = ({ formValues, isFormExpanded, onChange, initialValueMode, onToggleInitialValueMode, floorPlanAutoFilled, onClearAutoFill }) => (
    <>
        <div className="border-t border-white/[0.06] pt-4">
            <p className="text-[11px] uppercase tracking-widest text-blue-400/70 font-semibold mb-3 flex items-center gap-1.5"><span>📐</span> Project Details</p>
        </div>
        <div className={`grid ${isFormExpanded ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2'} gap-3`}>
            <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                    Floors
                    {floorPlanAutoFilled.Floors && (
                        <span className="ml-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 bg-cyan-500/15 text-cyan-300 text-[9px] font-medium rounded-full border border-cyan-500/30 animate-[fadeIn_0.5s_ease-in]">
                            ✨ Auto-filled from Floor Plan
                        </span>
                    )}
                </label>
                <input
                    type="number"
                    min="1"
                    max="60"
                    step="1"
                    value={formValues.Floors}
                    onChange={(e) => {
                        onChange('Floors', parseIntOrEmpty)(e);
                        onClearAutoFill('Floors');
                    }}
                    className={`w-full px-3 py-2 bg-dark-700 border rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 ${floorPlanAutoFilled.Floors ? 'border-cyan-500/40' : 'border-white/10'}`}
                    required
                />
                <p className="text-[10px] text-gray-500 mt-0.5">Range: 1-60 floors</p>
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                    Total Floor Area (SQFT)
                    {floorPlanAutoFilled.Area_SQFT && (
                        <span className="ml-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 bg-cyan-500/15 text-cyan-300 text-[9px] font-medium rounded-full border border-cyan-500/30 animate-[fadeIn_0.5s_ease-in]">
                            ✨ Auto-filled from Floor Plan
                        </span>
                    )}
                </label>
                <input
                    type="number"
                    min="500"
                    max="200000"
                    step="0.01"
                    value={formValues.Area_SQFT}
                    onChange={(e) => {
                        onChange('Area_SQFT', parseFloatOrEmpty)(e);
                        onClearAutoFill('Area_SQFT');
                    }}
                    className={`w-full px-3 py-2 bg-dark-700 border rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 ${floorPlanAutoFilled.Area_SQFT ? 'border-cyan-500/40' : 'border-white/10'}`}
                    placeholder="e.g., 15000"
                    required
                />
                <p className="text-[10px] text-gray-500 mt-0.5">Range: 500-200,000 SQFT</p>
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Estimated Cost Rate per SQFT (LKR)</label>
                <input
                    type="number"
                    min="2000"
                    max="100000"
                    step="0.01"
                    value={formValues.Rate_per_SQFT}
                    onChange={onChange('Rate_per_SQFT', parseFloatOrEmpty)}
                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="e.g., 12000"
                    required
                />
                <p className="text-[10px] text-gray-500 mt-0.5">Range: 2,000-100,000 LKR</p>
            </div>
            <div>
                <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-gray-400">Total Initial Budget (LKR)</label>
                    <button
                        type="button"
                        onClick={onToggleInitialValueMode}
                        className={`text-[10px] px-2 py-0.5 rounded border ${initialValueMode === 'auto'
                            ? 'border-green-500/40 text-green-400 bg-green-500/10'
                            : 'border-yellow-500/40 text-yellow-400 bg-yellow-500/10'
                        }`}
                    >
                        {initialValueMode === 'auto' ? '🔄 Auto' : '✏️ Manual'}
                    </button>
                </div>
                <input
                    type="number"
                    min="0"
                    max="20000000000"
                    step="0.01"
                    value={formValues.Initial_Value}
                    onChange={onChange('Initial_Value', parseFloatOrEmpty)}
                    onFocus={() => {
                        if (initialValueMode === 'auto') onToggleInitialValueMode();
                    }}
                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="e.g., 50000000"
                    required
                />
                <p className="text-[10px] text-gray-500 mt-0.5">
                    {initialValueMode === 'auto' ? 'Auto: Area × Rate' : 'Manual override'}
                </p>
            </div>
        </div>
    </>
);

const TimelineSection = ({ formValues, startDate, isFormExpanded, onChange, onStartDateChange, currentYear }) => (
    <>
        <div className="border-t border-white/[0.06] pt-4">
            <p className="text-[11px] uppercase tracking-widest text-violet-400/70 font-semibold mb-3 flex items-center gap-1.5"><span>📅</span> Timeline</p>
        </div>
        <div className={`grid ${isFormExpanded ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2'} gap-3`}>
            <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Estimated Construction Duration (Months)</label>
                <input
                    type="number"
                    min="1"
                    max="100"
                    step="0.1"
                    value={formValues.Initial_Period_Months}
                    onChange={onChange('Initial_Period_Months', parseFloatOrEmpty)}
                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="e.g., 24"
                    required
                />
                <p className="text-[10px] text-gray-500 mt-0.5">Range: 1-100 months</p>
            </div>
            <div className="col-span-full">
                <label className="block text-xs font-medium text-gray-400 mb-1">Project Start Date</label>
                <input
                    type="date"
                    value={startDate}
                    onChange={onStartDateChange}
                    min="2015-01-01"
                    max={`${currentYear}-12-31`}
                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                    Auto-calculates: Month ({formValues.Start_Month || '-'}), Quarter ({formValues.Start_Quarter || '-'}), Weekday ({formValues.Start_Weekday !== '' ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][formValues.Start_Weekday] : '-'}), Season
                </p>
            </div>
        </div>
    </>
);

const EconomicIndicatorsSection = ({ formValues, isFormExpanded, onChange, indicatorsLoading, indicatorsError, indicatorMetadata, onRefresh }) => (
    <>
        <div className="border-t border-white/[0.06] pt-4">
            <p className="text-[11px] uppercase tracking-widest text-teal-400/70 font-semibold mb-3 flex items-center gap-1.5"><span>💹</span> Economic Indicators</p>
        </div>
        <div className={`grid ${isFormExpanded ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2'} gap-3`}>
            <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Current Economic Inflation Rate (%)</label>
                <input
                    type="number"
                    min="-10"
                    max="50"
                    step="0.01"
                    value={formValues.Inflation_Rate}
                    onChange={onChange('Inflation_Rate', parseFloatOrEmpty)}
                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="e.g., 5.5"
                />
                <p className="text-[10px] text-gray-500 mt-0.5">Range: -10 to 50%</p>
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Construction Material Price Index</label>
                <input
                    type="number"
                    min="50"
                    max="500"
                    step="0.01"
                    value={formValues.Material_Index}
                    onChange={onChange('Material_Index', parseFloatOrEmpty)}
                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="e.g., 120.5"
                />
                <p className="text-[10px] text-gray-500 mt-0.5">Range: 50-500</p>
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">USD to LKR Exchange Rate</label>
                <input
                    type="number"
                    min="100"
                    max="500"
                    step="0.01"
                    value={formValues.Exchange_Rate_LKR !== '' && formValues.Exchange_Rate_LKR !== 0
                        ? Number(formValues.Exchange_Rate_LKR).toFixed(2)
                        : formValues.Exchange_Rate_LKR}
                    onChange={onChange('Exchange_Rate_LKR', (val) => {
                        const n = parseFloat(val);
                        return Number.isNaN(n) ? '' : Math.round(n * 100) / 100;
                    })}
                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="e.g., 320.00"
                />
                <p className="text-[10px] text-gray-500 mt-0.5">Range: 100-500</p>
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Scale & Scope Factor (0-10)</label>
                <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.01"
                    value={formValues.Project_Size_Index}
                    onChange={onChange('Project_Size_Index', parseFloatOrEmpty)}
                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="e.g., 4.5"
                />
                <p className="text-[10px] text-gray-500 mt-0.5">Range: 0-10</p>
            </div>
        </div>
        <div className="mt-3 p-3 border border-teal-500/20 bg-teal-500/5 rounded-lg">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-xs text-teal-200/90">
                    {indicatorsLoading && 'Fetching economic indicators from FRED...'}
                    {!indicatorsLoading && indicatorMetadata && (
                        <span>
                            Year: {indicatorMetadata.year}
                            {indicatorMetadata.fetchedAt ? ` | Updated: ${new Date(indicatorMetadata.fetchedAt).toLocaleTimeString()}` : ''}
                        </span>
                    )}
                    {!indicatorsLoading && !indicatorMetadata && 'Select year and province to auto-fetch indicators.'}
                </div>
                <button
                    type="button"
                    onClick={onRefresh}
                    disabled={indicatorsLoading}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${indicatorsLoading
                        ? 'border-gray-500/40 text-gray-500 cursor-not-allowed'
                        : 'border-teal-400/40 text-teal-300 hover:bg-teal-400/10'
                    }`}
                >
                    {indicatorsLoading ? 'Refreshing...' : 'Refresh Indicators'}
                </button>
            </div>
            {indicatorsError && (
                <p className="text-xs text-red-400 mt-2">{indicatorsError}</p>
            )}
        </div>
    </>
);

const RiskExperienceSection = ({ formValues, isFormExpanded, onChange }) => (
    <>
        <div className="border-t border-white/[0.06] pt-4">
            <p className="text-[11px] uppercase tracking-widest text-rose-400/70 font-semibold mb-3 flex items-center gap-1.5"><span>⚠️</span> Risk & Experience</p>
        </div>
        <div className={`grid ${isFormExpanded ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2'} gap-3`}>
            <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Contractor's Years of Experience</label>
                <input
                    type="number"
                    min="0"
                    max="50"
                    step="1"
                    value={formValues.Contractor_Experience_Years}
                    onChange={onChange('Contractor_Experience_Years', parseIntOrEmpty)}
                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="e.g., 10"
                />
                <p className="text-[10px] text-gray-500 mt-0.5">Range: 0-50 years</p>
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Market Instability Risk (0-10)</label>
                <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.01"
                    value={formValues.Economic_Risk_Index}
                    onChange={onChange('Economic_Risk_Index', parseFloatOrEmpty)}
                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="e.g., 3.2"
                />
                <p className="text-[10px] text-gray-500 mt-0.5">Range: 0-10</p>
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Expected Number of Design Changes</label>
                <input
                    type="number"
                    min="0"
                    max="50"
                    step="1"
                    value={formValues.Change_Order_Freq}
                    onChange={onChange('Change_Order_Freq', parseIntOrEmpty)}
                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="e.g., 2"
                />
                <p className="text-[10px] text-gray-500 mt-0.5">Range: 0-50</p>
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Overall Project Complexity (1-10)</label>
                <div className="flex items-center gap-3">
                    <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={formValues.Complexity_Score || 1}
                        onChange={onChange('Complexity_Score', parseIntOrEmpty)}
                        className="flex-1 h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                        style={{ accentColor: '#eab308' }}
                    />
                    <span className="w-12 text-center px-2 py-1 bg-dark-700 border border-yellow-500/30 rounded text-sm text-yellow-300 font-semibold">
                        {formValues.Complexity_Score || 1}
                    </span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">1 = Simple, 10 = Highly Complex</p>
            </div>
        </div>
    </>
);

const RiskScoresSection = ({ formValues, isFormExpanded, onChange }) => {
    const sliders = [
        { key: 'Design_Completeness', label: 'Current Design Completeness (%)', min: 0, max: 100, suffix: '%', hint: '0% = Not started, 100% = Fully complete', width: 'w-16' },
        { key: 'Design_Risk_Score', label: 'Design Uncertainty Risk (1-10)', min: 1, max: 10, suffix: '', hint: '1 = Low risk, 10 = High risk', width: 'w-12' },
        { key: 'Contractor_Risk_Score', label: 'Contractor Risk Score (1-10)', min: 1, max: 10, suffix: '', hint: '1 = Low risk, 10 = High risk', width: 'w-12' },
        { key: 'Weather_Risk_Score', label: 'Weather Risk Score (1-10)', min: 1, max: 10, suffix: '', hint: '1 = Low risk, 10 = High risk', width: 'w-12' },
    ];

    return (
        <>
            <div className="border-t border-white/[0.06] pt-4">
                <p className="text-[11px] uppercase tracking-widest text-pink-400/70 font-semibold mb-3 flex items-center gap-1.5"><span>🎯</span> Risk Scores</p>
            </div>
            <div className={`grid ${isFormExpanded ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-4`}>
                {sliders.map(({ key, label, min, max, suffix, hint, width }) => (
                    <div key={key}>
                        <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="range"
                                min={min}
                                max={max}
                                step="1"
                                value={formValues[key] || (key === 'Design_Completeness' ? 0 : 1)}
                                onChange={onChange(key, parseIntOrEmpty)}
                                className="flex-1 h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                                style={{ accentColor: '#eab308' }}
                            />
                            <span className={`${width} text-center px-2 py-1 bg-dark-700 border border-yellow-500/30 rounded text-sm text-yellow-300 font-semibold`}>
                                {formValues[key] || (key === 'Design_Completeness' ? 0 : 1)}{suffix}
                            </span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">{hint}</p>
                    </div>
                ))}
            </div>
        </>
    );
};

export { FormHeader, ModeSelectorTabs, ProjectClassificationSection, ProjectDetailsSection, TimelineSection, EconomicIndicatorsSection, RiskExperienceSection, RiskScoresSection };

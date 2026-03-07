import { useState, useEffect } from 'react';
import useCostController from '../../../controllers/useCostController';

const provinceDistrictMap = {
    'Western': ['Colombo', 'Gampaha', 'Kalutara'],
    'Central': ['Kandy', 'Matale', 'Nuwara Eliya'],
    'Southern': ['Galle', 'Matara', 'Hambantota'],
    'Eastern': ['Trincomalee', 'Batticaloa', 'Ampara'],
    'Northern': ['Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu'],
    'North Western': ['Kurunegala', 'Puttalam'],
    'North Central': ['Anuradhapura', 'Polonnaruwa'],
    'Uva': ['Badulla', 'Monaragala'],
    'Sabaragamuwa': ['Ratnapura', 'Kegalle']
};

const CostPredictionView = ({ project, onBack }) => {
    const [formValues, setFormValues] = useState({
                Project_Type: 'Apartment',
                Province: 'Western',
                District: 'Gampaha',
                CIDA_Grade: 'C5',
                Season: 'Monsoon',
                Floors: 14,
                Area_SQFT: 85000,
                Year_of_Tender: 2022,
                Contractor_Experience_Years: 5,
                Complexity_Score: 9,
                Change_Order_Freq: 14,
                Start_Month: 6,
                Start_Quarter: 2,
                Start_Weekday: 1,
                Initial_Period_Months: 30,
                Time_Overrun_Months: 11,
                Actual_Duration_Months: 41,
                Inflation_Rate: 55,
                Exchange_Rate_LKR: 360,
                Material_Index: 420,
                Design_Completeness: 0.42,
                Project_Size_Index: 120,
                Economic_Risk_Index: 60,
                Design_Risk_Score: 5.8,
                Contractor_Risk_Score: 4.7,
                Weather_Risk_Score: 5.2,
                Rate_per_SQFT: 64000,
                Initial_Value: 5440000000
    });

    const [availableDistricts, setAvailableDistricts] = useState([]);
    const [isFormExpanded, setIsFormExpanded] = useState(false);

    const { loading, error, prediction, hasPrediction, predictCost, clearPrediction } = useCostController();

    const riskFlag = prediction?.predicted_high_risk_class;
    const isHighRisk = riskFlag === true || riskFlag === 1;
    const overrunPct = prediction?.predicted_cost_overrun_pct;
    const probabilityValue = prediction?.predicted_high_risk_probability ?? null;
    const hasProbability = typeof probabilityValue === 'number';
    const topRiskFactors = Array.isArray(prediction?.top_risk_factors) ? prediction.top_risk_factors : [];
    const riskScorecard = Array.isArray(prediction?.risk_scorecard) ? prediction.risk_scorecard : [];
    const maxImpact = topRiskFactors.length > 0
        ? Math.max(...topRiskFactors.map((item) => Number(item.impact) || 0), 0.0001)
        : 1;

    const getImpactColor = (impactLevel) => {
        if (impactLevel === 'High') return 'text-red-300 border-red-500/40 bg-red-500/15';
        if (impactLevel === 'Medium') return 'text-yellow-300 border-yellow-500/40 bg-yellow-500/15';
        return 'text-green-300 border-green-500/40 bg-green-500/15';
    };

    useEffect(() => {
        if (project) {
            const getProjectType = (type) => {
                if (!type) return 'Apartment';
                const typeMap = {
                    'residential': 'House',
                    'commercial': 'Commercial',
                    'infrastructure': 'Infrastructure'
                };
                return typeMap[type.toLowerCase()] || type;
            };

            const getProvince = (location) => {
                if (typeof location === 'object' && location.province) return location.province;
                return 'Western';
            };

            const getDistrict = (location) => {
                if (typeof location === 'object' && location.district) return location.district;
                return 'Colombo';
            };

            const budget = typeof project.budget === 'number' ? project.budget : (project.budget?.estimated || 0);

            setFormValues(prev => ({
                ...prev,
                Project_Type: getProjectType(project.projectType),
                Province: getProvince(project.location),
                District: getDistrict(project.location),
                Initial_Value: budget,
            }));
        }
    }, [project]);

    useEffect(() => {
        const districts = formValues.Province ? provinceDistrictMap[formValues.Province] || [] : [];
        setAvailableDistricts(districts);
        if (!districts.includes(formValues.District)) {
            setFormValues(prev => ({ ...prev, District: '' }));
        }
    }, [formValues.Province]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        await predictCost(formValues);
    };

    const parseIntOrEmpty = (val) => {
        const n = parseInt(val, 10);
        return Number.isNaN(n) ? '' : n;
    };

    const parseFloatOrEmpty = (val) => {
        const n = parseFloat(val);
        return Number.isNaN(n) ? '' : n;
    };

    const handleChange = (key, parser = (val) => val) => (e) => {
        const { value } = e.target;
        const parsed = value === '' ? '' : parser(value);
        setFormValues({ ...formValues, [key]: parsed });
    };

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-yellow-500/15 via-orange-500/10 to-transparent border border-yellow-500/25 rounded-2xl p-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="w-10 h-10 rounded-xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-yellow-200 hover:bg-yellow-500/30 transition-colors"
                                title="Back to Project"
                            >
                                ←
                            </button>
                        )}
                        <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-xl font-bold text-yellow-200">
                            CP
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">
                                Cost Prediction{project ? ` - ${project.name}` : ''}
                            </h2>
                            <p className="text-gray-300 text-sm">classification with SHAP explanations.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-yellow-300 bg-yellow-500/10 border border-yellow-500/30 px-3 py-1 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Live Model
                    </div>
                </div>
            </div>

            <div className={`grid grid-cols-1 ${isFormExpanded ? 'xl:grid-cols-1' : 'xl:grid-cols-3'} gap-6`}>
                <div className={isFormExpanded ? 'xl:col-span-1' : 'xl:col-span-1'}>
                    <form onSubmit={handleSubmit} className={`bg-dark-800/60 border border-white/5 rounded-2xl p-5 space-y-4 ${isFormExpanded ? 'max-h-none' : 'max-h-[780px]'} overflow-y-auto`}>
                        <div className="flex items-center justify-between sticky top-0 bg-dark-800/80 pb-3">
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-300 text-xs rounded-full">Inputs</span>
                                <h3 className="text-lg font-semibold text-white">Project Parameters</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                {error && <span className="text-xs text-red-400">{error}</span>}
                                <button
                                    type="button"
                                    onClick={() => setIsFormExpanded(!isFormExpanded)}
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

                        <div className={`grid ${isFormExpanded ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2'} gap-3`}>
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-gray-400 mb-1">Type of Project</label>
                                <select
                                    value={formValues.Project_Type}
                                    onChange={handleChange('Project_Type')}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                >
                                    <option value="">Select Project Type</option>
                                    <option value="House">House</option>
                                    <option value="Duplex">Duplex</option>
                                    <option value="Townhouse">Townhouse</option>
                                    <option value="Apartment">Apartment</option>
                                    <option value="Condominium">Condominium</option>
                                    <option value="Commercial">Commercial</option>
                                    <option value="Infrastructure">Infrastructure</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Province</label>
                                <select
                                    value={formValues.Province}
                                    onChange={handleChange('Province')}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                >
                                    <option value="">Select Province</option>
                                    {Object.keys(provinceDistrictMap).map(province => (
                                        <option key={province} value={province}>{province}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">District</label>
                                <select
                                    value={formValues.District}
                                    onChange={handleChange('District')}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
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
                                    onChange={handleChange('Season')}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                >
                                    <option value="">Select Season</option>
                                    <option value="Monsoon">Monsoon</option>
                                    <option value="Dry">Dry</option>
                                    <option value="Inter-Monsoon">Inter-Monsoon</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Year of Tender</label>
                                <input
                                    type="number"
                                    min="1900"
                                    value={formValues.Year_of_Tender}
                                    onChange={handleChange('Year_of_Tender', parseIntOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">CIDA Grade</label>
                                <input
                                    type="text"
                                    value={formValues.CIDA_Grade}
                                    onChange={handleChange('CIDA_Grade')}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                            </div>
                        </div>

                        <div className={`grid ${isFormExpanded ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2'} gap-3`}>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Floors</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formValues.Floors}
                                    onChange={handleChange('Floors', parseIntOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Area (SQFT)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formValues.Area_SQFT}
                                    onChange={handleChange('Area_SQFT', parseFloatOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Rate per SQFT</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formValues.Rate_per_SQFT}
                                    onChange={handleChange('Rate_per_SQFT', parseFloatOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Initial Value</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formValues.Initial_Value}
                                    onChange={handleChange('Initial_Value', parseFloatOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Actual Duration (months)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formValues.Actual_Duration_Months}
                                    onChange={handleChange('Actual_Duration_Months', parseFloatOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                            </div>
                        </div>

                        <div className={`grid ${isFormExpanded ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2'} gap-3`}>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Initial Duration (months)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formValues.Initial_Period_Months}
                                    onChange={handleChange('Initial_Period_Months', parseFloatOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Time Overrun (months)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formValues.Time_Overrun_Months}
                                    onChange={handleChange('Time_Overrun_Months', parseFloatOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-3 col-span-full">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Start Month</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="12"
                                        value={formValues.Start_Month}
                                        onChange={handleChange('Start_Month', parseIntOrEmpty)}
                                        className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Start Quarter</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="4"
                                        value={formValues.Start_Quarter}
                                        onChange={handleChange('Start_Quarter', parseIntOrEmpty)}
                                        className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Start Weekday</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="6"
                                        value={formValues.Start_Weekday}
                                        onChange={handleChange('Start_Weekday', parseIntOrEmpty)}
                                        className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className={`grid ${isFormExpanded ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2'} gap-3`}>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Inflation Rate</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formValues.Inflation_Rate}
                                    onChange={handleChange('Inflation_Rate', parseFloatOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Material Price Index</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formValues.Material_Index}
                                    onChange={handleChange('Material_Index', parseFloatOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Exchange Rate</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formValues.Exchange_Rate_LKR}
                                    onChange={handleChange('Exchange_Rate_LKR', parseFloatOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Project Size Index</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formValues.Project_Size_Index}
                                    onChange={handleChange('Project_Size_Index', parseFloatOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                            </div>
                        </div>

                        <div className={`grid ${isFormExpanded ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2'} gap-3`}>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Contractor Experience (Years)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formValues.Contractor_Experience_Years}
                                    onChange={handleChange('Contractor_Experience_Years', parseIntOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Economic Risk Index</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formValues.Economic_Risk_Index}
                                    onChange={handleChange('Economic_Risk_Index', parseFloatOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Change Order Frequency</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formValues.Change_Order_Freq}
                                    onChange={handleChange('Change_Order_Freq', parseIntOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Project Complexity Score</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formValues.Complexity_Score}
                                    onChange={handleChange('Complexity_Score', parseIntOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                            </div>
                        </div>

                        <div className={`grid ${isFormExpanded ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2'} gap-3`}>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Design Risk Score</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formValues.Design_Risk_Score}
                                    onChange={handleChange('Design_Risk_Score', parseFloatOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Contractor Risk Score</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formValues.Contractor_Risk_Score}
                                    onChange={handleChange('Contractor_Risk_Score', parseFloatOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Weather Risk Score</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formValues.Weather_Risk_Score}
                                    onChange={handleChange('Weather_Risk_Score', parseFloatOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Design Completeness</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formValues.Design_Completeness}
                                    onChange={handleChange('Design_Completeness', parseFloatOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm">
                                <p className="text-red-400">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${loading
                                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-400 hover:to-orange-400'
                                }`}
                        >
                            {loading ? 'Predicting...' : 'Predict Cost Overrun'}
                        </button>
                    </form>
                </div>

                <div className="xl:col-span-2 space-y-4">
                    {hasPrediction ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className={`bg-dark-800/70 border rounded-xl p-5 text-center ${isHighRisk ? 'border-red-500/50 bg-red-500/10' : 'border-white/5 bg-green-500/10'}`}>
                                    <p className="text-sm text-gray-400 mb-2">Risk Status</p>
                                    <p className={`text-3xl font-bold ${isHighRisk ? 'text-red-400' : 'text-green-400'}`}>
                                        {prediction?.risk_label || (isHighRisk ? 'HIGH' : 'LOW')}
                                    </p>
                                </div>
                                <div className="bg-dark-800/70 border border-white/5 rounded-xl p-5 text-center">
                                    <p className="text-sm text-gray-400 mb-2">Cost Overrun %</p>
                                    <p className={`text-3xl font-bold ${(overrunPct ?? 0) > 10 ? 'text-red-400' : 'text-green-400'}`}>
                                        {overrunPct != null ? overrunPct.toFixed(2) : 'N/A'}{overrunPct != null ? '%' : ''}
                                    </p>
                                </div>
                                <div className="bg-dark-800/70 border border-white/5 rounded-xl p-5 text-center">
                                    <p className="text-sm text-gray-400 mb-2">Overrun Probability</p>
                                    <p className="text-3xl font-bold text-white">
                                        {hasProbability ? `${(probabilityValue * 100).toFixed(1)}%` : 'N/A'}
                                    </p>
                                    <div className="w-full h-2 bg-dark-700 rounded-full mt-2 overflow-hidden">
                                        <div
                                            className={`h-full transition-all ${hasProbability ? ((probabilityValue ?? 0) > 0.7 ? 'bg-red-500' : (probabilityValue ?? 0) > 0.4 ? 'bg-yellow-500' : 'bg-green-500') : 'bg-gray-500'}`}
                                            style={{ width: hasProbability ? `${((probabilityValue ?? 0) * 100)}%` : '0%' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-dark-800/70 border border-white/5 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">Prediction Details</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="p-4 bg-dark-700/50 rounded-lg">
                                        <p className="text-gray-400 mb-1">Predicted Overrun</p>
                                        <p className="text-2xl font-bold text-yellow-400">
                                            {overrunPct != null ? `${overrunPct.toFixed(2)}%` : 'N/A'}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-dark-700/50 rounded-lg">
                                        <p className="text-gray-400 mb-1">Risk Probability</p>
                                        <p className="text-2xl font-bold text-orange-400">
                                            {hasProbability ? `${(probabilityValue * 100).toFixed(1)}%` : 'N/A'}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-dark-700/50 rounded-lg">
                                        <p className="text-gray-400 mb-1">Risk Classification</p>
                                        <p className={`text-lg font-bold ${isHighRisk ? 'text-red-400' : 'text-green-400'}`}>
                                            {isHighRisk ? 'HIGH RISK' : 'LOW RISK'}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-dark-700/50 rounded-lg">
                                        <p className="text-gray-400 mb-1">Top Drivers</p>
                                        <p className="text-lg font-bold text-blue-400">{topRiskFactors.length}</p>
                                    </div>
                                </div>
                            </div>

                            {topRiskFactors.length > 0 && (
                                <div className="bg-dark-800/70 border border-white/5 rounded-2xl p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">Top Risk Factors Diagram</h3>
                                    <div className="space-y-3">
                                        {topRiskFactors.slice(0, 10).map((item, idx) => {
                                            const impact = Number(item.impact) || 0;
                                            const widthPct = Math.max(4, (impact / maxImpact) * 100);

                                            return (
                                                <div key={`${item.feature}-${idx}`} className="space-y-1">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <p className="text-gray-200 font-medium truncate pr-2">{item.feature}</p>
                                                        <p className="text-gray-400 tabular-nums">{impact.toFixed(4)}</p>
                                                    </div>
                                                    <div className="w-full h-2.5 bg-dark-700 rounded-full overflow-hidden border border-white/5">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300"
                                                            style={{ width: `${widthPct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {riskScorecard.length > 0 && (
                                <div className="bg-dark-800/70 border border-white/5 rounded-2xl p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">Risk Scorecard Diagram</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                        {riskScorecard.slice(0, 5).map((item, idx) => {
                                            const impactLevel = item.impact || 'Low';
                                            const impactWidth = impactLevel === 'High' ? 100 : impactLevel === 'Medium' ? 65 : 35;

                                            return (
                                                <div key={`${item.feature}-${idx}`} className="p-4 bg-dark-700/50 rounded-lg border border-white/5">
                                                    <div className="flex items-center justify-between gap-2 mb-2">
                                                        <p className="text-gray-200 font-semibold truncate">{item.feature}</p>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${getImpactColor(impactLevel)}`}>
                                                            {impactLevel}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-400 mb-2">
                                                        Value: <span className="text-gray-200 font-medium">{String(item.feature_value)}</span>
                                                    </p>
                                                    <div className="w-full h-2 bg-dark-800 rounded-full overflow-hidden border border-white/5 mb-2">
                                                        <div
                                                            className={`h-full ${impactLevel === 'High' ? 'bg-red-500' : impactLevel === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'}`}
                                                            style={{ width: `${impactWidth}%` }}
                                                        />
                                                    </div>
                                                    <p className="text-xs text-gray-300">{item.status}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="bg-dark-800/70 border border-white/5 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">Model Information</h3>
                                <div className="space-y-2 text-sm text-gray-400">
                                    <p><span className="text-gray-300 font-medium">Model Type:</span> GradientBoosting + RandomForest + SHAP</p>
                                    {prediction?.model_version && (
                                        <p><span className="text-gray-300 font-medium">Model Version:</span> {prediction.model_version}</p>
                                    )}
                                    <p><span className="text-gray-300 font-medium">Input Features:</span> 28 parameters</p>
                                    {prediction.timestamp && (
                                        <p><span className="text-gray-300 font-medium">Prediction Timestamp:</span> {new Date(prediction.timestamp).toLocaleString()}</p>
                                    )}
                                    <p><span className="text-gray-300 font-medium">Status:</span> <span className="text-green-400">Successful</span></p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={clearPrediction}
                                    className="flex-1 px-6 py-3 rounded-xl font-semibold bg-dark-700 border border-white/10 text-gray-300 hover:border-white/20 transition-all"
                                >
                                    Clear
                                </button>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="px-6 py-3 rounded-xl font-semibold bg-dark-700 border border-white/10 text-gray-300 hover:border-white/20 transition-all"
                                >
                                    Reset Form
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full min-h-[400px] bg-dark-800/50 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center p-10">
                            <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-2xl text-yellow-200">?</div>
                            <p className="text-white text-lg font-semibold">Run a prediction</p>
                            <p className="text-gray-400 text-sm mt-2">Fill in the project parameters and get ML-based risk insights with SHAP drivers.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CostPredictionView;

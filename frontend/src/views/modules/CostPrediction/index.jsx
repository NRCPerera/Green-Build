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
        // Type_of_Project: '',
        // Province: '',
        // District: '',
        // Season_of_Start: '',
        // Grade_of_contractor: '',
        // Floors: '',
        // Area_SQFT: '',
        // Year_of_Tender: '',
        // Rate_per_SQFT: '',
        // Initial_Contract_Value: '',
        // Initial_period_construction: '',
        // Design_Completeness: '',
        // Project_Complexity_Score: '',
        // Inflation_Rate: '',
        // Material_Price_Index: '',
        // Exchange_Rate: '',
        // Interest_Rate: '',
        // Contractor_Experience_Years: '',
        // Contractor_Previous_Projects: '',
        // Change_Order_Frequency: '',
        // Amount_Variations: '',
        // Amount_S_Change: '',
        // Amount_PF: '',
        // Adjusted_Contract_Sum: '',
        // Start_Date: '',
        // End_Date: ''
        "Type_of_Project": "Residential-House",
  "Province": "Western",
  "District": "Colombo",
  "Season_of_Start": "Dry Season",
  "Grade_of_contractor": "C1",
  "Floors": 2,
  "Area_SQFT": 2500,
  "Year_of_Tender": 2024,
  "Rate_per_SQFT": 9500,
  "Initial_Contract_Value": 23750000,
  "Initial_period_construction": 10,
  "Design_Completeness": 90,
  "Project_Complexity_Score": 4,
  "Inflation_Rate": 4.5,
  "Material_Price_Index": 140,
  "Exchange_Rate": 285,
  "Interest_Rate": 9.5,
  "Contractor_Experience_Years": 15,
  "Contractor_Previous_Projects": 30,
  "Change_Order_Frequency": 1,
  "Amount_Variations": 500000,
  "Amount_S_Change": 200000,
  "Amount_PF": 150000,
  "Adjusted_Contract_Sum": 24200000
    });

    const [availableDistricts, setAvailableDistricts] = useState([]);
    const [isFormExpanded, setIsFormExpanded] = useState(false);

    const { loading, error, prediction, hasPrediction, predictCost, clearPrediction } = useCostController();

    const riskFlag = prediction?.high_risk_label;
    const isHighRisk = riskFlag === true || riskFlag === 1 || prediction?.risk_label === 'HIGH';
    const overrunPct = prediction?.predicted_cost_overrun_pct;
    const hasProbability = typeof prediction?.overrun_probability === 'number';

    // Pre-fill form with project data
    useEffect(() => {
        if (project) {
            const getProjectType = (type) => {
                if (!type) return 'Residential-House';
                const typeMap = {
                    'residential': 'Residential-House',
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
                Type_of_Project: getProjectType(project.projectType),
                Province: getProvince(project.location),
                District: getDistrict(project.location),
                Initial_Contract_Value: budget,
                Start_Date: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
                End_Date: project.expectedEndDate ? new Date(project.expectedEndDate).toISOString().split('T')[0] : '',
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
                                    value={formValues.Type_of_Project}
                                    onChange={handleChange('Type_of_Project')}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                >
                                    <option value="">Select Project Type</option>
                                    <option value="House">House</option>
                                    <option value="Duplex">Duplex</option>
                                    <option value="Townhouse">Townhouse</option>
                                    <option value="Apartment">Apartment</option>
                                    <option value="Condominium">Condominium</option>
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
                                    value={formValues.Season_of_Start}
                                    onChange={handleChange('Season_of_Start')}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                >
                                    <option value="">Select Season</option>
                                    <option>Southwest Monsoon</option>
                                    <option>Northeast Monsoon</option>
                                    <option>Inter Monsoon</option>
                                    <option>Dry Season</option>
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
                                <label className="block text-xs font-medium text-gray-400 mb-1">Grade of Contractor</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formValues.Grade_of_contractor}
                                    onChange={handleChange('Grade_of_contractor', parseIntOrEmpty)}
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
                                <label className="block text-xs font-medium text-gray-400 mb-1">Initial Contract Value</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formValues.Initial_Contract_Value}
                                    onChange={handleChange('Initial_Contract_Value', parseFloatOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Adjusted Contract Sum</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formValues.Adjusted_Contract_Sum}
                                    onChange={handleChange('Adjusted_Contract_Sum', parseFloatOrEmpty)}
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
                                    value={formValues.Initial_period_construction}
                                    onChange={handleChange('Initial_period_construction', parseIntOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3 col-span-full">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        value={formValues.Start_Date}
                                        onChange={handleChange('Start_Date')}
                                        className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        value={formValues.End_Date}
                                        onChange={handleChange('End_Date')}
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
                                    value={formValues.Material_Price_Index}
                                    onChange={handleChange('Material_Price_Index', parseFloatOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Exchange Rate</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formValues.Exchange_Rate}
                                    onChange={handleChange('Exchange_Rate', parseFloatOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Interest Rate</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formValues.Interest_Rate}
                                    onChange={handleChange('Interest_Rate', parseFloatOrEmpty)}
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
                                <label className="block text-xs font-medium text-gray-400 mb-1">Contractor Previous Projects</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formValues.Contractor_Previous_Projects}
                                    onChange={handleChange('Contractor_Previous_Projects', parseIntOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Change Order Frequency</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formValues.Change_Order_Frequency}
                                    onChange={handleChange('Change_Order_Frequency', parseIntOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Project Complexity Score</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formValues.Project_Complexity_Score}
                                    onChange={handleChange('Project_Complexity_Score', parseFloatOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                            </div>
                        </div>

                        <div className={`grid ${isFormExpanded ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2'} gap-3`}>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Amount Variations</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formValues.Amount_Variations}
                                    onChange={handleChange('Amount_Variations', parseFloatOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Amount S Change</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formValues.Amount_S_Change}
                                    onChange={handleChange('Amount_S_Change', parseFloatOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Amount PF</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formValues.Amount_PF}
                                    onChange={handleChange('Amount_PF', parseFloatOrEmpty)}
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
                                        {hasProbability ? `${(prediction.overrun_probability * 100).toFixed(1)}%` : 'N/A'}
                                    </p>
                                    <div className="w-full h-2 bg-dark-700 rounded-full mt-2 overflow-hidden">
                                        <div
                                            className={`h-full transition-all ${hasProbability ? ((prediction?.overrun_probability ?? 0) > 0.7 ? 'bg-red-500' : (prediction?.overrun_probability ?? 0) > 0.4 ? 'bg-yellow-500' : 'bg-green-500') : 'bg-gray-500'}`}
                                            style={{ width: hasProbability ? `${((prediction?.overrun_probability ?? 0) * 100)}%` : '0%' }}
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
                                            {hasProbability ? `${(prediction.overrun_probability * 100).toFixed(1)}%` : 'N/A'}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-dark-700/50 rounded-lg">
                                        <p className="text-gray-400 mb-1">Risk Classification</p>
                                        <p className={`text-lg font-bold ${isHighRisk ? 'text-red-400' : 'text-green-400'}`}>
                                            {prediction?.risk_label ? `${prediction.risk_label} RISK` : (isHighRisk ? 'HIGH RISK' : 'LOW RISK')}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-dark-700/50 rounded-lg">
                                        <p className="text-gray-400 mb-1">Threshold</p>
                                        <p className="text-lg font-bold text-blue-400">{prediction?.threshold ?? 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {prediction.shap_explanation && prediction.shap_explanation.length > 0 && (
                                <div className="bg-dark-800/70 border border-white/5 rounded-2xl p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">Top SHAP Drivers</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                        {prediction.shap_explanation.map((item, idx) => (
                                            <div key={`${item.feature}-${idx}`} className="p-3 bg-dark-700/50 rounded-lg border border-white/5">
                                                <p className="text-gray-300 font-semibold truncate">{item.feature}</p>
                                                <p className="text-sm text-gray-400">Impact: {item.impact}</p>
                                                <p className={`text-sm font-semibold ${item.direction === 'increase' ? 'text-red-400' : 'text-green-400'}`}>
                                                    {item.direction === 'increase' ? 'Increases risk' : 'Lowers risk'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="bg-dark-800/70 border border-white/5 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">Model Information</h3>
                                <div className="space-y-2 text-sm text-gray-400">
                                    <p><span className="text-gray-300 font-medium">Model Type:</span> ANN Regression + Classification</p>
                                    {prediction?.model_version && (
                                        <p><span className="text-gray-300 font-medium">Model Version:</span> {prediction.model_version}</p>
                                    )}
                                    <p><span className="text-gray-300 font-medium">Input Features:</span> 25 parameters</p>
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

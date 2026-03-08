import { useState, useEffect } from 'react';
import useDelayController from '../../../controllers/useDelayController';

/**
 * Delay Forecast View
 * 
 * ML-powered construction delay prediction with:
 * - Regression: Predicts total delay days with P10/P90 uncertainty
 * - Classification: Categorizes delay severity (No Delay, Minor, Major, Critical)
 * - SHAP explainability for individual predictions
 */
const DelayForecastView = ({ project, onBack }) => {
    const [formValues, setFormValues] = useState({
        // ==========================================
        // DISPLAY-ONLY FIELDS (Not sent to ML model)
        // ==========================================
        projectName: 'Green Tower Complex',
        clientName: 'ABC Developers Ltd.',
        projectStartDate: '2026-02-01',
        siteLocation: 'Colombo 03, Near Independence Square',
        projectManager: 'John Silva',
        contractValue: 100000000,
        plannedDurationMonths: 12,

        // ==========================================
        // ML MODEL INPUT FIELDS (Sent to prediction API)
        // These MUST match the trained model's feature names
        // from DataSet.xlsx and train_regression.py / train_classification.py
        // ==========================================
        // Categorical features (7)
        province: 'Western',                        // Province: Western, Southern
        district: 'Colombo',                        // District: Colombo (Western), Galle (Southern)
        location: 'Dehiwala',                       // Location: 20 specific locations from dataset
        projectType: 'House',                       // Project_Type: Residential, Apartment, House
        contractorGrade: 'C4',                      // Contractor_ICTAD_Grade: C3, C4, C5
        startSeason: 'Dry Season',                  // Start_Season: Dry Season, Inter-Monsoon (Mar-Apr), Inter-Monsoon (Oct-Nov), Southwest Monsoon
        paymentDelayHistory: 'Minor',               // Payment_Delay_History: Minor, Moderate, Severe

        // Numeric features (11)
        floors: 6,                                  // Floors: 1-25
        contractorExperience: 12,                   // Contractor_Experience_Years: 5-22
        contractorPastDelayRate: 0.19,              // Contractor_Past_Delay_Rate: 0.02-0.476
        contractorPreviousProjects: 23,             // Contractor_Previous_Projects: 3-60
        labourPoolSize: 108,                        // Labour_Pool_Size: 20-250
        labourAssigned: 47,                         // Labour_Assigned_To_Project: 10-249
        plannedDurationDays: 545,                   // Planned_Duration_Days: 141-1589
        weatherImpactDays: 63,                      // Weather_Impact_Days: 0-120
        designChangeOrders: 14,                     // Design_Change_Orders: 2-30
        materialDeliveryDelay: 31,                  // Material_Delivery_Delay_Days: 4-90
        paymentDelayDays: 29,                       // Payment_Delay_Days: 4-90
    });

    const {
        loading,
        error,
        forecast,
        hasForecast,
        mlServiceStatus,
        predictDelay,
        checkMlHealth,
        clearForecast,
        getCategoryColor,
        getCategoryBgColor,
        formatDelayDays,
    } = useDelayController();

    // Check ML service health on mount
    useEffect(() => {
        checkMlHealth();
    }, [checkMlHealth]);

    // Pre-fill form with project data
    useEffect(() => {
        if (project) {
            const getProvince = (location) => {
                if (typeof location === 'object' && location.province) return location.province;
                return 'Western';
            };

            const getDistrict = (location) => {
                if (typeof location === 'object' && location.district) return location.district;
                return 'Colombo';
            };

            const getLocation = (location) => {
                if (typeof location === 'string') return location;
                const addressParts = [location?.address, location?.city, location?.district, location?.province].filter(Boolean);
                return addressParts.join(', ');
            };

            const budget = typeof project.budget === 'number' ? project.budget : (project.budget?.estimated || 0);
            const clientName = project.clientName || project.client?.name || '';

            setFormValues(prev => ({
                ...prev,
                projectName: project.name || prev.projectName,
                clientName: clientName || prev.clientName,
                projectStartDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : prev.projectStartDate,
                siteLocation: getLocation(project.location) || prev.siteLocation,
                contractValue: budget || prev.contractValue,
                province: getProvince(project.location),
                district: getDistrict(project.location),
                projectType: project.projectType === 'residential' ? 'Residential' :
                    project.projectType === 'apartment' ? 'Apartment' :
                        project.projectType === 'house' ? 'House' : prev.projectType,
            }));
        }
    }, [project]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        await predictDelay(formValues);
    };

    const handleReset = () => {
        clearForecast();
    };

    // Province -> District -> Location mapping (matches DataSet.xlsx exactly)
    const provinceDistrictMap = {
        'Western': ['Colombo'],
        'Southern': ['Galle'],
    };

    // District -> Location mapping (matches DataSet.xlsx exactly)
    const districtLocationMap = {
        'Colombo': ['Borella', 'Dehiwala', 'Kollupitiya', 'Kottawa', 'Maharagama', 'Moratuwa', 'Nugegoda', 'Piliyandala', 'Ratmalana', 'Wellampitiya'],
        'Galle': ['Ambalangoda', 'Baddegama', 'Balapitiya', 'Bentota', 'Elpitiya', 'Galle Fort', 'Hikkaduwa', 'Karapitiya', 'Kosgoda', 'Unawatuna'],
    };

    const provinces = Object.keys(provinceDistrictMap);

    // Get districts based on selected province
    const availableDistricts = provinceDistrictMap[formValues.province] || [];

    // Get locations based on selected district
    const availableLocations = districtLocationMap[formValues.district] || [];

    // Handle province change - cascade reset district and location
    const handleProvinceChange = (newProvince) => {
        const newDistricts = provinceDistrictMap[newProvince] || [];
        const newDistrict = newDistricts[0] || '';
        const newLocations = districtLocationMap[newDistrict] || [];
        setFormValues({
            ...formValues,
            province: newProvince,
            district: newDistrict,
            location: newLocations[0] || '',
        });
    };

    // Handle district change - cascade reset location
    const handleDistrictChange = (newDistrict) => {
        const newLocations = districtLocationMap[newDistrict] || [];
        setFormValues({
            ...formValues,
            district: newDistrict,
            location: newLocations[0] || '',
        });
    };

    // Dropdown options matching DataSet.xlsx exactly
    const projectTypes = ['Residential', 'Apartment', 'House'];

    const contractorGrades = ['C3', 'C4', 'C5'];

    const seasons = [
        'Dry Season',
        'Inter-Monsoon (Mar-Apr)',
        'Inter-Monsoon (Oct-Nov)',
        'Southwest Monsoon',
    ];

    const paymentDelayHistoryOptions = ['Minor', 'Moderate', 'Severe'];

    return (
        <div className="space-y-6">
            {/* Module Header */}
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-200 hover:bg-blue-500/30 transition-colors"
                                title="Back to Project"
                            >
                                ←
                            </button>
                        )}
                        <span className="text-4xl">⏱️</span>
                        <div>
                            <h2 className="text-2xl font-bold text-white">
                                Delay Prediction{project ? ` - ${project.name}` : ' Module'}
                            </h2>
                            <p className="text-gray-400 mt-1">
                                AI-powered construction delay forecasting for Sri Lanka projects
                            </p>
                        </div>
                    </div>
                    {/* ML Service Status Indicator */}
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${mlServiceStatus?.mlService?.status === 'healthy'
                            ? 'bg-green-500 animate-pulse'
                            : 'bg-red-500'
                            }`} />
                        <span className="text-sm text-gray-400">
                            ML Service: {mlServiceStatus?.mlService?.status || 'Checking...'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                    <p className="text-red-400">⚠️ {error}</p>
                    <p className="text-gray-400 text-sm mt-1">Using mock predictions as fallback.</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Input Form */}
                <div className="lg:col-span-1">
                    <form onSubmit={handleSubmit} className="bg-dark-800/50 border border-white/5 rounded-2xl p-6 space-y-5">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            📋 Project Parameters
                        </h3>

                        {/* Province */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Province</label>
                            <select
                                value={formValues.province}
                                onChange={(e) => handleProvinceChange(e.target.value)}
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {provinces.map((p) => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>

                        {/* District - Filtered by Province */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">District</label>
                            <select
                                value={formValues.district}
                                onChange={(e) => handleDistrictChange(e.target.value)}
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {availableDistricts.map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                Showing districts in {formValues.province} Province
                            </p>
                        </div>

                        {/* Location - Filtered by District */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Location / City</label>
                            <select
                                value={formValues.location}
                                onChange={(e) => setFormValues({ ...formValues, location: e.target.value })}
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {availableLocations.map((loc) => (
                                    <option key={loc} value={loc}>{loc}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                Showing locations in {formValues.district} District
                            </p>
                        </div>

                        {/* Project Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Project Type</label>
                            <select
                                value={formValues.projectType}
                                onChange={(e) => setFormValues({ ...formValues, projectType: e.target.value })}
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {projectTypes.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>

                        {/* Contractor Grade */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Contractor ICTAD Grade</label>
                            <select
                                value={formValues.contractorGrade}
                                onChange={(e) => setFormValues({ ...formValues, contractorGrade: e.target.value })}
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {contractorGrades.map((g) => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                        </div>

                        {/* Start Season */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Start Season</label>
                            <select
                                value={formValues.startSeason}
                                onChange={(e) => setFormValues({ ...formValues, startSeason: e.target.value })}
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {seasons.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>

                        {/* Floors */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Number of Floors
                            </label>
                            <input
                                type="number"
                                value={formValues.floors}
                                onChange={(e) => setFormValues({ ...formValues, floors: parseInt(e.target.value) || 1 })}
                                min="1"
                                max="25"
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Dataset range: 1–25 floors
                            </p>
                        </div>

                        {/* Divider for Timeline Section */}
                        <div className="border-t border-white/10 pt-4">
                            <h4 className="text-sm font-semibold text-blue-400 mb-3">📅 Project Timeline</h4>
                        </div>

                        {/* Project Start Date (display-only, not sent to ML) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Project Start Date
                            </label>
                            <input
                                type="date"
                                value={formValues.projectStartDate}
                                onChange={(e) => setFormValues({ ...formValues, projectStartDate: e.target.value })}
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Planned Duration Days (ML feature: Planned_Duration_Days) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Planned Duration (days)
                            </label>
                            <input
                                type="number"
                                value={formValues.plannedDurationDays}
                                onChange={(e) => setFormValues({ ...formValues, plannedDurationDays: parseInt(e.target.value) || 141 })}
                                min="141"
                                max="1589"
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Dataset range: 141–1589 days (~5–53 months)
                            </p>
                        </div>

                        {/* Divider for Contractor Section */}
                        <div className="border-t border-white/10 pt-4">
                            <h4 className="text-sm font-semibold text-purple-400 mb-3">👷 Contractor Details</h4>
                        </div>

                        {/* Contractor Experience */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Contractor Experience (years)
                            </label>
                            <input
                                type="range"
                                value={formValues.contractorExperience}
                                onChange={(e) => setFormValues({ ...formValues, contractorExperience: parseInt(e.target.value) })}
                                min="5"
                                max="22"
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>5 years</span>
                                <span className="text-blue-400 font-medium">{formValues.contractorExperience} years</span>
                                <span>22 years</span>
                            </div>
                        </div>

                        {/* Contractor Past Delay Rate */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Contractor Past Delay Rate
                            </label>
                            <input
                                type="range"
                                value={formValues.contractorPastDelayRate}
                                onChange={(e) => setFormValues({ ...formValues, contractorPastDelayRate: parseFloat(e.target.value) })}
                                min="0.02"
                                max="0.48"
                                step="0.01"
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>2%</span>
                                <span className="text-blue-400 font-medium">{(formValues.contractorPastDelayRate * 100).toFixed(0)}%</span>
                                <span>48%</span>
                            </div>
                        </div>

                        {/* Contractor Previous Projects */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Contractor Previous Projects
                            </label>
                            <input
                                type="number"
                                value={formValues.contractorPreviousProjects}
                                onChange={(e) => setFormValues({ ...formValues, contractorPreviousProjects: parseInt(e.target.value) || 3 })}
                                min="3"
                                max="60"
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Dataset range: 3–60 projects
                            </p>
                        </div>

                        {/* Divider for Labour Section */}
                        <div className="border-t border-white/10 pt-4">
                            <h4 className="text-sm font-semibold text-cyan-400 mb-3">👥 Labour</h4>
                        </div>

                        {/* Labour Pool Size */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Labour Pool Size
                            </label>
                            <input
                                type="number"
                                value={formValues.labourPoolSize}
                                onChange={(e) => setFormValues({ ...formValues, labourPoolSize: parseInt(e.target.value) || 20 })}
                                min="20"
                                max="250"
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Total workers available in the area (dataset: 20–250)
                            </p>
                        </div>

                        {/* Labour Assigned To Project */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Labour Assigned To Project
                            </label>
                            <input
                                type="number"
                                value={formValues.labourAssigned}
                                onChange={(e) => setFormValues({ ...formValues, labourAssigned: parseInt(e.target.value) || 10 })}
                                min="10"
                                max="249"
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Workers assigned specifically to this project (dataset: 10–249)
                            </p>
                        </div>

                        {/* Divider for Risk Factors Section */}
                        <div className="border-t border-white/10 pt-4">
                            <h4 className="text-sm font-semibold text-orange-400 mb-3">⚠️ Risk Factors</h4>
                        </div>

                        {/* Weather Impact Days */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Expected Weather Impact (days)
                            </label>
                            <input
                                type="number"
                                value={formValues.weatherImpactDays}
                                onChange={(e) => setFormValues({ ...formValues, weatherImpactDays: parseInt(e.target.value) || 0 })}
                                min="0"
                                max="120"
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Expected days of weather-related disruptions (dataset: 0–120)
                            </p>
                        </div>

                        {/* Design Change Orders */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Design Change Orders
                            </label>
                            <input
                                type="number"
                                value={formValues.designChangeOrders}
                                onChange={(e) => setFormValues({ ...formValues, designChangeOrders: parseInt(e.target.value) || 2 })}
                                min="2"
                                max="30"
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Number of expected design change requests (dataset: 2–30)
                            </p>
                        </div>

                        {/* Material Delivery Delay */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Material Delivery Delay (days)
                            </label>
                            <input
                                type="number"
                                value={formValues.materialDeliveryDelay}
                                onChange={(e) => setFormValues({ ...formValues, materialDeliveryDelay: parseInt(e.target.value) || 4 })}
                                min="4"
                                max="90"
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Dataset range: 4–90 days
                            </p>
                        </div>

                        {/* Payment Delay History (Categorical: Minor/Moderate/Severe) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Payment Delay History
                            </label>
                            <select
                                value={formValues.paymentDelayHistory}
                                onChange={(e) => setFormValues({ ...formValues, paymentDelayHistory: e.target.value })}
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {paymentDelayHistoryOptions.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                Severity of past payment delay history
                            </p>
                        </div>

                        {/* Payment Delay Days (Numeric) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Payment Delay (days)
                            </label>
                            <input
                                type="number"
                                value={formValues.paymentDelayDays}
                                onChange={(e) => setFormValues({ ...formValues, paymentDelayDays: parseInt(e.target.value) || 4 })}
                                min="4"
                                max="90"
                                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Expected payment delay in days (dataset: 4–90)
                            </p>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className={`
                                w-full px-6 py-3 rounded-xl font-semibold transition-all
                                ${loading
                                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-400 hover:to-purple-400'
                                }
                            `}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Predicting...
                                </span>
                            ) : '🔮 Predict Delay'}
                        </button>

                        {hasForecast && (
                            <button
                                type="button"
                                onClick={handleReset}
                                className="w-full px-6 py-3 rounded-xl font-semibold transition-all
                                         bg-gray-700 text-gray-300 hover:bg-gray-600"
                            >
                                Reset
                            </button>
                        )}
                    </form>
                </div>

                {/* Results */}
                <div className="lg:col-span-2">
                    {hasForecast ? (
                        <div className="space-y-6">
                            {/* Mock Data Indicator */}
                            {forecast.source === 'mock_prediction' && (
                                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
                                    <p className="text-yellow-400 text-sm">⚠️ Using mock prediction (ML service may be unavailable)</p>
                                </div>
                            )}

                            {/* Key Metrics */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {/* Predicted Delay Days */}
                                <div className="bg-dark-800/50 border border-white/5 rounded-xl p-5 text-center">
                                    <p className="text-sm text-gray-400 mb-2">Predicted Delay</p>
                                    <p className="text-3xl font-bold text-orange-400">
                                        {Math.round(forecast.predictedDelayDays)}
                                    </p>
                                    <p className="text-sm text-gray-500">days</p>
                                </div>

                                {/* Delay Category */}
                                <div className={`border rounded-xl p-5 text-center ${getCategoryBgColor(forecast.predictedCategory)}`}>
                                    <p className="text-sm text-gray-400 mb-2">Category</p>
                                    <p className={`text-lg font-bold ${getCategoryColor(forecast.predictedCategory)}`}>
                                        {forecast.predictedCategory}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {(forecast.categoryConfidence * 100).toFixed(0)}% confidence
                                    </p>
                                </div>

                                {/* Risk Level */}
                                <div className="bg-dark-800/50 border border-white/5 rounded-xl p-5 text-center">
                                    <p className="text-sm text-gray-400 mb-2">Risk Level</p>
                                    <p className={`text-xl font-bold ${forecast.riskLevel === 'Critical' ? 'text-red-500' :
                                        forecast.riskLevel === 'High' ? 'text-orange-400' :
                                            forecast.riskLevel === 'Medium' ? 'text-yellow-400' : 'text-green-400'
                                        }`}>
                                        {forecast.riskLevel}
                                    </p>
                                </div>

                                {/* Completion Date */}
                                <div className="bg-dark-800/50 border border-white/5 rounded-xl p-5 text-center">
                                    <p className="text-sm text-gray-400 mb-2">Expected Completion</p>
                                    <p className="text-lg font-bold text-white">
                                        {new Date(forecast.predictedCompletionDate).toLocaleDateString('en-GB', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric'
                                        })}
                                    </p>
                                </div>
                            </div>

                            {/* Class Probabilities */}
                            <div className="bg-dark-800/50 border border-white/5 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">📊 Category Probabilities</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {Object.entries(forecast.classProbabilities || {}).map(([category, probability]) => (
                                        <div key={category} className="text-center">
                                            <div className="relative h-24 w-24 mx-auto">
                                                <svg className="transform -rotate-90 w-24 h-24">
                                                    <circle
                                                        className="text-gray-700"
                                                        strokeWidth="8"
                                                        stroke="currentColor"
                                                        fill="transparent"
                                                        r="36"
                                                        cx="48"
                                                        cy="48"
                                                    />
                                                    <circle
                                                        className={getCategoryColor(category).replace('text-', 'text-')}
                                                        strokeWidth="8"
                                                        strokeLinecap="round"
                                                        stroke="currentColor"
                                                        fill="transparent"
                                                        r="36"
                                                        cx="48"
                                                        cy="48"
                                                        strokeDasharray={`${probability * 226} 226`}
                                                    />
                                                </svg>
                                                <span className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${getCategoryColor(category)}`}>
                                                    {(probability * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-400 mt-2">{category}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* SHAP Feature Explainer */}
                            {forecast.shapValues && Object.keys(forecast.shapValues).length > 0 && (
                                <div className="bg-dark-800/50 border border-white/5 rounded-2xl p-6">
                                    <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                                        🧠 AI Model Reasoning
                                    </h3>
                                    <p className="text-sm text-gray-400 mb-6">
                                        Top factors influencing this specific delay prediction based on SHAP feature importance.
                                    </p>

                                    <div className="space-y-4">
                                        {Object.entries(forecast.shapValues)
                                            .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                                            .slice(0, 6) // Top 6 features
                                            .map(([feature, impact], idx) => {
                                                const isPositive = impact > 0;
                                                const maxAbs = Math.max(...Object.values(forecast.shapValues).map(v => Math.abs(v)));
                                                const widthPct = Math.min(100, (Math.abs(impact) / maxAbs) * 100);

                                                // Format feature name to be readable (e.g. "Contractor_Experience_Years" -> "Contractor Experience Years")
                                                const readableFeature = feature.replace(/_/g, ' ');

                                                return (
                                                    <div key={idx} className="relative">
                                                        <div className="flex justify-between text-sm mb-1">
                                                            <span className="text-gray-300 font-medium">{readableFeature}</span>
                                                            <span className={isPositive ? 'text-red-400' : 'text-green-400'}>
                                                                {isPositive ? 'Increases Delay' : 'Reduces Delay'}
                                                            </span>
                                                        </div>
                                                        <div className="h-2 w-full bg-dark-700 rounded-full overflow-hidden flex">
                                                            {/* If Reduces Delay (Negative), fill from Right to Left from center */}
                                                            <div className="w-1/2 flex justify-end">
                                                                {!isPositive && (
                                                                    <div
                                                                        className="h-full bg-green-500 rounded-l-full"
                                                                        style={{ width: `${widthPct}%` }}
                                                                    />
                                                                )}
                                                            </div>
                                                            {/* If Increases Delay (Positive), fill from Left to Right from center */}
                                                            <div className="w-1/2 flex justify-start">
                                                                {isPositive && (
                                                                    <div
                                                                        className="h-full bg-red-500 rounded-r-full"
                                                                        style={{ width: `${widthPct}%` }}
                                                                    />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-500 mt-4 border-t border-white/5 pt-3">
                                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Reduces Delay Risk</span>
                                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Increases Delay Risk</span>
                                    </div>
                                </div>
                            )}

                            {/* What-If Sensitivity Analysis */}
                            <div className="bg-dark-800/50 border border-white/5 rounded-2xl p-6">
                                <div className="flex justify-between items-end mb-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                            🔬 What-If Sensitivity Analysis
                                        </h3>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Adjust parameters to see how they affect predicted delay. Click ± to modify, then re-predict.
                                        </p>
                                    </div>
                                    <div className="text-xs text-purple-400 px-2 py-1 bg-purple-500/10 rounded border border-purple-500/20">
                                        Interactive
                                    </div>
                                </div>

                                {/* Feature Tornado Chart */}
                                <div className="space-y-3 mb-6">
                                    {[
                                        { key: 'weatherImpactDays', label: 'Weather Impact Days', min: 0, max: 120, step: 5, icon: '🌧️' },
                                        { key: 'designChangeOrders', label: 'Design Change Orders', min: 2, max: 30, step: 1, icon: '📐' },
                                        { key: 'materialDeliveryDelay', label: 'Material Delivery Delay', min: 4, max: 90, step: 5, icon: '📦' },
                                        { key: 'contractorExperience', label: 'Contractor Experience (yrs)', min: 5, max: 22, step: 1, icon: '👷' },
                                        { key: 'labourAssigned', label: 'Labour Assigned', min: 10, max: 249, step: 5, icon: '👥' },
                                        { key: 'paymentDelayDays', label: 'Payment Delay Days', min: 4, max: 90, step: 5, icon: '💰' },
                                    ].map((param) => {
                                        const currentVal = formValues[param.key];
                                        const pct = ((currentVal - param.min) / (param.max - param.min)) * 100;
                                        return (
                                            <div key={param.key} className="flex items-center gap-3">
                                                <span className="text-lg w-6 text-center">{param.icon}</span>
                                                <div className="w-40 text-sm text-gray-300 truncate">{param.label}</div>
                                                <button
                                                    onClick={() => setFormValues(prev => ({
                                                        ...prev,
                                                        [param.key]: Math.max(param.min, (prev[param.key] || 0) - param.step)
                                                    }))}
                                                    className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/40 transition-colors text-sm font-bold flex items-center justify-center"
                                                >
                                                    −
                                                </button>
                                                <div className="flex-1 relative h-6">
                                                    <div className="absolute inset-0 bg-dark-700 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full transition-all duration-300"
                                                            style={{
                                                                width: `${Math.min(100, Math.max(2, pct))}%`,
                                                                background: pct > 66 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' :
                                                                    pct > 33 ? 'linear-gradient(90deg, #3b82f6, #f59e0b)' :
                                                                        'linear-gradient(90deg, #22c55e, #3b82f6)'
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white drop-shadow">
                                                        {currentVal}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => setFormValues(prev => ({
                                                        ...prev,
                                                        [param.key]: Math.min(param.max, (prev[param.key] || 0) + param.step)
                                                    }))}
                                                    className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/40 transition-colors text-sm font-bold flex items-center justify-center"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Re-predict Button */}
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className={`
                                        w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all
                                        ${loading
                                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-purple-500/80 to-blue-500/80 text-white hover:from-purple-400/80 hover:to-blue-400/80 border border-purple-500/30'
                                        }
                                    `}
                                >
                                    {loading ? 'Re-predicting...' : '🔄 Re-Predict with Modified Parameters'}
                                </button>
                            </div>


                            <div className="bg-dark-800/50 border border-white/5 rounded-2xl p-6">
                                <div className="flex justify-between items-end mb-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">📈 Quantile Scenarios</h3>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Mathematically derived P10 / P50 / P90 confidence limits
                                        </p>
                                    </div>
                                    <div className="text-xs text-blue-400 px-2 py-1 bg-blue-500/10 rounded border border-blue-500/20">
                                        Data-driven Uncertainty
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-center flex flex-col justify-center">
                                        <span className="text-xs text-green-400 font-medium">Best Case (P10)</span>
                                        <p className="text-xl font-bold text-green-400 mt-2">
                                            {formatDelayDays(forecast.scenarios?.bestCase?.delayDays || 0)}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-center flex flex-col justify-center relative scale-105 shadow-lg">
                                        <span className="text-xs text-blue-400 font-medium">Most Likely (Ensemble)</span>
                                        <p className="text-2xl font-bold text-blue-400 mt-2">
                                            {formatDelayDays(forecast.scenarios?.mostLikely?.delayDays || 0)}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center flex flex-col justify-center">
                                        <span className="text-xs text-red-400 font-medium">Worst Case (P90)</span>
                                        <p className="text-xl font-bold text-red-400 mt-2">
                                            {formatDelayDays(forecast.scenarios?.worstCase?.delayDays || 0)}
                                        </p>
                                    </div>
                                </div>

                                {/* Confidence Band visual */}
                                <div className="mt-8 relative px-4">
                                    <div className="h-2 w-full bg-gray-700 rounded-full" />
                                    {/* P10 -> P90 band */}
                                    <div className="absolute top-0 h-2 bg-blue-500/40 rounded-full" style={{ left: '10%', width: '80%' }} />
                                    {/* Markers */}
                                    <div className="absolute top-[-4px] w-4 h-4 rounded-full bg-green-400 border-2 border-dark-800" style={{ left: '10%' }} title="Best Case"></div>
                                    <div className="absolute top-[-6px] w-5 h-5 rounded-full bg-blue-400 border-2 border-dark-800" style={{ left: '50%' }} title="Most Likely"></div>
                                    <div className="absolute top-[-4px] w-4 h-4 rounded-full bg-red-400 border-2 border-dark-800" style={{ left: '90%' }} title="Worst Case"></div>
                                </div>
                            </div>

                            {/* Recommendations */}
                            <div className="bg-dark-800/50 border border-white/5 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">💡 Recommendations</h3>
                                <div className="space-y-3">
                                    {forecast.recommendations?.map((rec, index) => (
                                        <div key={index} className="flex items-start gap-3 p-3 bg-dark-700/50 rounded-lg">
                                            <span className="text-blue-400">{index + 1}.</span>
                                            <p className="text-gray-300">{rec}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Timeline */}
                            <div className="bg-dark-800/50 border border-white/5 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">📅 Project Timeline</h3>
                                <div className="relative">
                                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-700" />

                                    {/* Project Start Date */}
                                    <div className="relative pl-10 pb-6">
                                        <div className="absolute left-2.5 w-3 h-3 rounded-full bg-green-500" />
                                        <p className="text-sm text-gray-400">Project Start</p>
                                        <p className="text-white font-medium">
                                            {new Date(forecast.projectStartDate).toLocaleDateString('en-GB', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    </div>

                                    {/* Planned Completion (without delays) */}
                                    <div className="relative pl-10 pb-6">
                                        <div className="absolute left-2.5 w-3 h-3 rounded-full bg-blue-500" />
                                        <p className="text-sm text-gray-400">Planned Completion</p>
                                        <p className="text-white font-medium">
                                            {new Date(forecast.plannedCompletionDate).toLocaleDateString('en-GB', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            ({forecast.plannedDurationMonths} months from start)
                                        </p>
                                    </div>

                                    {/* Predicted Completion (with delays) */}
                                    <div className="relative pl-10">
                                        <div className={`absolute left-2.5 w-3 h-3 rounded-full ${forecast.predictedDelayDays > 60 ? 'bg-red-500' :
                                            forecast.predictedDelayDays > 0 ? 'bg-orange-500' : 'bg-green-500'
                                            }`} />
                                        <p className="text-sm text-gray-400">Predicted Completion</p>
                                        <p className="text-white font-medium">
                                            {new Date(forecast.predictedCompletionDate).toLocaleDateString('en-GB', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </p>
                                        {forecast.predictedDelayDays > 0 ? (
                                            <div className="mt-2 p-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                                                <p className="text-orange-400 text-sm font-medium">
                                                    ⏰ +{Math.round(forecast.predictedDelayDays)} days delay
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    Total duration: {Math.round((forecast.plannedDurationDays + forecast.predictedDelayDays) / 30)} months
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="mt-2 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                                                <p className="text-green-400 text-sm font-medium">
                                                    ✅ On schedule
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-96 flex flex-col items-center justify-center bg-dark-800/50 border border-white/5 rounded-2xl">
                            <span className="text-6xl mb-6">🔮</span>
                            <h3 className="text-xl font-semibold text-white mb-2">No Prediction Yet</h3>
                            <p className="text-gray-400 text-center max-w-md">
                                Configure your project parameters and click "Predict Delay" to get
                                AI-powered delay forecasts using our trained machine learning model.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DelayForecastView;

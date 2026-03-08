import { useState, useEffect, useRef } from 'react';
import useCostController from '../../../controllers/useCostController';

const INDICATOR_KEYS = ['Inflation_Rate', 'Exchange_Rate_LKR', 'Material_Index'];

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
    const currentYear = new Date().getFullYear();

    // Helper to get initial form values from project
    const getInitialFormValues = () => {
        const defaults = {
            Project_Type: '',
            Province: '',
            District: '',
            CIDA_Grade: '',
            Season: '',
            Floors: 0,
            Area_SQFT: 0,
            Year_of_Tender: 0,
            Contractor_Experience_Years: 0,
            Complexity_Score: 1,
            Change_Order_Freq: 0,
            Start_Month: 0,
            Start_Quarter: 0,
            Start_Weekday: 0,
            Initial_Period_Months: 0,
            Inflation_Rate: 0,
            Exchange_Rate_LKR: 0,
            Material_Index: 0,
            Design_Completeness: 0,
            Project_Size_Index: 0,
            Economic_Risk_Index: 0,
            Design_Risk_Score: 1,
            Contractor_Risk_Score: 1,
            Weather_Risk_Score: 1,
            Rate_per_SQFT: 0,
            Initial_Value: 0
        };

        if (!project) return defaults;

        // Map project type
        const getProjectType = (type) => {
            if (!type) return '';
            const typeMap = {
                'residential': 'Residential-House',
                'apartment': 'Residential-Apartment',
                'commercial': 'Commercial-Building',
                'industrial': 'Industrial-Building',
                'infrastructure': 'Infrastructure',
                'institutional': 'Commercial-Building',
                'mixed-use': 'Mixed-Development',
                'other': 'Residential-House'
            };
            return typeMap[type.toLowerCase()] || 'Residential-House';
        };

        // Get province
        const province = typeof project.location === 'object' && project.location.province 
            ? project.location.province 
            : '';

        // Get district
        const district = typeof project.location === 'object' && project.location.district 
            ? project.location.district 
            : '';

        const budget = typeof project.budget === 'number' ? project.budget : (project.budget?.estimated || 0);
        const areaSqft = project.areaSQFT || project.area || project.Area_SQFT || 0;
        const floors = project.floors || project.Floors || 0;

        return {
            ...defaults,
            Project_Type: getProjectType(project.projectType),
            Province: province,
            District: district,
            Area_SQFT: areaSqft,
            Floors: floors,
            Initial_Value: budget
        };
    };

    const [formValues, setFormValues] = useState(getInitialFormValues());

    const [initialValueMode, setInitialValueMode] = useState('auto'); // 'auto' or 'manual'
    const [startDate, setStartDate] = useState(''); // Store the selected start date

    // Initialize available districts based on initial province
    const getInitialDistricts = () => {
        const initialProvince = project?.location?.province || '';
        return initialProvince ? (provinceDistrictMap[initialProvince] || []) : [];
    };

    const [availableDistricts, setAvailableDistricts] = useState(getInitialDistricts());
    const [isFormExpanded, setIsFormExpanded] = useState(false);
    const [validationErrors, setValidationErrors] = useState([]);
    const [indicatorTouched, setIndicatorTouched] = useState({
        Inflation_Rate: false,
        Exchange_Rate_LKR: false,
        Material_Index: false,
    });

    const fetchDebounceRef = useRef(null);

    const {
        loading,
        error,
        indicatorsLoading,
        indicatorsError,
        indicatorMetadata,
        prediction,
        hasPrediction,
        predictCost,
        fetchEconomicIndicators,
        clearPrediction,
        clearIndicatorsError,
        savePrediction,
        savingPrediction
    } = useCostController();

    const projectId = project?._id || project?.id;
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

    // Helper function to get optimal parameter values for risk reduction
    const getOptimalValue = (featureName, currentValue) => {
        const optimals = {
            'Design_Completeness': {
                target: '85-95%',
                description: 'Higher design completion reduces change orders and rework',
                direction: currentValue < 85 ? 'increase' : 'optimal',
                riskReduction: 10
            },
            'Contractor_Experience_Years': {
                target: '10+ years',
                description: 'More experienced contractors handle challenges better',
                direction: currentValue < 10 ? 'increase' : 'optimal',
                riskReduction: 12
            },
            'Change_Order_Freq': {
                target: '0-3',
                description: 'Minimize scope changes to prevent cost escalation',
                direction: currentValue > 3 ? 'decrease' : 'optimal',
                riskReduction: 15
            },
            'Complexity_Score': {
                target: '1-5',
                description: 'Simpler designs are easier to estimate and execute',
                direction: currentValue > 5 ? 'decrease' : 'optimal',
                riskReduction: 8
            },
            'Economic_Risk_Index': {
                target: '0-3',
                description: 'Use fixed-price contracts and early material procurement',
                direction: currentValue > 3 ? 'decrease' : 'optimal',
                riskReduction: 7
            },
            'Material_Index': {
                target: '< 150',
                description: 'Lock in material prices early to avoid escalation',
                direction: currentValue > 150 ? 'decrease' : 'optimal',
                riskReduction: 6
            },
            'Initial_Period_Months': {
                target: '12-18 months',
                description: 'Realistic timelines prevent rushed work and errors',
                direction: currentValue < 12 || currentValue > 18 ? 'adjust' : 'optimal',
                riskReduction: 9
            },
            'Weather_Risk_Score': {
                target: '0-3',
                description: 'Plan construction around favorable weather seasons',
                direction: currentValue > 3 ? 'decrease' : 'optimal',
                riskReduction: 5
            },
            'Project_Size_Index': {
                target: '0-5',
                description: 'Break large projects into manageable phases',
                direction: currentValue > 5 ? 'decrease' : 'optimal',
                riskReduction: 7
            }
        };
        return optimals[featureName] || null;
    };

    useEffect(() => {
        if (project) {
            const getProjectType = (type) => {
                if (!type) return '';
                const typeMap = {
                    'residential': 'Residential-House',
                    'apartment': 'Residential-Apartment',
                    'commercial': 'Commercial-Building',
                    'industrial': 'Industrial-Building',
                    'infrastructure': 'Infrastructure',
                    'institutional': 'Commercial-Building',
                    'mixed-use': 'Mixed-Development',
                    'other': 'Residential-House'
                };
                return typeMap[type.toLowerCase()] || 'Residential-House';
            };

            const getProvince = (location) => {
                if (typeof location === 'object' && location.province) return location.province;
                return '';
            };

            const getDistrict = (location) => {
                if (typeof location === 'object' && location.district) return location.district;
                return '';
            };

            const budget = typeof project.budget === 'number' ? project.budget : (project.budget?.estimated || 0);
            const areaSqft = project.areaSQFT || project.area || project.Area_SQFT || 0;
            const floors = project.floors || project.Floors || 0;
            const cidaGrade = project.contractorGrade || project.cidaGrade || project.CIDA_Grade || '';
            const constructionPeriod = project.constructionPeriod || 0;

            // Derive timeline fields from startDate
            let startMonth = 0, startQuarter = 0, startWeekday = 0, yearOfTender = 0, season = '';
            let formattedStartDate = '';
            if (project.startDate) {
                const startDateObj = new Date(project.startDate);
                if (!isNaN(startDateObj.getTime())) {
                    startMonth = startDateObj.getMonth() + 1; // 1-12
                    startQuarter = Math.ceil(startMonth / 3); // 1-4
                    startWeekday = startDateObj.getDay(); // 0-6
                    yearOfTender = startDateObj.getFullYear();
                    
                    // Format date for input[type="date"] (YYYY-MM-DD)
                    formattedStartDate = startDateObj.toISOString().split('T')[0];
                    
                    // Determine season based on Sri Lanka monsoon patterns
                    if (startMonth >= 5 && startMonth <= 9) {
                        season = 'Southwest-Monsoon'; // May-Sep
                    } else if (startMonth >= 10 || startMonth <= 1) {
                        season = 'Northeast-Monsoon'; // Oct-Jan
                    } else if (startMonth >= 2 && startMonth <= 4) {
                        season = 'Inter-Monsoon'; // Feb-Apr
                    } else {
                        season = 'Dry-Season';
                    }
                }
            }

            // Compute Rate per SQFT if we have both budget and area
            const ratePerSqft = (areaSqft > 0 && budget > 0) ? Math.round(budget / areaSqft) : 0;

            if (formattedStartDate) {
                setStartDate(formattedStartDate);
            }

            setFormValues(prev => ({
                ...prev,
                Project_Type: getProjectType(project.projectType),
                Province: getProvince(project.location),
                District: getDistrict(project.location),
                Initial_Value: budget || prev.Initial_Value,
                Area_SQFT: areaSqft || prev.Area_SQFT,
                Floors: floors || prev.Floors,
                CIDA_Grade: cidaGrade || prev.CIDA_Grade,
                Initial_Period_Months: constructionPeriod || prev.Initial_Period_Months,
                Start_Month: startMonth || prev.Start_Month,
                Start_Quarter: startQuarter || prev.Start_Quarter,
                Start_Weekday: startWeekday || prev.Start_Weekday,
                Year_of_Tender: yearOfTender || prev.Year_of_Tender,
                Season: season || prev.Season,
                Rate_per_SQFT: ratePerSqft || prev.Rate_per_SQFT,
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

    // Auto-calculate Initial_Value from Area_SQFT × Rate_per_SQFT
    useEffect(() => {
        if (initialValueMode === 'auto') {
            const area = Number(formValues.Area_SQFT) || 0;
            const rate = Number(formValues.Rate_per_SQFT) || 0;
            const calculated = area * rate;
            if (calculated !== formValues.Initial_Value) {
                setFormValues(prev => ({ ...prev, Initial_Value: Math.round(calculated * 100) / 100 }));
            }
        }
    }, [formValues.Area_SQFT, formValues.Rate_per_SQFT, initialValueMode]);

    useEffect(() => {
        return () => {
            if (fetchDebounceRef.current) {
                clearTimeout(fetchDebounceRef.current);
            }
        };
    }, []);

    const validateForm = () => {
        const errors = [];
        const addRangeError = (value, label, min, max, options = {}) => {
            const { integer = false } = options;
            const parsed = Number(value);

            if (!Number.isFinite(parsed)) {
                errors.push(`${label} is required`);
                return;
            }

            if (integer && !Number.isInteger(parsed)) {
                errors.push(`${label} must be a whole number`);
                return;
            }

            if (parsed < min || parsed > max) {
                errors.push(`${label} must be between ${min.toLocaleString()} and ${max.toLocaleString()}`);
            }
        };

        // Required dropdown fields
        if (!formValues.Project_Type) errors.push('Please select a Project Type');
        if (!formValues.Province) errors.push('Please select a Province');
        if (!formValues.District) errors.push('Please select a District');
        if (!formValues.CIDA_Grade) errors.push('Please select a CIDA Grade');
        if (!formValues.Season) errors.push('Please select a Season');
        if (!startDate) errors.push('Please select a Project Start Date');

        const val = formValues;
        addRangeError(val.Floors, 'Floors', 1, 60, { integer: true });
        addRangeError(val.Area_SQFT, 'Area (SQFT)', 500, 200000);
        addRangeError(val.Rate_per_SQFT, 'Rate per SQFT (LKR)', 2000, 100000);
        addRangeError(val.Initial_Value, 'Initial Value (LKR)', 1, 20000000000);
        addRangeError(val.Year_of_Tender, 'Year of Tender', 2015, currentYear, { integer: true });
        addRangeError(val.Initial_Period_Months, 'Initial Duration (months)', 1, 100);
        addRangeError(val.Contractor_Experience_Years, 'Contractor Experience (Years)', 0, 50, { integer: true });
        addRangeError(val.Change_Order_Freq, 'Change Order Frequency', 0, 50, { integer: true });
        addRangeError(val.Complexity_Score, 'Project Complexity Score', 1, 10, { integer: true });

        // Derived timeline fields from selected start date
        addRangeError(val.Start_Month, 'Start Month', 1, 12, { integer: true });
        addRangeError(val.Start_Quarter, 'Start Quarter', 1, 4, { integer: true });
        addRangeError(val.Start_Weekday, 'Start Weekday', 0, 6, { integer: true });
        
        // Economic indicators
        addRangeError(val.Inflation_Rate, 'Inflation Rate (%)', -10, 50);
        addRangeError(val.Material_Index, 'Material Price Index', 50, 500);
        addRangeError(val.Exchange_Rate_LKR, 'Exchange Rate (LKR/USD)', 100, 500);
        addRangeError(val.Project_Size_Index, 'Project Size Index', 0, 10);
        addRangeError(val.Economic_Risk_Index, 'Economic Risk Index', 0, 10);
        
        // Risk scores (already constrained by sliders, but double-check)
        addRangeError(val.Design_Completeness, 'Design Completeness (%)', 0, 100);
        addRangeError(val.Design_Risk_Score, 'Design Risk Score', 1, 10, { integer: true });
        addRangeError(val.Contractor_Risk_Score, 'Contractor Risk Score', 1, 10, { integer: true });
        addRangeError(val.Weather_Risk_Score, 'Weather Risk Score', 1, 10, { integer: true });

        return errors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const errors = validateForm();
        setValidationErrors(errors);
        
        if (errors.length > 0) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        
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

    const parseFloatTwoDecimals = (val) => {
        const n = parseFloat(val);
        return Number.isNaN(n) ? '' : Math.round(n * 100) / 100;
    };

    const applyFetchedIndicators = (fetchedValues, forceUpdate = false) => {
        setFormValues((prev) => ({
            ...prev,
            Inflation_Rate: forceUpdate || !indicatorTouched.Inflation_Rate
                ? (fetchedValues.Inflation_Rate ?? prev.Inflation_Rate)
                : prev.Inflation_Rate,
            Exchange_Rate_LKR: forceUpdate || !indicatorTouched.Exchange_Rate_LKR
                ? (fetchedValues.Exchange_Rate_LKR ?? prev.Exchange_Rate_LKR)
                : prev.Exchange_Rate_LKR,
            Material_Index: forceUpdate || !indicatorTouched.Material_Index
                ? (fetchedValues.Material_Index ?? prev.Material_Index)
                : prev.Material_Index,
        }));
    };

    const runEconomicIndicatorsFetch = async (forceUpdate = false) => {
        const year = Number(formValues.Year_of_Tender);
        const province = formValues.Province;
        const district = formValues.District;

        if (!Number.isInteger(year) || year < 1950 || !province) {
            return;
        }

        const result = await fetchEconomicIndicators({ year, province, district });
        if (result.success && result.data) {
            applyFetchedIndicators(result.data, forceUpdate);
        }
    };

    useEffect(() => {
        const year = Number(formValues.Year_of_Tender);
        if (!Number.isInteger(year) || year < 1950 || !formValues.Province) {
            return;
        }

        if (fetchDebounceRef.current) {
            clearTimeout(fetchDebounceRef.current);
        }

        fetchDebounceRef.current = setTimeout(() => {
            runEconomicIndicatorsFetch(false);
        }, 550);

        return () => {
            if (fetchDebounceRef.current) {
                clearTimeout(fetchDebounceRef.current);
            }
        };
    }, [formValues.Year_of_Tender, formValues.Province, formValues.District]);

    const handleChange = (key, parser = (val) => val) => (e) => {
        const { value } = e.target;
        const parsed = value === '' ? '' : parser(value);
        if (INDICATOR_KEYS.includes(key)) {
            setIndicatorTouched((prev) => ({ ...prev, [key]: true }));
            clearIndicatorsError();
        }
        // Clear validation errors when user makes changes
        if (validationErrors.length > 0) {
            setValidationErrors([]);
        }
        setFormValues((prev) => ({ ...prev, [key]: parsed }));
    };

    const handleRefreshIndicators = async () => {
        setIndicatorTouched({
            Inflation_Rate: false,
            Exchange_Rate_LKR: false,
            Material_Index: false,
        });
        await runEconomicIndicatorsFetch(true);
    };

    const handleStartDateChange = (e) => {
        const dateValue = e.target.value;
        setStartDate(dateValue);
        
        if (dateValue) {
            const date = new Date(dateValue);
            if (!isNaN(date.getTime())) {
                const month = date.getMonth() + 1; // 1-12
                const quarter = Math.ceil(month / 3); // 1-4
                const weekday = date.getDay(); // 0-6 (Sun-Sat)
                const year = date.getFullYear();
                
                // Determine season based on Sri Lanka monsoon patterns
                let season = '';
                if (month >= 5 && month <= 9) {
                    season = 'Southwest-Monsoon'; // May-Sep
                } else if (month >= 10 || month <= 1) {
                    season = 'Northeast-Monsoon'; // Oct-Jan
                } else if (month >= 2 && month <= 4) {
                    season = 'Inter-Monsoon'; // Feb-Apr
                } else {
                    season = 'Dry-Season';
                }
                
                // Clear validation errors when user makes changes
                if (validationErrors.length > 0) {
                    setValidationErrors([]);
                }
                
                setFormValues(prev => ({
                    ...prev,
                    Start_Month: month,
                    Start_Quarter: quarter,
                    Start_Weekday: weekday,
                    Year_of_Tender: year,
                    Season: season
                }));
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Animated Header */}
            <div className="relative overflow-hidden bg-gradient-to-r from-amber-600/20 via-orange-500/15 to-yellow-500/20 border border-amber-500/30 rounded-2xl p-6" style={{ backgroundSize: '200% 200%', animation: 'gradientShift 6s ease infinite' }}>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(251,191,36,0.15),transparent_60%)]" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 rounded-full blur-2xl" />
                <div className="relative flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-yellow-200 hover:bg-white/20 hover:scale-105 transition-all duration-200"
                                title="Back to Project"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                        )}
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 shadow-lg shadow-amber-500/25 flex items-center justify-center">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">
                                Cost Prediction{project ? ` — ${project.name}` : ''}
                            </h2>
                            <p className="text-amber-200/70 text-sm mt-0.5">ML-powered cost overrun classification with SHAP explanations</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-sm text-emerald-300 bg-emerald-500/10 backdrop-blur-sm border border-emerald-500/30 px-4 py-1.5 rounded-full">
                            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span></span> Live Model
                        </div>
                    </div>
                </div>
            </div>
            <style>{`@keyframes gradientShift{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}`}</style>

            <div className={`grid grid-cols-1 ${isFormExpanded ? 'xl:grid-cols-1' : 'xl:grid-cols-3'} gap-6`}>
                <div className={isFormExpanded ? 'xl:col-span-1' : 'xl:col-span-1'}>
                    <form onSubmit={handleSubmit} className={`bg-dark-800/60 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-5 space-y-5 ${isFormExpanded ? 'max-h-none' : 'max-h-[780px]'} overflow-y-auto shadow-xl shadow-black/20`}>
                        <div className="flex items-center justify-between sticky top-0 bg-dark-800/95 backdrop-blur-md pb-3 z-10">
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 text-xs font-semibold rounded-full border border-amber-500/30">⚡ Inputs</span>
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

                        {/* ── Section: Project Classification ── */}
                        <div className="border-t border-white/[0.06] pt-4">
                            <p className="text-[11px] uppercase tracking-widest text-amber-400/70 font-semibold mb-3 flex items-center gap-1.5"><span>🏗️</span> Project Classification</p>
                        </div>
                        <div className={`grid ${isFormExpanded ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2'} gap-3`}>
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-gray-400 mb-1">Type of Project {project && <span className="text-xs text-gray-500">(from project)</span>}</label>
                                <select
                                    value={formValues.Project_Type}
                                    onChange={handleChange('Project_Type')}
                                    disabled={!!project}
                                    className={`w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 ${project ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    required
                                >
                                    <option value="">Select Project Type</option>
                                    <option value="Residential-House">Residential - House</option>
                                    <option value="Residential-Apartment">Residential - Apartment</option>
                                    <option value="Commercial-Building">Commercial Building</option>
                                    <option value="Industrial-Building">Industrial Building</option>
                                    <option value="Infrastructure">Infrastructure</option>
                                    <option value="Mixed-Development">Mixed Development</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Province {project && <span className="text-xs text-gray-500">(from project)</span>}</label>
                                <select
                                    value={formValues.Province}
                                    onChange={handleChange('Province')}
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
                                    onChange={handleChange('District')}
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
                                    onChange={handleChange('Season')}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                    required
                                >
                                    <option value="">Select Season</option>
                                    <option value="Dry-Season">Dry Season</option>
                                    <option value="Southwest-Monsoon">Southwest Monsoon (May-Sep)</option>
                                    <option value="Northeast-Monsoon">Northeast Monsoon (Oct-Jan)</option>
                                    <option value="Inter-Monsoon">Inter-Monsoon (Feb-Apr)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Year of Tender</label>
                                <input
                                    type="number"
                                    min="2015"
                                    max={currentYear}
                                    step="1"
                                    value={formValues.Year_of_Tender}
                                    onChange={handleChange('Year_of_Tender', parseIntOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">CIDA Grade</label>
                                <select
                                    value={formValues.CIDA_Grade}
                                    onChange={handleChange('CIDA_Grade')}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                    required
                                >
                                    <option value="">Select CIDA Grade</option>
                                    <option value="C1">C1 - Unlimited Value</option>
                                    <option value="C2">C2 - Up to 500M</option>
                                    <option value="C3">C3 - Up to 200M</option>
                                    <option value="C4">C4 - Up to 75M</option>
                                    <option value="C5">C5 - Up to 25M</option>
                                    <option value="C6">C6 - Up to 10M</option>
                                    <option value="C7">C7 - Up to 3M</option>
                                </select>
                            </div>
                        </div>

                        {/* ── Section: Project Details ── */}
                        <div className="border-t border-white/[0.06] pt-4">
                            <p className="text-[11px] uppercase tracking-widest text-blue-400/70 font-semibold mb-3 flex items-center gap-1.5"><span>📐</span> Project Details</p>
                        </div>
                        <div className={`grid ${isFormExpanded ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2'} gap-3`}>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Floors</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="60"
                                    step="1"
                                    value={formValues.Floors}
                                    onChange={handleChange('Floors', parseIntOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                    required
                                />
                                <p className="text-[10px] text-gray-500 mt-0.5">Range: 1-60 floors</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Area (SQFT)</label>
                                <input
                                    type="number"
                                    min="500"
                                    max="200000"
                                    step="0.01"
                                    value={formValues.Area_SQFT}
                                    onChange={handleChange('Area_SQFT', parseFloatOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                    required
                                />
                                <p className="text-[10px] text-gray-500 mt-0.5">Range: 500-200,000 SQFT</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Rate per SQFT (LKR)</label>
                                <input
                                    type="number"
                                    min="2000"
                                    max="100000"
                                    step="0.01"
                                    value={formValues.Rate_per_SQFT}
                                    onChange={handleChange('Rate_per_SQFT', parseFloatOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                    required
                                />
                                <p className="text-[10px] text-gray-500 mt-0.5">Range: 2,000-100,000 LKR</p>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-xs font-medium text-gray-400">Initial Value (LKR)</label>
                                    <button
                                        type="button"
                                        onClick={() => setInitialValueMode(initialValueMode === 'auto' ? 'manual' : 'auto')}
                                        className={`text-[10px] px-2 py-0.5 rounded border ${
                                            initialValueMode === 'auto'
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
                                    onChange={handleChange('Initial_Value', parseFloatOrEmpty)}
                                    onFocus={() => setInitialValueMode('manual')}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                    required
                                />
                                <p className="text-[10px] text-gray-500 mt-0.5">
                                    {initialValueMode === 'auto' ? 'Auto: Area × Rate' : 'Manual override'}
                                </p>
                            </div>
                        </div>

                        {/* ── Section: Timeline ── */}
                        <div className="border-t border-white/[0.06] pt-4">
                            <p className="text-[11px] uppercase tracking-widest text-violet-400/70 font-semibold mb-3 flex items-center gap-1.5"><span>📅</span> Timeline</p>
                        </div>
                        <div className={`grid ${isFormExpanded ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2'} gap-3`}>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Initial Duration (months)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    step="0.1"
                                    value={formValues.Initial_Period_Months}
                                    onChange={handleChange('Initial_Period_Months', parseFloatOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                    required
                                />
                                <p className="text-[10px] text-gray-500 mt-0.5">Range: 1-100 months</p>
                            </div>

                            <div className="col-span-full">
                                <label className="block text-xs font-medium text-gray-400 mb-1">Project Start Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={handleStartDateChange}
                                    min="2015-01-01"
                                    max={`${currentYear}-12-31`}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                                <p className="text-[10px] text-gray-500 mt-1">
                                    Auto-calculates: Month ({formValues.Start_Month || '-'}), Quarter ({formValues.Start_Quarter || '-'}), Weekday ({formValues.Start_Weekday !== '' ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][formValues.Start_Weekday] : '-'}), Season
                                </p>
                            </div>
                        </div>

                        {/* ── Section: Economic Indicators ── */}
                        <div className="border-t border-white/[0.06] pt-4">
                            <p className="text-[11px] uppercase tracking-widest text-teal-400/70 font-semibold mb-3 flex items-center gap-1.5"><span>💹</span> Economic Indicators</p>
                        </div>
                        <div className={`grid ${isFormExpanded ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2'} gap-3`}>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Inflation Rate (%)</label>
                                <input
                                    type="number"
                                    min="-10"
                                    max="50"
                                    step="0.01"
                                    value={formValues.Inflation_Rate}
                                    onChange={handleChange('Inflation_Rate', parseFloatOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                                <p className="text-[10px] text-gray-500 mt-0.5">Range: -10 to 50%</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Material Price Index</label>
                                <input
                                    type="number"
                                    min="50"
                                    max="500"
                                    step="0.01"
                                    value={formValues.Material_Index}
                                    onChange={handleChange('Material_Index', parseFloatOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                                <p className="text-[10px] text-gray-500 mt-0.5">Range: 50-500</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Exchange Rate (LKR/USD)</label>
                                <input
                                    type="number"
                                    min="100"
                                    max="500"
                                    step="0.01"
                                    value={formValues.Exchange_Rate_LKR !== '' && formValues.Exchange_Rate_LKR !== 0 
                                        ? Number(formValues.Exchange_Rate_LKR).toFixed(2) 
                                        : formValues.Exchange_Rate_LKR}
                                    onChange={handleChange('Exchange_Rate_LKR', parseFloatTwoDecimals)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                                <p className="text-[10px] text-gray-500 mt-0.5">Range: 100-500</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Project Size Index</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    step="0.01"
                                    value={formValues.Project_Size_Index}
                                    onChange={handleChange('Project_Size_Index', parseFloatOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
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
                                            Source: {indicatorMetadata.source} | Year: {indicatorMetadata.year}
                                            {indicatorMetadata.fetchedAt ? ` | Updated: ${new Date(indicatorMetadata.fetchedAt).toLocaleTimeString()}` : ''}
                                        </span>
                                    )}
                                    {!indicatorsLoading && !indicatorMetadata && 'Select year and province to auto-fetch indicators.'}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleRefreshIndicators}
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

                        {/* ── Section: Risk & Experience ── */}
                        <div className="border-t border-white/[0.06] pt-4">
                            <p className="text-[11px] uppercase tracking-widest text-rose-400/70 font-semibold mb-3 flex items-center gap-1.5"><span>⚠️</span> Risk & Experience</p>
                        </div>
                        <div className={`grid ${isFormExpanded ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2'} gap-3`}>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Contractor Experience (Years)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="50"
                                    step="1"
                                    value={formValues.Contractor_Experience_Years}
                                    onChange={handleChange('Contractor_Experience_Years', parseIntOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                                <p className="text-[10px] text-gray-500 mt-0.5">Range: 0-50 years</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Economic Risk Index</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    step="0.01"
                                    value={formValues.Economic_Risk_Index}
                                    onChange={handleChange('Economic_Risk_Index', parseFloatOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                                <p className="text-[10px] text-gray-500 mt-0.5">Range: 0-10</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Change Order Frequency</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="50"
                                    step="1"
                                    value={formValues.Change_Order_Freq}
                                    onChange={handleChange('Change_Order_Freq', parseIntOrEmpty)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                                <p className="text-[10px] text-gray-500 mt-0.5">Range: 0-50</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Project Complexity Score (1-10)</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        step="1"
                                        value={formValues.Complexity_Score || 1}
                                        onChange={handleChange('Complexity_Score', parseIntOrEmpty)}
                                        className="flex-1 h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                                        style={{
                                            accentColor: '#eab308'
                                        }}
                                    />
                                    <span className="w-12 text-center px-2 py-1 bg-dark-700 border border-yellow-500/30 rounded text-sm text-yellow-300 font-semibold">
                                        {formValues.Complexity_Score || 1}
                                    </span>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1">1 = Simple, 10 = Highly Complex</p>
                            </div>
                        </div>

                        {/* ── Section: Risk Scores ── */}
                        <div className="border-t border-white/[0.06] pt-4">
                            <p className="text-[11px] uppercase tracking-widest text-pink-400/70 font-semibold mb-3 flex items-center gap-1.5"><span>🎯</span> Risk Scores</p>
                        </div>
                        <div className={`grid ${isFormExpanded ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-4`}>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Design Completeness (%)</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="1"
                                        value={formValues.Design_Completeness || 0}
                                        onChange={handleChange('Design_Completeness', parseIntOrEmpty)}
                                        className="flex-1 h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                                        style={{
                                            accentColor: '#eab308'
                                        }}
                                    />
                                    <span className="w-16 text-center px-2 py-1 bg-dark-700 border border-yellow-500/30 rounded text-sm text-yellow-300 font-semibold">
                                        {formValues.Design_Completeness || 0}%
                                    </span>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1">0% = Not started, 100% = Fully complete</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Design Risk Score (1-10)</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        step="1"
                                        value={formValues.Design_Risk_Score || 1}
                                        onChange={handleChange('Design_Risk_Score', parseIntOrEmpty)}
                                        className="flex-1 h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                                        style={{
                                            accentColor: '#eab308'
                                        }}
                                    />
                                    <span className="w-12 text-center px-2 py-1 bg-dark-700 border border-yellow-500/30 rounded text-sm text-yellow-300 font-semibold">
                                        {formValues.Design_Risk_Score || 1}
                                    </span>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1">1 = Low risk, 10 = High risk</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Contractor Risk Score (1-10)</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        step="1"
                                        value={formValues.Contractor_Risk_Score || 1}
                                        onChange={handleChange('Contractor_Risk_Score', parseIntOrEmpty)}
                                        className="flex-1 h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                                        style={{
                                            accentColor: '#eab308'
                                        }}
                                    />
                                    <span className="w-12 text-center px-2 py-1 bg-dark-700 border border-yellow-500/30 rounded text-sm text-yellow-300 font-semibold">
                                        {formValues.Contractor_Risk_Score || 1}
                                    </span>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1">1 = Low risk, 10 = High risk</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Weather Risk Score (1-10)</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        step="1"
                                        value={formValues.Weather_Risk_Score || 1}
                                        onChange={handleChange('Weather_Risk_Score', parseIntOrEmpty)}
                                        className="flex-1 h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                                        style={{
                                            accentColor: '#eab308'
                                        }}
                                    />
                                    <span className="w-12 text-center px-2 py-1 bg-dark-700 border border-yellow-500/30 rounded text-sm text-yellow-300 font-semibold">
                                        {formValues.Weather_Risk_Score || 1}
                                    </span>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1">1 = Low risk, 10 = High risk</p>
                            </div>
                        </div>

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

                        <div className="border-t border-white/[0.06] pt-5">
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
                                ) : '🚀 Predict Cost Overrun'}
                            </button>
                        </div>
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

                            {/* Save Prediction Button */}
                            {project && (
                                <div className="bg-gradient-to-r from-green-600/20 via-emerald-500/15 to-teal-500/20 border border-green-500/30 rounded-xl p-4">
                                    <div className="flex items-center justify-between gap-4 flex-wrap">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                                                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-white">Save This Prediction</h4>
                                                <p className="text-xs text-green-200/70">Store for historical tracking and scenario comparison</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    if (!projectId) {
                                                        alert('❌ Error: No project selected.');
                                                        return;
                                                    }
                                                    
                                                    if (!hasPrediction) {
                                                        alert('❌ Error: No prediction available to save.');
                                                        return;
                                                    }
                                                    
                                                    const timestamp = new Date().toLocaleString('en-US', { 
                                                        month: 'short', 
                                                        day: 'numeric', 
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    });
                                                    const scenarioName = `Prediction - ${timestamp}`;
                                                    
                                                    const result = await savePrediction(projectId, formValues, {
                                                        scenarioName,
                                                        notes: `${isHighRisk ? 'HIGH' : 'LOW'} Risk, ${overrunPct?.toFixed(1)}% Overrun`,
                                                        tags: [isHighRisk ? 'high-risk' : 'low-risk']
                                                    });
                                                    
                                                    if (result.success) {
                                                        alert('✅ Prediction saved successfully!');
                                                    } else {
                                                        alert(`❌ Failed to save: ${result.error || 'Unknown error'}`);
                                                    }
                                                } catch (error) {
                                                    console.error('❌ Save error:', error);
                                                    alert(`❌ Error saving prediction: ${error.message || 'Unknown error'}`);
                                                }
                                            }}
                                            disabled={savingPrediction}
                                            className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-green-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {savingPrediction ? (
                                                <>
                                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                    </svg>
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                                    </svg>
                                                    Save Prediction
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="bg-dark-800/70 border border-white/5 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">Budget Summary</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-dark-700/50 rounded-lg border border-blue-500/20">
                                        <p className="text-sm text-gray-400 mb-1">Initial Budget</p>
                                        <p className="text-2xl font-bold text-blue-400">
                                            {formValues.Initial_Value && Number(formValues.Initial_Value) > 0
                                                ? `${(Number(formValues.Initial_Value) / 1000000).toFixed(2)}M LKR` 
                                                : 'N/A'}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-dark-700/50 rounded-lg border border-amber-500/20">
                                        <p className="text-sm text-gray-400 mb-1">Predicted Final Cost</p>
                                        <p className="text-2xl font-bold text-amber-400">
                                            {formValues.Initial_Value > 0 && overrunPct != null
                                                ? `${((Number(formValues.Initial_Value) * (1 + Number(overrunPct) / 100)) / 1000000).toFixed(2)}M LKR`
                                                : 'N/A'}
                                        </p>
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
                                    <div className="w-full h-64 relative">
                                        <svg width="100%" height="100%" viewBox="0 0 1000 250" preserveAspectRatio="xMidYMid meet" className="bg-dark-700/30 rounded-lg">
                                            {/* Grid lines */}
                                            {[0, 1, 2, 3, 4, 5].map((i) => (
                                                <line
                                                    key={`grid-${i}`}
                                                    x1="50"
                                                    y1={220 - (i * 40)}
                                                    x2="950"
                                                    y2={220 - (i * 40)}
                                                    stroke="#ffffff10"
                                                    strokeWidth="1"
                                                    strokeDasharray="4"
                                                />
                                            ))}

                                            {/* Y-axis labels */}
                                            {[0, 1, 2, 3, 4, 5].map((i) => {
                                                const yVal = (i * maxImpact) / 5;
                                                return (
                                                    <text key={`y-label-${i}`} x="35" y={225 - (i * 40)} textAnchor="end" fontSize="11" fill="#9ca3af">
                                                        {yVal.toFixed(2)}
                                                    </text>
                                                );
                                            })}

                                            {/* X and Y axes */}
                                            <line x1="50" y1="220" x2="950" y2="220" stroke="#ffffff30" strokeWidth="2" />
                                            <line x1="50" y1="20" x2="50" y2="220" stroke="#ffffff30" strokeWidth="2" />

                                            {/* Line path */}
                                            {topRiskFactors.slice(0, 10).length > 1 && (
                                                <polyline
                                                    points={topRiskFactors.slice(0, 10)
                                                        .map((item, idx) => {
                                                            const impact = Number(item.impact) || 0;
                                                            const x = 50 + (idx * 900) / (topRiskFactors.slice(0, 10).length - 1);
                                                            const y = 220 - ((impact / maxImpact) * 200);
                                                            return `${x},${y}`;
                                                        })
                                                        .join(' ')}
                                                    fill="none"
                                                    stroke="url(#lineGradient)"
                                                    strokeWidth="3"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            )}

                                            {/* Gradient definition */}
                                            <defs>
                                                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                    <stop offset="0%" style={{ stopColor: '#f59e0b', stopOpacity: 1 }} />
                                                    <stop offset="50%" style={{ stopColor: '#fbbf24', stopOpacity: 1 }} />
                                                    <stop offset="100%" style={{ stopColor: '#fcd34d', stopOpacity: 1 }} />
                                                </linearGradient>
                                            </defs>

                                            {/* Data points and labels */}
                                            {topRiskFactors.slice(0, 10).map((item, idx) => {
                                                const impact = Number(item.impact) || 0;
                                                const x = 50 + (idx * 900) / (topRiskFactors.slice(0, 10).length - 1);
                                                const y = 220 - ((impact / maxImpact) * 200);

                                                return (
                                                    <g key={`point-${idx}`}>
                                                        {/* Circle point */}
                                                        <circle cx={x} cy={y} r="5" fill="#f59e0b" stroke="#fff" strokeWidth="2" />
                                                        {/* Hover background (invisible) */}
                                                        <circle cx={x} cy={y} r="10" fill="transparent" className="hover:opacity-20" />
                                                        {/* X-axis labels */}
                                                        <text
                                                            x={x}
                                                            y="240"
                                                            textAnchor="middle"
                                                            fontSize="10"
                                                            fill="#9ca3af"
                                                            className="truncate"
                                                        >
                                                            {item.feature.substring(0, 12)}
                                                        </text>
                                                    </g>
                                                );
                                            })}
                                        </svg>
                                    </div>

                                    {/* Legend */}
                                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                                        {topRiskFactors.slice(0, 5).map((item, idx) => (
                                            <div key={`legend-${idx}`} className="p-2 bg-dark-700/50 rounded border border-white/10">
                                                <p className="text-gray-300 font-medium truncate">{item.feature}</p>
                                                <p className="text-amber-400 font-semibold">{(Number(item.impact) || 0).toFixed(4)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Low Risk Parameter Recommendations */}
                            {topRiskFactors.length > 0 && (
                                <div className="bg-dark-800/70 border border-green-500/20 rounded-2xl p-6">
                                    <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                                        <span className="text-green-400">🎯</span> 
                                        Low Risk Target Parameters
                                    </h3>
                                    <p className="text-sm text-gray-400 mb-4">
                                        Adjust these high-impact parameters to reduce your cost overrun risk
                                    </p>

                                    <div className="space-y-3">
                                        {topRiskFactors.slice(0, 5).map((factor, idx) => {
                                            const featureName = factor.feature;
                                            const currentValue = formValues[featureName];
                                            const optimal = getOptimalValue(featureName, currentValue);
                                            
                                            if (!optimal) return null;

                                            const isNumeric = typeof currentValue === 'number';
                                            const needsImprovement = optimal.direction !== 'optimal';

                                            return (
                                                <div key={`optimal-${idx}`} className="p-4 bg-dark-700/50 rounded-lg border border-green-500/10">
                                                    <div className="flex items-start justify-between gap-3 mb-2">
                                                        <div className="flex-1">
                                                            <h4 className="font-semibold text-green-300 mb-1">
                                                                {featureName.replace(/_/g, ' ')}
                                                            </h4>
                                                            <p className="text-xs text-gray-400">{optimal.description}</p>
                                                        </div>
                                                        <span className={`text-xs px-2 py-1 rounded ${
                                                            needsImprovement 
                                                                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' 
                                                                : 'bg-green-500/20 text-green-300 border border-green-500/40'
                                                        }`}>
                                                            {(Number(factor.impact) || 0).toFixed(4)} impact
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3 mt-3">
                                                        <div className="p-2 bg-dark-800/50 rounded border border-red-500/20">
                                                            <p className="text-xs text-gray-400 mb-1">Current Value</p>
                                                            <p className="text-sm font-bold text-red-300">
                                                                {isNumeric ? Number(currentValue).toFixed(1) : currentValue || 'N/A'}
                                                            </p>
                                                        </div>
                                                        <div className="p-2 bg-dark-800/50 rounded border border-green-500/20">
                                                            <p className="text-xs text-gray-400 mb-1">Target (Low Risk)</p>
                                                            <p className="text-sm font-bold text-green-300">
                                                                {optimal.target}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {needsImprovement && (
                                                        <div className="mt-2 flex items-center gap-2 text-xs">
                                                            <span className={`px-2 py-1 rounded ${
                                                                optimal.direction === 'increase' 
                                                                    ? 'bg-blue-500/20 text-blue-300' 
                                                                    : 'bg-purple-500/20 text-purple-300'
                                                            }`}>
                                                                {optimal.direction === 'increase' ? '↑ Increase' : '↓ Decrease'}
                                                            </span>
                                                            <span className="text-gray-400">
                                                                Est. risk reduction: <span className="text-green-400 font-semibold">-{optimal.riskReduction}%</span>
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                        <p className="text-xs text-green-300">
                                            💡 <span className="font-semibold">Pro Tip:</span> Implementing these optimizations could potentially reduce your cost overrun risk by 
                                            <span className="font-bold"> 15-30%</span>, depending on how many factors you improve.
                                        </p>
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

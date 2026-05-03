import { useState, useEffect, useRef, useCallback } from 'react';
import useCostController from '../../../controllers/useCostController';
import useProjectStore from '../../../models/useProjectStore';
import { INDICATOR_KEYS, CONTRACTOR_PROFILES, provinceDistrictMap } from './constants';
import { getInitialFormValues, getInitialDistricts, parseIntOrEmpty, parseFloatOrEmpty, validateForm } from './utils/formUtils';
import { getBudget, getAreaSqft, getFloors, deriveTimelineFromStartDate } from './utils/projectUtils';
import { FormHeader, ModeSelectorTabs, ProjectClassificationSection, ProjectDetailsSection, TimelineSection, EconomicIndicatorsSection, RiskExperienceSection, RiskScoresSection } from './components/FormSections';
import { MonteCarloConfig, FormFooter } from './components/MonteCarloConfig';
import { PredictionResults, MonteCarloResults } from './components/ResultPanels';

const CostPredictionView = ({ project, onBack }) => {
    const currentYear = new Date().getFullYear();
    const [formValues, setFormValues] = useState(() => getInitialFormValues(project));
    const quantityResult = useProjectStore((state) => state.quantityResult);
    const quantityData = useProjectStore((state) => state.quantityData);
    const [floorPlanAutoFilled, setFloorPlanAutoFilled] = useState({ Area_SQFT: false, Floors: false });
    const [initialValueMode, setInitialValueMode] = useState('auto');
    const [startDate, setStartDate] = useState('');
    const [availableDistricts, setAvailableDistricts] = useState(() => getInitialDistricts(project));
    const [isFormExpanded, setIsFormExpanded] = useState(false);
    const [validationErrors, setValidationErrors] = useState([]);
    const [indicatorTouched, setIndicatorTouched] = useState({ Inflation_Rate: false, Exchange_Rate_LKR: false, Material_Index: false });
    const fetchDebounceRef = useRef(null);
    const [predictionMode, setPredictionMode] = useState('single');
    const [mcEnabled, setMcEnabled] = useState(false);
    const [mcRanges, setMcRanges] = useState({
        Inflation_Rate: { min: -10, max: 50 },
        Exchange_Rate_LKR: { min: 100, max: 500 },
        Material_Index: { min: 50, max: 500 },
        Complexity_Score: { min: 1, max: 10 }
    });
    const [numSimulations, setNumSimulations] = useState(1000);

    const {
        loading, error, indicatorsLoading, indicatorsError, indicatorMetadata,
        prediction, hasPrediction, predictCost, fetchEconomicIndicators, clearPrediction,
        clearIndicatorsError, savePrediction, savingPrediction, predictMonteCarlo,
        monteCarloResult, monteCarloLoading
    } = useCostController();

    useEffect(() => {
        setMcRanges(prev => ({
            ...prev,
            Inflation_Rate: { ...prev.Inflation_Rate, min: (formValues.Inflation_Rate || 5) - 2, max: (formValues.Inflation_Rate || 5) + 5 },
            Exchange_Rate_LKR: { ...prev.Exchange_Rate_LKR, min: (formValues.Exchange_Rate_LKR || 300) - 10, max: (formValues.Exchange_Rate_LKR || 300) + 20 },
            Material_Index: { ...prev.Material_Index, min: (formValues.Material_Index || 120) - 10, max: (formValues.Material_Index || 120) + 20 },
            Complexity_Score: { ...prev.Complexity_Score, min: Math.max((formValues.Complexity_Score || 5) - 2, 1), max: Math.min((formValues.Complexity_Score || 5) + 2, 10) }
        }));
    }, [formValues.Inflation_Rate, formValues.Exchange_Rate_LKR, formValues.Material_Index, formValues.Complexity_Score]);

    useEffect(() => {
        if (!project) return;

        const budget = getBudget(project);
        const areaSqft = getAreaSqft(project);
        const floors = getFloors(project);
        const cidaGrade = project.contractorGrade || project.cidaGrade || project.CIDA_Grade || '';
        const constructionPeriod = project.constructionPeriod || 0;
        const timeline = deriveTimelineFromStartDate(project.startDate);
        const ratePerSqft = (areaSqft > 0 && budget > 0) ? Math.round(budget / areaSqft) : 0;

        if (timeline.formattedDate) setStartDate(timeline.formattedDate);
        if (budget > 0) setInitialValueMode('manual');

        setFormValues(prev => ({
            ...prev,
            Project_Type: project.projectType ? (project.projectType.toLowerCase() === 'residential' ? 'Residential-House' : project.projectType.toLowerCase() === 'apartment' ? 'Residential-Apartment' : project.projectType.toLowerCase() === 'commercial' ? 'Commercial-Building' : project.projectType.toLowerCase() === 'industrial' ? 'Industrial-Building' : project.projectType.toLowerCase() === 'infrastructure' ? 'Infrastructure' : project.projectType.toLowerCase() === 'mixed-use' ? 'Mixed-Development' : 'Residential-House') : '',
            Province: typeof project.location === 'object' && project.location.province ? project.location.province : '',
            District: typeof project.location === 'object' && project.location.district ? project.location.district : '',
            Initial_Value: budget || prev.Initial_Value,
            Area_SQFT: areaSqft || prev.Area_SQFT,
            Floors: floors || prev.Floors,
            CIDA_Grade: cidaGrade || prev.CIDA_Grade,
            Initial_Period_Months: constructionPeriod || prev.Initial_Period_Months,
            Start_Month: timeline.Start_Month || prev.Start_Month,
            Start_Quarter: timeline.Start_Quarter || prev.Start_Quarter,
            Start_Weekday: timeline.Start_Weekday || prev.Start_Weekday,
            Year_of_Tender: timeline.Year_of_Tender || prev.Year_of_Tender,
            Season: timeline.Season || prev.Season,
            Rate_per_SQFT: ratePerSqft || prev.Rate_per_SQFT,
        }));
    }, [project]);

    useEffect(() => {
        if (!quantityResult) return;
        const floorAreaM2 = quantityResult?.room_detection?.total_floor_area_m2 || 0;
        const floorAreaSqft = floorAreaM2 > 0 ? Math.round(floorAreaM2 * 10.764 * 100) / 100 : 0;
        const updates = {};
        const autoFlags = { Area_SQFT: false, Floors: false };

        if (floorAreaSqft > 0) { updates.Area_SQFT = floorAreaSqft; autoFlags.Area_SQFT = true; }
        const detectedRooms = quantityData?.detectedRooms || [];
        if (detectedRooms.length > 0 && (!formValues.Floors || formValues.Floors === 0)) { updates.Floors = 1; autoFlags.Floors = true; }

        if (Object.keys(updates).length > 0) {
            setFormValues(prev => ({ ...prev, ...updates }));
            setFloorPlanAutoFilled(prev => ({ ...prev, ...autoFlags }));
        }
    }, [quantityResult, quantityData]);

    useEffect(() => {
        const districts = formValues.Province ? provinceDistrictMap[formValues.Province] || [] : [];
        setAvailableDistricts(districts);
        if (!districts.includes(formValues.District)) {
            setFormValues(prev => ({ ...prev, District: '' }));
        }
    }, [formValues.Province]);

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
        return () => { if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current); };
    }, []);

    const handleMcRangeChange = useCallback((key, type, value) => {
        setMcRanges(prev => ({ ...prev, [key]: { ...prev[key], [type]: parseFloatOrEmpty(value) } }));
    }, []);

    const handleSliderSensitivity = useCallback(async (val) => {
        handleMcRangeChange('Complexity_Score', 'max', val);
        const newRanges = { ...mcRanges, Complexity_Score: { ...mcRanges.Complexity_Score, max: val } };
        await predictMonteCarlo(formValues, newRanges, 300);
    }, [mcRanges, formValues, predictMonteCarlo, handleMcRangeChange]);

    const handleRunMonteCarlo = useCallback(async () => {
        const errors = validateForm(formValues, startDate, currentYear);
        setValidationErrors(errors);
        if (errors.length > 0) return;
        await predictMonteCarlo(formValues, mcRanges, numSimulations);
    }, [formValues, startDate, currentYear, mcRanges, numSimulations, predictMonteCarlo]);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        const errors = validateForm(formValues, startDate, currentYear);
        setValidationErrors(errors);
        if (errors.length > 0) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
        await predictCost(formValues);
    }, [formValues, startDate, currentYear, predictCost]);

    const applyFetchedIndicators = useCallback((fetchedValues, forceUpdate = false) => {
        setFormValues((prev) => ({
            ...prev,
            Inflation_Rate: forceUpdate || !indicatorTouched.Inflation_Rate ? (fetchedValues.Inflation_Rate ?? prev.Inflation_Rate) : prev.Inflation_Rate,
            Exchange_Rate_LKR: forceUpdate || !indicatorTouched.Exchange_Rate_LKR ? (fetchedValues.Exchange_Rate_LKR ?? prev.Exchange_Rate_LKR) : prev.Exchange_Rate_LKR,
            Material_Index: forceUpdate || !indicatorTouched.Material_Index ? (fetchedValues.Material_Index ?? prev.Material_Index) : prev.Material_Index,
        }));
    }, [indicatorTouched]);

    const runEconomicIndicatorsFetch = useCallback(async (forceUpdate = false) => {
        const year = Number(formValues.Year_of_Tender);
        const province = formValues.Province;
        const district = formValues.District;
        if (!Number.isInteger(year) || year < 1950 || !province) return;
        const result = await fetchEconomicIndicators({ year, province, district });
        if (result.success && result.data) applyFetchedIndicators(result.data, forceUpdate);
    }, [formValues.Year_of_Tender, formValues.Province, formValues.District, fetchEconomicIndicators, applyFetchedIndicators]);

    useEffect(() => {
        const year = Number(formValues.Year_of_Tender);
        if (!Number.isInteger(year) || year < 1950 || !formValues.Province) return;
        if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
        fetchDebounceRef.current = setTimeout(() => { runEconomicIndicatorsFetch(false); }, 550);
        return () => { if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current); };
    }, [formValues.Year_of_Tender, formValues.Province, formValues.District, runEconomicIndicatorsFetch]);

    const handleChange = useCallback((key, parser = (val) => val) => (e) => {
        const { value } = e.target;
        const parsed = value === '' ? '' : parser(value);
        if (INDICATOR_KEYS.includes(key)) {
            setIndicatorTouched((prev) => ({ ...prev, [key]: true }));
            clearIndicatorsError();
        }
        setFormValues((prev) => ({ ...prev, [key]: parsed }));
    }, [clearIndicatorsError]);

    const handleRefreshIndicators = useCallback(async () => {
        setIndicatorTouched({ Inflation_Rate: false, Exchange_Rate_LKR: false, Material_Index: false });
        await runEconomicIndicatorsFetch(true);
    }, [runEconomicIndicatorsFetch]);

    const handleStartDateChange = useCallback((e) => {
        const dateValue = e.target.value;
        setStartDate(dateValue);
        if (dateValue) {
            const timeline = deriveTimelineFromStartDate(dateValue);
            if (timeline.Season) {
                setValidationErrors([]);
                setFormValues(prev => ({
                    ...prev,
                    Start_Month: timeline.Start_Month,
                    Start_Quarter: timeline.Start_Quarter,
                    Start_Weekday: timeline.Start_Weekday,
                    Year_of_Tender: timeline.Year_of_Tender,
                    Season: timeline.Season
                }));
            }
        }
    }, []);

    const projectId = project?._id || project?.id;

    return (
        <div className="space-y-6">
            <div className="relative overflow-hidden bg-gradient-to-r from-amber-600/20 via-orange-500/15 to-yellow-500/20 border border-amber-500/30 rounded-2xl p-6" style={{ backgroundSize: '200% 200%', animation: 'gradientShift 6s ease infinite' }}>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(251,191,36,0.15),transparent_60%)]" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 rounded-full blur-2xl" />
                <div className="relative flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                        {onBack && (
                            <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-yellow-200 hover:bg-white/20 hover:scale-105 transition-all duration-200" title="Back to Project">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                        )}
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 shadow-lg shadow-amber-500/25 flex items-center justify-center">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">Cost Prediction{project ? ` — ${project.name}` : ''}</h2>
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

            <div className={`grid grid-cols-1 ${isFormExpanded ? 'xl:grid-cols-1' : 'xl:grid-cols-12'} gap-6 items-start`}>
                <div className={isFormExpanded ? 'xl:col-span-1' : 'xl:col-span-5 xl:sticky xl:top-4'}>
                    <form onSubmit={handleSubmit} className={`bg-dark-800/60 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-5 space-y-5 ${isFormExpanded ? 'max-h-none' : 'max-h-[calc(100vh-9rem)]'} overflow-y-auto shadow-xl shadow-black/20`}>
                        <FormHeader error={error} isFormExpanded={isFormExpanded} onToggleExpand={() => setIsFormExpanded(!isFormExpanded)} onBack={onBack} projectName={project?.name} />
                        <ModeSelectorTabs predictionMode={predictionMode} onModeChange={setPredictionMode} />
                        <ProjectClassificationSection formValues={formValues} project={project} availableDistricts={availableDistricts} isFormExpanded={isFormExpanded} onChange={handleChange} />
                        <ProjectDetailsSection formValues={formValues} isFormExpanded={isFormExpanded} onChange={handleChange} initialValueMode={initialValueMode} onToggleInitialValueMode={() => setInitialValueMode(initialValueMode === 'auto' ? 'manual' : 'auto')} floorPlanAutoFilled={floorPlanAutoFilled} onClearAutoFill={(key) => setFloorPlanAutoFilled(prev => ({ ...prev, [key]: false }))} />
                        <TimelineSection formValues={formValues} startDate={startDate} isFormExpanded={isFormExpanded} onChange={handleChange} onStartDateChange={handleStartDateChange} currentYear={currentYear} />
                        <EconomicIndicatorsSection formValues={formValues} isFormExpanded={isFormExpanded} onChange={handleChange} indicatorsLoading={indicatorsLoading} indicatorsError={indicatorsError} indicatorMetadata={indicatorMetadata} onRefresh={handleRefreshIndicators} />
                        <RiskExperienceSection formValues={formValues} isFormExpanded={isFormExpanded} onChange={handleChange} />
                        <RiskScoresSection formValues={formValues} isFormExpanded={isFormExpanded} onChange={handleChange} />

                        {predictionMode === 'monte-carlo' && !mcEnabled && (
                            <div className="flex items-center justify-end mb-3">
                                <button type="button" onClick={() => setMcEnabled(true)} className="px-3 py-1 text-xs font-medium rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 transition-all">Show Uncertainty Config</button>
                            </div>
                        )}
                        {predictionMode === 'monte-carlo' && mcEnabled && (
                            <MonteCarloConfig mcRanges={mcRanges} numSimulations={numSimulations} onRangeChange={handleMcRangeChange} onNumSimulationsChange={setNumSimulations} onToggle={setMcEnabled} onSliderSensitivity={handleSliderSensitivity} />
                        )}

                        <FormFooter validationErrors={validationErrors} error={error} predictionMode={predictionMode} loading={loading} monteCarloLoading={monteCarloLoading} onSubmit={handleSubmit} onMonteCarlo={handleRunMonteCarlo} onClearPrediction={clearPrediction} onReset={() => window.location.reload()} />
                    </form>
                </div>

                <div className={isFormExpanded ? 'space-y-4' : 'xl:col-span-7 space-y-4'}>
                    {monteCarloResult && (
                        <MonteCarloResults monteCarloResult={monteCarloResult} formValues={formValues} projectId={projectId} savePrediction={savePrediction} savingPrediction={savingPrediction} />
                    )}
                    {hasPrediction ? (
                        <PredictionResults prediction={prediction} formValues={formValues} projectId={projectId} savePrediction={savePrediction} savingPrediction={savingPrediction} onClearPrediction={clearPrediction} />
                    ) : (
                        !monteCarloResult && (
                            <div className="h-full min-h-[420px] bg-dark-800/50 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center p-10">
                                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl text-amber-200">$</div>
                                <p className="text-white text-xl font-semibold mt-3">Prediction Workspace Ready</p>
                                <p className="text-gray-400 text-sm mt-2 max-w-md">Complete the input panel and click Predict Cost Overrun to view risk level, budget impact, top drivers, and optimization guidance.</p>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default CostPredictionView;

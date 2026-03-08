import { useState, useCallback } from 'react';
import useProjectStore from '../models/useProjectStore';
import { costApi, parseApiError } from '../models/api';

const useCostController = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [indicatorsLoading, setIndicatorsLoading] = useState(false);
    const [indicatorsError, setIndicatorsError] = useState(null);
    const [indicatorMetadata, setIndicatorMetadata] = useState(null);

    const costPrediction = useProjectStore((state) => state.costPrediction);
    const setCostPrediction = useProjectStore((state) => state.setCostPrediction);

    // ML model expects these fields only
    const ML_EXPECTED_FIELDS = [
        'Project_Type',
        'Province',
        'District',
        'CIDA_Grade',
        'Season',
        'Floors',
        'Area_SQFT',
        'Year_of_Tender',
        'Contractor_Experience_Years',
        'Complexity_Score',
        'Change_Order_Freq',
        'Start_Month',
        'Start_Quarter',
        'Start_Weekday',
        'Initial_Period_Months',
        'Inflation_Rate',
        'Exchange_Rate_LKR',
        'Material_Index',
        'Design_Completeness',
        'Project_Size_Index',
        'Economic_Risk_Index',
        'Design_Risk_Score',
        'Contractor_Risk_Score',
        'Weather_Risk_Score',
        'Rate_per_SQFT',
        'Initial_Value'
    ];

    const buildMLPayload = (formValues) => {
        // Filter to only send ML-expected fields
        const payload = {};
        ML_EXPECTED_FIELDS.forEach(field => {
            if (field in formValues) {
                payload[field] = formValues[field];
            }
        });
        return payload;
    };

    const predictCost = useCallback(async (formValues) => {
        setLoading(true);
        setError(null);

        try {
            // Build whitelisted payload (excludes UI-only fields)
            const mlPayload = buildMLPayload(formValues);
            
            console.log('📤 Request Data (filtered):', mlPayload);
            console.log('📋 Full Form Values:', formValues);

            const response = await costApi.predictCost(mlPayload);

            console.log('📥 Response Data:', response.data);

            const isSuccess = response.data?.success ?? true;
            if (isSuccess) {
                // Normalize backend fields so the UI can handle both old and new API shapes.
                const raw = response.data?.data ?? response.data ?? {};
                const normalizedOverrun =
                    raw.predicted_cost_overrun_pct ?? raw.predicted_cost_overrun_percentage ?? null;
                const normalizedRiskFlag =
                    raw.high_risk_label ??
                    raw.predicted_high_risk_project ??
                    (raw.risk_label === 'HIGH' ? 1 : raw.risk_label === 'LOW' ? 0 : null);

                const predictionData = {
                    predicted_cost_overrun_pct: normalizedOverrun,
                    predicted_high_risk_class:
                        raw.predicted_high_risk_class ?? raw.predicted_high_risk_project ?? normalizedRiskFlag,
                    predicted_high_risk_probability:
                        raw.predicted_high_risk_probability ?? raw.overrun_probability ?? null,
                    top_risk_factors: Array.isArray(raw.top_risk_factors) ? raw.top_risk_factors : [],
                    risk_scorecard: Array.isArray(raw.risk_scorecard) ? raw.risk_scorecard : [],
                    model_version: raw.model_version ?? null,
                    timestamp: response.data?.timestamp
                };
                console.log('✅ Prediction Data:', predictionData);
                setCostPrediction(predictionData);
                return { success: true, data: predictionData };
            } else {
                console.error('❌ Prediction Failed:', response.data.message);
                throw new Error(response.data.message || 'Prediction failed');
            }
        } catch (err) {
            let errorMessage = 'Failed to connect to prediction service';
            
            if (err.response) {
                // Server responded with error
                errorMessage = err.response.data?.message || err.response.data?.error || errorMessage;
                console.error('❌ Server Error:', err.response.data);
            } else if (err.request) {
                // No response received
                errorMessage = 'ML service unavailable. Please ensure the service is running on port 8085.';
                console.error('❌ No Response:', err.request);
            } else {
                // Request setup error
                errorMessage = err.message;
            }
            
            setError(errorMessage);
            console.error('[CostController] Prediction error:', err);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    }, [setCostPrediction]);

    const clearPrediction = useCallback(() => {
        useProjectStore.getState().resetModule('cost');
        setError(null);
    }, []);

    const fetchEconomicIndicators = useCallback(async ({ year, province, district }) => {
        if (!year || !province) {
            return { success: false, error: 'Year and province are required.' };
        }

        setIndicatorsLoading(true);
        setIndicatorsError(null);

        try {
            const response = await costApi.getEconomicIndicators({
                year,
                province,
                district,
            });

            const raw = response?.data?.data ?? {};
            const normalized = {
                Inflation_Rate: raw.Inflation_Rate ?? null,
                Exchange_Rate_LKR: raw.Exchange_Rate_LKR ?? null,
                Material_Index: raw.Material_Index ?? null,
            };

            const metadata = {
                fetchedAt: response?.data?.timestamp || new Date().toISOString(),
                source: raw?.meta?.source || 'FRED',
                year: raw?.meta?.year ?? year,
                appliedMultiplier: raw?.meta?.appliedMultiplier || null,
                series: raw?.meta?.series || null,
            };

            setIndicatorMetadata(metadata);

            return {
                success: true,
                data: normalized,
                metadata,
            };
        } catch (err) {
            const message = parseApiError(err);
            setIndicatorsError(message);
            return {
                success: false,
                error: message,
            };
        } finally {
            setIndicatorsLoading(false);
        }
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const clearIndicatorsError = useCallback(() => {
        setIndicatorsError(null);
    }, []);

    // ── Persistence Methods ──────────────────────────────────────

    const [savingPrediction, setSavingPrediction] = useState(false);
    const [predictionHistory, setPredictionHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const savePrediction = useCallback(async (projectId, formValues, metadata = {}) => {
        console.log('🔄 [savePrediction] Called with:', { projectId, metadata });
        console.log('🔄 [savePrediction] Form values:', formValues);
        console.log('🔄 [savePrediction] Current prediction:', costPrediction);
        
        if (!costPrediction) {
            console.error('❌ [savePrediction] No prediction available');
            return { success: false, error: 'No prediction to save' };
        }

        setSavingPrediction(true);
        try {
            // Build ML payload from form values
            const mlPayload = {};
            ML_EXPECTED_FIELDS.forEach(field => {
                if (field in formValues) {
                    mlPayload[field] = formValues[field];
                }
            });
            
            console.log('📦 [savePrediction] ML Payload:', mlPayload);
            console.log('📦 [savePrediction] Prediction object:', {
                predicted_cost_overrun_pct: costPrediction.predicted_cost_overrun_pct,
                predicted_high_risk_class: costPrediction.predicted_high_risk_class,
                predicted_high_risk_probability: costPrediction.predicted_high_risk_probability,
                model_version: costPrediction.model_version
            });
            console.log('📦 [savePrediction] Top risk factors count:', (costPrediction.top_risk_factors || []).length);
            console.log('📦 [savePrediction] Risk scorecard count:', (costPrediction.risk_scorecard || []).length);
            
            const response = await costApi.savePrediction(
                projectId,
                mlPayload,
                {
                    predicted_cost_overrun_pct: costPrediction.predicted_cost_overrun_pct,
                    predicted_high_risk_class: costPrediction.predicted_high_risk_class,
                    predicted_high_risk_probability: costPrediction.predicted_high_risk_probability,
                    model_version: costPrediction.model_version
                },
                costPrediction.top_risk_factors || [],
                costPrediction.risk_scorecard || [],
                metadata
            );

            console.log('✅ [savePrediction] Response:', response.data);
            return { success: true, data: response.data };
        } catch (err) {
            const errorMessage = parseApiError(err);
            console.error('❌ [savePrediction] Error:', errorMessage);
            console.error('❌ [savePrediction] Full error:', err);
            return { success: false, error: errorMessage };
        } finally {
            setSavingPrediction(false);
        }
    }, [costPrediction]);

    const fetchPredictionHistory = useCallback(async (projectId, filters = {}) => {
        setLoadingHistory(true);
        try {
            const response = await costApi.getPredictionHistory(projectId, filters);
            const predictions = response.data?.data?.predictions || [];
            setPredictionHistory(predictions);
            return { success: true, data: response.data };
        } catch (err) {
            const errorMessage = parseApiError(err);
            console.error('❌ Fetch history error:', errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoadingHistory(false);
        }
    }, []);

    const updatePrediction = useCallback(async (predictionId, updates) => {
        try {
            const response = await costApi.updatePrediction(predictionId, updates);
            console.log('✅ Prediction updated:', response.data);
            return { success: true, data: response.data };
        } catch (err) {
            const errorMessage = parseApiError(err);
            console.error('❌ Update prediction error:', errorMessage);
            return { success: false, error: errorMessage };
        }
    }, []);

    const deletePrediction = useCallback(async (predictionId) => {
        try {
            const response = await costApi.deletePrediction(predictionId);
            console.log('✅ Prediction deleted');
            return { success: true, data: response.data };
        } catch (err) {
            const errorMessage = parseApiError(err);
            console.error('❌ Delete prediction error:', errorMessage);
            return { success: false, error: errorMessage };
        }
    }, []);

    const recordActualOutcome = useCallback(async (predictionId, actualData) => {
        try {
            const response = await costApi.recordActualOutcome(predictionId, actualData);
            console.log('✅ Actual outcome recorded:', response.data);
            return { success: true, data: response.data };
        } catch (err) {
            const errorMessage = parseApiError(err);
            console.error('❌ Record outcome error:', errorMessage);
            return { success: false, error: errorMessage };
        }
    }, []);

    return {
        loading,
        error,
        indicatorsLoading,
        indicatorsError,
        indicatorMetadata,
        prediction: costPrediction,
        hasPrediction: costPrediction !== null,
        predictCost,
        fetchEconomicIndicators,
        clearPrediction,
        clearError,
        clearIndicatorsError,
        // Persistence methods
        savePrediction,
        savingPrediction,
        fetchPredictionHistory,
        predictionHistory,
        loadingHistory,
        updatePrediction,
        deletePrediction,
        recordActualOutcome
    };
};

export default useCostController;

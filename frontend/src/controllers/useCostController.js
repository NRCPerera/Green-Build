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
    };
};

export default useCostController;

import { useState, useCallback } from 'react';
import useProjectStore from '../models/useProjectStore';
import { costApi, parseApiError } from '../models/api';
import axios from 'axios';

const useCostController = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const costPrediction = useProjectStore((state) => state.costPrediction);
    const setCostPrediction = useProjectStore((state) => state.setCostPrediction);

    const predictCost = useCallback(async (formValues) => {
        setLoading(true);
        setError(null);

        try {
            console.log('📤 Request Data:', formValues);
            console.log('📋 Form Values:', formValues);

            // Get auth token from localStorage
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('Authentication required. Please login first.');
            }

            // Call the new pre-project prediction endpoint
            const response = await axios.post(
                'http://localhost:5000/api/cost-prediction/pre-project',
                formValues, // Send features directly (no data wrapper)
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    timeout: 30000
                }
            );

            console.log('📥 Response Data:', response.data);

            if (response.data.success) {
                // Normalize backend fields so the UI can handle both old and new API shapes.
                const raw = response.data.data || {};
                const normalizedOverrun =
                    raw.predicted_cost_overrun_pct ?? raw.predicted_cost_overrun_percentage ?? null;
                const normalizedRiskFlag =
                    raw.high_risk_label ??
                    raw.predicted_high_risk_project ??
                    (raw.risk_label === 'HIGH' ? 1 : raw.risk_label === 'LOW' ? 0 : null);

                const predictionData = {
                    ...raw,
                    predicted_cost_overrun_pct: normalizedOverrun,
                    predicted_cost_overrun_percentage: normalizedOverrun,
                    high_risk_label: normalizedRiskFlag,
                    predicted_high_risk_project: normalizedRiskFlag,
                    overrun_probability: raw.overrun_probability ?? null,
                    threshold: raw.threshold ?? null,
                    timestamp: response.data.timestamp
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

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        loading,
        error,
        prediction: costPrediction,
        hasPrediction: costPrediction !== null,
        predictCost,
        clearPrediction,
        clearError,
    };
};

export default useCostController;

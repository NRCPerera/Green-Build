import { useState, useCallback } from 'react';
import useProjectStore from '../models/useProjectStore';
import { costApi, parseApiError } from '../models/api';

const useCostController = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const costPrediction = useProjectStore((state) => state.costPrediction);
    const setCostPrediction = useProjectStore((state) => state.setCostPrediction);

    const predictCost = useCallback(async (formValues) => {
        setLoading(true);
        setError(null);

        try {
            const requestPayload = { data: formValues, explain: true, top_n: 20 };
            console.log('📤 Request Data:', requestPayload);
            console.log('📋 Form Values:', formValues);

            // Send the form data directly to the API, request SHAP with top_n=20
            const response = await fetch('http://localhost:5000/api/predict-cost-overrun', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestPayload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Error Response:', errorData);
                throw new Error(errorData.message || 'Prediction failed');
            }

            const result = await response.json();
            console.log('📥 Response Data:', result);

            if (result.success) {
                // Map the API response to the expected format
                const predictionData = {
                    ...result.prediction,
                    timestamp: result.timestamp
                };
                console.log('✅ Prediction Data:', predictionData);
                setCostPrediction(predictionData);
                return { success: true, data: predictionData };
            } else {
                console.error('❌ Prediction Failed:', result.message);
                throw new Error(result.message || 'Prediction failed');
            }
        } catch (err) {
            const errorMessage = err.message || 'Failed to connect to prediction service';
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

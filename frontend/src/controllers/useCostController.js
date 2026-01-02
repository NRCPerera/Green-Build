/**
 * =============================================================================
 * COST PREDICTION CONTROLLER
 * =============================================================================
 * 
 * Business logic hook for Module 2: Cost Prediction.
 * 
 * KEY FEATURE: Pulls quantityData from the global store (set by Module 1),
 * sends it to the Cost Prediction API, and returns prediction results.
 * 
 * REQUIRES: Quantity data must be available in the store.
 */

import { useState, useCallback, useEffect } from 'react';
import useProjectStore from '../models/useProjectStore';
import { costApi, parseApiError } from '../models/api';

/**
 * Custom hook for Cost Prediction module
 * 
 * @returns {Object} Controller state and methods
 */
const useCostController = () => {
    // Local state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Global store - READ quantity data from Module 1
    const quantityData = useProjectStore((state) => state.quantityData);
    const costPrediction = useProjectStore((state) => state.costPrediction);
    const setCostPrediction = useProjectStore((state) => state.setCostPrediction);

    // Check if quantity data is available
    const hasQuantityData = quantityData !== null;

    /**
     * Predict cost overruns based on quantity data and form inputs
     * 
     * @param {Object} formValues - Additional prediction parameters
     * @param {number} formValues.projectDurationMonths - Project duration
     * @param {number} formValues.complexityScore - Project complexity 1-10
     * @param {string} formValues.contractorGrade - Contractor grade A/B/C/D
     * @param {number} formValues.weatherRiskFactor - Weather risk 0-1
     */
    const predictCost = useCallback(async (formValues) => {
        if (!hasQuantityData) {
            setError('Quantity data is required. Complete Module 1 first.');
            return { success: false, error: 'Missing quantity data' };
        }

        setLoading(true);
        setError(null);

        try {
            // Build prediction input using quantity data from global store
            const input = {
                quantityData: {
                    wallArea: quantityData.wallNetSurfaceAreaM2,
                    doorCount: quantityData.itemCounts?.doors || 0,
                    windowCount: quantityData.itemCounts?.windows || 0,
                    roomCount: quantityData.detectedRooms?.length || 0,
                },
                projectDurationMonths: formValues.projectDurationMonths,
                complexityScore: formValues.complexityScore,
                contractorGrade: formValues.contractorGrade,
                weatherRiskFactor: formValues.weatherRiskFactor || 0.3,
            };

            const response = await costApi.predictCost(input);

            if (response.data?.success) {
                setCostPrediction(response.data.data);
                return { success: true, data: response.data.data };
            } else {
                throw new Error(response.data?.message || 'Prediction failed');
            }
        } catch (err) {
            const errorMessage = parseApiError(err);
            setError(errorMessage);

            // Generate mock prediction for demo purposes if API fails
            console.warn('[CostController] API failed, generating mock prediction');
            const mockPrediction = generateMockPrediction(formValues, quantityData);
            setCostPrediction(mockPrediction);

            return { success: true, data: mockPrediction, mock: true };
        } finally {
            setLoading(false);
        }
    }, [hasQuantityData, quantityData, setCostPrediction]);

    /**
     * Clear prediction results
     */
    const clearPrediction = useCallback(() => {
        useProjectStore.getState().resetModule('cost');
        setError(null);
    }, []);

    /**
     * Clear error state
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    /**
     * Get color class for risk level
     * @param {string} riskLevel - 'High', 'Medium', or 'Low'
     * @returns {string} Tailwind color class
     */
    const getRiskColor = (riskLevel) => {
        switch (riskLevel) {
            case 'High':
                return 'text-red-400 bg-red-500/10 border-red-500/30';
            case 'Medium':
                return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
            case 'Low':
                return 'text-green-400 bg-green-500/10 border-green-500/30';
            default:
                return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
        }
    };

    return {
        // State
        loading,
        error,

        // Data from global store
        quantityData,
        prediction: costPrediction,
        hasQuantityData,
        hasPrediction: costPrediction !== null,

        // Actions
        predictCost,
        clearPrediction,
        clearError,

        // Utilities
        getRiskColor,
    };
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a mock prediction for demo purposes
 * @param {Object} formValues - Form input values
 * @param {Object} quantityData - Quantity data from store
 * @returns {Object} Mock prediction result
 */
function generateMockPrediction(formValues, quantityData) {
    const baseOverrun = (formValues.complexityScore || 5) * 1.5;
    const gradeMultiplier = getGradeMultiplier(formValues.contractorGrade);
    const weatherImpact = (formValues.weatherRiskFactor || 0.3) * 5;

    const predictedOverrun = baseOverrun + weatherImpact * gradeMultiplier;
    const riskLevel = predictedOverrun > 15 ? 'High' : predictedOverrun > 8 ? 'Medium' : 'Low';

    return {
        predictedOverrunPercentage: parseFloat(predictedOverrun.toFixed(1)),
        riskLevel,
        riskScore: Math.min(100, Math.round(predictedOverrun * 5)),
        confidenceInterval: {
            lower: parseFloat((predictedOverrun * 0.7).toFixed(1)),
            upper: parseFloat((predictedOverrun * 1.3).toFixed(1)),
        },
        shapValues: [
            { feature: 'Project Complexity', contribution: formValues.complexityScore * 1.2 },
            { feature: 'Contractor Grade', contribution: gradeMultiplier * 3 },
            { feature: 'Weather Risk', contribution: weatherImpact },
            { feature: 'Wall Area', contribution: (quantityData?.wallNetSurfaceAreaM2 || 0) * 0.05 },
            { feature: 'Duration', contribution: (formValues.projectDurationMonths || 12) * 0.2 },
        ],
        recommendations: [
            'Monitor material prices weekly',
            'Establish clear change order procedures',
            'Consider phased construction approach',
        ],
        timestamp: new Date().toISOString(),
    };
}

function getGradeMultiplier(grade) {
    switch (grade) {
        case 'A': return 0.8;
        case 'B': return 1.0;
        case 'C': return 1.2;
        case 'D': return 1.5;
        default: return 1.0;
    }
}

export default useCostController;

import { useState, useCallback } from 'react';
import useProjectStore from '../models/useProjectStore';
import { delayApi, parseApiError } from '../models/api';

/**
 * Delay Controller Hook
 * 
 * Manages delay prediction functionality using the ML service.
 * Supports both regression (delay days) and classification (delay category).
 */
const useDelayController = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [mlServiceStatus, setMlServiceStatus] = useState(null);

    const delayForecast = useProjectStore((state) => state.delayForecast);
    const setDelayForecast = useProjectStore((state) => state.setDelayForecast);

    /**
     * Predict delay using the ML service (full prediction)
     * Combines regression (days) and classification (category)
     */
    const predictDelay = useCallback(async (formValues) => {
        setLoading(true);
        setError(null);

        try {
            // Build input matching the ML model's expected features
            const input = {
                District: formValues.district || 'Colombo',
                Project_Type: formValues.projectType || 'Commercial Building',
                Contractor_ICTAD_Grade: formValues.contractorGrade || 'CIDA 1',
                Contract_Value_LKR: formValues.contractValue || 100000000,
                Land_Area_Sqft: formValues.landArea || 10000,
                Planned_Duration_Days: (formValues.plannedDurationMonths || 12) * 30,
                Weather_Impact_Score: formValues.weatherImpactScore || 2.5,
                Contractor_Experience_Years: formValues.contractorExperience || 10,
                Labor_Availability_Score: formValues.laborAvailability || 3.0,
                Material_Cost_Index: formValues.materialCostIndex || 100,
                Inflation_Rate: formValues.inflationRate || 0.08,
                Rainfall_mm: formValues.rainfall || 150,
                Equipment_Availability_Score: formValues.equipmentAvailability || 3.5,
            };

            console.log('📤 Delay Prediction Request:', input);

            const response = await delayApi.predict(input);
            console.log('📥 Delay Prediction Response:', response.data);

            if (response.data?.success) {
                const result = transformApiResponse(response.data, formValues);
                setDelayForecast(result);
                return { success: true, data: result };
            }

            throw new Error(response.data?.message || 'Prediction failed');

        } catch (err) {
            console.error('[DelayController] Prediction error:', err);
            const errorMessage = parseApiError(err);
            setError(errorMessage);

            // Fallback to mock data if API fails
            console.warn('[DelayController] Using mock data due to API error');
            const mockResult = generateMockDelayForecast(formValues);
            setDelayForecast(mockResult);
            return { success: true, data: mockResult, mock: true };

        } finally {
            setLoading(false);
        }
    }, [setDelayForecast]);

    /**
     * Check ML service health
     */
    const checkMlHealth = useCallback(async () => {
        try {
            const response = await delayApi.checkHealth();
            setMlServiceStatus(response.data);
            return response.data;
        } catch (err) {
            setMlServiceStatus({ status: 'unavailable', error: err.message });
            return null;
        }
    }, []);

    /**
     * Clear forecast data
     */
    const clearForecast = useCallback(() => {
        useProjectStore.getState().resetModule('delay');
        setError(null);
    }, []);

    /**
     * Clear error state
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // Helper functions for UI
    const getCategoryColor = (category) => {
        switch (category) {
            case 'Critical Delay':
                return 'text-red-500';
            case 'Major Delay':
                return 'text-orange-400';
            case 'Minor Delay':
                return 'text-yellow-400';
            case 'On-Time':
                return 'text-green-400';
            default:
                return 'text-gray-400';
        }
    };

    const getCategoryBgColor = (category) => {
        switch (category) {
            case 'Critical Delay':
                return 'bg-red-500/20 border-red-500/30';
            case 'Major Delay':
                return 'bg-orange-500/20 border-orange-500/30';
            case 'Minor Delay':
                return 'bg-yellow-500/20 border-yellow-500/30';
            case 'On-Time':
                return 'bg-green-500/20 border-green-500/30';
            default:
                return 'bg-gray-500/20 border-gray-500/30';
        }
    };

    const formatDelayDays = (days) => {
        if (days <= 0) return 'On Time';
        if (days < 7) return `${Math.round(days)} days`;
        if (days < 30) return `${Math.round(days / 7)} weeks`;
        if (days < 365) return `${(days / 30).toFixed(1)} months`;
        return `${(days / 365).toFixed(1)} years`;
    };

    const getSeverityLevel = (days) => {
        if (days <= 0) return 'On-Time';
        if (days <= 60) return 'Minor';
        if (days <= 180) return 'Major';
        return 'Critical';
    };

    return {
        loading,
        error,
        mlServiceStatus,
        forecast: delayForecast,
        hasForecast: delayForecast !== null,
        predictDelay,
        checkMlHealth,
        clearForecast,
        clearError,
        getCategoryColor,
        getCategoryBgColor,
        formatDelayDays,
        getSeverityLevel,
    };
};

/**
 * Transform API response to the format expected by the view
 */
function transformApiResponse(apiResponse, formValues) {
    const { regression_result, classification_result, timestamp } = apiResponse;

    const predictedDelayDays = regression_result?.predicted_delay_days || 0;
    const predictedCategory = classification_result?.predicted_category || 'Unknown';
    const confidence = classification_result?.confidence || 0;
    const classProbabilities = classification_result?.class_probabilities || {};

    // Calculate completion dates
    const startDate = new Date();
    const plannedDays = (formValues.plannedDurationMonths || 12) * 30;
    const plannedEnd = new Date(startDate);
    plannedEnd.setDate(plannedEnd.getDate() + plannedDays);

    const predictedEnd = new Date(plannedEnd);
    predictedEnd.setDate(predictedEnd.getDate() + predictedDelayDays);

    return {
        // ML Model Results
        predictedDelayDays,
        delaySeverity: regression_result?.delay_severity || 'Unknown',
        predictedCategory,
        categoryConfidence: confidence,
        classProbabilities,

        // Computed Values
        predictedDelayMonths: predictedDelayDays / 30,
        plannedCompletionDate: plannedEnd.toISOString(),
        predictedCompletionDate: predictedEnd.toISOString(),

        // Risk Level
        riskLevel: predictedCategory.includes('Critical') ? 'Critical' :
            predictedCategory.includes('Major') ? 'High' :
                predictedCategory.includes('Minor') ? 'Medium' : 'Low',

        // Confidence Interval (estimated based on predicted days)
        confidenceInterval: {
            earliest: new Date(predictedEnd.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            latest: new Date(predictedEnd.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString(),
        },

        // Scenarios (estimated based on predicted days)
        scenarios: {
            bestCase: {
                delayDays: Math.max(0, predictedDelayDays * 0.6),
                probability: classProbabilities['On-Time'] || 0.2
            },
            mostLikely: {
                delayDays: predictedDelayDays,
                probability: confidence
            },
            worstCase: {
                delayDays: predictedDelayDays * 1.5,
                probability: classProbabilities['Critical Delay'] || classProbabilities['Major Delay'] || 0.15
            },
        },

        // Recommendations based on category
        recommendations: getRecommendations(predictedCategory, predictedDelayDays),

        timestamp: timestamp || new Date().toISOString(),
        source: 'ml_prediction',
    };
}

/**
 * Get recommendations based on delay prediction
 */
function getRecommendations(category, delayDays) {
    const baseRecs = [
        'Monitor project milestones closely',
        'Maintain regular communication with contractors',
    ];

    if (category === 'Critical Delay' || delayDays > 180) {
        return [
            '🚨 Immediate intervention required',
            'Consider adding more resources or parallel work streams',
            'Review and expedite all pending approvals',
            'Negotiate contract extensions proactively',
            ...baseRecs,
        ];
    }

    if (category === 'Major Delay' || delayDays > 60) {
        return [
            '⚠️ Develop mitigation strategies',
            'Increase resource allocation for critical path activities',
            'Review contractor performance and capacity',
            'Build contingency buffer in the schedule',
            ...baseRecs,
        ];
    }

    if (category === 'Minor Delay' || delayDays > 0) {
        return [
            '📋 Track delay causes for lessons learned',
            'Optimize resource scheduling',
            'Consider fast-tracking non-critical activities',
            ...baseRecs,
        ];
    }

    return [
        '✅ Project on track',
        'Maintain current pace and quality',
        'Document successful practices',
        ...baseRecs,
    ];
}

/**
 * Generate mock forecast data when API is unavailable
 */
function generateMockDelayForecast(formValues) {
    const plannedDays = (formValues.plannedDurationMonths || 12) * 30;

    // Simple mock calculation
    const baseDelayDays = Math.random() * 60 + 20; // 20-80 days
    const predictedDelayDays = Math.round(baseDelayDays);

    const startDate = new Date();
    const plannedEnd = new Date(startDate);
    plannedEnd.setDate(plannedEnd.getDate() + plannedDays);

    const predictedEnd = new Date(plannedEnd);
    predictedEnd.setDate(predictedEnd.getDate() + predictedDelayDays);

    const category = predictedDelayDays <= 0 ? 'On-Time' :
        predictedDelayDays <= 60 ? 'Minor Delay' :
            predictedDelayDays <= 180 ? 'Major Delay' : 'Critical Delay';

    return {
        predictedDelayDays,
        delaySeverity: `${category} (${predictedDelayDays} days)`,
        predictedCategory: category,
        categoryConfidence: 0.65,
        classProbabilities: {
            'On-Time': 0.2,
            'Minor Delay': 0.4,
            'Major Delay': 0.3,
            'Critical Delay': 0.1,
        },
        predictedDelayMonths: predictedDelayDays / 30,
        plannedCompletionDate: plannedEnd.toISOString(),
        predictedCompletionDate: predictedEnd.toISOString(),
        riskLevel: category.includes('Critical') ? 'Critical' :
            category.includes('Major') ? 'High' :
                category.includes('Minor') ? 'Medium' : 'Low',
        confidenceInterval: {
            earliest: new Date(predictedEnd.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            latest: new Date(predictedEnd.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString(),
        },
        scenarios: {
            bestCase: { delayDays: predictedDelayDays * 0.6, probability: 0.2 },
            mostLikely: { delayDays: predictedDelayDays, probability: 0.6 },
            worstCase: { delayDays: predictedDelayDays * 1.5, probability: 0.2 },
        },
        recommendations: getRecommendations(category, predictedDelayDays),
        timestamp: new Date().toISOString(),
        source: 'mock_prediction',
    };
}

export default useDelayController;

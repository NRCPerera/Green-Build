import { useState, useCallback } from 'react';
import useProjectStore from '../models/useProjectStore';
import { delayApi, parseApiError } from '../models/api';

/**
 * Delay Controller Hook
 * 
 * Manages delay prediction functionality using the ML service.
 * Supports both regression (delay days) and classification (delay category).
 * 
 * Features match the training script columns exactly:
 * Numeric:  Floors, Contractor_Experience_Years, Contractor_Previous_Projects,
 *           Contractor_Past_Delay_Rate, Labour_Pool_Size, Labour_Assigned_To_Project,
 *           Planned_Duration_Days, Weather_Impact_Days, Design_Change_Orders,
 *           Material_Delivery_Delay_Days, Payment_Delay_Days
 * 
 * Categorical: Project_Type, Province, District, Location,
 *              Contractor_ICTAD_Grade, Start_Season, Payment_Delay_History
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
            // Build input matching the ML model's ACTUAL feature names from training
            const input = {
                // ---- Categorical features (must match training script) ----
                Project_Type: formValues.projectType || 'House',
                Province: formValues.province || 'Western',
                District: formValues.district || 'Colombo',
                Location: formValues.location || 'Dehiwala',
                Contractor_ICTAD_Grade: formValues.contractorGrade || 'C4',
                Start_Season: formValues.startSeason || 'Dry Season',
                Payment_Delay_History: formValues.paymentDelayHistory || 'Minor',

                // ---- Numeric features (must match training script) ----
                Floors: formValues.floors || 6,
                Contractor_Experience_Years: formValues.contractorExperience || 12,
                Contractor_Previous_Projects: formValues.contractorPreviousProjects || 23,
                Contractor_Past_Delay_Rate: formValues.contractorPastDelayRate || 0.19,
                Labour_Pool_Size: formValues.labourPoolSize || 108,
                Labour_Assigned_To_Project: formValues.labourAssigned || 47,
                Planned_Duration_Days: formValues.plannedDurationDays || 545,
                Weather_Impact_Days: formValues.weatherImpactDays || 63,
                Design_Change_Orders: formValues.designChangeOrders || 14,
                Material_Delivery_Delay_Days: formValues.materialDeliveryDelay || 31,
                Payment_Delay_Days: formValues.paymentDelayDays || 29,
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
            case 'No Delay':
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
            case 'No Delay':
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
        if (days <= 0) return 'No Delay';
        if (days <= 30) return 'Minor';
        if (days <= 90) return 'Major';
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
    const p10DelayDays = regression_result?.p10_delay_days;
    const p90DelayDays = regression_result?.p90_delay_days;
    const shapValues = classification_result?.shap_values || regression_result?.shap_values;

    const predictedCategory = classification_result?.predicted_category || 'Unknown';
    const confidence = classification_result?.confidence || 0;
    const classProbabilities = classification_result?.class_probabilities || {};

    // Calculate completion dates using USER-PROVIDED values
    const startDate = formValues.projectStartDate
        ? new Date(formValues.projectStartDate)
        : new Date();
    const plannedDays = formValues.plannedDurationDays || 545;
    const plannedDurationMonths = Math.round(plannedDays / 30);

    const plannedEnd = new Date(startDate);
    plannedEnd.setDate(plannedEnd.getDate() + plannedDays);

    const predictedEnd = new Date(plannedEnd);
    predictedEnd.setDate(predictedEnd.getDate() + predictedDelayDays);

    const confEarliest = p10DelayDays !== undefined
        ? new Date(plannedEnd.getTime() + p10DelayDays * 24 * 60 * 60 * 1000)
        : new Date(predictedEnd.getTime() - 14 * 24 * 60 * 60 * 1000);

    const confLatest = p90DelayDays !== undefined
        ? new Date(plannedEnd.getTime() + p90DelayDays * 24 * 60 * 60 * 1000)
        : new Date(predictedEnd.getTime() + 21 * 24 * 60 * 60 * 1000);

    return {
        // ML Model Results
        predictedDelayDays,
        delaySeverity: regression_result?.delay_severity || 'Unknown',
        predictedCategory,
        categoryConfidence: confidence,
        classProbabilities,
        shapValues,

        // User-provided timeline values
        projectStartDate: startDate.toISOString(),
        plannedDurationMonths,
        plannedDurationDays: plannedDays,

        // Computed Values
        predictedDelayMonths: predictedDelayDays / 30,
        plannedCompletionDate: plannedEnd.toISOString(),
        predictedCompletionDate: predictedEnd.toISOString(),

        // Risk Level
        riskLevel: predictedCategory.includes('Critical') ? 'Critical' :
            predictedCategory.includes('Major') ? 'High' :
                predictedCategory.includes('Minor') ? 'Medium' : 'Low',

        // Confidence Interval (Data-driven using Quantile Regressor P10/P90 if available)
        confidenceInterval: {
            earliest: confEarliest.toISOString(),
            latest: confLatest.toISOString(),
        },

        // Scenarios (Data-driven)
        scenarios: {
            bestCase: {
                delayDays: p10DelayDays !== undefined ? p10DelayDays : Math.max(0, predictedDelayDays * 0.6),
                probability: classProbabilities['No Delay'] || 0.2
            },
            mostLikely: {
                delayDays: predictedDelayDays,
                probability: confidence
            },
            worstCase: {
                delayDays: p90DelayDays !== undefined ? p90DelayDays : predictedDelayDays * 1.5,
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

    if (category === 'Critical Delay' || delayDays > 90) {
        return [
            '🚨 Immediate intervention required',
            'Consider adding more resources or parallel work streams',
            'Review and expedite all pending approvals',
            'Negotiate contract extensions proactively',
            ...baseRecs,
        ];
    }

    if (category === 'Major Delay' || delayDays > 30) {
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
    const plannedDays = formValues.plannedDurationDays || 545;
    const plannedDurationMonths = Math.round(plannedDays / 30);

    // Simple mock calculation
    const baseDelayDays = Math.random() * 60 + 20; // 20-80 days
    const predictedDelayDays = Math.round(baseDelayDays);

    const startDate = formValues.projectStartDate
        ? new Date(formValues.projectStartDate)
        : new Date();
    const plannedEnd = new Date(startDate);
    plannedEnd.setDate(plannedEnd.getDate() + plannedDays);

    const predictedEnd = new Date(plannedEnd);
    predictedEnd.setDate(predictedEnd.getDate() + predictedDelayDays);

    const category = predictedDelayDays <= 0 ? 'No Delay' :
        predictedDelayDays <= 30 ? 'Minor Delay' :
            predictedDelayDays <= 90 ? 'Major Delay' : 'Critical Delay';

    return {
        predictedDelayDays,
        delaySeverity: `${category} (${predictedDelayDays} days)`,
        predictedCategory: category,
        categoryConfidence: 0.65,
        classProbabilities: {
            'No Delay': 0.2,
            'Minor Delay': 0.4,
            'Major Delay': 0.3,
            'Critical Delay': 0.1,
        },
        // User-provided timeline values
        projectStartDate: startDate.toISOString(),
        plannedDurationMonths,
        plannedDurationDays: plannedDays,
        // Computed values
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

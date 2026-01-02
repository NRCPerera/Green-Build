import { useState, useCallback } from 'react';
import useProjectStore from '../models/useProjectStore';
import { delayApi, parseApiError } from '../models/api';

const useDelayController = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const quantityData = useProjectStore((state) => state.quantityData);
    const delayForecast = useProjectStore((state) => state.delayForecast);
    const setDelayForecast = useProjectStore((state) => state.setDelayForecast);

    const hasQuantityData = quantityData !== null;

    const predictDelay = useCallback(async (formValues) => {
        if (!hasQuantityData) {
            setError('Quantity data is required. Complete Module 1 first.');
            return { success: false, error: 'Missing quantity data' };
        }

        setLoading(true);
        setError(null);

        try {
            const input = {
                quantityData: {
                    wallArea: quantityData.wallNetSurfaceAreaM2,
                    doorCount: quantityData.itemCounts?.doors || 0,
                    windowCount: quantityData.itemCounts?.windows || 0,
                    complexity: quantityData.detectedRooms?.length || 1,
                },
                contractorGrade: formValues.contractorGrade,
                plannedDurationMonths: formValues.plannedDurationMonths,
                resourceAvailability: formValues.resourceAvailability,
                permitStatus: formValues.permitStatus,
                siteAccessibility: formValues.siteAccessibility,
            };

            const response = await delayApi.predict(input);

            if (response.data?.success) {
                setDelayForecast(response.data.data);
                return { success: true, data: response.data.data };
            }
            throw new Error(response.data?.message || 'Prediction failed');
        } catch (err) {
            const errorMessage = parseApiError(err);
            setError(errorMessage);

            const mockResult = generateMockDelayForecast(formValues, quantityData);
            setDelayForecast(mockResult);
            return { success: true, data: mockResult, mock: true };
        } finally {
            setLoading(false);
        }
    }, [hasQuantityData, quantityData, setDelayForecast]);

    const clearForecast = useCallback(() => {
        useProjectStore.getState().resetModule('delay');
        setError(null);
    }, []);

    const getProbabilityColor = (probability) => {
        if (probability >= 0.7) return 'text-red-400';
        if (probability >= 0.4) return 'text-yellow-400';
        return 'text-green-400';
    };

    const getRiskLevel = (probability) => {
        if (probability >= 0.7) return 'High';
        if (probability >= 0.4) return 'Medium';
        return 'Low';
    };

    const formatDelay = (months) => {
        if (months < 1) {
            return `${Math.round(months * 4)} weeks`;
        }
        return `${months.toFixed(1)} months`;
    };

    return {
        loading,
        error,
        quantityData,
        hasQuantityData,
        forecast: delayForecast,
        hasForecast: delayForecast !== null,
        predictDelay,
        clearForecast,
        getProbabilityColor,
        getRiskLevel,
        formatDelay,
    };
};

function generateMockDelayForecast(formValues, quantityData) {
    const gradeFactors = { A: 0.1, B: 0.25, C: 0.45, D: 0.7 };
    const gradeFactor = gradeFactors[formValues.contractorGrade] || 0.3;
    const resourceFactor = (100 - formValues.resourceAvailability) / 100;
    const permitFactor = formValues.permitStatus === 'Approved' ? 0 : formValues.permitStatus === 'Pending' ? 0.2 : 0.4;
    const accessFactor = (10 - formValues.siteAccessibility) / 10 * 0.1;
    const complexity = (quantityData?.detectedRooms?.length || 3) / 10;

    const delayProbability = Math.min(0.95, Math.max(0.1,
        0.2 + gradeFactor * 0.3 + resourceFactor * 0.2 + permitFactor + accessFactor + complexity * 0.1
    ));

    const predictedDelayMonths = delayProbability * formValues.plannedDurationMonths * 0.3;
    const riskLevel = delayProbability >= 0.7 ? 'High' : delayProbability >= 0.4 ? 'Medium' : 'Low';

    const startDate = new Date();
    const plannedEnd = new Date(startDate);
    plannedEnd.setMonth(plannedEnd.getMonth() + formValues.plannedDurationMonths);
    const predictedEnd = new Date(plannedEnd);
    predictedEnd.setDate(predictedEnd.getDate() + Math.round(predictedDelayMonths * 30));

    return {
        delayProbability: parseFloat(delayProbability.toFixed(2)),
        predictedDelayMonths: parseFloat(predictedDelayMonths.toFixed(1)),
        riskLevel,
        plannedCompletionDate: plannedEnd.toISOString(),
        predictedCompletionDate: predictedEnd.toISOString(),
        confidenceInterval: {
            earliest: new Date(predictedEnd.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            latest: new Date(predictedEnd.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        delayDrivers: [
            { factor: 'Contractor Experience', days: Math.round(gradeFactor * 20), mitigatable: false },
            { factor: 'Resource Availability', days: Math.round(resourceFactor * 15), mitigatable: true },
            { factor: 'Permit Status', days: Math.round(permitFactor * 30), mitigatable: true },
            { factor: 'Site Accessibility', days: Math.round(accessFactor * 10), mitigatable: true },
        ].sort((a, b) => b.days - a.days),
        scenarios: {
            bestCase: { delayMonths: predictedDelayMonths * 0.5, probability: 0.2 },
            mostLikely: { delayMonths: predictedDelayMonths, probability: 0.6 },
            worstCase: { delayMonths: predictedDelayMonths * 1.8, probability: 0.2 },
        },
        recommendations: formValues.permitStatus !== 'Approved'
            ? ['Expedite permit approval process', 'Secure additional resources', 'Build buffer time']
            : ['Monitor contractor progress', 'Secure resources early', 'Build buffer time'],
        timestamp: new Date().toISOString(),
    };
}

export default useDelayController;

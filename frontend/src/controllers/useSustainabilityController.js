import { useState, useCallback } from 'react';
import useProjectStore from '../models/useProjectStore';
import { sustainabilityApi, parseApiError } from '../models/api';

const useSustainabilityController = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [materials, setMaterials] = useState([]);

    const quantityData = useProjectStore((state) => state.quantityData);
    const sustainabilityResult = useProjectStore((state) => state.sustainabilityResult);
    const setSustainabilityResult = useProjectStore((state) => state.setSustainabilityResult);

    const hasQuantityData = quantityData !== null;

    const addMaterial = useCallback((material) => {
        setMaterials((prev) => [...prev, { ...material, id: Date.now() }]);
    }, []);

    const removeMaterial = useCallback((id) => {
        setMaterials((prev) => prev.filter((m) => m.id !== id));
    }, []);

    const calculateSustainability = useCallback(async (formValues) => {
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
                },
                materials,
                buildingLifespanYears: formValues.buildingLifespanYears,
                energyEfficiencyRating: formValues.energyEfficiencyRating,
                renewableEnergyPercentage: formValues.renewableEnergyPercentage,
            };

            const response = await sustainabilityApi.calculate(input);

            if (response.data?.success) {
                setSustainabilityResult(response.data.data);
                return { success: true, data: response.data.data };
            }
            throw new Error(response.data?.message || 'Calculation failed');
        } catch (err) {
            const errorMessage = parseApiError(err);
            setError(errorMessage);

            const mockResult = generateMockSustainabilityResult(formValues, quantityData, materials);
            setSustainabilityResult(mockResult);
            return { success: true, data: mockResult, mock: true };
        } finally {
            setLoading(false);
        }
    }, [hasQuantityData, quantityData, materials, setSustainabilityResult]);

    const clearResults = useCallback(() => {
        useProjectStore.getState().resetModule('sustainability');
        setError(null);
    }, []);

    const formatCarbon = (carbonKg) => {
        if (carbonKg >= 1000) {
            return `${(carbonKg / 1000).toFixed(2)} t CO₂e`;
        }
        return `${carbonKg.toFixed(2)} kg CO₂e`;
    };

    const formatCurrency = (amount) => {
        return `Rs. ${amount.toLocaleString('en-IN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        })}`;
    };

    return {
        loading,
        error,
        quantityData,
        hasQuantityData,
        result: sustainabilityResult,
        hasResult: sustainabilityResult !== null,
        materials,
        addMaterial,
        removeMaterial,
        calculateSustainability,
        clearResults,
        formatCarbon,
        formatCurrency,
    };
};

function generateMockSustainabilityResult(formValues, quantityData, materials) {
    const wallArea = quantityData?.wallNetSurfaceAreaM2 || 100;
    const totalMaterialCarbon = materials.reduce((sum, m) => sum + (m.quantity * 0.5), 0);

    const embodiedCarbon = totalMaterialCarbon + wallArea * 50;
    const operationalCarbon = wallArea * 10 * (1 - formValues.renewableEnergyPercentage / 100);
    const totalCarbon = embodiedCarbon + operationalCarbon * formValues.buildingLifespanYears;

    const constructionCost = wallArea * 150;
    const operationalCost = wallArea * 8 * formValues.buildingLifespanYears;
    const lifecycleCost = constructionCost + operationalCost;

    const score = Math.max(0, Math.min(100, 80 - (totalCarbon / 1000) + formValues.renewableEnergyPercentage * 0.5));

    return {
        lifecycleCost,
        carbonFootprint: totalCarbon,
        sustainabilityScore: Math.round(score),
        breakdown: {
            embodiedCarbon,
            operationalCarbon,
            constructionCost,
            operationalCost,
        },
        paretoFrontier: [
            { id: 'p1', cost: lifecycleCost * 0.8, carbon: totalCarbon * 1.3, label: 'Low Cost' },
            { id: 'p2', cost: lifecycleCost, carbon: totalCarbon, label: 'Balanced' },
            { id: 'p3', cost: lifecycleCost * 1.2, carbon: totalCarbon * 0.7, label: 'Green' },
        ],
        recommendations: [
            'Increase recycled content in materials',
            'Consider local sourcing to reduce transport emissions',
            'Upgrade to higher energy efficiency rating',
        ],
        timestamp: new Date().toISOString(),
    };
}

export default useSustainabilityController;

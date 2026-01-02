/**
 * =============================================================================
 * SUSTAINABILITY CONTROLLER
 * =============================================================================
 * 
 * Business logic hook for Module 3: Sustainability (Lifecycle & Carbon).
 * Reads quantityData from global store (set by Module 1).
 */

import { useState, useCallback } from 'react';
import useProjectStore from '../models/useProjectStore';
import { sustainabilityApi, parseApiError } from '../models/api';

/**
 * Custom hook for Sustainability module
 * 
 * @returns {Object} Controller state and methods
 */
const useSustainabilityController = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [materials, setMaterials] = useState([]);

    // Global store
    const quantityData = useProjectStore((state) => state.quantityData);
    const sustainabilityResult = useProjectStore((state) => state.sustainabilityResult);
    const setSustainabilityResult = useProjectStore((state) => state.setSustainabilityResult);

    const hasQuantityData = quantityData !== null;

    /**
     * Add a material to the list
     * @param {Object} material - Material object
     */
    const addMaterial = useCallback((material) => {
        setMaterials((prev) => [...prev, { ...material, id: Date.now() }]);
    }, []);

    /**
     * Remove a material from the list
     * @param {number} id - Material ID
     */
    const removeMaterial = useCallback((id) => {
        setMaterials((prev) => prev.filter((m) => m.id !== id));
    }, []);

    /**
     * Calculate sustainability metrics
     * @param {Object} formValues - Form input values
     */
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

            // Generate mock result for demo
            const mockResult = generateMockSustainabilityResult(formValues, quantityData, materials);
            setSustainabilityResult(mockResult);
            return { success: true, data: mockResult, mock: true };
        } finally {
            setLoading(false);
        }
    }, [hasQuantityData, quantityData, materials, setSustainabilityResult]);

    /**
     * Clear results
     */
    const clearResults = useCallback(() => {
        useProjectStore.getState().resetModule('sustainability');
        setError(null);
    }, []);

    /**
     * Format carbon value for display
     * @param {number} carbonKg - Carbon in kg
     * @returns {string} Formatted string
     */
    const formatCarbon = (carbonKg) => {
        if (carbonKg >= 1000) {
            return `${(carbonKg / 1000).toFixed(2)} t CO₂e`;
        }
        return `${carbonKg.toFixed(2)} kg CO₂e`;
    };

    /**
     * Format currency for display
     * @param {number} amount - Amount
     * @returns {string} Formatted string
     */
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
        }).format(amount);
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

// Mock result generator
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

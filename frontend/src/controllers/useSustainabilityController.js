import { useState, useCallback, useEffect } from 'react';
import { sustainabilityApi, parseApiError } from '../models/api';

/**
 * Sustainability Controller Hook
 * 
 * Manages state and logic for the sustainability analysis module.
 * Connects to the ML service for predictions using actual model features.
 */
const useSustainabilityController = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);
    const [mlServiceStatus, setMlServiceStatus] = useState(null);

    // Check ML service health on mount
    useEffect(() => {
        const checkHealth = async () => {
            try {
                const response = await sustainabilityApi.checkHealth();
                setMlServiceStatus(response.data?.mlService || { status: 'healthy' });
            } catch {
                setMlServiceStatus({ status: 'unavailable' });
            }
        };
        checkHealth();
    }, []);

    /**
     * Run full sustainability analysis (all 3 models)
     */
    const analyzeProject = useCallback(async (formData) => {
        setLoading(true);
        setError(null);

        try {
            // Format data for the API (matching actual model features)
            const input = {
                // Sustainability score features
                energy_kwh_year: parseFloat(formData.energyKwhYear) || 0,
                embodied_co2_tons: parseFloat(formData.embodiedCo2Tons) || 0,
                operational_co2_tons: parseFloat(formData.operationalCo2Tons) || 0,
                energy_efficiency: parseFloat(formData.energyEfficiency) || 0,
                energy_efficiency_per_sqft: parseFloat(formData.energyEfficiencyPerSqft) || 0,
                cost_per_sqft_for_sustainability: parseFloat(formData.costPerSqftForSustainability) || 0,
                energy_co2_impact_relative_to_cost: parseFloat(formData.energyCo2ImpactRelativeToCost) || 0,
                
                // Lifecycle cost features
                construction_cost_per_sqft: parseFloat(formData.constructionCostPerSqft) || 0,
                maintenance_cost_per_year: parseFloat(formData.maintenanceCostPerYear) || 0,
                
                // Risk prediction features
                design_completeness: parseFloat(formData.designCompleteness) || 0,
                project_complexity_score: parseFloat(formData.projectComplexityScore) || 0,
                change_order_frequency: parseFloat(formData.changeOrderFrequency) || 0,
                inflation_rate: parseFloat(formData.inflationRate) || 0,
                interest_rate: parseFloat(formData.interestRate) || 0,
                contractor_experience_years: parseFloat(formData.contractorExperienceYears) || 0
            };

            console.log('[Sustainability] Sending analysis request:', input);

            const response = await sustainabilityApi.analyze(input);

            if (response.data?.success) {
                const data = response.data.data;
                setResult({
                    // Sustainability score
                    sustainabilityScore: data.sustainability_score,
                    sustainabilityInterpretation: data.sustainability_interpretation,
                    
                    // Lifecycle cost
                    lifecycleCostMillions: data.lifecycle_cost_millions_lkr,
                    lifecycleCostLkr: data.lifecycle_cost_lkr,
                    lifecycleInterpretation: data.lifecycle_interpretation,
                    
                    // Risk
                    isHighRisk: data.is_high_risk,
                    riskProbability: data.risk_probability,
                    riskLevel: data.risk_level,
                    riskRecommendations: data.risk_recommendations || [],
                    
                    timestamp: new Date().toISOString()
                });
                return { success: true, data: response.data.data };
            }
            
            throw new Error(response.data?.message || 'Analysis failed');
        } catch (err) {
            console.error('[Sustainability] API Error:', err);
            const errorMessage = parseApiError(err);
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Clear all results
     */
    const clearResults = useCallback(() => {
        setResult(null);
        setError(null);
    }, []);

    /**
     * Format currency in LKR (Sri Lankan Rupees)
     */
    const formatCurrencyLKR = (amount) => {
        if (amount >= 1000000) {
            return `LKR ${(amount / 1000000).toFixed(2)}M`;
        }
        return new Intl.NumberFormat('en-LK', {
            style: 'currency',
            currency: 'LKR',
        return `${carbonKg.toFixed(2)} kg CO₂e`;
    };

    const formatCurrency = (amount) => {
        return `Rs. ${amount.toLocaleString('en-IN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        })}`;
    };

    /**
     * Get color class based on risk level
     */
    const getRiskColor = (level) => {
        const colors = {
            low: 'text-green-400',
            medium: 'text-yellow-400',
            high: 'text-red-400',
        };
        return colors[level] || colors.medium;
    };

    /**
     * Get color class based on sustainability score
     */
    const getScoreColor = (score) => {
        if (score >= 70) return 'text-green-400';
        if (score >= 40) return 'text-yellow-400';
        return 'text-red-400';
    };

    return {
        loading,
        error,
        result,
        hasResult: result !== null,
        mlServiceStatus,
        analyzeProject,
        clearResults,
        formatCurrencyLKR,
        getRiskColor,
        getScoreColor
    };
};

export default useSustainabilityController;

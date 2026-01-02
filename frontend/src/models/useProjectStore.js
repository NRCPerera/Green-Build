/**
 * =============================================================================
 * GLOBAL PROJECT STORE - ZUSTAND
 * =============================================================================
 * 
 * Centralized state management using Zustand.
 * This store holds all application state that needs to be shared across modules.
 * 
 * KEY ARCHITECTURAL DECISION:
 * Module 1 (Quantity Takeoff) output is stored here and serves as INPUT
 * for Modules 2 (Cost), 3 (Sustainability), and 4 (Delay).
 * 
 * =============================================================================
 * DATA SHAPE DOCUMENTATION
 * =============================================================================
 * 
 * @typedef {Object} QuantityData
 * @property {number} wallLengthMeters - Total length of detected walls in meters
 * @property {number} wallGrossSurfaceAreaM2 - Gross wall surface area (before deductions)
 * @property {number} wallNetSurfaceAreaM2 - Net wall surface area (after deductions)
 * @property {number} deductionsAreaM2 - Total area of doors/windows deducted
 * @property {Object} itemCounts - Counts of detected items
 * @property {number} itemCounts.doors - Number of detected doors
 * @property {number} itemCounts.windows - Number of detected windows
 * @property {number} itemCounts.rooms - Number of detected rooms
 * @property {Array} detectedRooms - Array of detected room objects
 * @property {number} scalePixelsPerMeter - Scale used for conversion
 * @property {number} wallHeightMeters - Wall height used for calculations
 * 
 * @typedef {Object} ProjectDetails
 * @property {string} id - Unique project identifier
 * @property {string} name - Project name
 * @property {string} location - Project location
 * @property {string} status - Current status (Draft, Active, Completed)
 * @property {number} totalBudget - Total budget in currency
 * @property {string} currency - Currency code (USD, EUR, etc.)
 * 
 * @typedef {Object} CostPrediction
 * @property {number} predictedOverrunPercentage - Predicted cost overrun %
 * @property {string} riskLevel - Risk level (High, Medium, Low)
 * @property {number} riskScore - Risk score 0-100
 * @property {Array} shapValues - SHAP values for XAI visualization
 * @property {Array} recommendations - List of recommendations
 * 
 * @typedef {Object} SustainabilityResult
 * @property {number} lifecycleCost - Total lifecycle cost
 * @property {number} carbonFootprint - Total carbon footprint in kgCO2e
 * @property {number} sustainabilityScore - Score 0-100
 * @property {Array} paretoFrontier - Pareto optimal points
 * 
 * @typedef {Object} DelayForecast
 * @property {number} delayProbability - Probability of delay (0-1)
 * @property {number} predictedDelayMonths - Predicted delay in months
 * @property {string} riskLevel - Risk level (High, Medium, Low)
 * @property {Array} milestones - Project milestones with predictions
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState = {
    // Project Information
    projectDetails: null,

    // Module 1: Quantity Takeoff - THIS DRIVES OTHER MODULES
    quantityData: null,
    quantityResult: null,

    // Module 2: Cost Prediction
    costPrediction: null,

    // Module 3: Sustainability
    sustainabilityResult: null,

    // Module 4: Delay Forecast
    delayForecast: null,

    // UI State
    isLoading: false,
    activeModule: null,
    errors: {},
};

// =============================================================================
// STORE CREATION
// =============================================================================

/**
 * Main application store using Zustand
 * 
 * Usage:
 *   import useProjectStore from './models/useProjectStore';
 *   
 *   const quantityData = useProjectStore((state) => state.quantityData);
 *   const setQuantityData = useProjectStore((state) => state.setQuantityData);
 */
const useProjectStore = create(
    devtools(
        persist(
            (set, get) => ({
                ...initialState,

                // =================================================================
                // PROJECT ACTIONS
                // =================================================================

                /**
                 * Set project details
                 * @param {ProjectDetails} details - Project details object
                 */
                setProjectDetails: (details) => {
                    set({ projectDetails: details }, false, 'setProjectDetails');
                },

                /**
                 * Clear all project data
                 */
                clearProject: () => {
                    set({
                        projectDetails: null,
                        quantityData: null,
                        quantityResult: null,
                        costPrediction: null,
                        sustainabilityResult: null,
                        delayForecast: null,
                    }, false, 'clearProject');
                },

                // =================================================================
                // MODULE 1: QUANTITY TAKEOFF ACTIONS
                // =================================================================

                /**
                 * Set quantity data from floor plan analysis.
                 * This is the PRIMARY data that drives all other modules.
                 * 
                 * @param {QuantityData} data - Extracted quantity data
                 */
                setQuantityData: (data) => {
                    set({ quantityData: data }, false, 'setQuantityData');
                    console.log('[Store] Quantity data updated - available for Cost, Sustainability, and Delay modules');
                },

                /**
                 * Set complete quantity takeoff result including visualizations
                 * @param {Object} result - Complete API response
                 */
                setQuantityResult: (result) => {
                    set({
                        quantityResult: result,
                        // Also extract key data for easy access
                        quantityData: result.quantities ? {
                            wallLengthMeters: result.quantities.wall_total_length_m,
                            wallGrossSurfaceAreaM2: result.quantities.wall_gross_surface_area_m2,
                            wallNetSurfaceAreaM2: result.quantities.wall_net_surface_area_m2,
                            deductionsAreaM2: result.quantities.deductions_area_m2,
                            itemCounts: result.quantities.item_counts,
                            detectedRooms: result.room_detection?.rooms || [],
                        } : null,
                    }, false, 'setQuantityResult');
                },

                // =================================================================
                // MODULE 2: COST PREDICTION ACTIONS
                // =================================================================

                /**
                 * Set cost prediction result
                 * @param {CostPrediction} prediction - Prediction result
                 */
                setCostPrediction: (prediction) => {
                    set({ costPrediction: prediction }, false, 'setCostPrediction');
                },

                // =================================================================
                // MODULE 3: SUSTAINABILITY ACTIONS
                // =================================================================

                /**
                 * Set sustainability analysis result
                 * @param {SustainabilityResult} result - Analysis result
                 */
                setSustainabilityResult: (result) => {
                    set({ sustainabilityResult: result }, false, 'setSustainabilityResult');
                },

                // =================================================================
                // MODULE 4: DELAY FORECAST ACTIONS
                // =================================================================

                /**
                 * Set delay forecast result
                 * @param {DelayForecast} forecast - Forecast result
                 */
                setDelayForecast: (forecast) => {
                    set({ delayForecast: forecast }, false, 'setDelayForecast');
                },

                // =================================================================
                // UI ACTIONS
                // =================================================================

                /**
                 * Set loading state
                 * @param {boolean} loading - Loading state
                 */
                setLoading: (loading) => {
                    set({ isLoading: loading }, false, 'setLoading');
                },

                /**
                 * Set active module
                 * @param {string|null} module - Module name or null
                 */
                setActiveModule: (module) => {
                    set({ activeModule: module }, false, 'setActiveModule');
                },

                /**
                 * Set an error for a specific key
                 * @param {string} key - Error key
                 * @param {string} message - Error message
                 */
                setError: (key, message) => {
                    set(
                        (state) => ({ errors: { ...state.errors, [key]: message } }),
                        false,
                        'setError'
                    );
                },

                /**
                 * Clear an error
                 * @param {string} key - Error key to clear
                 */
                clearError: (key) => {
                    set(
                        (state) => {
                            const newErrors = { ...state.errors };
                            delete newErrors[key];
                            return { errors: newErrors };
                        },
                        false,
                        'clearError'
                    );
                },

                /**
                 * Clear all errors
                 */
                clearAllErrors: () => {
                    set({ errors: {} }, false, 'clearAllErrors');
                },

                // =================================================================
                // RESET ACTIONS
                // =================================================================

                /**
                 * Reset a specific module's data
                 * @param {'quantity'|'cost'|'sustainability'|'delay'} module - Module to reset
                 */
                resetModule: (module) => {
                    switch (module) {
                        case 'quantity':
                            set({ quantityData: null, quantityResult: null }, false, 'resetQuantity');
                            break;
                        case 'cost':
                            set({ costPrediction: null }, false, 'resetCost');
                            break;
                        case 'sustainability':
                            set({ sustainabilityResult: null }, false, 'resetSustainability');
                            break;
                        case 'delay':
                            set({ delayForecast: null }, false, 'resetDelay');
                            break;
                    }
                },

                /**
                 * Reset entire store to initial state
                 */
                resetAll: () => {
                    set(initialState, false, 'resetAll');
                },

                // =================================================================
                // SELECTORS (Derived State)
                // =================================================================

                /**
                 * Check if quantity data is available
                 * @returns {boolean}
                 */
                hasQuantityData: () => {
                    return get().quantityData !== null;
                },

                /**
                 * Get wall area for other modules
                 * @returns {number|null}
                 */
                getWallArea: () => {
                    return get().quantityData?.wallNetSurfaceAreaM2 || null;
                },

                /**
                 * Get item counts for other modules
                 * @returns {Object|null}
                 */
                getItemCounts: () => {
                    return get().quantityData?.itemCounts || null;
                },

                /**
                 * Check module completion status
                 * @returns {Object}
                 */
                getModuleStatuses: () => {
                    const state = get();
                    return {
                        quantity: state.quantityResult !== null,
                        cost: state.costPrediction !== null,
                        sustainability: state.sustainabilityResult !== null,
                        delay: state.delayForecast !== null,
                    };
                },
            }),
            {
                name: 'green-build-storage',
                // Only persist essential data
                partialize: (state) => ({
                    projectDetails: state.projectDetails,
                    quantityData: state.quantityData,
                    activeModule: state.activeModule,
                }),
            }
        ),
        {
            name: 'GreenBuildStore',
            enabled: import.meta.env.DEV,
        }
    )
);

export default useProjectStore;

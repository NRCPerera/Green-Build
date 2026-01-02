/**
 * =============================================================================
 * QUANTITY TAKEOFF CONTROLLER
 * =============================================================================
 * 
 * Business logic hook for Module 1: Quantity Takeoff.
 * Handles file upload, API communication, and storing results in global state.
 * 
 * OUTPUT: Stores quantityData in the global store for Modules 2, 3, 4.
 */

import { useState, useCallback } from 'react';
import useProjectStore from '../models/useProjectStore';
import { quantityApi, parseApiError } from '../models/api';

/**
 * Custom hook for Quantity Takeoff module
 * 
 * @returns {Object} Controller state and methods
 */
const useQuantityController = () => {
    // Local state
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);

    // Global store actions
    const setQuantityResult = useProjectStore((state) => state.setQuantityResult);
    const setQuantityData = useProjectStore((state) => state.setQuantityData);
    const quantityResult = useProjectStore((state) => state.quantityResult);
    const quantityData = useProjectStore((state) => state.quantityData);

    /**
     * Process a floor plan image
     * 
     * @param {File} imageFile - The uploaded image file
     * @param {number} scale - Scale in pixels per meter
     * @param {number} wallHeight - Wall height in meters
     */
    const processFloorPlan = useCallback(async (imageFile, scale, wallHeight) => {
        setLoading(true);
        setError(null);
        setProgress(0);

        // Simulate progress during ML processing
        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 90) return prev;
                return prev + Math.random() * 15;
            });
        }, 500);

        try {
            const response = await quantityApi.uploadFloorPlan(imageFile, scale, wallHeight);

            clearInterval(progressInterval);
            setProgress(100);

            if (response.data?.success) {
                // Store complete result in global state
                setQuantityResult(response.data.data);

                console.log('[QuantityController] Results saved to global store');
                return { success: true, data: response.data.data };
            } else {
                throw new Error(response.data?.message || 'Processing failed');
            }
        } catch (err) {
            clearInterval(progressInterval);
            const errorMessage = parseApiError(err);
            setError(errorMessage);
            console.error('[QuantityController] Error:', errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    }, [setQuantityResult]);

    /**
     * Clear current results
     */
    const clearResults = useCallback(() => {
        useProjectStore.getState().resetModule('quantity');
        setError(null);
        setProgress(0);
    }, []);

    /**
     * Clear error state
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    /**
     * Format wall area for display
     * @param {number} area - Area in square meters
     * @returns {string} Formatted string
     */
    const formatArea = (area) => {
        if (!area) return '0.00';
        return area.toFixed(2);
    };

    return {
        // State
        loading,
        progress,
        error,

        // Data from global store
        quantityResult,
        quantityData,
        hasResults: quantityResult !== null,

        // Actions
        processFloorPlan,
        clearResults,
        clearError,

        // Utilities
        formatArea,
    };
};

export default useQuantityController;

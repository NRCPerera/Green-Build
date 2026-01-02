/**
 * Floor Plan Processing Hook
 * 
 * Custom React hook that manages the state and logic for floor plan uploads.
 * Encapsulates form handling, API calls, and progress tracking.
 */

import { useState, useCallback } from 'react';
import { message } from 'antd';
import { uploadFloorPlan, parseApiError } from '../services/apiService';

/**
 * Hook for managing floor plan upload and processing workflow.
 * 
 * @returns {Object} State and handler functions for the upload form
 */
const useFloorPlanUpload = () => {
    // Loading and progress state
    const [loading, setLoading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);

    // Results and error state
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);

    /**
     * Processes an uploaded floor plan image.
     * Shows progress updates during the processing time.
     * 
     * @param {File} imageFile - The uploaded image file
     * @param {number} scale - Scale in pixels per meter
     * @param {number} wallHeight - Wall height in meters
     */
    const processFloorPlan = useCallback(async (imageFile, scale, wallHeight) => {
        setLoading(true);
        setError(null);
        setResults(null);
        setLoadingProgress(0);

        // Update progress periodically to show activity during ML processing
        const progressInterval = setInterval(() => {
            setLoadingProgress(prev => {
                if (prev >= 90) return prev;
                return prev + Math.random() * 15;
            });
        }, 500);

        try {
            const response = await uploadFloorPlan(imageFile, scale, wallHeight);

            clearInterval(progressInterval);
            setLoadingProgress(100);

            if (response.success) {
                // Debug: Log the response data to see room_detection
                console.log('API Response data:', response.data);
                console.log('Room detection:', response.data.room_detection);

                setResults(response.data);
                message.success('Quantity takeoff completed successfully!');
            } else {
                throw new Error(response.message || 'Unknown error occurred');
            }
        } catch (err) {
            clearInterval(progressInterval);
            console.error('API Error:', err);

            const errorMessage = parseApiError(err);
            setError(errorMessage);
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Clears the current error state.
     * Used when the user dismisses the error alert.
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    /**
     * Resets all state to initial values.
     * Used when starting a new analysis.
     */
    const reset = useCallback(() => {
        setLoading(false);
        setLoadingProgress(0);
        setResults(null);
        setError(null);
    }, []);

    return {
        loading,
        loadingProgress,
        results,
        error,
        processFloorPlan,
        clearError,
        reset
    };
};

export default useFloorPlanUpload;

import { useState, useCallback } from 'react';
import useProjectStore from '../models/useProjectStore';
import { quantityApi, parseApiError } from '../models/api';

const useQuantityController = () => {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);

    const setQuantityResult = useProjectStore((state) => state.setQuantityResult);
    const setQuantityData = useProjectStore((state) => state.setQuantityData);
    const quantityResult = useProjectStore((state) => state.quantityResult);
    const quantityData = useProjectStore((state) => state.quantityData);

    const processFloorPlan = useCallback(async (imageFile, scale, wallHeight) => {
        setLoading(true);
        setError(null);
        setProgress(0);

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

    const clearResults = useCallback(() => {
        useProjectStore.getState().resetModule('quantity');
        setError(null);
        setProgress(0);
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const formatArea = (area) => {
        if (!area) return '0.00';
        return area.toFixed(2);
    };

    return {
        loading,
        progress,
        error,
        quantityResult,
        quantityData,
        hasResults: quantityResult !== null,
        processFloorPlan,
        clearResults,
        clearError,
        formatArea,
    };
};

export default useQuantityController;

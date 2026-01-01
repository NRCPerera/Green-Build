/**
 * Manual Input Controller Hook
 * 
 * Manages state and logic for manually-input construction elements.
 */

import { useState, useCallback, useMemo } from 'react';
import { defaultManualInputs, calculateManualCosts } from '../models/manualInputModel';

/**
 * Hook for managing manual input state and calculations.
 * 
 * @returns {Object} State and handlers for manual inputs
 */
const useManualInput = () => {
    const [inputs, setInputs] = useState(defaultManualInputs);

    /**
     * Updates a single input value.
     * 
     * @param {string} field - The field name to update
     * @param {number} value - The new value
     */
    const updateInput = useCallback((field, value) => {
        setInputs(prev => ({
            ...prev,
            [field]: Math.max(0, value || 0)
        }));
    }, []);

    /**
     * Resets all inputs to default values.
     */
    const resetInputs = useCallback(() => {
        setInputs(defaultManualInputs);
    }, []);

    /**
     * Gets the total cost of all manual items.
     */
    const costs = useMemo(() => {
        return calculateManualCosts(inputs);
    }, [inputs]);

    /**
     * Checks if any manual inputs have values.
     */
    const hasInputs = useMemo(() => {
        return Object.values(inputs).some(v => v > 0);
    }, [inputs]);

    return {
        inputs,
        updateInput,
        resetInputs,
        costs,
        hasInputs
    };
};

export default useManualInput;

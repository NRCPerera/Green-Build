import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

const initialState = {
    projectDetails: null,
    quantityData: null,
    quantityResult: null,
    costPrediction: null,
    sustainabilityResult: null,
    delayForecast: null,
    isLoading: false,
    activeModule: null,
    errors: {},
};

const useProjectStore = create(
    devtools(
        persist(
            (set, get) => ({
                ...initialState,

                setProjectDetails: (details) => {
                    set({ projectDetails: details }, false, 'setProjectDetails');
                },

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

                setQuantityData: (data) => {
                    set({ quantityData: data }, false, 'setQuantityData');
                    console.log('[Store] Quantity data updated');
                },

                setQuantityResult: (result) => {
                    set({
                        quantityResult: result,
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

                setCostPrediction: (prediction) => {
                    set({ costPrediction: prediction }, false, 'setCostPrediction');
                },

                setSustainabilityResult: (result) => {
                    set({ sustainabilityResult: result }, false, 'setSustainabilityResult');
                },

                setDelayForecast: (forecast) => {
                    set({ delayForecast: forecast }, false, 'setDelayForecast');
                },

                setLoading: (loading) => {
                    set({ isLoading: loading }, false, 'setLoading');
                },

                setActiveModule: (module) => {
                    set({ activeModule: module }, false, 'setActiveModule');
                },

                setError: (key, message) => {
                    set(
                        (state) => ({ errors: { ...state.errors, [key]: message } }),
                        false,
                        'setError'
                    );
                },

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

                clearAllErrors: () => {
                    set({ errors: {} }, false, 'clearAllErrors');
                },

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

                resetAll: () => {
                    set(initialState, false, 'resetAll');
                },

                hasQuantityData: () => {
                    return get().quantityData !== null;
                },

                getWallArea: () => {
                    return get().quantityData?.wallNetSurfaceAreaM2 || null;
                },

                getItemCounts: () => {
                    return get().quantityData?.itemCounts || null;
                },

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

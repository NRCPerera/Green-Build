/**
 * Cost Calculation Model
 * 
 * This module handles all cost-related calculations and data transformations.
 * It takes quantity data from the ML service and produces cost estimates.
 */

const config = require('../config');

/**
 * Calculates construction costs based on the provided quantity data.
 * The calculation considers wall areas, doors, and windows to produce
 * a detailed cost breakdown with different finish options.
 * 
 * @param {Object} quantities - Quantity takeoff data from the Python ML service
 * @param {number} quantities.wall_net_surface_area_m2 - Net wall area in square meters
 * @param {Object} quantities.item_counts - Count of doors and windows
 * @returns {Object} Complete cost breakdown with rates, individual costs, and estimates
 */
const calculateCosts = (quantities) => {
    const { costRates } = config;

    // Extract the relevant measurements from the quantities object
    const netArea = quantities.wall_net_surface_area_m2 || 0;
    const doors = quantities.item_counts?.doors || 0;
    const windows = quantities.item_counts?.windows || 0;

    // Calculate individual cost components
    const wallPaintCost = netArea * costRates.wallPaintRatePerSqm;
    const wallPlasterCost = netArea * costRates.wallPlasterRatePerSqm;
    const wallTilingCost = netArea * costRates.wallTilingRatePerSqm;
    const doorsCost = doors * costRates.doorUnitCost;
    const windowsCost = windows * costRates.windowUnitCost;

    // The basic estimate uses paint rate for walls plus door and window costs
    const basicEstimate = wallPaintCost + doorsCost + windowsCost;

    return {
        rates_used: {
            wall_paint_rate_per_m2: costRates.wallPaintRatePerSqm,
            wall_plaster_rate_per_m2: costRates.wallPlasterRatePerSqm,
            wall_tiling_rate_per_m2: costRates.wallTilingRatePerSqm,
            door_unit_cost: costRates.doorUnitCost,
            window_unit_cost: costRates.windowUnitCost
        },
        breakdown: {
            wall_paint_cost: parseFloat(wallPaintCost.toFixed(2)),
            wall_plaster_cost: parseFloat(wallPlasterCost.toFixed(2)),
            wall_tiling_cost: parseFloat(wallTilingCost.toFixed(2)),
            doors_cost: parseFloat(doorsCost.toFixed(2)),
            windows_cost: parseFloat(windowsCost.toFixed(2))
        },
        estimates: {
            basic_finish: parseFloat(basicEstimate.toFixed(2)),
            standard_finish: parseFloat((wallPlasterCost + doorsCost + windowsCost).toFixed(2)),
            premium_finish: parseFloat((wallTilingCost + doorsCost + windowsCost).toFixed(2))
        },
        currency: 'LKR'
    };
};

module.exports = {
    calculateCosts
};

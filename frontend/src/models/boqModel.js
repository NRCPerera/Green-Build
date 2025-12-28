/**
 * BOQ Data Model
 * 
 * Transforms raw API response data into formatted BOQ table entries.
 * This model handles the data structure for the Bill of Quantities display.
 */

/**
 * Generates structured BOQ data from API results.
 * Creates an array of items suitable for table display with proper formatting.
 * 
 * @param {Object} results - The results object from the API response
 * @param {Object} results.quantities - Quantity measurements from ML analysis
 * @param {Object} results.costs - Calculated costs and rates
 * @returns {Array} Formatted BOQ entries for table display
 */
export const generateBOQData = (results) => {
    if (!results) return [];

    const { quantities, costs } = results;
    const rates = costs.rates_used;

    return [
        {
            key: '1',
            item: 'Wall Surface Area (Gross)',
            description: 'Total wall area before deductions',
            quantity: quantities.wall_gross_surface_area_m2,
            unit: 'm2',
            rate: '-',
            total: '-',
            type: 'measurement'
        },
        {
            key: '2',
            item: 'Doors and Windows (Deductions)',
            description: 'Openings to be subtracted',
            quantity: quantities.deductions_area_m2,
            unit: 'm2',
            rate: '-',
            total: '-',
            type: 'deduction'
        },
        {
            key: '3',
            item: 'Wall Surface Area (Net)',
            description: 'Final paintable and workable area',
            quantity: quantities.wall_net_surface_area_m2,
            unit: 'm2',
            rate: '-',
            total: '-',
            type: 'subtotal'
        },
        {
            key: '4',
            item: 'Wall Painting - Basic Finish',
            description: 'Standard emulsion paint, 2 coats',
            quantity: quantities.wall_net_surface_area_m2,
            unit: 'm2',
            rate: `$${rates.wall_paint_rate_per_m2.toFixed(2)}`,
            total: `$${costs.breakdown.wall_paint_cost.toFixed(2)}`,
            type: 'work'
        },
        {
            key: '5',
            item: 'Wall Plastering',
            description: 'Cement plaster, 12mm thick',
            quantity: quantities.wall_net_surface_area_m2,
            unit: 'm2',
            rate: `$${rates.wall_plaster_rate_per_m2.toFixed(2)}`,
            total: `$${costs.breakdown.wall_plaster_cost.toFixed(2)}`,
            type: 'work'
        },
        {
            key: '6',
            item: 'Wall Tiling - Premium',
            description: 'Ceramic tiles with grouting',
            quantity: quantities.wall_net_surface_area_m2,
            unit: 'm2',
            rate: `$${rates.wall_tiling_rate_per_m2.toFixed(2)}`,
            total: `$${costs.breakdown.wall_tiling_cost.toFixed(2)}`,
            type: 'work'
        },
        {
            key: '7',
            item: 'Doors',
            description: 'Standard interior doors with frames',
            quantity: quantities.item_counts.doors,
            unit: 'nos',
            rate: `$${rates.door_unit_cost.toFixed(2)}`,
            total: `$${costs.breakdown.doors_cost.toFixed(2)}`,
            type: 'item'
        },
        {
            key: '8',
            item: 'Windows',
            description: 'Standard aluminum windows with glass',
            quantity: quantities.item_counts.windows,
            unit: 'nos',
            rate: `$${rates.window_unit_cost.toFixed(2)}`,
            total: `$${costs.breakdown.windows_cost.toFixed(2)}`,
            type: 'item'
        }
    ];
};

/**
 * Default form values for the input form.
 * These provide sensible starting points for typical floor plans.
 */
export const defaultFormValues = {
    scale: 100,      // 100 pixels per meter is a common starting point
    wallHeight: 2.7  // Standard residential wall height in meters
};

export default {
    generateBOQData,
    defaultFormValues
};

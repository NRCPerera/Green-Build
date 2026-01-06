export const generateBOQData = (results) => {
    if (!results) return [];

    const { quantities, costs } = results;
    const rates = costs.rates_used;

    // Helper function to format LKR with thousand separators
    const formatLKR = (amount) => {
        return `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

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
            rate: formatLKR(rates.wall_paint_rate_per_m2),
            total: formatLKR(costs.breakdown.wall_paint_cost),
            type: 'work'
        },
        {
            key: '5',
            item: 'Wall Plastering',
            description: 'Cement plaster, 12mm thick',
            quantity: quantities.wall_net_surface_area_m2,
            unit: 'm2',
            rate: formatLKR(rates.wall_plaster_rate_per_m2),
            total: formatLKR(costs.breakdown.wall_plaster_cost),
            type: 'work'
        },
        {
            key: '6',
            item: 'Wall Tiling - Premium',
            description: 'Ceramic tiles with grouting',
            quantity: quantities.wall_net_surface_area_m2,
            unit: 'm2',
            rate: formatLKR(rates.wall_tiling_rate_per_m2),
            total: formatLKR(costs.breakdown.wall_tiling_cost),
            type: 'work'
        },
        {
            key: '7',
            item: 'Doors',
            description: 'Standard interior doors with frames',
            quantity: quantities.item_counts.doors,
            unit: 'nos',
            rate: formatLKR(rates.door_unit_cost),
            total: formatLKR(costs.breakdown.doors_cost),
            type: 'item'
        },
        {
            key: '8',
            item: 'Windows',
            description: 'Standard aluminum windows with glass',
            quantity: quantities.item_counts.windows,
            unit: 'nos',
            rate: formatLKR(rates.window_unit_cost),
            total: formatLKR(costs.breakdown.windows_cost),
            type: 'item'
        }
    ];
};

export const defaultFormValues = {
    scale: 100,
    wallHeight: 2.7
};

export default {
    generateBOQData,
    defaultFormValues
};

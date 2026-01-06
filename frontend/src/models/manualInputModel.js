export const defaultManualInputs = {
    outlets: 0,
    switches: 0,
    lightFixtures: 0,
    sinks: 0,
    toilets: 0,
    showers: 0,
    bathtubs: 0,
    acUnits: 0,
    staircases: 0,
    flooringTileArea: 0,
    flooringWoodArea: 0,
    flooringCarpetArea: 0,
    ceilingPlainArea: 0,
    ceilingFalseArea: 0
};

// Manual item rates in LKR (Sri Lankan Rupees)
export const manualItemRates = {
    outlets: 1500.00,
    switches: 1200.00,
    lightFixtures: 3500.00,
    sinks: 15000.00,
    toilets: 35000.00,
    showers: 25000.00,
    bathtubs: 85000.00,
    acUnits: 150000.00,
    staircases: 350000.00,
    flooringTileArea: 3500.00,
    flooringWoodArea: 8500.00,
    flooringCarpetArea: 2500.00,
    ceilingPlainArea: 1200.00,
    ceilingFalseArea: 3500.00
};

export const calculateManualCosts = (inputs) => {
    const breakdown = {};
    let total = 0;

    Object.keys(inputs).forEach(key => {
        const quantity = inputs[key] || 0;
        const rate = manualItemRates[key] || 0;
        const cost = quantity * rate;

        if (quantity > 0) {
            breakdown[key] = {
                quantity,
                rate,
                cost
            };
            total += cost;
        }
    });

    return { breakdown, total };
};

// Helper function to format LKR
const formatLKR = (amount) => {
    return `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const generateManualBOQData = (inputs) => {
    const items = [];
    let keyCounter = 100;

    const itemConfig = {
        outlets: { label: 'Electrical Outlets', unit: 'nos', category: 'Electrical' },
        switches: { label: 'Light Switches', unit: 'nos', category: 'Electrical' },
        lightFixtures: { label: 'Light Fixtures', unit: 'nos', category: 'Electrical' },
        sinks: { label: 'Sinks', unit: 'nos', category: 'Plumbing' },
        toilets: { label: 'Toilets', unit: 'nos', category: 'Plumbing' },
        showers: { label: 'Shower Units', unit: 'nos', category: 'Plumbing' },
        bathtubs: { label: 'Bathtubs', unit: 'nos', category: 'Plumbing' },
        acUnits: { label: 'AC Units', unit: 'nos', category: 'HVAC' },
        staircases: { label: 'Staircases', unit: 'nos', category: 'Structural' },
        flooringTileArea: { label: 'Tile Flooring', unit: 'sq.m', category: 'Flooring' },
        flooringWoodArea: { label: 'Wood Flooring', unit: 'sq.m', category: 'Flooring' },
        flooringCarpetArea: { label: 'Carpet Flooring', unit: 'sq.m', category: 'Flooring' },
        ceilingPlainArea: { label: 'Plain Ceiling', unit: 'sq.m', category: 'Ceiling' },
        ceilingFalseArea: { label: 'False Ceiling', unit: 'sq.m', category: 'Ceiling' }
    };

    Object.keys(inputs).forEach(key => {
        const quantity = inputs[key] || 0;
        if (quantity > 0) {
            const config = itemConfig[key];
            const rate = manualItemRates[key];
            const cost = quantity * rate;

            items.push({
                key: String(keyCounter++),
                item: config.label,
                description: `${config.category} - User input`,
                quantity: quantity,
                unit: config.unit,
                rate: formatLKR(rate),
                total: formatLKR(cost),
                type: 'manual'
            });
        }
    });

    return items;
};

export default {
    defaultManualInputs,
    manualItemRates,
    calculateManualCosts,
    generateManualBOQData
};

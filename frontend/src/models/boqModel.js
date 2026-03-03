/**
 * BOQ Model - Complete Bill of Quantities Data Generator
 * 
 * Generates a professional BOQ with 6 measured work sections:
 *   A. Earthworks
 *   B. Concrete Works
 *   C. Masonry Works
 *   D. Finishes
 *   E. Doors & Windows
 *   F. MEP Works (Mechanical, Electrical, Plumbing)
 */

// ── LKR Rate Schedules ──────────────────────────────────────────

export const boqRates = {
    // A. Earthworks
    siteClearance: 250.00,          // per m²
    excavation: 2800.00,            // per m³
    backfilling: 1800.00,           // per m³
    compaction: 600.00,             // per m²
    surplusSoilDisposal: 3200.00,   // per m³

    // B. Concrete Works
    pcc: 12000.00,                  // per m³ — plain cement concrete
    rcc: 22000.00,                  // per m³ — reinforced cement concrete
    formwork: 1200.00,              // per m²
    reinforcementSteel: 260.00,     // per kg

    // C. Masonry Works
    brickwork: 5500.00,             // per m²
    blockwork: 4800.00,             // per m²
    stoneMasonry: 8500.00,          // per m³

    // D. Finishes
    plastering: 850.00,             // per m²
    wallPainting: 450.00,           // per m²
    wallTiling: 2500.00,            // per m²
    floorTiling: 3500.00,           // per m²
    woodFlooring: 8500.00,          // per m²
    carpetFlooring: 2500.00,        // per m²
    plainCeiling: 1200.00,          // per m²
    falseCeiling: 3500.00,          // per m²

    // E. Doors & Windows
    woodenDoor: 35000.00,           // per no.
    aluminumWindow: 25000.00,       // per no.
    glassInstallation: 8500.00,     // per m²
    ironmongery: 5000.00,           // per set

    // F. MEP Works
    electricalWiring: 1800.00,      // per m (run)
    lightingFixture: 3500.00,       // per no.
    switchboard: 8500.00,           // per no.
    outlet: 1500.00,                // per no.
    switch: 1200.00,                // per no.
    acUnit: 150000.00,              // per no.
    plumbingPipes: 950.00,          // per m
    plumbingFittings: 2500.00,      // per no.
    sink: 15000.00,                 // per no.
    toilet: 35000.00,               // per no.
    shower: 25000.00,               // per no.
    bathtub: 85000.00,              // per no.
    staircase: 350000.00,           // per no.
};

// ── Helper ───────────────────────────────────────────────────────

const fmt = (amount) =>
    `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── Section generators ───────────────────────────────────────────

const makeItem = (key, section, item, desc, qty, unit, rate) => ({
    key,
    section,
    item,
    description: desc,
    quantity: qty,
    unit,
    rate: fmt(rate),
    total: fmt(qty * rate),
    rawTotal: qty * rate,
    type: 'work'
});

/**
 * Generate BOQ Section A — Earthworks
 * Derived from floor area detected by ML
 */
const generateEarthworks = (mlResults, manualInputs, startKey) => {
    const items = [];
    let k = startKey;

    const floorArea = mlResults?.room_detection?.total_floor_area_m2 || 0;
    // Earthwork assumptions: footprint area = floor area, excavation depth ~1.2m
    const excavationDepth = manualInputs.excavationDepth || 1.2;
    const excavationVol = floorArea * excavationDepth;
    const backfillVol = excavationVol * 0.7; // 70% backfill
    const surplus = excavationVol * 0.3;

    if (floorArea > 0) {
        items.push(makeItem(String(k++), 'A', 'Site Clearance', 'Clearing site for construction', floorArea, 'm²', boqRates.siteClearance));
        items.push(makeItem(String(k++), 'A', 'Excavation', `Excavation to ${excavationDepth}m depth`, excavationVol, 'm³', boqRates.excavation));
        items.push(makeItem(String(k++), 'A', 'Backfilling', 'Backfilling with approved material', backfillVol, 'm³', boqRates.backfilling));
        items.push(makeItem(String(k++), 'A', 'Compaction', 'Mechanical compaction of backfill', floorArea, 'm²', boqRates.compaction));
        items.push(makeItem(String(k++), 'A', 'Disposal of Surplus Soil', 'Carting away surplus excavated material', surplus, 'm³', boqRates.surplusSoilDisposal));
    }

    return { items, nextKey: k };
};

/**
 * Generate BOQ Section B — Concrete Works
 * Foundation PCC/RCC derived from floor area
 */
const generateConcreteWorks = (mlResults, manualInputs, startKey) => {
    const items = [];
    let k = startKey;

    const floorArea = mlResults?.room_detection?.total_floor_area_m2 || 0;
    // Assumptions: PCC 75mm bed, RCC foundation 300mm, formwork = perimeter × depth
    const pccVol = floorArea * 0.075;
    const rccVol = manualInputs.rccVolume || (floorArea * 0.30);
    const formworkArea = manualInputs.formworkArea || (floorArea * 0.8);
    const steelKg = manualInputs.steelKg || (rccVol * 78); // ~78 kg/m³ rule of thumb

    if (floorArea > 0) {
        items.push(makeItem(String(k++), 'B', 'Plain Cement Concrete (PCC)', '1:2:4 mix, 75mm thick bed concrete', pccVol, 'm³', boqRates.pcc));
        items.push(makeItem(String(k++), 'B', 'Reinforced Cement Concrete (RCC)', '1:1.5:3 mix for foundations & slabs', rccVol, 'm³', boqRates.rcc));
        items.push(makeItem(String(k++), 'B', 'Formwork', 'Plywood formwork for concrete elements', formworkArea, 'm²', boqRates.formwork));
        items.push(makeItem(String(k++), 'B', 'Reinforcement Steel', 'TMT bars (Fe 500D grade)', steelKg, 'kg', boqRates.reinforcementSteel));
    }

    return { items, nextKey: k };
};

/**
 * Generate BOQ Section C — Masonry Works
 * Wall area from ML detection ➜ masonry quantity
 */
const generateMasonryWorks = (mlResults, manualInputs, startKey) => {
    const items = [];
    let k = startKey;

    const netWallArea = mlResults?.quantities?.wall_net_surface_area_m2 || 0;
    // Default to blockwork; user can override
    const brickArea = manualInputs.brickworkArea || 0;
    const blockArea = manualInputs.blockworkArea || netWallArea;
    const stoneVol = manualInputs.stoneMasonryVolume || 0;

    if (blockArea > 0) {
        items.push(makeItem(String(k++), 'C', 'Cement Block Masonry', '150mm cement block walls', blockArea, 'm²', boqRates.blockwork));
    }
    if (brickArea > 0) {
        items.push(makeItem(String(k++), 'C', 'Brick Masonry', '225mm thick burnt clay brick', brickArea, 'm²', boqRates.brickwork));
    }
    if (stoneVol > 0) {
        items.push(makeItem(String(k++), 'C', 'Stone Masonry', 'Random rubble masonry', stoneVol, 'm³', boqRates.stoneMasonry));
    }

    return { items, nextKey: k };
};

/**
 * Generate BOQ Section D — Finishes
 * Plastering, painting, tiling, flooring, ceiling
 */
const generateFinishes = (mlResults, manualInputs, startKey) => {
    const items = [];
    let k = startKey;

    const netWallArea = mlResults?.quantities?.wall_net_surface_area_m2 || 0;
    const floorArea = mlResults?.room_detection?.total_floor_area_m2 || 0;

    // Plastering — both sides of walls = 2× net area
    const plasterArea = manualInputs.plasterArea || (netWallArea * 2);
    if (plasterArea > 0) {
        items.push(makeItem(String(k++), 'D', 'Plastering', '12mm cement plaster, both sides', plasterArea, 'm²', boqRates.plastering));
    }

    // Painting
    const paintArea = manualInputs.paintArea || plasterArea;
    if (paintArea > 0) {
        items.push(makeItem(String(k++), 'D', 'Wall Painting', 'Emulsion paint — 2 coats', paintArea, 'm²', boqRates.wallPainting));
    }

    // Wall tiling (user must specify area)
    const wallTileArea = manualInputs.wallTileArea || 0;
    if (wallTileArea > 0) {
        items.push(makeItem(String(k++), 'D', 'Wall Tiling', 'Ceramic wall tiles with grouting', wallTileArea, 'm²', boqRates.wallTiling));
    }

    // Floor tiling
    const floorTileArea = manualInputs.floorTileArea || floorArea;
    if (floorTileArea > 0) {
        items.push(makeItem(String(k++), 'D', 'Floor Tiling', 'Vitrified floor tiles with grouting', floorTileArea, 'm²', boqRates.floorTiling));
    }

    // Wood flooring
    const woodFloorArea = manualInputs.woodFloorArea || 0;
    if (woodFloorArea > 0) {
        items.push(makeItem(String(k++), 'D', 'Wood Flooring', 'Engineered hardwood flooring', woodFloorArea, 'm²', boqRates.woodFlooring));
    }

    // Carpet flooring
    const carpetArea = manualInputs.carpetFloorArea || 0;
    if (carpetArea > 0) {
        items.push(makeItem(String(k++), 'D', 'Carpet Flooring', 'Commercial grade carpet tiles', carpetArea, 'm²', boqRates.carpetFlooring));
    }

    // Ceiling — plain
    const plainCeilingArea = manualInputs.plainCeilingArea || floorArea;
    if (plainCeilingArea > 0) {
        items.push(makeItem(String(k++), 'D', 'Plain Ceiling', 'Skimcoat finish on concrete soffit', plainCeilingArea, 'm²', boqRates.plainCeiling));
    }

    // Ceiling — false
    const falseCeilingArea = manualInputs.falseCeilingArea || 0;
    if (falseCeilingArea > 0) {
        items.push(makeItem(String(k++), 'D', 'False Ceiling', 'Gypsum board false ceiling with frame', falseCeilingArea, 'm²', boqRates.falseCeiling));
    }

    return { items, nextKey: k };
};

/**
 * Generate BOQ Section E — Doors & Windows
 * Counts from ML detection
 */
const generateDoorsWindows = (mlResults, manualInputs, startKey) => {
    const items = [];
    let k = startKey;

    const doors = manualInputs.doors ?? (mlResults?.quantities?.item_counts?.doors || 0);
    const windows = manualInputs.windows ?? (mlResults?.quantities?.item_counts?.windows || 0);
    const glassArea = manualInputs.glassArea || 0;
    const ironmongery = manualInputs.ironmongerySets || doors;

    if (doors > 0) {
        items.push(makeItem(String(k++), 'E', 'Wooden Doors', 'Hardwood panel door with frame — standard', doors, 'No.', boqRates.woodenDoor));
    }
    if (windows > 0) {
        items.push(makeItem(String(k++), 'E', 'Aluminium Windows', 'Powder-coated aluminium sliding window', windows, 'No.', boqRates.aluminumWindow));
    }
    if (glassArea > 0) {
        items.push(makeItem(String(k++), 'E', 'Glass Installation', '6mm toughened clear glass', glassArea, 'm²', boqRates.glassInstallation));
    }
    if (ironmongery > 0) {
        items.push(makeItem(String(k++), 'E', 'Ironmongery', 'Hinges, handles, locks — per door set', ironmongery, 'set', boqRates.ironmongery));
    }

    return { items, nextKey: k };
};

/**
 * Generate BOQ Section F — MEP Works
 * Electrical, plumbing, HVAC, sanitary
 */
const generateMEP = (mlResults, manualInputs, startKey) => {
    const items = [];
    let k = startKey;

    const floorArea = mlResults?.room_detection?.total_floor_area_m2 || 0;

    // Electrical
    const wiringLength = manualInputs.wiringLength || (floorArea * 1.5); // ~1.5m run per m² rule of thumb
    if (wiringLength > 0) {
        items.push(makeItem(String(k++), 'F', 'Electrical Wiring', 'PVC insulated copper (1.5–4 mm²)', wiringLength, 'm', boqRates.electricalWiring));
    }

    const lights = manualInputs.lightFixtures || 0;
    if (lights > 0) {
        items.push(makeItem(String(k++), 'F', 'Lighting Fixtures', 'LED panel / downlight installation', lights, 'No.', boqRates.lightingFixture));
    }

    const switchboards = manualInputs.switchboards || 0;
    if (switchboards > 0) {
        items.push(makeItem(String(k++), 'F', 'Switchboards / DB', 'Distribution board with MCBs', switchboards, 'No.', boqRates.switchboard));
    }

    const outlets = manualInputs.outlets || 0;
    if (outlets > 0) {
        items.push(makeItem(String(k++), 'F', 'Electrical Outlets', '13A twin socket with wiring', outlets, 'No.', boqRates.outlet));
    }

    const switches = manualInputs.switches || 0;
    if (switches > 0) {
        items.push(makeItem(String(k++), 'F', 'Switches', 'Modular light switches', switches, 'No.', boqRates.switch));
    }

    // HVAC
    const acUnits = manualInputs.acUnits || 0;
    if (acUnits > 0) {
        items.push(makeItem(String(k++), 'F', 'HVAC — AC Units', '1.5 ton split inverter AC installed', acUnits, 'No.', boqRates.acUnit));
    }

    // Plumbing
    const pipeLength = manualInputs.plumbingPipeLength || 0;
    if (pipeLength > 0) {
        items.push(makeItem(String(k++), 'F', 'Plumbing Pipes', 'uPVC / CPVC water supply & drainage', pipeLength, 'm', boqRates.plumbingPipes));
    }

    const fittings = manualInputs.plumbingFittings || 0;
    if (fittings > 0) {
        items.push(makeItem(String(k++), 'F', 'Plumbing Fittings', 'Elbows, tees, couplings', fittings, 'No.', boqRates.plumbingFittings));
    }

    // Sanitary
    const sinks = manualInputs.sinks || 0;
    if (sinks > 0) {
        items.push(makeItem(String(k++), 'F', 'Sinks', 'Stainless-steel kitchen / wash basin', sinks, 'No.', boqRates.sink));
    }
    const toilets = manualInputs.toilets || 0;
    if (toilets > 0) {
        items.push(makeItem(String(k++), 'F', 'Toilets', 'Western commode with cistern', toilets, 'No.', boqRates.toilet));
    }
    const showers = manualInputs.showers || 0;
    if (showers > 0) {
        items.push(makeItem(String(k++), 'F', 'Shower Units', 'Wall-mounted shower mixer set', showers, 'No.', boqRates.shower));
    }
    const bathtubs = manualInputs.bathtubs || 0;
    if (bathtubs > 0) {
        items.push(makeItem(String(k++), 'F', 'Bathtubs', 'Acrylic bathtub with fittings', bathtubs, 'No.', boqRates.bathtub));
    }

    // Structural misc
    const staircases = manualInputs.staircases || 0;
    if (staircases > 0) {
        items.push(makeItem(String(k++), 'F', 'Staircases', 'RCC staircase with MS railing', staircases, 'No.', boqRates.staircase));
    }

    return { items, nextKey: k };
};

// ── Public API ───────────────────────────────────────────────────

/**
 * Generate the complete BOQ across all 6 sections.
 *
 * @param {Object} mlResults   — ML service response (quantities, room_detection, costs, etc.)
 * @param {Object} manualInputs — user-provided overrides / additional quantities
 * @returns {Object} { sections, allItems, grandTotal }
 */
export const generateFullBOQ = (mlResults, manualInputs = {}) => {
    const sections = [];
    let key = 1;

    const generators = [
        { code: 'A', title: '🏗️ Earthworks', fn: generateEarthworks },
        { code: 'B', title: '🧱 Concrete Works', fn: generateConcreteWorks },
        { code: 'C', title: '🧱 Masonry Works', fn: generateMasonryWorks },
        { code: 'D', title: '🏠 Finishes', fn: generateFinishes },
        { code: 'E', title: '🚪 Doors & Windows', fn: generateDoorsWindows },
        { code: 'F', title: '⚡ MEP Works', fn: generateMEP },
    ];

    let allItems = [];

    generators.forEach(({ code, title, fn }) => {
        const { items, nextKey } = fn(mlResults, manualInputs, key);
        key = nextKey;

        const sectionTotal = items.reduce((sum, i) => sum + i.rawTotal, 0);

        sections.push({
            code,
            title,
            items,
            total: sectionTotal,
            totalFormatted: fmt(sectionTotal)
        });
        allItems = [...allItems, ...items];
    });

    const subtotal = allItems.reduce((sum, i) => sum + i.rawTotal, 0);
    const contingency = subtotal * 0.10;
    const overhead = subtotal * 0.15;
    const profit = subtotal * 0.10;
    const grandTotal = subtotal + contingency + overhead + profit;

    return {
        sections,
        allItems,
        summary: {
            subtotal,
            contingencyPercent: 10,
            contingencyAmount: contingency,
            overheadPercent: 15,
            overheadAmount: overhead,
            profitPercent: 10,
            profitAmount: profit,
            grandTotal,
            currency: 'LKR'
        },
        subtotalFormatted: fmt(subtotal),
        grandTotalFormatted: fmt(grandTotal)
    };
};

/**
 * Legacy compat — generates the flat BOQ from ML results only (old behaviour)
 */
export const generateBOQData = (results) => {
    if (!results) return [];

    const { quantities, costs } = results;
    const rates = costs.rates_used;

    const fmtLKR = (amount) =>
        `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return [
        { key: '1', item: 'Wall Surface Area (Gross)', description: 'Total wall area before deductions', quantity: quantities.wall_gross_surface_area_m2, unit: 'm²', rate: '-', total: '-', type: 'measurement' },
        { key: '2', item: 'Doors and Windows (Deductions)', description: 'Openings to be subtracted', quantity: quantities.deductions_area_m2, unit: 'm²', rate: '-', total: '-', type: 'deduction' },
        { key: '3', item: 'Wall Surface Area (Net)', description: 'Final paintable and workable area', quantity: quantities.wall_net_surface_area_m2, unit: 'm²', rate: '-', total: '-', type: 'subtotal' },
        { key: '4', item: 'Wall Painting — Basic Finish', description: 'Standard emulsion paint, 2 coats', quantity: quantities.wall_net_surface_area_m2, unit: 'm²', rate: fmtLKR(rates.wall_paint_rate_per_m2), total: fmtLKR(costs.breakdown.wall_paint_cost), type: 'work' },
        { key: '5', item: 'Wall Plastering', description: 'Cement plaster, 12mm thick', quantity: quantities.wall_net_surface_area_m2, unit: 'm²', rate: fmtLKR(rates.wall_plaster_rate_per_m2), total: fmtLKR(costs.breakdown.wall_plaster_cost), type: 'work' },
        { key: '6', item: 'Wall Tiling — Premium', description: 'Ceramic tiles with grouting', quantity: quantities.wall_net_surface_area_m2, unit: 'm²', rate: fmtLKR(rates.wall_tiling_rate_per_m2), total: fmtLKR(costs.breakdown.wall_tiling_cost), type: 'work' },
        { key: '7', item: 'Doors', description: 'Standard interior doors with frames', quantity: quantities.item_counts.doors, unit: 'nos', rate: fmtLKR(rates.door_unit_cost), total: fmtLKR(costs.breakdown.doors_cost), type: 'item' },
        { key: '8', item: 'Windows', description: 'Standard aluminum windows with glass', quantity: quantities.item_counts.windows, unit: 'nos', rate: fmtLKR(rates.window_unit_cost), total: fmtLKR(costs.breakdown.windows_cost), type: 'item' },
    ];
};

export const defaultFormValues = {
    scale: 100,
    wallHeight: 2.7
};

export default {
    generateBOQData,
    generateFullBOQ,
    boqRates,
    defaultFormValues
};

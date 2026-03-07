/**
 * BOQ Generator Service
 *
 * Takes confirmed detections + user inputs + dynamic rates
 * and produces a complete BOQ with Sections A–F.
 *
 * Called by: POST /api/boq/generate
 */

const rateEngine = require('./rateEngine');

/**
 * Generate a complete BOQ from confirmed detections.
 *
 * @param {Object} confirmed    — confirmedDetections from FloorPlan
 * @param {Object} materials    — materialSelections from user
 * @param {Date}   rateDate     — effective date for rate lookup
 * @returns {Object} { sections[], summary }
 */
const generateBOQ = async (confirmed, materials = {}, rateDate = new Date()) => {
    const sections = [];

    // Compute derived values
    const totalFloorArea = computeTotalFloorArea(confirmed);
    const wallNetArea = confirmed.walls?.netArea || 0;
    const wallHeight = confirmed.walls?.heightM || 2.7;
    const excavationDepth = confirmed.additionalInputs?.excavationDepth || 1.2;

    // ── Section A: Earthworks ─────────────────────────────
    sections.push(await buildSection('A', 'Earthworks', 'earthworks', [
        { code: 'A01', qty: totalFloorArea },
        { code: 'A02', qty: totalFloorArea * excavationDepth },
        { code: 'A03', qty: totalFloorArea * excavationDepth * 0.7 },
        { code: 'A04', qty: totalFloorArea },
        { code: 'A05', qty: totalFloorArea * excavationDepth * 0.3 },
    ], 'standard', rateDate));

    // ── Section B: Concrete Works ─────────────────────────
    const rccVolume = confirmed.additionalInputs?.rccVolume || totalFloorArea * 0.30;
    const formworkArea = confirmed.additionalInputs?.formworkArea || totalFloorArea * 0.80;
    const steelKg = confirmed.additionalInputs?.steelKg || rccVolume * 78;

    sections.push(await buildSection('B', 'Concrete Works', 'concrete_works', [
        { code: 'B01', qty: totalFloorArea * 0.075 },  // PCC
        { code: 'B02', qty: rccVolume },                // RCC
        { code: 'B03', qty: formworkArea },             // Formwork
        { code: 'B04', qty: steelKg },                  // Steel
    ], 'standard', rateDate));

    // ── Section C: Masonry Works ──────────────────────────
    const blockworkArea = confirmed.additionalInputs?.blockworkArea || wallNetArea;
    const brickworkArea = confirmed.additionalInputs?.brickworkArea || 0;
    const stoneMasonryVol = confirmed.additionalInputs?.stoneMasonryVolume || 0;

    const masonryItems = [];
    if (brickworkArea > 0) masonryItems.push({ code: 'C01', qty: brickworkArea });
    if (blockworkArea > 0) masonryItems.push({ code: 'C02', qty: blockworkArea });
    if (stoneMasonryVol > 0) masonryItems.push({ code: 'C03', qty: stoneMasonryVol });

    // If no masonry override, default all wall area to blockwork
    if (masonryItems.length === 0 && wallNetArea > 0) {
        masonryItems.push({ code: 'C02', qty: wallNetArea });
    }

    sections.push(await buildSection('C', 'Masonry Works', 'masonry_works',
        masonryItems, materials.masonryType || 'standard', rateDate));

    // ── Section D: Finishes ──────────────────────────────
    const finishItems = [];

    // Plastering & Painting default to 2× wall area (both sides)
    const plasterArea = confirmed.additionalInputs?.plasterArea || wallNetArea * 2;
    const paintArea = confirmed.additionalInputs?.paintArea || plasterArea;
    if (plasterArea > 0) finishItems.push({ code: 'D01', qty: plasterArea });
    if (paintArea > 0) finishItems.push({ code: 'D02', qty: paintArea });

    // Wall tiling (optional, from manual inputs)
    const wallTileArea = confirmed.additionalInputs?.wallTileArea || 0;
    if (wallTileArea > 0) finishItems.push({ code: 'D03', qty: wallTileArea });

    // Per-room flooring
    const rooms = confirmed.rooms || [];
    if (rooms.length > 0) {
        // Group by flooring code to aggregate areas
        const flooringGroups = {};
        rooms.forEach(room => {
            const mat = room.flooringMaterial || materials.flooringDefault || 'ceramic_tile';
            const code = mat.includes('wood') ? 'D05' :
                mat.includes('carpet') ? 'D06' : 'D04';
            flooringGroups[code] = (flooringGroups[code] || 0) + (room.area || 0);
        });
        for (const [code, area] of Object.entries(flooringGroups)) {
            if (area > 0) finishItems.push({ code, qty: area });
        }
    } else if (totalFloorArea > 0) {
        // No rooms — use total floor area with default material
        const floorTileArea = confirmed.additionalInputs?.floorTileArea || totalFloorArea;
        finishItems.push({ code: 'D04', qty: floorTileArea });
    }

    // Wood & carpet from manual override
    const woodFloorArea = confirmed.additionalInputs?.woodFloorArea || 0;
    const carpetFloorArea = confirmed.additionalInputs?.carpetFloorArea || 0;
    if (woodFloorArea > 0) finishItems.push({ code: 'D05', qty: woodFloorArea });
    if (carpetFloorArea > 0) finishItems.push({ code: 'D06', qty: carpetFloorArea });

    // Ceiling
    if (rooms.length > 0) {
        const ceilingGroups = { plain: 0, false: 0 };
        rooms.forEach(room => {
            const type = room.ceilingType || 'plain';
            if (type === 'false') ceilingGroups.false += (room.area || 0);
            else ceilingGroups.plain += (room.area || 0);
        });
        if (ceilingGroups.plain > 0) finishItems.push({ code: 'D07', qty: ceilingGroups.plain });
        if (ceilingGroups.false > 0) finishItems.push({ code: 'D08', qty: ceilingGroups.false });
    } else {
        const plainCeiling = confirmed.additionalInputs?.plainCeilingArea || totalFloorArea;
        const falseCeiling = confirmed.additionalInputs?.falseCeilingArea || 0;
        if (plainCeiling > 0) finishItems.push({ code: 'D07', qty: plainCeiling });
        if (falseCeiling > 0) finishItems.push({ code: 'D08', qty: falseCeiling });
    }

    sections.push(await buildSection('D', 'Finishes', 'finishes',
        finishItems, 'standard', rateDate));

    // ── Section E: Doors & Windows ───────────────────────
    const approvedDoors = (confirmed.doors || []).filter(d => d.status !== 'deleted');
    const approvedWindows = (confirmed.windows || []).filter(w => w.status !== 'deleted');
    // Manual overrides
    const doorCount = confirmed.additionalInputs?.doors || approvedDoors.length;
    const windowCount = confirmed.additionalInputs?.windows || approvedWindows.length;

    const dwItems = [];
    if (doorCount > 0) {
        dwItems.push({ code: 'E01', qty: doorCount, material: materials.doorType || 'standard' });
        // Ironmongery per door
        const ironmongerySets = confirmed.additionalInputs?.ironmongerySets || doorCount;
        dwItems.push({ code: 'E04', qty: ironmongerySets });
    }
    if (windowCount > 0) {
        dwItems.push({ code: 'E02', qty: windowCount, material: materials.windowType || 'standard' });
    }
    // Glass installation
    const glassArea = confirmed.additionalInputs?.glassArea || 0;
    if (glassArea > 0) dwItems.push({ code: 'E03', qty: glassArea });

    sections.push(await buildSection('E', 'Doors & Windows', 'doors_windows',
        dwItems, 'standard', rateDate));

    // ── Section F: MEP Works ─────────────────────────────
    const add = confirmed.additionalInputs || {};
    const mepItems = [];

    // Electrical
    const wiringLength = add.wiringLength || totalFloorArea * 1.5;
    if (wiringLength > 0) mepItems.push({ code: 'F01', qty: wiringLength });
    if (add.lightFixtures) mepItems.push({ code: 'F02', qty: add.lightFixtures });
    if (add.switchboards) mepItems.push({ code: 'F03', qty: add.switchboards });
    if (add.outlets) mepItems.push({ code: 'F04', qty: add.outlets });
    if (add.switches) mepItems.push({ code: 'F05', qty: add.switches });

    // HVAC
    if (add.acUnits) mepItems.push({ code: 'F06', qty: add.acUnits });

    // Plumbing
    if (add.plumbingPipeLength) mepItems.push({ code: 'F07', qty: add.plumbingPipeLength });
    if (add.plumbingFittings) mepItems.push({ code: 'F08', qty: add.plumbingFittings });

    // Sanitary Fixtures
    if (add.sinks) mepItems.push({ code: 'F09', qty: add.sinks });
    if (add.toilets) mepItems.push({ code: 'F10', qty: add.toilets });
    if (add.showers) mepItems.push({ code: 'F11', qty: add.showers });
    if (add.bathtubs) mepItems.push({ code: 'F12', qty: add.bathtubs });

    // Structural misc
    if (add.staircases) mepItems.push({ code: 'F13', qty: add.staircases });

    sections.push(await buildSection('F', 'MEP Works', 'mep_works',
        mepItems, 'standard', rateDate));

    // ── Summary ──────────────────────────────────────────
    const subtotal = sections.reduce((sum, s) => sum + s.subtotal, 0);
    const contingencyPct = 10;
    const overheadPct = 15;
    const profitPct = 10;

    const contingency = subtotal * contingencyPct / 100;
    const overhead = subtotal * overheadPct / 100;
    const profit = subtotal * profitPct / 100;
    const grandTotal = subtotal + contingency + overhead + profit;

    return {
        sections,
        summary: {
            sectionSubtotals: Object.fromEntries(
                sections.map(s => [s.sectionKey, s.subtotal])
            ),
            subtotal: round(subtotal),
            contingencyPercent: contingencyPct,
            contingencyAmount: round(contingency),
            overheadPercent: overheadPct,
            overheadAmount: round(overhead),
            profitPercent: profitPct,
            profitAmount: round(profit),
            grandTotal: round(grandTotal),
            currency: 'LKR',
            rateDate
        }
    };
};

/**
 * Build a single BOQ section by looking up rates for each item.
 */
async function buildSection(code, title, sectionKey, items, defaultMaterial = 'standard', rateDate) {
    const resolvedItems = [];

    for (const item of items) {
        if (!item.qty || item.qty <= 0) continue;

        const material = item.material || defaultMaterial;
        const rateInfo = await rateEngine.getRate(sectionKey, item.code, material, rateDate);
        const amount = item.qty * rateInfo.rate;

        resolvedItems.push({
            itemNo: item.code,
            section: sectionKey,
            category: sectionKeyToCategory(sectionKey),
            itemName: rateInfo.itemName,
            description: rateInfo.itemName,
            unit: rateInfo.unit,
            quantity: round(item.qty),
            materialType: material,
            unitRate: rateInfo.rate,
            rateRef: rateInfo.rateId,
            rateEffectiveDate: rateInfo.effectiveDate,
            totalCost: round(amount),
            source: 'calculated'
        });
    }

    const subtotal = resolvedItems.reduce((sum, i) => sum + i.totalCost, 0);

    return {
        code,
        title,
        sectionKey,
        items: resolvedItems,
        subtotal: round(subtotal)
    };
}

// ── Helpers ──────────────────────────────────────────────

function computeTotalFloorArea(confirmed) {
    if (confirmed.rooms && confirmed.rooms.length > 0) {
        return confirmed.rooms.reduce((sum, r) => sum + (r.area || 0), 0);
    }
    return confirmed.totalFloorArea || 0;
}

function sectionKeyToCategory(sectionKey) {
    const map = {
        'earthworks': 'earthworks',
        'concrete_works': 'concrete',
        'masonry_works': 'masonry',
        'finishes': 'finishes',
        'doors_windows': 'doors',
        'mep_works': 'mep'
    };
    return map[sectionKey] || 'other';
}

function round(n) {
    return parseFloat(n.toFixed(2));
}

module.exports = { generateBOQ };

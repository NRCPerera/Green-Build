/**
 * Rate Engine Service
 *
 * Resolves the correct rate for a BOQ item based on:
 *   1. Section (earthworks, finishes, etc.)
 *   2. Item code (A01, D05, etc.)
 *   3. Material type (standard, premium, ceramic, etc.)
 *   4. Effective date (latest rate where effective_date <= target_date)
 *
 * Falls back to config.costRates when no DB rate exists (backward compat).
 */

const Rate = require('../models/Rate');
const config = require('../config');

/**
 * Get the effective rate for a specific item.
 *
 * @param {string} section      — e.g. 'finishes'
 * @param {string} itemCode     — e.g. 'D05'
 * @param {string} materialType — e.g. 'ceramic' (default: 'standard')
 * @param {Date}   asOfDate     — rate effective on this date (default: now)
 * @returns {Object} { rate, rateId, effectiveDate, unit, source, itemName }
 */
const getRate = async (section, itemCode, materialType = 'standard', asOfDate = new Date()) => {
    // Try DB lookup — latest rate where effectiveDate <= asOfDate
    const dbRate = await Rate.findOne({
        section,
        itemCode: itemCode.toUpperCase(),
        materialType: materialType.toLowerCase(),
        effectiveDate: { $lte: asOfDate },
        isActive: true
    })
        .sort({ effectiveDate: -1 })
        .lean();

    if (dbRate) {
        return {
            rate: dbRate.rate,
            rateId: dbRate._id,
            effectiveDate: dbRate.effectiveDate,
            unit: dbRate.unit,
            source: 'database',
            itemName: dbRate.itemName
        };
    }

    // Fallback to hardcoded defaults (backward compat with config.costRates)
    const fallback = getFallbackRate(section, itemCode);
    return {
        rate: fallback.rate,
        rateId: null,
        effectiveDate: null,
        unit: fallback.unit,
        source: 'config_default',
        itemName: fallback.itemName
    };
};

/**
 * Get all current rates for a section (for frontend material selection UI).
 * Groups by itemCode + materialType, returning only the latest effective rate.
 *
 * @param {string} section   — BOQ section key
 * @param {Date}   asOfDate  — rate effective on this date
 * @returns {Array} Array of rate objects
 */
const getRatesForSection = async (section, asOfDate = new Date()) => {
    const rates = await Rate.aggregate([
        {
            $match: {
                section,
                effectiveDate: { $lte: asOfDate },
                isActive: true
            }
        },
        { $sort: { effectiveDate: -1 } },
        {
            $group: {
                _id: { itemCode: '$itemCode', materialType: '$materialType' },
                latestRate: { $first: '$$ROOT' }
            }
        },
        { $replaceRoot: { newRoot: '$latestRate' } },
        { $sort: { itemCode: 1, materialType: 1 } }
    ]);

    return rates;
};

/**
 * Get all available material types for a given section+itemCode.
 *
 * @param {string} section
 * @param {string} itemCode
 * @returns {Array} e.g. ['standard', 'premium', 'ceramic']
 */
const getMaterialTypes = async (section, itemCode) => {
    const materials = await Rate.distinct('materialType', {
        section,
        itemCode: itemCode.toUpperCase(),
        isActive: true
    });
    return materials.length > 0 ? materials : ['standard'];
};

/**
 * Import rates from parsed CSV rows.
 * Creates new rate entries; old ones are preserved for history.
 *
 * @param {Array}  rows       — array of { section, itemCode, itemName, unit, materialType, rate, effectiveDate }
 * @param {string} uploadedBy — user ID
 * @returns {Object} { imported, skipped, errors }
 */
const importFromCSV = async (rows, uploadedBy) => {
    const results = { imported: 0, skipped: 0, errors: [] };

    for (const row of rows) {
        try {
            if (!row.section || !row.itemCode || !row.rate) {
                results.skipped++;
                results.errors.push({
                    row: row.itemCode || '?',
                    error: 'Missing required fields: section, itemCode, rate'
                });
                continue;
            }

            const rateValue = parseFloat(row.rate);
            if (isNaN(rateValue) || rateValue < 0) {
                results.skipped++;
                results.errors.push({
                    row: row.itemCode,
                    error: `Invalid rate value: ${row.rate}`
                });
                continue;
            }

            await Rate.create({
                section: row.section.toLowerCase().trim(),
                itemCode: row.itemCode.toUpperCase().trim(),
                itemName: (row.itemName || row.itemCode).trim(),
                description: row.description || '',
                unit: row.unit || 'No.',
                materialType: (row.materialType || 'standard').toLowerCase().trim(),
                rate: rateValue,
                effectiveDate: row.effectiveDate ? new Date(row.effectiveDate) : new Date(),
                source: 'csv_import',
                uploadedBy
            });

            results.imported++;
        } catch (err) {
            results.errors.push({
                row: row.itemCode || '?',
                error: err.message
            });
        }
    }

    return results;
};

/**
 * Seed default rates into the database (run once or on first startup).
 * Uses config values for backward-compatible pricing.
 *
 * @param {string} userId — optional admin user ID
 * @returns {Object} { seeded, skipped }
 */
const seedDefaultRates = async (userId = null) => {
    const existingCount = await Rate.countDocuments();
    if (existingCount > 0) {
        return { seeded: 0, skipped: existingCount, message: 'Rates already exist in database' };
    }

    const sections = getAllDefaults();
    let seeded = 0;

    for (const [sectionKey, items] of Object.entries(sections)) {
        for (const [itemCode, data] of Object.entries(items)) {
            await Rate.create({
                section: sectionKey,
                itemCode,
                itemName: data.itemName,
                unit: data.unit,
                materialType: 'standard',
                rate: data.rate,
                effectiveDate: new Date('2026-01-01'),
                source: 'system_default',
                uploadedBy: userId
            });
            seeded++;
        }
    }

    return { seeded, skipped: 0, message: `Seeded ${seeded} default rates` };
};

// ── Fallback rates from config (backward compat) ────────────────

function getFallbackRate(section, itemCode) {
    const defaults = getAllDefaults();
    return defaults[section]?.[itemCode.toUpperCase()]
        || { rate: 0, unit: '?', itemName: itemCode };
}

function getAllDefaults() {
    return {
        'earthworks': {
            'A01': { rate: 250, unit: 'm²', itemName: 'Site Clearance' },
            'A02': { rate: 2800, unit: 'm³', itemName: 'Excavation' },
            'A03': { rate: 1800, unit: 'm³', itemName: 'Backfilling' },
            'A04': { rate: 600, unit: 'm²', itemName: 'Compaction' },
            'A05': { rate: 3200, unit: 'm³', itemName: 'Surplus Soil Disposal' },
        },
        'concrete_works': {
            'B01': { rate: 12000, unit: 'm³', itemName: 'Plain Cement Concrete (PCC)' },
            'B02': { rate: 22000, unit: 'm³', itemName: 'Reinforced Concrete (RCC)' },
            'B03': { rate: 1200, unit: 'm²', itemName: 'Formwork' },
            'B04': { rate: 260, unit: 'kg', itemName: 'Reinforcement Steel' },
        },
        'masonry_works': {
            'C01': { rate: 5500, unit: 'm²', itemName: 'Brickwork' },
            'C02': { rate: 4800, unit: 'm²', itemName: 'Blockwork' },
            'C03': { rate: 8500, unit: 'm³', itemName: 'Stone Masonry' },
        },
        'finishes': {
            'D01': { rate: config.costRates.wallPlasterRatePerSqm || 850, unit: 'm²', itemName: 'Plastering' },
            'D02': { rate: config.costRates.wallPaintRatePerSqm || 450, unit: 'm²', itemName: 'Wall Painting' },
            'D03': { rate: config.costRates.wallTilingRatePerSqm || 2500, unit: 'm²', itemName: 'Wall Tiling' },
            'D04': { rate: 3500, unit: 'm²', itemName: 'Floor Tiling (Ceramic)' },
            'D05': { rate: 8500, unit: 'm²', itemName: 'Wood Flooring' },
            'D06': { rate: 2500, unit: 'm²', itemName: 'Carpet Flooring' },
            'D07': { rate: 1200, unit: 'm²', itemName: 'Plain Ceiling' },
            'D08': { rate: 3500, unit: 'm²', itemName: 'False Ceiling' },
        },
        'doors_windows': {
            'E01': { rate: config.costRates.doorUnitCost || 35000, unit: 'No.', itemName: 'Wooden Doors' },
            'E02': { rate: config.costRates.windowUnitCost || 25000, unit: 'No.', itemName: 'Aluminium Windows' },
            'E03': { rate: 8500, unit: 'm²', itemName: 'Glass Installation' },
            'E04': { rate: 5000, unit: 'set', itemName: 'Ironmongery' },
        },
        'mep_works': {
            'F01': { rate: 1800, unit: 'm', itemName: 'Electrical Wiring' },
            'F02': { rate: 3500, unit: 'No.', itemName: 'Lighting Fixtures' },
            'F03': { rate: 8500, unit: 'No.', itemName: 'Switchboards / DB' },
            'F04': { rate: config.additionalRates?.electricalOutlet || 1500, unit: 'No.', itemName: 'Electrical Outlets' },
            'F05': { rate: config.additionalRates?.electricalSwitch || 1200, unit: 'No.', itemName: 'Switches' },
            'F06': { rate: config.additionalRates?.acUnit || 150000, unit: 'No.', itemName: 'AC Units' },
            'F07': { rate: 950, unit: 'm', itemName: 'Plumbing Pipes' },
            'F08': { rate: 2500, unit: 'No.', itemName: 'Plumbing Fittings' },
            'F09': { rate: config.additionalRates?.sink || 15000, unit: 'No.', itemName: 'Sinks' },
            'F10': { rate: config.additionalRates?.toilet || 35000, unit: 'No.', itemName: 'Toilets' },
            'F11': { rate: config.additionalRates?.shower || 25000, unit: 'No.', itemName: 'Showers' },
            'F12': { rate: config.additionalRates?.bathtub || 85000, unit: 'No.', itemName: 'Bathtubs' },
            'F13': { rate: config.additionalRates?.staircase || 350000, unit: 'No.', itemName: 'Staircases' },
        }
    };
}

module.exports = {
    getRate,
    getRatesForSection,
    getMaterialTypes,
    importFromCSV,
    seedDefaultRates,
    getFallbackRate,
    getAllDefaults
};

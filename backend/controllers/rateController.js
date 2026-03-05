/**
 * Rate Controller
 *
 * CRUD operations for construction rates + CSV bulk import.
 * Used by admin to manage dynamic pricing for BOQ generation.
 */

const Rate = require('../models/Rate');
const rateEngine = require('../services/rateEngine');
const csv = require('csv-parser');
const { Readable } = require('stream');

/**
 * Get all rates (with filtering)
 * GET /api/rates?section=finishes&materialType=ceramic&active=true
 */
const getRates = async (req, res) => {
    try {
        const { section, materialType, itemCode, active } = req.query;

        const filter = {};
        if (section) filter.section = section;
        if (materialType) filter.materialType = materialType.toLowerCase();
        if (itemCode) filter.itemCode = itemCode.toUpperCase();
        if (active !== undefined) filter.isActive = active === 'true';
        else filter.isActive = true;

        // If section is provided, use the aggregation for latest rates
        if (section) {
            const asOfDate = req.query.asOfDate ? new Date(req.query.asOfDate) : new Date();
            const rates = await rateEngine.getRatesForSection(section, asOfDate);
            return res.json({
                success: true,
                data: { rates, count: rates.length }
            });
        }

        const rates = await Rate.find(filter)
            .sort({ section: 1, itemCode: 1, effectiveDate: -1 })
            .lean();

        res.json({
            success: true,
            data: { rates, count: rates.length }
        });
    } catch (error) {
        console.error('[Rates] Get error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch rates.'
        });
    }
};

/**
 * Get a single rate
 * GET /api/rates/:id
 */
const getRate = async (req, res) => {
    try {
        const rate = await Rate.findById(req.params.id).lean();

        if (!rate) {
            return res.status(404).json({
                success: false,
                message: 'Rate not found.'
            });
        }

        res.json({
            success: true,
            data: { rate }
        });
    } catch (error) {
        console.error('[Rates] Get one error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch rate.'
        });
    }
};

/**
 * Create a new rate
 * POST /api/rates
 */
const createRate = async (req, res) => {
    try {
        const {
            section, itemCode, itemName, description,
            unit, materialType, rate, effectiveDate
        } = req.body;

        if (!section || !itemCode || !itemName || !unit || rate === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: section, itemCode, itemName, unit, rate'
            });
        }

        const newRate = await Rate.create({
            section,
            itemCode: itemCode.toUpperCase(),
            itemName,
            description: description || '',
            unit,
            materialType: (materialType || 'standard').toLowerCase(),
            rate: parseFloat(rate),
            effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
            source: 'manual',
            uploadedBy: req.userId || null
        });

        res.status(201).json({
            success: true,
            message: 'Rate created successfully.',
            data: { rate: newRate }
        });
    } catch (error) {
        console.error('[Rates] Create error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create rate.'
        });
    }
};

/**
 * Update a rate
 * PUT /api/rates/:id
 */
const updateRate = async (req, res) => {
    try {
        const { rate, itemName, description, materialType, unit, isActive } = req.body;

        const updates = {};
        if (rate !== undefined) updates.rate = parseFloat(rate);
        if (itemName) updates.itemName = itemName;
        if (description !== undefined) updates.description = description;
        if (materialType) updates.materialType = materialType.toLowerCase();
        if (unit) updates.unit = unit;
        if (isActive !== undefined) updates.isActive = isActive;

        const updatedRate = await Rate.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true }
        );

        if (!updatedRate) {
            return res.status(404).json({
                success: false,
                message: 'Rate not found.'
            });
        }

        res.json({
            success: true,
            message: 'Rate updated successfully.',
            data: { rate: updatedRate }
        });
    } catch (error) {
        console.error('[Rates] Update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update rate.'
        });
    }
};

/**
 * Upload rates from CSV
 * POST /api/rates/upload-csv
 * Expects multipart form with 'file' field containing CSV
 *
 * CSV columns: section,itemCode,itemName,description,unit,materialType,rate,effectiveDate
 */
const uploadCSV = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No CSV file uploaded.'
            });
        }

        const rows = [];

        await new Promise((resolve, reject) => {
            const stream = Readable.from(req.file.buffer.toString());
            stream
                .pipe(csv())
                .on('data', (row) => rows.push(row))
                .on('end', resolve)
                .on('error', reject);
        });

        if (rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'CSV file is empty or has no valid rows.'
            });
        }

        const result = await rateEngine.importFromCSV(rows, req.userId || null);

        res.json({
            success: true,
            message: `Imported ${result.imported} rates from CSV.`,
            data: result
        });
    } catch (error) {
        console.error('[Rates] CSV upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process CSV file.',
            details: error.message
        });
    }
};

/**
 * Get available sections with their item codes and material types
 * GET /api/rates/sections
 */
const getSections = async (req, res) => {
    try {
        const sections = await Rate.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: { section: '$section', itemCode: '$itemCode' },
                    itemName: { $first: '$itemName' },
                    unit: { $first: '$unit' },
                    materialTypes: { $addToSet: '$materialType' }
                }
            },
            {
                $group: {
                    _id: '$_id.section',
                    items: {
                        $push: {
                            itemCode: '$_id.itemCode',
                            itemName: '$itemName',
                            unit: '$unit',
                            materialTypes: '$materialTypes'
                        }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // If no rates in DB, return defaults from rate engine
        if (sections.length === 0) {
            const defaults = rateEngine.getAllDefaults();
            const fallbackSections = Object.entries(defaults).map(([key, items]) => ({
                _id: key,
                items: Object.entries(items).map(([code, data]) => ({
                    itemCode: code,
                    itemName: data.itemName,
                    unit: data.unit,
                    materialTypes: ['standard']
                }))
            }));

            return res.json({
                success: true,
                data: { sections: fallbackSections, source: 'defaults' }
            });
        }

        res.json({
            success: true,
            data: { sections, source: 'database' }
        });
    } catch (error) {
        console.error('[Rates] Sections error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sections.'
        });
    }
};

/**
 * Seed default rates into database
 * POST /api/rates/seed
 */
const seedRates = async (req, res) => {
    try {
        const result = await rateEngine.seedDefaultRates(req.userId || null);
        res.json({
            success: true,
            message: result.message,
            data: result
        });
    } catch (error) {
        console.error('[Rates] Seed error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to seed rates.'
        });
    }
};

module.exports = {
    getRates,
    getRate,
    createRate,
    updateRate,
    uploadCSV,
    getSections,
    seedRates
};

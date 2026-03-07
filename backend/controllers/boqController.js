/**
 * BOQ Report Controller
 * 
 * Handles CRUD operations for Bill of Quantities reports.
 */

const BOQReport = require('../models/BOQReport');
const Project = require('../models/Project');
const FloorPlan = require('../models/FloorPlan');
const boqGenerator = require('../services/boqGenerator');

/**
 * Get all BOQ reports for a project
 * GET /api/projects/:projectId/boq-reports
 */
const getProjectBOQReports = async (req, res) => {
    try {
        const { projectId } = req.params;

        // Verify project exists and belongs to user
        const project = await Project.findOne({ _id: projectId, owner: req.userId });
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found.'
            });
        }

        const reports = await BOQReport.find({ project: projectId })
            .populate('floorPlan', 'name floorNumber')
            .select('-items')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: { reports }
        });
    } catch (error) {
        console.error('[BOQ] Get reports error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch BOQ reports.'
        });
    }
};

/**
 * Get a single BOQ report with full details
 * GET /api/projects/:projectId/boq-reports/:id
 */
const getBOQReport = async (req, res) => {
    try {
        const { projectId, id } = req.params;

        // Verify project exists and belongs to user
        const project = await Project.findOne({ _id: projectId, owner: req.userId });
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found.'
            });
        }

        const report = await BOQReport.findOne({ _id: id, project: projectId })
            .populate('floorPlan', 'name floorNumber originalFilename')
            .populate('generatedBy', 'name email');

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'BOQ report not found.'
            });
        }

        res.json({
            success: true,
            data: { report }
        });
    } catch (error) {
        console.error('[BOQ] Get report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch BOQ report.'
        });
    }
};

/**
 * Update BOQ report status
 * PUT /api/projects/:projectId/boq-reports/:id
 */
const updateBOQReport = async (req, res) => {
    try {
        const { projectId, id } = req.params;
        const { status, finishType, notes } = req.body;

        // Verify project exists and belongs to user
        const project = await Project.findOne({ _id: projectId, owner: req.userId });
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found.'
            });
        }

        const updates = {};
        if (status) updates.status = status;
        if (finishType) updates.finishType = finishType;
        if (notes !== undefined) updates.notes = notes;

        const report = await BOQReport.findOneAndUpdate(
            { _id: id, project: projectId },
            { $set: updates },
            { new: true }
        );

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'BOQ report not found.'
            });
        }

        res.json({
            success: true,
            message: 'BOQ report updated successfully.',
            data: { report }
        });
    } catch (error) {
        console.error('[BOQ] Update report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update BOQ report.'
        });
    }
};

/**
 * Delete a BOQ report
 * DELETE /api/projects/:projectId/boq-reports/:id
 */
const deleteBOQReport = async (req, res) => {
    try {
        const { projectId, id } = req.params;

        // Verify project exists and belongs to user
        const project = await Project.findOne({ _id: projectId, owner: req.userId });
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found.'
            });
        }

        const report = await BOQReport.findOne({ _id: id, project: projectId });

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'BOQ report not found.'
            });
        }

        // Remove from project's boqReports array
        project.boqReports = project.boqReports.filter(
            reportId => reportId.toString() !== id
        );
        await project.save();

        // Delete report
        await BOQReport.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'BOQ report deleted successfully.'
        });
    } catch (error) {
        console.error('[BOQ] Delete report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete BOQ report.'
        });
    }
};

/**
 * Get BOQ summary for a project (aggregated from all reports)
 * GET /api/projects/:projectId/boq-summary
 */
const getProjectBOQSummary = async (req, res) => {
    try {
        const { projectId } = req.params;

        // Verify project exists and belongs to user
        const project = await Project.findOne({ _id: projectId, owner: req.userId });
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found.'
            });
        }

        const reports = await BOQReport.find({ project: projectId });

        const summary = {
            totalReports: reports.length,
            totalItems: 0,
            grandTotal: 0,
            byCategory: {},
            estimates: {
                basic: 0,
                standard: 0,
                premium: 0
            }
        };

        reports.forEach(report => {
            summary.totalItems += report.items.length;
            summary.grandTotal += report.summary.grandTotal;
            summary.estimates.basic += report.estimates.basic;
            summary.estimates.standard += report.estimates.standard;
            summary.estimates.premium += report.estimates.premium;

            report.items.forEach(item => {
                if (!summary.byCategory[item.category]) {
                    summary.byCategory[item.category] = {
                        quantity: 0,
                        totalCost: 0
                    };
                }
                summary.byCategory[item.category].quantity += item.quantity;
                summary.byCategory[item.category].totalCost += item.totalCost;
            });
        });

        res.json({
            success: true,
            data: {
                project: {
                    _id: project._id,
                    name: project.name
                },
                summary
            }
        });
    } catch (error) {
        console.error('[BOQ] Summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch BOQ summary.'
        });
    }
};

/**
 * Confirm user-reviewed detections
 * POST /api/detections/confirm
 *
 * Saves the user-reviewed/edited detection data to the FloorPlan record.
 * This is the bridge between ML detection and BOQ generation.
 */
const confirmDetections = async (req, res) => {
    try {
        const { floorPlanId, detections } = req.body;

        if (!detections) {
            return res.status(400).json({
                success: false,
                message: 'No detection data provided.'
            });
        }

        // Build the confirmed detections object
        const confirmedData = {
            isConfirmed: true,
            confirmedAt: new Date(),
            confirmedBy: req.userId || null,
            walls: {
                totalLengthM: detections.walls?.totalLengthM || 0,
                grossArea: detections.walls?.grossAreaM2 || detections.walls?.grossArea || 0,
                netArea: detections.walls?.netAreaM2 || detections.walls?.netArea || 0,
                heightM: detections.walls?.heightM || 2.7
            },
            doors: (detections.doors || []).map((d, i) => ({
                id: d.id || `d${i + 1}`,
                type: d.type || 'wooden',
                width: d.width || 0.9,
                height: d.height || 2.1,
                materialType: d.materialType || 'standard',
                status: d.status || 'approved'
            })),
            windows: (detections.windows || []).map((w, i) => ({
                id: w.id || `w${i + 1}`,
                type: w.type || 'aluminium',
                width: w.width || 1.2,
                height: w.height || 1.0,
                materialType: w.materialType || 'standard',
                status: w.status || 'approved'
            })),
            rooms: (detections.rooms || []).map((r, i) => ({
                id: r.id || `r${i + 1}`,
                type: r.type || 'unknown',
                area: r.area || r.area_m2 || 0,
                flooringMaterial: r.flooringMaterial || 'ceramic_tile',
                ceilingType: r.ceilingType || 'plain'
            })),
            additionalInputs: detections.additionalInputs || {}
        };

        // If a floorPlanId is provided, save to database
        if (floorPlanId) {
            const floorPlan = await FloorPlan.findByIdAndUpdate(
                floorPlanId,
                {
                    $set: {
                        confirmedDetections: confirmedData,
                        status: 'confirmed'
                    }
                },
                { new: true }
            );

            if (!floorPlan) {
                return res.status(404).json({
                    success: false,
                    message: 'Floor plan not found.'
                });
            }
        }

        res.json({
            success: true,
            message: 'Detections confirmed and saved.',
            data: {
                confirmedAt: confirmedData.confirmedAt,
                summary: {
                    wallNetArea: confirmedData.walls.netArea,
                    wallHeight: confirmedData.walls.heightM,
                    doors: confirmedData.doors.filter(d => d.status !== 'deleted').length,
                    windows: confirmedData.windows.filter(w => w.status !== 'deleted').length,
                    rooms: confirmedData.rooms.length,
                    totalFloorArea: confirmedData.rooms.reduce((s, r) => s + (r.area || 0), 0),
                    hasAdditionalInputs: Object.keys(confirmedData.additionalInputs).length > 0
                },
                confirmedDetections: confirmedData
            }
        });
    } catch (error) {
        console.error('[BOQ] Confirm detections error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to confirm detections.',
            details: error.message
        });
    }
};

/**
 * Generate a full BOQ from confirmed detections
 * POST /api/boq/generate
 *
 * Uses the Rate Engine for dynamic pricing and BOQ Generator
 * to build all 6 measured work sections (A–F).
 */
const generateBOQFromDetections = async (req, res) => {
    try {
        const {
            confirmedDetections,
            materialSelections = {},
            rateDate,
            projectId,
            floorPlanId,
            title
        } = req.body;

        if (!confirmedDetections) {
            return res.status(400).json({
                success: false,
                message: 'No confirmed detections provided. Confirm detections first.'
            });
        }

        const effectiveRateDate = rateDate ? new Date(rateDate) : new Date();

        console.log('[BOQ] Generating full BOQ with dynamic rates...');

        // Generate BOQ using the generator service
        const boqResult = await boqGenerator.generateBOQ(
            confirmedDetections,
            materialSelections,
            effectiveRateDate
        );

        console.log(`[BOQ] Generated ${boqResult.sections.length} sections, ` +
            `grand total: LKR ${boqResult.summary.grandTotal.toLocaleString()}`);

        // If project + floorPlan IDs given, persist to database
        let savedReport = null;
        if (projectId && floorPlanId) {
            // Flatten all section items into a single items array for DB
            const allItems = [];
            boqResult.sections.forEach(section => {
                section.items.forEach(item => allItems.push(item));
            });

            const boqReport = new BOQReport({
                project: projectId,
                floorPlan: floorPlanId,
                generatedBy: req.userId || null,
                title: title || `BOQ - ${new Date().toISOString().slice(0, 10)}`,
                description: 'Generated from confirmed detections with dynamic rates',
                items: allItems,
                summary: {
                    sectionSubtotals: boqResult.summary.sectionSubtotals,
                    totalMLDetectedCost: 0,
                    totalManualInputCost: 0,
                    subtotal: boqResult.summary.subtotal,
                    contingencyPercent: boqResult.summary.contingencyPercent,
                    contingencyAmount: boqResult.summary.contingencyAmount,
                    overheadPercent: boqResult.summary.overheadPercent,
                    overheadAmount: boqResult.summary.overheadAmount,
                    profitPercent: boqResult.summary.profitPercent,
                    profitAmount: boqResult.summary.profitAmount,
                    grandTotal: boqResult.summary.grandTotal,
                    rateDate: effectiveRateDate,
                    currency: 'LKR'
                },
                status: 'draft'
            });

            savedReport = await boqReport.save();

            // Update floor plan status
            await FloorPlan.findByIdAndUpdate(floorPlanId, {
                status: 'boq_generated'
            });

            // Link to project if possible
            try {
                await Project.findByIdAndUpdate(projectId, {
                    $addToSet: { boqReports: savedReport._id }
                });
            } catch (linkErr) {
                console.warn('[BOQ] Could not link to project:', linkErr.message);
            }

            console.log(`[BOQ] Saved report: ${savedReport.reportNumber}`);
        }

        res.json({
            success: true,
            message: 'BOQ generated successfully.',
            data: {
                boqReport: {
                    _id: savedReport?._id || null,
                    reportNumber: savedReport?.reportNumber || null,
                    sections: boqResult.sections,
                    summary: boqResult.summary,
                    itemCount: boqResult.sections.reduce((s, sec) => s + sec.items.length, 0)
                }
            }
        });
    } catch (error) {
        console.error('[BOQ] Generate error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate BOQ.',
            details: error.message
        });
    }
};

module.exports = {
    getProjectBOQReports,
    getBOQReport,
    updateBOQReport,
    deleteBOQReport,
    getProjectBOQSummary,
    confirmDetections,
    generateBOQFromDetections
};

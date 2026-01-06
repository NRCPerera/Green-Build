/**
 * BOQ Report Controller
 * 
 * Handles CRUD operations for Bill of Quantities reports.
 */

const BOQReport = require('../models/BOQReport');
const Project = require('../models/Project');
const FloorPlan = require('../models/FloorPlan');

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

module.exports = {
    getProjectBOQReports,
    getBOQReport,
    updateBOQReport,
    deleteBOQReport,
    getProjectBOQSummary
};

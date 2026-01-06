/**
 * BOQ Report Routes
 * 
 * API endpoints for BOQ report management within projects.
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const boqController = require('../controllers/boqController');
const { authenticate } = require('../middleware/authMiddleware');

// All BOQ routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/projects/:projectId/boq-reports
 * @desc    Get all BOQ reports for a project
 * @access  Private
 */
router.get('/', boqController.getProjectBOQReports);

/**
 * @route   GET /api/projects/:projectId/boq-reports/:id
 * @desc    Get a single BOQ report with full details
 * @access  Private
 */
router.get('/:id', boqController.getBOQReport);

/**
 * @route   PUT /api/projects/:projectId/boq-reports/:id
 * @desc    Update BOQ report status/details
 * @access  Private
 */
router.put('/:id', boqController.updateBOQReport);

/**
 * @route   DELETE /api/projects/:projectId/boq-reports/:id
 * @desc    Delete a BOQ report
 * @access  Private
 */
router.delete('/:id', boqController.deleteBOQReport);

module.exports = router;

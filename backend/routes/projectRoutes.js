/**
 * Project Routes
 * 
 * API endpoints for project management.
 * All routes require authentication.
 */

const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authenticate } = require('../middleware/authMiddleware');

// All project routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/projects
 * @desc    Create a new project
 * @access  Private
 */
router.post('/', projectController.createProject);

/**
 * @route   GET /api/projects
 * @desc    Get all projects for authenticated user
 * @access  Private
 */
router.get('/', projectController.getProjects);

/**
 * @route   GET /api/projects/:id
 * @desc    Get a single project by ID
 * @access  Private
 */
router.get('/:id', projectController.getProject);

/**
 * @route   PUT /api/projects/:id
 * @desc    Update a project
 * @access  Private
 */
router.put('/:id', projectController.updateProject);

/**
 * @route   DELETE /api/projects/:id
 * @desc    Delete a project and associated data
 * @access  Private
 */
router.delete('/:id', projectController.deleteProject);

/**
 * @route   GET /api/projects/:id/summary
 * @desc    Get project summary statistics
 * @access  Private
 */
router.get('/:id/summary', projectController.getProjectSummary);

module.exports = router;

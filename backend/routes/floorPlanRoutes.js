/**
 * Floor Plan Routes
 * 
 * API endpoints for floor plan management within projects.
 * All routes require authentication and are nested under projects.
 */

const express = require('express');
const router = express.Router({ mergeParams: true }); // Enable access to parent route params
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const floorPlanController = require('../controllers/floorPlanController');
const { authenticate } = require('../middleware/authMiddleware');

// Configure multer for floor plan uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueName = `plan_${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

// All floor plan routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/projects/:projectId/floorplans
 * @desc    Upload and analyze a new floor plan
 * @access  Private
 */
router.post('/', upload.single('floorPlan'), floorPlanController.uploadFloorPlan);

/**
 * @route   GET /api/projects/:projectId/floorplans
 * @desc    Get all floor plans for a project
 * @access  Private
 */
router.get('/', floorPlanController.getFloorPlans);

/**
 * @route   GET /api/projects/:projectId/floorplans/:id
 * @desc    Get a single floor plan with full details
 * @access  Private
 */
router.get('/:id', floorPlanController.getFloorPlan);

/**
 * @route   PUT /api/projects/:projectId/floorplans/:id
 * @desc    Update floor plan details
 * @access  Private
 */
router.put('/:id', floorPlanController.updateFloorPlan);

/**
 * @route   DELETE /api/projects/:projectId/floorplans/:id
 * @desc    Delete a floor plan
 * @access  Private
 */
router.delete('/:id', floorPlanController.deleteFloorPlan);

/**
 * @route   POST /api/projects/:projectId/floorplans/:id/reanalyze
 * @desc    Re-analyze a floor plan with new parameters
 * @access  Private
 */
router.post('/:id/reanalyze', floorPlanController.reanalyzeFloorPlan);

module.exports = router;

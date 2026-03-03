/**
 * Upload Routes
 * 
 * Defines routes for floor plan upload, detection confirmation,
 * BOQ generation, and 3D geometry operations.
 */

const express = require('express');
const router = express.Router();
const { upload } = require('../models/fileModel');
const uploadController = require('../controllers/uploadController');
const boqController = require('../controllers/boqController');

// Floor plan upload and ML detection endpoint
// Returns detections for user review (no cost calculation)
router.post('/api/upload-plan', upload.single('image'), uploadController.processFloorPlan);

// Confirm user-reviewed detections
// Saves the edited detection data before BOQ generation
router.post('/api/detections/confirm', boqController.confirmDetections);

// Generate full BOQ from confirmed detections using dynamic rates
router.post('/api/boq/generate', boqController.generateBOQFromDetections);

// Generate 3D geometry from floor plan for Three.js visualization
router.post('/api/generate-3d-geometry', upload.single('image'), uploadController.generate3DGeometry);

module.exports = router;

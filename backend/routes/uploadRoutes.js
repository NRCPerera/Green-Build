/**
 * Upload Routes
 * 
 * Defines routes for file upload and processing operations.
 */

const express = require('express');
const router = express.Router();
const { upload } = require('../models/fileModel');
const uploadController = require('../controllers/uploadController');

// Floor plan upload and processing endpoint
// Accepts multipart form data with image file, scale, and wall height
router.post('/api/upload-plan', upload.single('image'), uploadController.processFloorPlan);

module.exports = router;

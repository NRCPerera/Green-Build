/**
 * Rate Routes
 *
 * API routes for construction rate management.
 * Includes CRUD, CSV import, and section listing.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const rateController = require('../controllers/rateController');

// Multer for CSV upload (memory storage — small files)
const csvUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'), false);
        }
    }
});

// List all available sections with items and material types
router.get('/api/rates/sections', rateController.getSections);

// Seed default rates into database
router.post('/api/rates/seed', rateController.seedRates);

// Upload rates from CSV file
router.post('/api/rates/upload-csv', csvUpload.single('file'), rateController.uploadCSV);

// CRUD for individual rates
router.get('/api/rates', rateController.getRates);
router.get('/api/rates/:id', rateController.getRate);
router.post('/api/rates', rateController.createRate);
router.put('/api/rates/:id', rateController.updateRate);

module.exports = router;

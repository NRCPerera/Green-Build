/**
 * Green Build Backend Server
 * ==========================
 * Express API gateway for Construction Estimation App.
 * Handles file uploads and communicates with Python ML engine.
 * 
 * @author Senior Backend Developer
 * @version 1.0.0
 */

const express = require('express');
const multer = require('multer');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

// Load environment variables
require('dotenv').config();

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
    PORT: process.env.PORT || 5000,
    PYTHON_SERVICE_URL: process.env.PYTHON_SERVICE_URL || 'http://localhost:8000',
    UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB max file size
    ALLOWED_MIMETYPES: [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/tiff',
        'image/bmp'
    ],
    // Cost estimation rates (per square meter)
    COST_RATES: {
        WALL_PAINT_RATE: 15.00,      // $/m² - Basic wall painting
        WALL_PLASTER_RATE: 25.00,    // $/m² - Plastering
        WALL_TILING_RATE: 45.00,     // $/m² - Wall tiling
        DOOR_UNIT_COST: 350.00,      // $ per door
        WINDOW_UNIT_COST: 250.00     // $ per window
    }
};

// ============================================================================
// Express App Setup
// ============================================================================

const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); // Request logging

// Ensure uploads directory exists
if (!fs.existsSync(CONFIG.UPLOAD_DIR)) {
    fs.mkdirSync(CONFIG.UPLOAD_DIR, { recursive: true });
    console.log(`📁 Created uploads directory: ${CONFIG.UPLOAD_DIR}`);
}

// ============================================================================
// Multer Configuration (File Upload Handling)
// ============================================================================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, CONFIG.UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with original extension
        const uniqueId = uuidv4();
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = `plan_${uniqueId}${ext}`;
        cb(null, filename);
    }
});

const fileFilter = (req, file, cb) => {
    if (CONFIG.ALLOWED_MIMETYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${CONFIG.ALLOWED_MIMETYPES.join(', ')}`), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: CONFIG.MAX_FILE_SIZE
    }
});

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Delete a file from the filesystem
 * @param {string} filePath - Path to the file to delete
 */
const deleteFile = async (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
            console.log(`🗑️  Cleaned up temp file: ${filePath}`);
        }
    } catch (error) {
        console.error(`⚠️  Failed to delete temp file: ${filePath}`, error.message);
    }
};

/**
 * Calculate estimated costs from quantity data
 * @param {Object} quantities - Quantity takeoff data from Python service
 * @returns {Object} Cost breakdown
 */
const calculateCosts = (quantities) => {
    const { COST_RATES } = CONFIG;

    const netArea = quantities.wall_net_surface_area_m2 || 0;
    const doors = quantities.item_counts?.doors || 0;
    const windows = quantities.item_counts?.windows || 0;

    // Calculate individual costs
    const wallPaintCost = netArea * COST_RATES.WALL_PAINT_RATE;
    const wallPlasterCost = netArea * COST_RATES.WALL_PLASTER_RATE;
    const wallTilingCost = netArea * COST_RATES.WALL_TILING_RATE;
    const doorsCost = doors * COST_RATES.DOOR_UNIT_COST;
    const windowsCost = windows * COST_RATES.WINDOW_UNIT_COST;

    // Basic estimate uses paint rate
    const basicEstimate = wallPaintCost + doorsCost + windowsCost;

    return {
        rates_used: {
            wall_paint_rate_per_m2: COST_RATES.WALL_PAINT_RATE,
            wall_plaster_rate_per_m2: COST_RATES.WALL_PLASTER_RATE,
            wall_tiling_rate_per_m2: COST_RATES.WALL_TILING_RATE,
            door_unit_cost: COST_RATES.DOOR_UNIT_COST,
            window_unit_cost: COST_RATES.WINDOW_UNIT_COST
        },
        breakdown: {
            wall_paint_cost: parseFloat(wallPaintCost.toFixed(2)),
            wall_plaster_cost: parseFloat(wallPlasterCost.toFixed(2)),
            wall_tiling_cost: parseFloat(wallTilingCost.toFixed(2)),
            doors_cost: parseFloat(doorsCost.toFixed(2)),
            windows_cost: parseFloat(windowsCost.toFixed(2))
        },
        estimates: {
            basic_finish: parseFloat(basicEstimate.toFixed(2)),
            standard_finish: parseFloat((wallPlasterCost + doorsCost + windowsCost).toFixed(2)),
            premium_finish: parseFloat((wallTilingCost + doorsCost + windowsCost).toFixed(2))
        },
        currency: 'USD'
    };
};

/**
 * Forward file to Python ML service
 * @param {string} filePath - Path to the uploaded file
 * @param {number} scale - Pixels per meter scale
 * @param {number} wallHeight - Wall height in meters
 * @returns {Promise<Object>} Response from Python service
 */
const callPythonService = async (filePath, scale, wallHeight) => {
    const formData = new FormData();

    // Append file
    formData.append('file', fs.createReadStream(filePath));
    formData.append('scale_ppm', scale.toString());
    formData.append('wall_height', wallHeight.toString());

    const response = await axios.post(
        `${CONFIG.PYTHON_SERVICE_URL}/calculate-quantities`,
        formData,
        {
            headers: {
                ...formData.getHeaders()
            },
            timeout: 60000, // 60 second timeout for ML inference
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        }
    );

    return response.data;
};

// ============================================================================
// API Routes
// ============================================================================

/**
 * Health Check Endpoint
 */
app.get('/api/health', async (req, res) => {
    let pythonServiceStatus = 'unknown';

    try {
        const response = await axios.get(`${CONFIG.PYTHON_SERVICE_URL}/health`, {
            timeout: 5000
        });
        pythonServiceStatus = response.data.status || 'healthy';
    } catch (error) {
        pythonServiceStatus = 'unavailable';
    }

    res.json({
        status: 'healthy',
        service: 'Green Build Backend',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        python_ml_service: pythonServiceStatus,
        python_service_url: CONFIG.PYTHON_SERVICE_URL
    });
});

/**
 * Root Endpoint
 */
app.get('/', (req, res) => {
    res.json({
        message: 'Green Build Construction Estimation API',
        version: '1.0.0',
        endpoints: {
            health: 'GET /api/health',
            upload: 'POST /api/upload-plan'
        }
    });
});

/**
 * Main Upload & Process Endpoint
 * 
 * Accepts: multipart/form-data
 * - image: File (required) - Construction plan image
 * - scale: Number (required) - Pixels per meter
 * - wallHeight: Number (required) - Wall height in meters
 * 
 * Returns: Combined quantities and cost estimation
 */
app.post('/api/upload-plan', upload.single('image'), async (req, res) => {
    const startTime = Date.now();
    let uploadedFilePath = null;

    try {
        // ----------------------------------------------------------------
        // Validate Request
        // ----------------------------------------------------------------

        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No image file provided',
                message: 'Please upload a construction plan image (JPEG, PNG, TIFF, or BMP)'
            });
        }

        uploadedFilePath = req.file.path;
        console.log(`📤 Received file: ${req.file.originalname} (${(req.file.size / 1024).toFixed(2)} KB)`);

        // Parse and validate scale
        const scale = parseFloat(req.body.scale);
        if (isNaN(scale) || scale <= 0) {
            await deleteFile(uploadedFilePath);
            return res.status(400).json({
                success: false,
                error: 'Invalid scale value',
                message: 'Scale must be a positive number representing pixels per meter'
            });
        }

        // Parse and validate wall height
        const wallHeight = parseFloat(req.body.wallHeight);
        if (isNaN(wallHeight) || wallHeight <= 0) {
            await deleteFile(uploadedFilePath);
            return res.status(400).json({
                success: false,
                error: 'Invalid wall height',
                message: 'Wall height must be a positive number in meters'
            });
        }

        console.log(`📊 Parameters: Scale=${scale} ppm, Wall Height=${wallHeight}m`);

        // ----------------------------------------------------------------
        // Call Python ML Service
        // ----------------------------------------------------------------

        console.log('🔄 Forwarding to Python ML service...');

        let quantities;
        try {
            quantities = await callPythonService(uploadedFilePath, scale, wallHeight);
            console.log('✅ Received quantities from Python service');
        } catch (pythonError) {
            console.error('❌ Python service error:', pythonError.message);

            // Handle specific error types
            if (pythonError.code === 'ECONNREFUSED') {
                await deleteFile(uploadedFilePath);
                return res.status(503).json({
                    success: false,
                    error: 'ML service unavailable',
                    message: 'The Python ML processing service is not running. Please ensure it is started on port 8000.',
                    details: {
                        service_url: CONFIG.PYTHON_SERVICE_URL,
                        error_code: 'ML_SERVICE_DOWN'
                    }
                });
            }

            if (pythonError.response) {
                // Python service returned an error
                await deleteFile(uploadedFilePath);
                return res.status(pythonError.response.status || 500).json({
                    success: false,
                    error: 'ML processing failed',
                    message: pythonError.response.data?.detail || 'Error processing the image',
                    details: pythonError.response.data
                });
            }

            if (pythonError.code === 'ETIMEDOUT' || pythonError.code === 'ECONNABORTED') {
                await deleteFile(uploadedFilePath);
                return res.status(504).json({
                    success: false,
                    error: 'ML service timeout',
                    message: 'The ML processing took too long. Try with a smaller image or simpler drawing.',
                    details: {
                        timeout_ms: 60000,
                        error_code: 'ML_SERVICE_TIMEOUT'
                    }
                });
            }

            throw pythonError;
        }

        // ----------------------------------------------------------------
        // Calculate Costs
        // ----------------------------------------------------------------

        console.log('💰 Calculating cost estimates...');
        const costs = calculateCosts(quantities);

        // ----------------------------------------------------------------
        // Build Response
        // ----------------------------------------------------------------

        const processingTime = Date.now() - startTime;

        const response = {
            success: true,
            message: 'Quantity takeoff and cost estimation completed successfully',
            data: {
                quantities: {
                    wall_total_length_m: quantities.wall_total_length_m,
                    wall_gross_surface_area_m2: quantities.wall_gross_surface_area_m2,
                    deductions_area_m2: quantities.deductions_area_m2,
                    wall_net_surface_area_m2: quantities.wall_net_surface_area_m2,
                    item_counts: quantities.item_counts
                },
                costs: costs,
                input_parameters: {
                    scale_ppm: scale,
                    wall_height_m: wallHeight,
                    original_filename: req.file.originalname,
                    file_size_kb: parseFloat((req.file.size / 1024).toFixed(2))
                }
            },
            meta: {
                processing_time_ms: processingTime,
                timestamp: new Date().toISOString()
            }
        };

        console.log(`✨ Request completed in ${processingTime}ms`);

        // Clean up temp file
        await deleteFile(uploadedFilePath);

        res.json(response);

    } catch (error) {
        console.error('❌ Unexpected error:', error);

        // Clean up temp file on error
        if (uploadedFilePath) {
            await deleteFile(uploadedFilePath);
        }

        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'An unexpected error occurred while processing your request',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ============================================================================
// Error Handling Middleware
// ============================================================================

// Handle Multer errors
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large',
                message: `Maximum file size is ${CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`
            });
        }
        return res.status(400).json({
            success: false,
            error: 'File upload error',
            message: error.message
        });
    }

    if (error.message && error.message.includes('Invalid file type')) {
        return res.status(400).json({
            success: false,
            error: 'Invalid file type',
            message: error.message
        });
    }

    next(error);
});

// Handle 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not found',
        message: `Route ${req.method} ${req.path} not found`
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred'
    });
});

// ============================================================================
// Server Startup
// ============================================================================

app.listen(CONFIG.PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║         🏗️  Green Build Backend Server Started  🏗️            ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║  🌐 Server:      http://localhost:${CONFIG.PORT}                      ║`);
    console.log(`║  🐍 ML Service:  ${CONFIG.PYTHON_SERVICE_URL}                   ║`);
    console.log(`║  📁 Uploads:     ${CONFIG.UPLOAD_DIR}                               ║`);
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║  Endpoints:                                                  ║');
    console.log('║    GET  /              - API info                            ║');
    console.log('║    GET  /api/health    - Health check                        ║');
    console.log('║    POST /api/upload-plan - Upload & process plan             ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
});

module.exports = app;

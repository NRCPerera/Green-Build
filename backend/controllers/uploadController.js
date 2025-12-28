/**
 * Upload Controller
 * 
 * Handles file upload and processing requests for construction plan analysis.
 * Coordinates between the file model, Python service, and cost model.
 */

const { deleteFile } = require('../models/fileModel');
const { calculateCosts } = require('../models/costModel');
const pythonService = require('../services/pythonService');
const config = require('../config');

/**
 * Processes an uploaded floor plan image and returns quantity takeoff with cost estimates.
 * This is the main endpoint for the application's core functionality.
 * 
 * The processing flow:
 * 1. Validate the uploaded file and input parameters
 * 2. Send the image to the Python ML service for analysis
 * 3. Calculate costs based on the extracted quantities
 * 4. Return the combined results to the client
 * 
 * @param {Object} req - Express request object with uploaded file and form data
 * @param {Object} res - Express response object
 */
const processFloorPlan = async (req, res) => {
    const startTime = Date.now();
    let uploadedFilePath = null;

    try {
        // Validate that a file was included in the request
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No image file provided',
                message: 'Please upload a construction plan image (JPEG, PNG, TIFF, or BMP)'
            });
        }

        uploadedFilePath = req.file.path;
        const fileSizeKb = (req.file.size / 1024).toFixed(2);
        console.log(`[Upload] Received file: ${req.file.originalname} (${fileSizeKb} KB)`);

        // Parse and validate the scale parameter
        const scale = parseFloat(req.body.scale);
        if (isNaN(scale) || scale <= 0) {
            await deleteFile(uploadedFilePath);
            return res.status(400).json({
                success: false,
                error: 'Invalid scale value',
                message: 'Scale must be a positive number representing pixels per meter'
            });
        }

        // Parse and validate the wall height parameter
        const wallHeight = parseFloat(req.body.wallHeight);
        if (isNaN(wallHeight) || wallHeight <= 0) {
            await deleteFile(uploadedFilePath);
            return res.status(400).json({
                success: false,
                error: 'Invalid wall height',
                message: 'Wall height must be a positive number in meters'
            });
        }

        console.log(`[Upload] Parameters: Scale=${scale} ppm, Wall Height=${wallHeight}m`);

        // Send the image to the Python ML service for quantity extraction
        console.log('[Upload] Sending to Python ML service for analysis...');

        let quantities;
        try {
            quantities = await pythonService.calculateQuantities(uploadedFilePath, scale, wallHeight);
            console.log('[Upload] Successfully received quantities from ML service');
        } catch (pythonError) {
            console.error('[Upload] Python service error:', pythonError.message);

            // Handle connection refused errors when the ML service is not running
            if (pythonError.code === 'ECONNREFUSED') {
                await deleteFile(uploadedFilePath);
                return res.status(503).json({
                    success: false,
                    error: 'ML service unavailable',
                    message: 'The Python ML processing service is not running. Please ensure it is started on port 8000.',
                    details: {
                        service_url: config.pythonServiceUrl,
                        error_code: 'ML_SERVICE_DOWN'
                    }
                });
            }

            // Handle errors returned by the Python service itself
            if (pythonError.response) {
                await deleteFile(uploadedFilePath);
                return res.status(pythonError.response.status || 500).json({
                    success: false,
                    error: 'ML processing failed',
                    message: pythonError.response.data?.detail || 'Error processing the image',
                    details: pythonError.response.data
                });
            }

            // Handle timeout errors for complex images
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

        // Calculate costs based on the extracted quantities
        console.log('[Upload] Calculating cost estimates...');
        const costs = calculateCosts(quantities);

        // Build the response payload
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
                    file_size_kb: parseFloat(fileSizeKb)
                }
            },
            meta: {
                processing_time_ms: processingTime,
                timestamp: new Date().toISOString()
            }
        };

        console.log(`[Upload] Request completed in ${processingTime}ms`);

        // Clean up the temporary file after successful processing
        await deleteFile(uploadedFilePath);

        res.json(response);

    } catch (error) {
        console.error('[Upload] Unexpected error:', error);

        // Always clean up temporary files when an error occurs
        if (uploadedFilePath) {
            await deleteFile(uploadedFilePath);
        }

        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'An unexpected error occurred while processing your request',
            details: config.nodeEnv === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    processFloorPlan
};

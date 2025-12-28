/**
 * Error Handling Middleware
 * 
 * Centralized error handling for the Express application.
 * Catches and processes different types of errors with appropriate responses.
 */

const multer = require('multer');
const config = require('../config');
const { errorResponse, notFoundError, serverError } = require('../views/errorView');

/**
 * Handles Multer-specific errors from file uploads.
 * These include file size limits and invalid file types.
 * 
 * @param {Error} error - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const multerErrorHandler = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            const maxSizeMb = config.maxFileSize / (1024 * 1024);
            return res.status(400).json(
                errorResponse('File too large', `Maximum file size is ${maxSizeMb}MB`)
            );
        }
        return res.status(400).json(
            errorResponse('File upload error', error.message)
        );
    }

    // Handle custom file type validation errors
    if (error.message && error.message.includes('Invalid file type')) {
        return res.status(400).json(
            errorResponse('Invalid file type', error.message)
        );
    }

    next(error);
};

/**
 * Handles 404 errors for undefined routes.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const notFoundHandler = (req, res) => {
    res.status(404).json(notFoundError(req.method, req.path));
};

/**
 * Global error handler for uncaught exceptions in routes.
 * Logs the error and returns a generic error response.
 * 
 * @param {Error} error - The caught error
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const globalErrorHandler = (error, req, res, next) => {
    console.error('[Error Handler] Unhandled error:', error);
    const isDevelopment = config.nodeEnv === 'development';
    res.status(500).json(serverError(error, isDevelopment));
};

module.exports = {
    multerErrorHandler,
    notFoundHandler,
    globalErrorHandler
};

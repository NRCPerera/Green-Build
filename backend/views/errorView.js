/**
 * Error Response Views
 * 
 * This module provides standardized error response templates.
 * Using consistent error structures makes client-side error handling easier.
 */

/**
 * Creates a standardized error response object.
 * 
 * @param {string} error - Short error identifier
 * @param {string} message - Human-readable error message
 * @param {Object} details - Optional additional error details
 * @returns {Object} Formatted error response
 */
const errorResponse = (error, message, details = null) => {
    const response = {
        success: false,
        error: error,
        message: message
    };

    if (details) {
        response.details = details;
    }

    return response;
};

/**
 * Creates a response for file validation errors.
 * 
 * @param {string} message - Specific validation failure message
 * @returns {Object} Formatted validation error response
 */
const validationError = (message) => {
    return errorResponse('Validation failed', message);
};

/**
 * Creates a response for not found errors.
 * 
 * @param {string} method - HTTP method used
 * @param {string} path - Requested path
 * @returns {Object} Formatted not found response
 */
const notFoundError = (method, path) => {
    return errorResponse('Not found', `Route ${method} ${path} not found`);
};

/**
 * Creates a response for internal server errors.
 * In development mode, includes the actual error message.
 * 
 * @param {Error} error - The caught error object
 * @param {boolean} isDevelopment - Whether running in development mode
 * @returns {Object} Formatted server error response
 */
const serverError = (error, isDevelopment = false) => {
    return errorResponse(
        'Internal server error',
        'An unexpected error occurred',
        isDevelopment ? error.message : undefined
    );
};

module.exports = {
    errorResponse,
    validationError,
    notFoundError,
    serverError
};

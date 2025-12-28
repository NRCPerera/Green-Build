/**
 * File Handling Model
 * 
 * This module manages file operations including upload configuration,
 * file validation, and cleanup operations.
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

/**
 * Sets up the upload directory if it does not exist.
 * This is called during module initialization to ensure the directory is ready.
 */
const ensureUploadDirectory = () => {
    if (!fs.existsSync(config.uploadDir)) {
        fs.mkdirSync(config.uploadDir, { recursive: true });
        console.log(`[File Model] Created uploads directory: ${config.uploadDir}`);
    }
};

// Initialize the upload directory when this module loads
ensureUploadDirectory();

/**
 * Multer storage configuration.
 * Files are stored with a unique identifier prefix to prevent naming conflicts.
 */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, config.uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate a unique filename while preserving the original extension
        const uniqueId = uuidv4();
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = `plan_${uniqueId}${ext}`;
        cb(null, filename);
    }
});

/**
 * File filter function for multer.
 * Only allows image files with specific MIME types.
 * 
 * @param {Object} req - Express request object
 * @param {Object} file - Uploaded file metadata
 * @param {Function} cb - Callback function
 */
const fileFilter = (req, file, cb) => {
    if (config.allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        const errorMessage = `Invalid file type: ${file.mimetype}. Allowed types: ${config.allowedMimeTypes.join(', ')}`;
        cb(new Error(errorMessage), false);
    }
};

/**
 * Configured multer upload instance.
 * Handles single file uploads with size limits and type validation.
 */
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: config.maxFileSize
    }
});

/**
 * Deletes a file from the filesystem.
 * Used for cleanup after processing or when errors occur.
 * 
 * @param {string} filePath - Absolute or relative path to the file
 * @returns {Promise<void>}
 */
const deleteFile = async (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
            console.log(`[File Model] Removed temporary file: ${filePath}`);
        }
    } catch (error) {
        console.error(`[File Model] Failed to delete file: ${filePath}`, error.message);
    }
};

module.exports = {
    upload,
    deleteFile,
    ensureUploadDirectory
};

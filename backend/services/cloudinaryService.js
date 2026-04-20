/**
 * Cloudinary Service
 * 
 * Handles image uploads and deletions via Cloudinary.
 * Used for persistent cloud storage of floor plan images
 * instead of local disk storage.
 */

const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const config = require('../config');

// Configure Cloudinary with credentials from environment variables
cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret
});

/**
 * Uploads an image file to Cloudinary.
 * 
 * @param {string} filePath - Local path to the file to upload
 * @param {Object} [options={}] - Additional upload options
 * @param {string} [options.folder] - Cloudinary folder to store in
 * @param {string} [options.publicId] - Custom public ID for the image
 * @returns {Promise<Object>} Cloudinary upload result with url, public_id, etc.
 * @throws {Error} If the upload fails
 */
const uploadImage = async (filePath, options = {}) => {
    try {
        const uploadOptions = {
            folder: options.folder || config.cloudinary.folder,
            resource_type: 'image',
            use_filename: true,
            unique_filename: true,
            overwrite: false,
            // Optimize for floor plan images
            quality: 'auto:best',
            fetch_format: 'auto',
            ...options
        };

        // Remove keys we handle specially
        delete uploadOptions.publicId;
        if (options.publicId) {
            uploadOptions.public_id = options.publicId;
        }

        console.log(`[Cloudinary] Uploading image: ${filePath}`);
        const result = await cloudinary.uploader.upload(filePath, uploadOptions);

        console.log(`[Cloudinary] Upload successful: ${result.public_id} (${(result.bytes / 1024).toFixed(2)} KB)`);

        return {
            publicId: result.public_id,
            url: result.secure_url,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
            resourceType: result.resource_type,
            createdAt: result.created_at
        };
    } catch (error) {
        console.error('[Cloudinary] Upload failed:', error.message);
        throw new Error(`Cloudinary upload failed: ${error.message}`);
    }
};

/**
 * Deletes an image from Cloudinary by its public ID.
 * 
 * @param {string} publicId - The Cloudinary public ID of the image
 * @returns {Promise<Object>} Deletion result
 */
const deleteImage = async (publicId) => {
    try {
        if (!publicId) {
            console.warn('[Cloudinary] No public ID provided for deletion');
            return { result: 'not_found' };
        }

        console.log(`[Cloudinary] Deleting image: ${publicId}`);
        const result = await cloudinary.uploader.destroy(publicId);

        console.log(`[Cloudinary] Delete result: ${result.result}`);
        return result;
    } catch (error) {
        console.error('[Cloudinary] Delete failed:', error.message);
        throw new Error(`Cloudinary delete failed: ${error.message}`);
    }
};

/**
 * Uploads a file to Cloudinary and removes the local temporary file afterward.
 * This is the primary method used during floor plan upload workflows.
 * 
 * @param {string} filePath - Local path to the temporary file
 * @param {Object} [options={}] - Additional upload options
 * @returns {Promise<Object>} Cloudinary upload result
 */
const uploadAndCleanup = async (filePath, options = {}) => {
    try {
        const result = await uploadImage(filePath, options);

        // Remove the local temporary file
        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
            console.log(`[Cloudinary] Cleaned up temp file: ${filePath}`);
        }

        return result;
    } catch (error) {
        // Still try to clean up the temp file even if upload fails
        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
            console.log(`[Cloudinary] Cleaned up temp file after error: ${filePath}`);
        }
        throw error;
    }
};

/**
 * Generates a Cloudinary URL with transformations.
 * Useful for creating thumbnails or optimized versions.
 * 
 * @param {string} publicId - The Cloudinary public ID
 * @param {Object} [transformations={}] - Cloudinary transformation options
 * @returns {string} Transformed image URL
 */
const getTransformedUrl = (publicId, transformations = {}) => {
    return cloudinary.url(publicId, {
        secure: true,
        ...transformations
    });
};

/**
 * Checks if Cloudinary is properly configured.
 * 
 * @returns {boolean} True if all required credentials are set
 */
const isConfigured = () => {
    return !!(
        config.cloudinary.cloudName &&
        config.cloudinary.apiKey &&
        config.cloudinary.apiSecret
    );
};

module.exports = {
    uploadImage,
    deleteImage,
    uploadAndCleanup,
    getTransformedUrl,
    isConfigured,
    cloudinary  // Export raw instance for advanced usage
};

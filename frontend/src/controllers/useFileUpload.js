/**
 * File Upload Hook
 * 
 * Custom React hook that manages file selection and preview generation.
 * Handles validation and provides preview URLs for image display.
 */

import { useState, useCallback } from 'react';
import { Upload, message } from 'antd';
import config from '../config';

/**
 * Hook for managing file upload state and validation.
 * 
 * @returns {Object} File state and handler functions
 */
const useFileUpload = () => {
    const [fileList, setFileList] = useState([]);
    const [previewImage, setPreviewImage] = useState(null);

    /**
     * Handles changes to the file list from the upload component.
     * Keeps only the most recent file and generates a preview.
     * 
     * @param {Object} info - Upload component change info
     */
    const handleFileChange = useCallback(({ fileList: newFileList }) => {
        // Only keep the latest uploaded file
        const latestFile = newFileList.slice(-1);
        setFileList(latestFile);

        // Generate a preview URL for the selected image
        if (latestFile.length > 0 && latestFile[0].originFileObj) {
            const reader = new FileReader();
            reader.onload = (e) => setPreviewImage(e.target.result);
            reader.readAsDataURL(latestFile[0].originFileObj);
        } else {
            setPreviewImage(null);
        }
    }, []);

    /**
     * Validates a file before it is added to the upload list.
     * Checks file type and size constraints.
     * 
     * @param {File} file - The file to validate
     * @returns {boolean|Symbol} Whether to accept the file
     */
    const beforeUpload = useCallback((file) => {
        // Verify the file is an image
        const isImage = file.type.startsWith('image/');
        if (!isImage) {
            message.error('You can only upload image files!');
            return Upload.LIST_IGNORE;
        }

        // Check file size limit
        const isWithinLimit = file.size / 1024 / 1024 < config.maxFileSizeMb;
        if (!isWithinLimit) {
            message.error(`Image must be smaller than ${config.maxFileSizeMb}MB!`);
            return Upload.LIST_IGNORE;
        }

        // Return false to prevent automatic upload
        return false;
    }, []);

    /**
     * Clears the current file selection and preview.
     */
    const clearFile = useCallback(() => {
        setFileList([]);
        setPreviewImage(null);
    }, []);

    /**
     * Checks if a file is currently selected.
     * 
     * @returns {boolean} Whether a file is selected
     */
    const hasFile = fileList.length > 0;

    /**
     * Gets the currently selected file object.
     * 
     * @returns {File|null} The selected file or null
     */
    const getFile = useCallback(() => {
        return hasFile ? fileList[0].originFileObj : null;
    }, [fileList, hasFile]);

    return {
        fileList,
        previewImage,
        hasFile,
        handleFileChange,
        beforeUpload,
        clearFile,
        getFile
    };
};

export default useFileUpload;

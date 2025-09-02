import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Safely delete a file with error handling
 * @param {string} filePath - Path to the file to delete
 * @param {string} description - Description for logging
 * @returns {boolean} - True if deleted successfully, false otherwise
 */
export const safeDeleteFile = (filePath, description = 'file') => {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Successfully deleted ${description}:`, filePath);
            return true;
        } else {
            console.warn(`${description} not found for deletion:`, filePath);
            return false;
        }
    } catch (error) {
        console.error(`Error deleting ${description}:`, error.message);
        return false;
    }
};

/**
 * Clean up multiple files
 * @param {Array<string>} filePaths - Array of file paths to delete
 * @param {string} description - Description for logging
 * @returns {Object} - Object with success count and errors
 */
export const cleanupFiles = (filePaths, description = 'files') => {
    const results = {
        successCount: 0,
        errorCount: 0,
        errors: []
    };

    filePaths.forEach(filePath => {
        if (safeDeleteFile(filePath, description)) {
            results.successCount++;
        } else {
            results.errorCount++;
            results.errors.push(filePath);
        }
    });

    console.log(`Cleanup completed for ${description}: ${results.successCount} deleted, ${results.errorCount} errors`);
    return results;
};

/**
 * Clean up uploaded files from request object
 * @param {Object} req - Express request object
 * @param {string} description - Description for logging
 */
export const cleanupRequestFiles = (req, description = 'uploaded files') => {
    if (req.files && req.files.length > 0) {
        const filePaths = req.files.map(file => file.path);
        cleanupFiles(filePaths, description);
    }
};

/**
 * Get file size safely
 * @param {string} filePath - Path to the file
 * @returns {number|null} - File size in bytes or null if error
 */
export const getFileSize = (filePath) => {
    try {
        const stats = fs.statSync(filePath);
        return stats.size;
    } catch (error) {
        console.error('Error getting file size:', error.message);
        return null;
    }
};

/**
 * Ensure directory exists, create if it doesn't
 * @param {string} dirPath - Directory path
 * @returns {boolean} - True if directory exists or was created successfully
 */
export const ensureDirectoryExists = (dirPath) => {
    try {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log('Created directory:', dirPath);
        }
        return true;
    } catch (error) {
        console.error('Error creating directory:', error.message);
        return false;
    }
};

/**
 * Get upload directory path
 * @returns {string} - Absolute path to uploads directory
 */
export const getUploadsDir = () => {
    return path.join(__dirname, '../uploads');
};

/**
 * Get full path for uploaded file
 * @param {string} filename - Filename
 * @returns {string} - Full path to the file
 */
export const getUploadedFilePath = (filename) => {
    return path.join(getUploadsDir(), filename);
};

/**
 * Validate file exists and is accessible
 * @param {string} filePath - Path to the file
 * @returns {boolean} - True if file exists and is accessible
 */
export const validateFileExists = (filePath) => {
    try {
        fs.accessSync(filePath, fs.constants.F_OK | fs.constants.R_OK);
        return true;
    } catch (error) {
        return false;
    }
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
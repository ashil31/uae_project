import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { convertVideoToMp4, fallbackVideoProcessing, checkFFmpegAvailability, getVideoMetadata } from '../utils/videoProcessor.js';


/**
 * Comprehensive media processing middleware for both images and videos
 * Processes images to WebP format and videos to MP4 format
 */
const processMedia = async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) return next();
        
        const processedFiles = [];
        const errors = [];
        
        // Separate image and video files
        const imageFiles = req.files.filter(file => file.mimetype.startsWith('image/'));
        const videoFiles = req.files.filter(file => file.mimetype.startsWith('video/'));
        const otherFiles = req.files.filter(file => 
            !file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')
        );
        
        // Process image files
        for (const file of imageFiles) {
            try {
                const originalPath = file.path;
                const newPath = originalPath.replace(path.extname(originalPath), '.webp');

                // Check if original file exists
                if (!fs.existsSync(originalPath)) {
                    console.warn(`Original image file not found: ${originalPath}`);
                    errors.push(`Image file not found: ${file.originalname}`);
                    continue;
                }

                // Convert to .webp and compress
                await sharp(originalPath)
                    .resize({ 
                        width: 1024, 
                        height: 1024, 
                        fit: 'inside',
                        withoutEnlargement: true 
                    })
                    .webp({ 
                        quality: 80,
                        effort: 6
                    })
                    .rotate()
                    .toFile(newPath);

                // Verify the new file was created
                if (fs.existsSync(newPath)) {
                    // Small delay to ensure Sharp has released the file handle
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Delete original file
                    try {
                        console.log(`Attempting to delete original image: ${originalPath}`);
                        fs.unlinkSync(originalPath);
                        console.log(`Successfully deleted original image: ${originalPath}`);
                    } catch (deleteError) {
                        console.error('Could not delete original image file:', deleteError.message);
                        console.error('Original path:', originalPath);
                        console.error('File exists check:', fs.existsSync(originalPath));
                    }

                    // Update file object
                    file.filename = path.basename(newPath);
                    file.path = newPath;
                    file.mimetype = 'image/webp';
                    
                    processedFiles.push(file);
                } else {
                    console.error('Failed to create compressed image:', newPath);
                    errors.push(`Failed to process image: ${file.originalname}`);
                    // Keep original file if compression failed
                    processedFiles.push(file);
                }
            } catch (fileError) {
                console.error(`Error processing image file ${file.originalname}:`, fileError);
                errors.push(`Error processing image ${file.originalname}: ${fileError.message}`);
                // Keep original file if processing failed
                processedFiles.push(file);
            }
        }
        
        // Process video files
        for (const file of videoFiles) {
            try {
                const originalPath = file.path;
                const outputFilename = `video-${Date.now()}-${Math.round(Math.random() * 1e9)}.mp4`;
                const outputPath = path.join(path.dirname(originalPath), outputFilename);

                // Check if FFmpeg is available
                const ffmpegAvailable = await checkFFmpegAvailability();
                
                let finalVideoPath;
                let videoMetadata = null;
                
                if (ffmpegAvailable) {
                    // Convert video to MP4 using FFmpeg
                    finalVideoPath = await convertVideoToMp4(originalPath, outputPath);
                    
                    // Get video metadata after conversion
                    try {
                        videoMetadata = await getVideoMetadata(finalVideoPath);
                    } catch (metadataError) {
                        console.warn('Could not extract video metadata:', metadataError.message);
                    }
                } else {
                    // Fallback: just rename the file to .mp4
                    console.warn('FFmpeg not available, using fallback video processing');
                    finalVideoPath = await fallbackVideoProcessing(originalPath, outputPath);
                }

                // Update file object with processed video info
                file.filename = path.basename(finalVideoPath);
                file.path = finalVideoPath;
                file.mimetype = 'video/mp4';
                
                // Add metadata to file object for later use
                if (videoMetadata) {
                    file.videoMetadata = {
                        duration: videoMetadata.format?.duration || null,
                        width: videoMetadata.streams?.[0]?.width || null,
                        height: videoMetadata.streams?.[0]?.height || null,
                        bitrate: videoMetadata.format?.bit_rate || null
                    };
                }
                
                processedFiles.push(file);
                
            } catch (videoError) {
                console.error(`Error processing video file ${file.originalname}:`, videoError);
                errors.push(`Error processing video ${file.originalname}: ${videoError.message}`);
                
                // Clean up files on error
                const originalPath = file.path;
                const outputPath = path.join(path.dirname(originalPath), `video-${Date.now()}-${Math.round(Math.random() * 1e9)}.mp4`);
                
                [originalPath, outputPath].forEach(filePath => {
                    if (fs.existsSync(filePath)) {
                        try {
                            fs.unlinkSync(filePath);
                        } catch (cleanupError) {
                            console.warn('Could not clean up video file:', cleanupError.message);
                        }
                    }
                });
            }
        }
        
        // Add other files (non-image, non-video) without processing
        processedFiles.push(...otherFiles);
        
        // Update req.files with processed files
        req.files = processedFiles;
        
        // Add processing errors to request for logging
        if (errors.length > 0) {
            req.mediaProcessingErrors = errors;
            console.warn('Media processing completed with errors:', errors);
        }

        next();
        
    } catch (error) {
        console.error('Media processing middleware error:', error);
        
        // Clean up any uploaded files on error
        if (req.files) {
            req.files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    try {
                        fs.unlinkSync(file.path);
                    } catch (cleanupError) {
                        console.warn('Could not clean up file on error:', cleanupError.message);
                    }
                }
            });
        }
        
        res.status(500).json({ 
            success: false,
            message: 'Media processing failed',
            error: error.message 
        });
    }
};

export default processMedia;
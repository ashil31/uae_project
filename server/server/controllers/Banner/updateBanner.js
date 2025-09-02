import HeroBanner from '../../models/heroBanner.js';
import mongoose from 'mongoose';
import { safeDeleteFile, getUploadedFilePath, getFileSize } from '../../utils/fileUtils.js';

const updateBanner = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const { id } = req.params;
        const { title, subtitle, cta, link, textPosition, removeMedia } = req.body;

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            await session.abortTransaction();
            return res.status(400).json({ 
                success: false,
                message: 'Invalid banner ID format' 
            });
        }

        // Find existing banner
        const existingBanner = await HeroBanner.findById(id).session(session);
        if (!existingBanner) {
            await session.abortTransaction();
            return res.status(404).json({ 
                success: false,
                message: 'Banner not found' 
            });
        }

        // Prepare update data
        const updates = {
            title: title?.trim(),
            subtitle: subtitle?.trim(),
            cta: cta?.trim() || 'Shop Now',
            link: link?.trim(),
            textPosition: textPosition || 'left',
            updatedAt: new Date()
        };

        // Handle media updates
        let mediaData = null;
        
        if (removeMedia === 'true') {
            // Remove existing media
            if (existingBanner.media && existingBanner.media.url) {
                const mediaPath = getUploadedFilePath(existingBanner.media.public_id);
                safeDeleteFile(mediaPath, 'existing banner media');
            }
            // Also remove legacy image if exists
            if (existingBanner.image && existingBanner.image.url) {
                const imagePath = getUploadedFilePath(existingBanner.image.public_id);
                safeDeleteFile(imagePath, 'existing banner image');
            }
            updates.media = undefined;
            updates.image = undefined;
        } else if (req.file) {
            // Process new media file
            try {
                // Clean up existing media first
                if (existingBanner.media && existingBanner.media.url) {
                    const oldMediaPath = getUploadedFilePath(existingBanner.media.public_id);
                    safeDeleteFile(oldMediaPath, 'old banner media');
                }
                // Also clean up legacy image
                if (existingBanner.image && existingBanner.image.url) {
                    const oldImagePath = getUploadedFilePath(existingBanner.image.public_id);
                    safeDeleteFile(oldImagePath, 'old banner image');
                }

                const fileSize = getFileSize(req.file.path);
                const isVideo = req.file.mimetype.startsWith('video/');
                
                mediaData = {
                    type: isVideo ? 'video' : 'image',
                    url: `/uploads/${req.file.filename}`,
                    altText: req.body.altText || `Banner-${title || 'Media'}`,
                    public_id: req.file.filename,
                    size: fileSize,
                    format: isVideo ? 'mp4' : 'webp'
                };

                // Add video-specific metadata if available
                if (isVideo && req.file.videoMetadata) {
                    mediaData.duration = req.file.videoMetadata.duration;
                    mediaData.width = req.file.videoMetadata.width;
                    mediaData.height = req.file.videoMetadata.height;
                }

                updates.media = mediaData;
                
                // Keep backward compatibility with image field
                if (!isVideo) {
                    updates.image = {
                        url: mediaData.url,
                        altText: mediaData.altText,
                        public_id: mediaData.public_id
                    };
                }

                console.log('Banner media updated successfully:', mediaData);
            } catch (mediaError) {
                console.error('Error processing banner media:', mediaError);
                // Clean up uploaded file on error
                if (req.file && req.file.path) {
                    safeDeleteFile(req.file.path, 'uploaded banner media');
                }
                await session.abortTransaction();
                return res.status(500).json({
                    success: false,
                    message: 'Failed to process media file',
                    error: mediaError.message
                });
            }
        }

        // Validate required fields
        if (!updates.title) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'Title is required'
            });
        }

        // Update banner
        const updatedBanner = await HeroBanner.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true, runValidators: true, session }
        );

        await session.commitTransaction();

        // Log media processing errors if any
        if (req.mediaProcessingErrors && req.mediaProcessingErrors.length > 0) {
            console.warn('Banner updated with media processing warnings:', req.mediaProcessingErrors);
        }

        res.status(200).json({
            success: true,
            message: 'Banner updated successfully',
            banner: updatedBanner,
            warnings: req.mediaProcessingErrors || []
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Error updating banner:', error);
        
        // Clean up uploaded file if error occurred
        if (req.file && req.file.path) {
            safeDeleteFile(req.file.path, 'uploaded banner media on error');
        }

        // Handle validation errors specifically
        if (error.name === 'ValidationError') {
            const errors = {};
            Object.values(error.errors).forEach(err => {
                errors[err.path] = err.message;
            });
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to update banner',
            error: error.message
        });
    } finally {
        session.endSession();
    }
};

export default updateBanner;
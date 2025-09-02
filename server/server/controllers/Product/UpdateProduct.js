import Product from '../../models/product.js';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { cleanupRequestFiles, getFileSize, safeDeleteFile, getUploadedFilePath } from '../../utils/fileUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const updateProduct = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            await session.abortTransaction();
            return res.status(400).json({ 
                success: false,
                message: 'Invalid product ID format' 
            });
        }

        const existingProduct = await Product.findById(id).session(session);
        if (!existingProduct) {
            await session.abortTransaction();
            return res.status(404).json({ 
                success: false,
                message: 'Product not found' 
            });
        }

        // Parse additionalInfo from string to object
        let additionalInfo = {};
        try {
            additionalInfo = req.body.additionalInfo ? JSON.parse(req.body.additionalInfo) : {};
        } catch (e) {
            console.error('Error parsing additionalInfo:', e);
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'Invalid additionalInfo data'
            });
        }

        // Parse form data
        const updates = {
            name: req.body.name?.trim(),
            description: req.body.description?.trim(),
            basePrice: parseFloat(req.body.basePrice) || 0,
            flatDiscount: parseFloat(req.body.flatDiscount) || 0,
            percentDiscount: parseFloat(req.body.percentDiscount) || 0,
            category: req.body.category?.trim(),
            subCategory: req.body.subCategory?.trim() || '',
            brand: req.body.brand?.trim(),
            materials: req.body.materials ? JSON.parse(req.body.materials) : [],
            careInstructions: req.body.careInstructions?.trim() || '',
            tags: req.body.tags ? JSON.parse(req.body.tags) : [],
            isFeatured: req.body.isFeatured === 'true',
            isOnSale: req.body.isOnSale === 'true',
            additionalInfo: {
                weight: parseFloat(additionalInfo.weight) || undefined,
                dimensions: additionalInfo.dimensions?.trim() || '',
                size: Array.isArray(additionalInfo.size) ? additionalInfo.size : [],
                color: Array.isArray(additionalInfo.color) ? additionalInfo.color : [],
                sku: additionalInfo.sku?.trim(),
                stock: parseInt(additionalInfo.stock) || 0,
                price: parseFloat(additionalInfo.price) || 0
            },
            images: []
        };

        // Track images to delete later
        const imagesToDelete = [];

        // Process existing images
        if (req.body.existingImages) {
            try {
                const existingImages = JSON.parse(req.body.existingImages);
                updates.images.push(...existingImages.map(img => ({
                    ...img,
                    _id: img._id ? new mongoose.Types.ObjectId(img._id) : undefined
                })));
            } catch (e) {
                console.error('Error parsing existingImages:', e);
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: 'Invalid existing images data'
                });
            }
        }

        // Separate image and video files
        const imageFiles = req.files?.filter(f => f.mimetype.startsWith('image/')) || [];
        const videoFiles = req.files?.filter(f => f.mimetype.startsWith('video/')) || [];

        // Process new images
        imageFiles.forEach((file, fileIndex) => {
            const alt = req.body[`altTexts[${fileIndex}]`] || 
                      path.parse(file.originalname).name;
            updates.images.push({
                url: `/uploads/${file.filename}`,
                altText: alt.substring(0, 100)
            });
        });

        // Handle video processing
        let videoData = null;
        if (req.body.removeVideo === 'true') {
            // Video should be removed
            videoData = null;
            // Clean up existing video file if it exists
            if (existingProduct.video && existingProduct.video.url) {
                const videoPath = getUploadedFilePath(path.basename(existingProduct.video.url));
                safeDeleteFile(videoPath, 'existing video file');
            }
        } else if (req.body.existingVideo) {
            // Keep existing video
            try {
                videoData = JSON.parse(req.body.existingVideo);
            } catch (e) {
                console.error('Error parsing existing video data:', e);
            }
        } else if (videoFiles.length > 0) {
            // Process new video (video processing is now handled by mediaProcessor middleware)
            const videoFile = videoFiles[0]; // Take only the first video

            try {
                // Clean up existing video file first if it exists
                if (existingProduct.video && existingProduct.video.url) {
                    const oldVideoPath = getUploadedFilePath(path.basename(existingProduct.video.url));
                    safeDeleteFile(oldVideoPath, 'old video file');
                }

                // Get file stats for size
                const fileSize = getFileSize(videoFile.path);

                videoData = {
                    url: `/uploads/${videoFile.filename}`,
                    originalName: req.body.videoName || videoFile.originalname,
                    size: fileSize,
                    format: 'mp4',
                    duration: videoFile.videoMetadata?.duration || null,
                    width: videoFile.videoMetadata?.width || null,
                    height: videoFile.videoMetadata?.height || null
                };
                
                console.log('Video updated successfully:', videoData);
            } catch (videoError) {
                console.error('Error handling processed video:', videoError);
                // Clean up the video file if there's an error
                safeDeleteFile(videoFile.path, 'processed video file');
            }
        }

        // Handle video updates
        if (req.body.removeVideo === 'true') {
            // Explicitly remove video
            updates.video = undefined;
        } else if (videoData) {
            // Add or update video
            updates.video = videoData;
        }

        // Find and mark images for deletion
        existingProduct.images.forEach(existingImg => {
            const imageExists = updates.images.some(newImg => {
                // Compare by _id if both have it
                if (existingImg._id && newImg._id) {
                    return existingImg._id.equals(newImg._id);
                }
                // Otherwise compare by URL
                return existingImg.url === newImg.url;
            });
            
            if (!imageExists) {
                imagesToDelete.push(existingImg.url);
            }
        });

        // Validate required fields
        const requiredFields = [
            'name', 'description', 'basePrice', 'category', 'brand',
            'materials', 'additionalInfo.size', 'additionalInfo.color',
            'additionalInfo.sku', 'additionalInfo.price', 'additionalInfo.stock'
        ];

        for (const field of requiredFields) {
            const value = field.includes('.') 
                ? field.split('.').reduce((obj, key) => obj?.[key], updates)
                : updates[field];
                
            if (!value || (Array.isArray(value) && value.length === 0)) {
                await session.abortTransaction();
                return res.status(400).json({ 
                    success: false,
                    message: `Missing required field: ${field}` 
                });
            }
        }

        // Validate numeric fields
        if (updates.basePrice < 0 || updates.additionalInfo.price < 0 || updates.additionalInfo.stock < 0) {
            await session.abortTransaction();
            return res.status(400).json({ 
                success: false,
                message: 'Price and stock cannot be negative' 
            });
        }

        // Validate size enum values
        const validSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'One Size'];
        for (const size of updates.additionalInfo.size) {
            if (!validSizes.includes(size)) {
                await session.abortTransaction();
                return res.status(400).json({ 
                    success: false,
                    message: `Invalid size value: ${size}` 
                });
            }
        }

        // Update product
        const updatedProduct = await Product.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true, runValidators: true, session }
        );

        await session.commitTransaction();

        // Clean up deleted images after successful update
        if (imagesToDelete.length > 0) {
            imagesToDelete.forEach(imagePath => {
                const fullPath = getUploadedFilePath(path.basename(imagePath));
                safeDeleteFile(fullPath, 'deleted image file');
            });
        }

        // Log media processing errors if any
        if (req.mediaProcessingErrors && req.mediaProcessingErrors.length > 0) {
            console.warn('Product updated with media processing warnings:', req.mediaProcessingErrors);
        }

        return res.status(200).json({
            success: true,
            message: 'Product updated successfully',
            product: updatedProduct,
            warnings: req.mediaProcessingErrors || []
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Error updating product:', error);
        
        // Clean up any uploaded files if error occurred
        cleanupRequestFiles(req, 'uploaded files after error');

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
            message: 'Failed to update product',
            error: error.message,
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        });
    } finally {
        session.endSession();
    }
};

export default updateProduct;
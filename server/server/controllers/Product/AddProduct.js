import Product from '../../models/product.js';
import fs from 'fs';
import path from 'path';
import { convertVideoToMp4, fallbackVideoProcessing, checkFFmpegAvailability, getVideoMetadata } from '../../utils/videoProcessor.js';
import { cleanupRequestFiles, getFileSize, safeDeleteFile } from '../../utils/fileUtils.js';

const addProduct = async (req, res) => {
    try {
        const {
            name,
            description,
            basePrice,
            flatDiscount,
            percentDiscount,
            category,
            subCategory,
            brand,
            materials,
            careInstructions,
            tags,
            isFeatured,
            isOnSale,
            additionalInfo,
            videoName
        } = req.body;

        // Separate image and video files
        const imageFiles = [];
        const videoFiles = [];
        
        if (req.files) {
            req.files.forEach(file => {
                if (file.mimetype.startsWith('image/')) {
                    imageFiles.push(file);
                } else if (file.mimetype.startsWith('video/')) {
                    videoFiles.push(file);
                }
            });
        }

        // Handle image files
        const images = imageFiles.map((file, index) => ({
            url: `/uploads/${file.filename}`,
            altText: req.body[`altTexts[${index}]`] || file.originalname.split('.')[0]
        }));

        // Handle video file (only one video per product)
        // Video processing is now handled by the mediaProcessor middleware
        let videoData = null;
        if (videoFiles.length > 0) {
            const videoFile = videoFiles[0]; // Take only the first video
            
            try {
                // Get file stats for size
                const fileSize = getFileSize(videoFile.path);

                videoData = {
                    url: `/uploads/${videoFile.filename}`,
                    originalName: videoName || videoFile.originalname,
                    size: fileSize,
                    format: 'mp4',
                    duration: videoFile.videoMetadata?.duration || null,
                    width: videoFile.videoMetadata?.width || null,
                    height: videoFile.videoMetadata?.height || null
                };
                
                console.log('Video processed successfully:', videoData);
            } catch (videoError) {
                console.error('Error handling processed video:', videoError);
                // Clean up the video file if there's an error
                safeDeleteFile(videoFile.path, 'processed video file');
            }
        }

        // Create new product
        const productData = {
            name,
            description,
            basePrice: parseFloat(basePrice),
            flatDiscount: parseFloat(flatDiscount),
            percentDiscount: parseFloat(percentDiscount),
            category,
            subCategory,
            brand,
            materials: JSON.parse(materials),
            careInstructions,
            tags: tags ? JSON.parse(tags) : [],
            isFeatured: isFeatured === 'true',
            isOnSale: isOnSale === 'true',
            additionalInfo: {
                ...JSON.parse(additionalInfo),
                weight: parseFloat(JSON.parse(additionalInfo).weight) || undefined,
                stock: parseInt(JSON.parse(additionalInfo).stock),
                price: parseFloat(JSON.parse(additionalInfo).price)
            },
            images
        };

        // Add video data if available
        if (videoData) {
            productData.video = videoData;
        }

        const newProduct = new Product(productData);

        // Validate required fields
        const requiredFields = ['name', 'description', 'basePrice', 'category', 'brand'];
        for (const field of requiredFields) {
            if (!productData[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validate that at least one image is provided
        if (!productData.images || productData.images.length === 0) {
            throw new Error('At least one product image is required');
        }

        // Save to database
        const savedProduct = await newProduct.save();

        // Log media processing errors if any
        if (req.mediaProcessingErrors && req.mediaProcessingErrors.length > 0) {
            console.warn('Product created with media processing warnings:', req.mediaProcessingErrors);
        }

        res.status(201).json({
            success: true,
            product: savedProduct,
            message: videoData ? 'Product created with video successfully!' : 'Product created successfully!',
            warnings: req.mediaProcessingErrors || []
        });

    } catch (error) {
        console.error('Error creating product:', error);
        
        // Clean up uploaded files if error occurs
        cleanupRequestFiles(req, 'uploaded files after error');
        
        res.status(500).json({
            success: false,
            message: 'Failed to create product',
            error: error.message
        });
    }
};

export default addProduct;
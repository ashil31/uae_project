import HeroBanner from "../../models/heroBanner.js";
import { cleanupRequestFiles, getFileSize, safeDeleteFile } from '../../utils/fileUtils.js';

const addBanner = async(req, res) => {
    try {
        const { title, subtitle, cta, link, textPosition, altText } = req.body;

        // Get uploaded file - support single file from multer (req.file) or first of req.files[]
        const uploadedFile =  req.files[0];

        // Validate required fields
        if (!title || !title.trim()) {
            if (uploadedFile?.path) {
                safeDeleteFile(req.files.path, 'uploaded banner media');
            }
            return res.status(400).json({ 
                success: false,
                message: 'Title is required' 
            });
        }

        if (!uploadedFile) {
            return res.status(400).json({ 
                success: false,
                message: 'Media file (image or video) is required' 
            });
        }

        const count = await HeroBanner.countDocuments();
        const mimetype = uploadedFile.mimetype;
        const isVideo = mimetype.startsWith('video/');
        const isImage = mimetype.startsWith('image/');


        if (!isVideo && !isImage) {
            safeDeleteFile(uploadedFile.path, 'unsupported media type');
            return res.status(400).json({
                success: false,
                message: 'Only image or video files are allowed'
            });
        }

        
        const fileSize = getFileSize(uploadedFile.path);
        const fileExtension = mimetype.split('/')[1]; // Get extension from mimetype

        
        // Prepare media data
        const mediaData = {
            type: isVideo ? 'video' : 'image',
            url: `/uploads/${uploadedFile.filename}`,
            altText: altText || `Banner-Order-${count}`,
            public_id: uploadedFile.filename,
            size: fileSize,
            format: fileExtension
        };

        // Add video-specific metadata if available
        if (isVideo && uploadedFile.videoMetadata) {
            const { duration, width, height } = uploadedFile.videoMetadata;
            mediaData.duration = duration;
            mediaData.width = width;
            mediaData.height = height;
        }

        // Prepare banner data
        const bannerData = {
            title: title.trim(),
            subtitle: subtitle?.trim() || '',
            cta: cta?.trim() || 'Shop Now',
            link: link?.trim() || '',
            textPosition: textPosition || 'left',
            media: mediaData,
            order: count
        };

        // Keep backward compatibility with image field
        if (isImage) {
            bannerData.image = {
                url: mediaData.url,
                altText: mediaData.altText,
                public_id: mediaData.public_id
            };
        }

        // Clean up uploaded file
        const newBanner = new HeroBanner(bannerData);
        await newBanner.save();

        // Log media processing errors if any
        if (req.mediaProcessingErrors && req.mediaProcessingErrors.length > 0) {
            console.warn('Banner created with media processing warnings:', req.mediaProcessingErrors);
        }

        console.log('Banner created successfully:', {
            id: newBanner._id,
            title: newBanner.title,
            mediaType: mediaData.type
        });

        res.status(201).json({
            success: true,
            banner: newBanner,
            message: `Banner created successfully with ${mediaData.type}`,
            warnings: req.mediaProcessingErrors || []
        });

    } catch (error) {
        console.error('Error adding banner:', error);
        
        // Clean up uploaded file if error occurs
        if (req.files) {
            safeDeleteFile(req.files.path, 'uploaded banner media on error');
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
            message: 'Failed to create banner',
            error: error.message 
        });
    }
}

export default addBanner;
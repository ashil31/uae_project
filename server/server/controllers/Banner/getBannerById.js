import HeroBanner from '../../models/heroBanner.js';
import mongoose from 'mongoose';

const getBannerById = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid banner ID format' 
            });
        }
        
        const banner = await HeroBanner.findById(id).lean();

        if (!banner) {
            return res.status(404).json({ 
                success: false, 
                message: 'Banner not found' 
            });
        }
        
        // Process banner data for proper media formatting
        let responseBanner = { ...banner };

        // Ensure video data is properly formatted if it exists
        if (responseBanner.media && responseBanner.media.type === 'video' && responseBanner.media.duration) {
            responseBanner.media.formattedDuration = 
                `${Math.floor(responseBanner.media.duration / 60)}:${Math.floor(responseBanner.media.duration % 60).toString().padStart(2, '0')}`;
        }

        // Backward compatibility: if no media field but image field exists, create media field
        if (!responseBanner.media && responseBanner.image && responseBanner.image.url) {
            responseBanner.media = {
                type: 'image',
                url: responseBanner.image.url,
                altText: responseBanner.image.altText,
                public_id: responseBanner.image.public_id,
                format: 'webp'
            };
        }

        // Add file size formatting if available
        if (responseBanner.media && responseBanner.media.size) {
            responseBanner.media.formattedSize = formatFileSize(responseBanner.media.size);
        }

        res.json({
            success: true,
            banner: responseBanner
        });
        
    } catch (error) {
        console.error('Error fetching banner:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch banner',
            error: error.message
        });
    }   
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default getBannerById;
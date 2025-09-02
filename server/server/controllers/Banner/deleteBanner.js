import HeroBanner from "../../models/heroBanner.js";
import mongoose from 'mongoose';
import { safeDeleteFile, getUploadedFilePath } from '../../utils/fileUtils.js';

const deleteBanner = async(req, res) => {
    try {
        const { id } = req.params;

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid banner ID format' 
            });
        }

        // Find banner first to get media info for cleanup
        const banner = await HeroBanner.findById(id);

        if (!banner) {
            return res.status(404).json({ 
                success: false,
                message: 'Banner not found' 
            });
        }

        // Delete the banner from database
        await HeroBanner.findByIdAndDelete(id);

        // Clean up media files
        const filesToDelete = [];
        
        // Clean up new media field
        if (banner.media && banner.media.public_id) {
            const mediaPath = getUploadedFilePath(banner.media.public_id);
            filesToDelete.push({ path: mediaPath, description: 'banner media' });
        }
        
        // Clean up legacy image field (for backward compatibility)
        if (banner.image && banner.image.public_id && 
            (!banner.media || banner.image.public_id !== banner.media.public_id)) {
            const imagePath = getUploadedFilePath(banner.image.public_id);
            filesToDelete.push({ path: imagePath, description: 'banner image' });
        }

        // Delete files
        let deletedFiles = 0;
        filesToDelete.forEach(({ path, description }) => {
            if (safeDeleteFile(path, description)) {
                deletedFiles++;
            }
        });

        console.log(`Banner deleted successfully. Cleaned up ${deletedFiles} media files.`);

        res.status(200).json({ 
            success: true,
            message: 'Banner deleted successfully',
            deletedBanner: {
                id: banner._id,
                title: banner.title,
                mediaType: banner.media?.type || 'image'
            },
            filesDeleted: deletedFiles
        }); 
        
    } catch (error) {
        console.error('Error deleting banner:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to delete banner',
            error: error.message 
        });
    }
}

export default deleteBanner;
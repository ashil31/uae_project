import HeroBanner from '../../models/heroBanner.js';

const getAllBanners = async(req, res) => {
    try {
        const { includeInactive = 'false' } = req.query;
        
        // Build query based on whether to include inactive banners
        const query = includeInactive === 'true' ? {} : { isActive: true };
        
        const banners = await HeroBanner.find(query)
            .sort({ order: 1 })
            .select('-__v')
            .lean();

        // Process banners to ensure proper media formatting
        const processedBanners = banners.map(banner => {
            const processedBanner = { ...banner };
            
            // Ensure video duration is properly formatted if it exists
            if (processedBanner.media && processedBanner.media.type === 'video' && processedBanner.media.duration) {
                processedBanner.media.formattedDuration = 
                    `${Math.floor(processedBanner.media.duration / 60)}:${Math.floor(processedBanner.media.duration % 60).toString().padStart(2, '0')}`;
            }
            
            // Backward compatibility: if no media field but image field exists, create media field
            if (!processedBanner.media && processedBanner.image && processedBanner.image.url) {
                processedBanner.media = {
                    type: 'image',
                    url: processedBanner.image.url,
                    altText: processedBanner.image.altText,
                    public_id: processedBanner.image.public_id,
                    format: 'webp'
                };
            }
            
            return processedBanner;
        });

        res.status(200).json({ 
            success: true,
            banners: processedBanners,
            count: processedBanners.length,
            message: 'Banners fetched successfully'
        });
        
    } catch (error) {
        console.error('Error fetching banners:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error while fetching banners',
            error: error.message
        });
    }
}


export default getAllBanners;
import HeroBanner from "../../models/heroBanner.js";

const UpdateOrder = async(req, res) => {
    try {
        const { banners } = req.body

        // Validate input
        if (!Array.isArray(banners)) {
            return res.status(400).json({ message: 'Invalid banners array' });
        }

        // Update each banner's order
        const bulkOps = banners.map(banner => ({
            updateOne: {
                filter: { _id: banner._id },
                update: { $set: { order: banner.order, textPosition: banner.textPosition } }
            }
        }));

        await HeroBanner.bulkWrite(bulkOps);

        const updatedBanners = await HeroBanner.find().sort({ order: 1 });
        res.status(200).json(updatedBanners);
    } catch (error) {
        console.error('Error updating banner order:', error);
        res.status(500).json({ message: 'Server error while updating banner order' });
    }
}


export default UpdateOrder;
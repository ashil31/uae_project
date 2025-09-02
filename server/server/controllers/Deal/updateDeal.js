import Deal from "../../models/deal.js";

const updateDeal = async(req,res) => {
    try {
        const { id } = req.params;
        const { enabled } = req.body
        
        const updatedDeal = await Deal.findByIdAndUpdate(
            id,
            { enabled, updatedAt: Date.now() },
            { new: true }
        ).populate('product');

        if(!updatedDeal) {
            return res.status(404).json({ message: 'Deal not found' });
        }

        res.status(200).json({
            success: true,
            deal:updatedDeal,
        })
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export default updateDeal;
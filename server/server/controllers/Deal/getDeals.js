import Deal from '../../models/deal.js';

const getDeals = async(req,res) => {
    try {
        const deals = await Deal.find()
            .populate('product', 'name additionalInfo images');
        
        if (!deals) {
            return res.status(404).json({ message: 'No active deal found' });
        }

        res.status(200).json({
            success: true,
            deals,
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}

export default getDeals
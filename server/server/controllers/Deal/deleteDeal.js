import Deal from '../../models/deal.js';

const deleteDeal = async(req,res) => {
    try {
        const { id } = req.params

        const deal = await Deal.findByIdAndDelete(id);
        
        if (!deal) {
            return res.status(404).json({ 
                success: false,
                message: 'Banner not found' 
            });
        }
        
        res.status(200).json({ 
            success: true,
            message: 'Deal deleted successfully',
            deal,
        });
    } catch (error) {
        console.error('Error deleting deal:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to delete deal',
            error: error.message 
        });
    }
}

export default deleteDeal;
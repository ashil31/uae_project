import Cart from '../../models/cart.js';

const getCart = async(req, res) => {
    try {
        const userId = req.user._id;

        const cart = await Cart.findOne({ userId })
            .populate('items.productId')
            .lean();    

        if (!cart) {
            return res.status(200).json({ 
                items: [], 
                couponApplied: null,
                lastUpdated: new Date() 
            });
        }

        res.status(200).json({
            success: true,
            cart,
        })
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
}

export default getCart;
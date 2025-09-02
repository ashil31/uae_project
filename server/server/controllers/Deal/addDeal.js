import Deal from '../../models/deal.js';
import Product from '../../models/product.js';


const addDeal = async(req, res) => {
    try {
        const { productId, discount, discountedPrice, endDate, enabled } = req.body

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        };

        // If enabling a new deal, disable any existing active deal
        if (enabled) {
            await Deal.updateMany(
                { enabled: true },
                { $set: { enabled: false } }
            );
        };

        // Create new deal
        const newDeal = new Deal({
            product: productId,
            discount,
            discountedPrice,
            endDate: new Date(endDate),
            enabled
        });

        await newDeal.save();

        // Return deal with populated product info
        const populatedDeal = await Deal.findById(newDeal._id)
            .populate('product', 'name price image');

        res.status(201).json({
            success: true,
            deal: populatedDeal,
        })
    } catch (error) {
        console.error(err);
        if (err.code === 11000) {
        return res.status(400).json({ message: 'Only one active deal can exist at a time' });
        }
        res.status(500).json({ message: 'Server error' });
    }
}

export default addDeal;
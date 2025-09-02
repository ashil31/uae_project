import Cart from '../../models/cart.js';
import mongoose from 'mongoose';
import Product from '../../models/product.js';


const updateCart = async(req, res) => {
    try {
        const { id } = req.params;
        const { quantity, color, size } = req.body;
        const userId = req.user._id;

        // Validate input
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid item ID' 
            });
        }

        if (quantity !== undefined && (isNaN(quantity) || quantity < 1)) {
            return res.status(400).json({ 
                success: false,
                message: 'Quantity must be a positive number' 
            });
        }

        // Find the cart and the specific item
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ 
                success: false,
                message: 'Cart not found' 
            });
        }

        const itemToUpdate = cart.items.find(item => item._id.equals(id));
        if (!itemToUpdate) {
            return res.status(404).json({ 
                success: false,
                message: 'Item not found in cart' 
            });
        }


        // If updating quantity, verify stock availability
        if (quantity !== undefined) {
            const product = await Product.findById(itemToUpdate.productId);
            if (!product) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Product no longer available' 
                });
            }

            if (product.additionalInfo.stock < quantity) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Insufficient stock',
                    availableStock: product.stock,
                    maxAllowed: product.stock
                });
            }
        }

        // Prepare update object
        const updateObj = { lastUpdated: Date.now() };
        const itemUpdates = {};

        if (quantity !== undefined) itemUpdates['items.$.quantity'] = quantity;
        if (color) itemUpdates['items.$.color'] = color;
        if (size) itemUpdates['items.$.size'] = size;

        if (Object.keys(itemUpdates).length > 0) {
            updateObj.$set = itemUpdates;
        }

        // Perform the update
        const updatedCart = await Cart.findOneAndUpdate(
            { userId, 'items._id': id },
            updateObj,
            { new: true, runValidators: true }
        ).populate('items.productId');

        res.status(200).json({
            success: true,
            cart: updatedCart,
            message: 'Cart updated successfully'
        });
    } catch (error) {
        console.error('Cart update error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to update cart',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

export default updateCart;
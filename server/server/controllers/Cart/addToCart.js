import Cart from '../../models/cart.js';
import Product from '../../models/product.js';
import Deal from '../../models/deal.js';

const addToCart = async (req, res) => {
    try {
        const { productId, quantity, color, size } = req.body;
        if (!req.user || !req.user._id) {
            return res.status(400).json({ message: "User is required to create a cart" });
        }
        const userId = req.user?._id;


        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check stock availability
        if (product.additionalInfo.stock < quantity) {
            return res.status(400).json({ 
                message: 'Not enough stock available',
                availableStock: product.additionalInfo.stock
            });
        }

        let cart = await Cart.findOne({ userId: req.user._id });

        // Check for active deal
        const deal = await Deal.findOne({ 
            product: productId,
            enabled: true,
            endDate: { $gt: new Date() }
        });

        let price;
        if (deal) {
            price = deal.discountedPrice;
        } else if (product.flatDiscount && product.flatDiscount > 0) {
            price = Math.max(0, product.additionalInfo.price - product.flatDiscount);
        } else if (product.percentDiscount && product.percentDiscount > 0) {
            price = Math.round(product.additionalInfo.price * (1 - product.percentDiscount / 100));
        } else {
            price = product.additionalInfo.price;
        }

        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        // Check if item already exists in cart with same color and size
        const existingItemIndex = cart.items.findIndex(item => 
            item.productId.equals(productId) && 
            item.color === color && 
            item.size === size &&
            item.image === product.images[0]?.url // Assuming first image is used
        );

        if (existingItemIndex !== -1) {
            // Item exists - update quantity
            const newQuantity = cart.items[existingItemIndex].quantity + quantity;
            
            // Check stock again with new quantity
            if (product.additionalInfo.stock < newQuantity) {
                return res.status(400).json({ 
                    message: 'Not enough stock available for the requested quantity',
                    availableStock: product.additionalInfo.stock,
                    currentInCart: cart.items[existingItemIndex].quantity
                });
            }
            
            cart.items[existingItemIndex].quantity = newQuantity;
            cart.items[existingItemIndex].priceAtAddition = price; // Update price in case deal changed
        } else {
            // Item doesn't exist - add new item
            cart.items.push({
                productId,
                quantity,
                priceAtAddition: price,
                image: product.images[0]?.url,
                color,
                size
            });
        }

        await cart.save();
        const populatedCart = await Cart.findById(cart._id).populate('items.productId');

        res.status(201).json({
            success: true,
            cart: populatedCart
        });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(400).json({ message: error.message });
    }
};

export default addToCart;
import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1,
    },
    color: {
        type: String,
        required: true,
    },
    size: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    priceAtAddition: {
        type: Number,
        required: true
    },
    addedAt: {
        type: Date,
        default: Date.now
    },
});

const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    items: [cartItemSchema],
    couponApplied: {
        code: String,
        discountValue: Number,
        discountType: String // 'percentage' or 'fixed'
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Add methods to cart schema
cartSchema.methods = {
    // Add item to cart or update quantity if already exists
    addItem: async function(productId, quantity, price, color, size) {
        // Check if item with same product, color and size already exists
        const existingItemIndex = this.items.findIndex(item => 
            item.productId.equals(productId) && 
            item.color === color && 
            item.size === size
        );

        if (existingItemIndex >= 0) {
            // Update quantity if item exists
            this.items[existingItemIndex].quantity += quantity;
        } else {
            // Add new item
            this.items.push({
                productId,
                quantity,
                priceAtAddition: price,
                color,
                size
            });
        }
        
        this.lastUpdated = Date.now();
        return this.save();
    },

    // Remove item from cart
    removeItem: function(productId, color, size) {
        this.items = this.items.filter(item => 
            !item.productId.equals(productId) || 
            item.color !== color || 
            item.size !== size
        );
        this.lastUpdated = Date.now();
        return this.save();
    },

    // Update item quantity
    updateQuantity: function(productId, newQuantity, color, size) {
        const item = this.items.find(item => 
            item.productId.equals(productId) && 
            item.color === color && 
            item.size === size
        );

        if (item) {
            item.quantity = newQuantity;
            this.lastUpdated = Date.now();
            return this.save();
        }
        throw new Error('Item not found in cart');
    },

    // Clear all items from cart
    clearCart: function() {
        this.items = [];
        this.couponApplied = null;
        this.lastUpdated = Date.now();
        return this.save();
    },

    // Apply coupon to cart
    applyCoupon: function(couponCode, discountValue, discountType) {
        this.couponApplied = {
            code: couponCode,
            discountValue,
            discountType
        };
        this.lastUpdated = Date.now();
        return this.save();
    },

    // Remove coupon from cart
    removeCoupon: function() {
        this.couponApplied = null;
        this.lastUpdated = Date.now();
        return this.save();
    },

    // Calculate cart total
    getTotal: function() {
        let subtotal = this.items.reduce((total, item) => {
            return total + (item.priceAtAddition * item.quantity);
        }, 0);

        if (this.couponApplied) {
            const { discountValue, discountType } = this.couponApplied;
            if (discountType === 'percentage') {
                subtotal -= subtotal * (discountValue / 100);
            } else {
                subtotal -= discountValue;
            }
        }

        return Math.max(0, subtotal); // Ensure total doesn't go negative
    },

    // Get item count
    getItemCount: function() {
        return this.items.reduce((count, item) => count + item.quantity, 0);
    }
};

const Cart = mongoose.model('Cart', cartSchema);

export default Cart;
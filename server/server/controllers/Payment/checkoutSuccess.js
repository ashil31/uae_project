import Coupon from "../../models/coupon.js";
import { stripe } from "../../lib/stripe.js";
import Order from "../../models/order.js";
import Cart from "../../models/cart.js";
import Product from "../../models/product.js";



import mongoose from 'mongoose';

const checkoutSuccess = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { sessionId } = req.body;
        if (!sessionId) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: "Session ID is required. Please contact support if this persists."
            });
        }
        let stripeSession;
        try {
            stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
        } catch (err) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: "Failed to retrieve payment session. Please try again or contact support.",
                error: err.message
            });
        }
        if (!stripeSession || !stripeSession.metadata || !stripeSession.metadata.userId || !stripeSession.metadata.products) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: "Invalid session or missing required data. Please refresh and try again."
            });
        }
        if (stripeSession.payment_status !== 'paid') {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: "Payment not completed successfully. If you were charged, please contact support."
            });
        }
        const products = JSON.parse(stripeSession.metadata.products);
        const userId = stripeSession.metadata.userId;
        // Address validation (if present in metadata)
        if (stripeSession.metadata.address) {
            const address = JSON.parse(stripeSession.metadata.address);
            const requiredFields = ['firstName', 'lastName', 'street', 'city', 'emirate', 'country', 'phone'];
            for (const field of requiredFields) {
                if (!address[field] || address[field].toString().trim() === '') {
                    await session.abortTransaction();
                    return res.status(400).json({
                        success: false,
                        message: `Address validation failed: Missing or invalid field '${field}'.`
                    });
                }
            }
        }
        // Stock validation
        for (const product of products) {
            const dbProduct = await Product.findById(product.id).session(session);
            if (!dbProduct) {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: `Product with ID ${product.id} not found. Please remove it from your cart and try again.`
                });
            }
            if (dbProduct.additionalInfo.stock < product.quantity) {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for product: ${dbProduct.name}. Available: ${dbProduct.additionalInfo.stock}, Requested: ${product.quantity}`
                });
            }
        }
        // Prevent duplicate order
        const existingOrder = await Order.findOne({ paymentSessionId: sessionId }).session(session);
        if (existingOrder) {
            await session.abortTransaction();
            return res.status(200).json({
                success: true,
                message: "Order already processed",
                orderId: existingOrder._id
            });
        }
        // Create order
        const orderStatus = 'confirmed';
        const initialTracking = [{
            stage: 'confirmed',
            message: 'Order confirmed and payment received successfully',
            timestamp: new Date()
        }];
        const newOrder = new Order({
            userId: userId,
            products: products.map(product => ({
                productId: product.id,
                color: product.color,
                size: product.size,
                quantity: product.quantity,
                price: product.price
            })),
            totalAmount: stripeSession.amount_total / 100,
            paymentSessionId: sessionId,
            status: orderStatus,
            paymentMethod: stripeSession.payment_method_types[0] || 'card',
            tracking: initialTracking,
        });
        await newOrder.save({ session });
        // Update product stock and soldQuantity
        for (const product of products) {
            const dbProduct = await Product.findById(product.id).session(session);
            if (dbProduct) {
                dbProduct.additionalInfo.stock = Math.max(0, dbProduct.additionalInfo.stock - product.quantity);
                dbProduct.soldQuantity = (dbProduct.soldQuantity || 0) + product.quantity;
                dbProduct.updatedAt = new Date();
                await dbProduct.save({ session });
            }
        }
        // Deactivate coupon if used
        if (stripeSession.metadata.couponCode) {
            await Coupon.findOneAndUpdate(
                { code: stripeSession.metadata.couponCode },
                { isActive: false, updatedAt: new Date() },
                { session }
            );
        }
        // Clear user's cart after successful order
        const userCart = await Cart.findOne({ userId: userId }).session(session);
        if (userCart) {
            await userCart.clearCart();
        }
        await session.commitTransaction();
        session.endSession();
        res.status(200).json({
            success: true,
            message: "Order placed successfully",
            orderId: newOrder._id,
            orderStatus: newOrder.status,
            totalAmount: newOrder.totalAmount
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Checkout success error:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: `Validation error: ${error.message}`,
                error: error.message
            });
        }
        if (error.type === 'StripeInvalidRequestError') {
            return res.status(400).json({
                success: false,
                message: `Invalid Stripe session: ${error.message}`,
                error: error.message
            });
        }
        res.status(500).json({
            success: false,
            message: `Order processing failed: ${error.message}`,
            error: error.message
        });
    }
};

export default checkoutSuccess;
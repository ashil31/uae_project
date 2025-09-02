
import Coupon from '../../models/coupon.js';
import { stripe } from '../../lib/stripe.js';

const createCheckoutSession = async (req, res) => {
    try {
        const { products, couponCode, total, shippingCost } = req.body;
        const user = req.user;

        console.log("Requsted Data : ",req.body)
        if(!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ message: 'Invalid products' });
        }


        let totalAmount = 0;
        const baseSubtotal = products.reduce((sum, product) => {
            const price = Number(product.priceAtAddition || product.productId?.price);
            return sum + price * Number(product.quantity);
        }, 0);

        // Tax and shipping logic
        let applyTax = true;
        let shippingCharge = 0;

        if (baseSubtotal < 50000) { // Stripe uses cents, so 500 AED = 50000
            // applyTax = true;
            shippingCharge = shippingCost * 100; // e.g., 20 AED shipping charge
        }

        const lineItems = products.map(product => {
            const price = Number(product.priceAtAddition || product.productId?.price);
            const quantity = Number(product.quantity);
            const tax = applyTax ? price * 0.05 : 0;
            const amount = Math.round((price + tax) * 100); // Stripe expects amount in cents
            const total = amount * quantity;
            totalAmount += total;

            let imageUrl = '';
            if (product.image) {
                imageUrl = `${process.env.SERVER_URL}${product.image}`;
            } else if (product.productId?.images) {
                imageUrl = `${process.env.SERVER_URL}${product.productId.images[0].url}`;
            }

            return {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: product.name || product.productId?.name || 'Product',
                        images: imageUrl ? [imageUrl] : [],
                    },
                    unit_amount: amount,
                },
                quantity,
            };
        });

        // Add shipping as a line item if needed
        if (shippingCharge > 0) {
            lineItems.push({
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Shipping Charges',
                    },
                    unit_amount: shippingCharge,
                },
                quantity: 1,
            });
            totalAmount += shippingCharge;
        }

        let stripeDiscount = [];
        const userId = user?._id || user?.userId;

        if (couponCode && userId) {
            const coupon = await Coupon.findOne({ code: couponCode, userId, isActive: true });
            if (coupon) {
                const stripeCouponId = await createStripeCoupon(coupon.discountPercentage);
                stripeDiscount.push({ coupon: stripeCouponId });
            }
        }

        // Create Stripe session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card', 'amazon_pay'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL}/cancel?session_id={CHECKOUT_SESSION_ID}`,
            discounts: stripeDiscount,
            metadata: {
                userId: userId ? String(userId) : '',
                couponCode: couponCode || '',
                products: JSON.stringify(
                    products.map(p => ({
                        id: p.id || p.productId?._id || p.productId?.id,
                        name: p.name || p.productId?.name,
                        quantity: p.quantity,
                        image: p.image || p.productId.images[0].url,
                        price: p.priceAtAddition || p.price,
                        color: p.color,
                        size: p.size
                    }))
                )
            }
        });


        // After successful session creation:
        if (totalAmount >= 500000 && userId) {
            await createNewCoupon(userId);
        }


        res.status(200).json({
            id: session.id,
            totalAmount: totalAmount / 100, // Just display purpose
            url: session.url
        });

            
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ success:false,message: 'Server error while creating checkout session' });
    }  
};

const createStripeCoupon = async (discountPercentage) => {
    const coupon = await stripe.coupons.create({
        percent_off: discountPercentage,
        duration: 'once'
    });
    return coupon.id
}

const createNewCoupon = async (userId) => {
    if (!userId) throw new Error('userId is required to create a coupon');
    const newCoupon = new Coupon({
        code: 'GIFT' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        discountPercentage: 10,
        expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userId: userId,
        isActive: true
    });
    await newCoupon.save();
    return newCoupon;
}

export default createCheckoutSession  
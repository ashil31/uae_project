import express from 'express';
import AuthRoutes from './Auth/Auth.js';
import ProductRoutes from './Product/Product.js';
import UserRoutes from './User/user.js';
import BannerRoutes from './Banner/Banner.js';
import DealRoutes from './Deal/Deal.js';
import CartRoute from './Cart/Cart.js';
import CouponRoute from './Coupon/Coupon.js';
import PaymentRoute from './Payment/Payment.js';
import ContactRoute from './Contact/Contact.js';

import dashboardRoute from './Dashboard/Dashboard.js'
import OrderRoute from './Order/Order.js';
import AdminOrderManagementRoute from './Order/AdminOrderManagement.js';
import OrderTrackingRoute from './Order/OrderTracking.js';
import InvoiceRoute from './Order/Invoice.js';
import AdminReviewRoute from './Admin/AdminReview.js';
import TailorRoute from './Tailor/Tailor.js';

const router = express.Router(); 

router.use('/auth', AuthRoutes);
router.use('/products', ProductRoutes);
router.use('/user', UserRoutes);
router.use('/home', BannerRoutes);
router.use('/deals', DealRoutes);
router.use('/cart', CartRoute);
router.use('/coupons', CouponRoute)
router.use('/payment', PaymentRoute)
router.use('/contact', ContactRoute)
router.use('/dashboard', dashboardRoute)
router.use('/orders', OrderRoute);

// Separate routes for admin order management and user order tracking
router.use('/admin-orders', AdminOrderManagementRoute);
router.use('/order-tracking', OrderTrackingRoute);
router.use('/invoices', InvoiceRoute);
router.use('/admin-reviews', AdminReviewRoute);
router.use('/tailors', TailorRoute)


export default router   
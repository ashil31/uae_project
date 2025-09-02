import express from 'express';
import { getUserOrders, getOrderById, createOrderFromCart } from '../../controllers/Order/orderController.js';
import ProtectRoute from '../../middlewares/ProtectRoute.js';

const router = express.Router();

// Basic order routes (kept for backward compatibility)
router.get('/my', ProtectRoute, getUserOrders);
router.get('/:id', ProtectRoute, getOrderById);
router.post('/from-cart', ProtectRoute, createOrderFromCart);

export default router;

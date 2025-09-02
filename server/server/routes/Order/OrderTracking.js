import express from 'express';
import { 
  getUserOrders, 
  getOrderById, 
  createOrderFromCart,
  trackOrder,
  cancelOrder 
} from '../../controllers/Order/orderController.js';
import ProtectRoute from '../../middlewares/ProtectRoute.js';

const router = express.Router();

// All routes in this file require user authentication
router.use(ProtectRoute);

// User Order Tracking Routes
router.get('/my-orders', getUserOrders);         // GET /api/order-tracking/my-orders - Get user's orders
router.get('/track/:id', trackOrder);           // GET /api/order-tracking/track/:id - Track specific order
router.get('/:id', getOrderById);               // GET /api/order-tracking/:id - Get order details
router.post('/create-from-cart', createOrderFromCart); // POST /api/order-tracking/create-from-cart - Create order from cart
router.put('/:id/cancel', cancelOrder);         // PUT /api/order-tracking/:id/cancel - Cancel order

export default router;
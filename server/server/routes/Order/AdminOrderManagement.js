import express from 'express';
import { 
  getAllOrders, 
  getOrderById, 
  updateOrderStatus, 
  deleteOrder,
  getOrderStatistics 
} from '../../controllers/Order/orderController.js';
import AdminRoute from '../../middlewares/AdminRoute.js';

const router = express.Router();

// All routes in this file require admin authentication
router.use(AdminRoute);

// Admin Order Management Routes
router.get('/', AdminRoute, getAllOrders);                    // GET /api/admin-orders - Get all orders
router.get('/statistics', AdminRoute, getOrderStatistics);   // GET /api/admin-orders/statistics - Get order stats
router.get('/:id', AdminRoute, getOrderById);               // GET /api/admin-orders/:id - Get specific order
router.put('/:id/status', AdminRoute, updateOrderStatus);   // PUT /api/admin-orders/:id/status - Update order status
router.delete('/:id', AdminRoute, deleteOrder);             // DELETE /api/admin-orders/:id - Delete order
router.get('/order', getAllOrders)
export default router;
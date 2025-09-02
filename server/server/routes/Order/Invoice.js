import express from 'express';
import { 
  generateInvoice, 
  getAllInvoices, 
  getInvoiceStatistics 
} from '../../controllers/Order/invoiceController.js';
import ProtectRoute from '../../middlewares/ProtectRoute.js';
import AdminRoute from '../../middlewares/AdminRoute.js';

const router = express.Router();

// Middleware to check if user is admin

// Invoice Routes
router.get('/', AdminRoute, getAllInvoices);                    // GET /api/invoices - Get all invoices
router.get('/statistics', AdminRoute, getInvoiceStatistics);   // GET /api/invoices/statistics - Get invoice stats
router.get('/:orderId', AdminRoute, generateInvoice);          // GET /api/invoices/:orderId - Generate invoice for order

export default router;
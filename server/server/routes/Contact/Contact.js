import express from 'express';
import {
    createContact,
    getAllContacts,
    getContactById,
    updateContact,
    deleteContact,
    getContactStats
} from '../../controllers/Contact/Contact.js';
import AdminRoute from '../../middlewares/AdminRoute.js';

const router = express.Router();

// Public route - Anyone can submit contact form
router.post('/submit', createContact);

// Admin only routes - Using AdminRoute middleware only (since AdminRoute handles both auth and admin check)
router.get('/', AdminRoute, getAllContacts);
router.get('/stats', AdminRoute, getContactStats);
router.get('/:id', AdminRoute, getContactById);
router.put('/:id', AdminRoute, updateContact);
router.delete('/:id', AdminRoute, deleteContact);

export default router;
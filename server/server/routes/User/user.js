import express from 'express'
const router = express.Router();
import AdminRoute from '../../middlewares/AdminRoute.js';
import getAllUsers from '../../controllers/User/GetAllUsersController.js';
import banUser from '../../controllers/User/BanController.js'
import updateUserRole from '../../controllers/User/UpdateRoleController.js'

import addAddress from '../../controllers/User/addAddress.js'
import getUserAddresses from '../../controllers/User/getUserAddresses.js'
import updateAddress from '../../controllers/User/updateAddress.js'
import deleteAddress from '../../controllers/User/deleteAddress.js'
import setDefaultAddress from '../../controllers/User/setDefaultAddress.js'
import getUserProfile from '../../controllers/User/ProfileController.js'
import ProtectRoute from '../../middlewares/ProtectRoute.js';

// Admin routes
router.get('/getAllUsers', AdminRoute, getAllUsers);
router.post('/banUser', AdminRoute, banUser);
router.put('/updateRole', AdminRoute, updateUserRole);

// User profile route
router.get('/profile', ProtectRoute, getUserProfile);

// User address routes
router.get('/:id/addresses', ProtectRoute, getUserAddresses);
router.post('/:id/addresses', ProtectRoute, addAddress);
router.put('/:id/addresses/:addressId', ProtectRoute, updateAddress);
router.put('/:id/addresses/:addressId/default', ProtectRoute, setDefaultAddress);
router.delete('/:id/addresses/:addressId', ProtectRoute, deleteAddress);

export default router
import express from 'express';
import AdminRoute from '../../middlewares/AdminRoute.js';

import getTailors from '../../controllers/Tailor/getTailors.js';
import addTailor from '../../controllers/Tailor/addTailor.js';
import editTailor from '../../controllers/Tailor/editTailor.js';
import deleteTailor from '../../controllers/Tailor/deleteTailor.js';
import { assignOrderToTailor,getAssignedOrders,getUnassignedOrders } from "../../controllers/Order/orderController.js";
// --- Tailor-facing controllers ---
import { protect, tailor } from '../../middlewares/authMiddleware.js'; 
import {
    getMyAssignedWork,
    addDailyProduction,
    sendUpdateToMaster
} from '../../controllers/Tailor/TailorController.js';

import getClothRolls from '../../controllers/Tailor/getClothRolls.js';
import addClothRoll from '../../controllers/Tailor/addClothRoll.js';
import editClothRoll from '../../controllers/Tailor/editClothRoll.js';
import deleteClothRoll from '../../controllers/Tailor/deleteClothRoll.js';


import assignClothRoll from '../../controllers/Tailor/assignClothRoll.js';
import logClothRollUsage from '../../controllers/Tailor/logClothRollUsage.js';
import getAssignedClothRolls from '../../controllers/Tailor/getAssignedClothRolls.js';

const router = express.Router();

// Tailor Routes
router.get('/', AdminRoute, getTailors);
router.post('/newtailor', AdminRoute, addTailor);
router.put('/:id/edit', AdminRoute, editTailor);
router.delete('/:id/delete', AdminRoute, deleteTailor);

 
//  TAILOR ROUTES (for the logged-in tailor)
 
router.get('/my-work', protect, tailor, getMyAssignedWork);
router.post('/production', protect, tailor, addDailyProduction);
router.post('/update', protect, tailor, sendUpdateToMaster);

// Cloth Roll Routes
router.get('/cloth-rolls', AdminRoute, getClothRolls);
router.post('/create-cloth-roll', AdminRoute, addClothRoll);
router.put('/:id/edit-cloth-roll', AdminRoute, editClothRoll);
router.delete('/:id/delete-cloth-roll', AdminRoute, deleteClothRoll);


// Cloth Roll Assignment to Tailor
router.post('/assign-cloth-roll', AdminRoute, assignClothRoll);

// Log usage data like garments/size, waste, returned cloth etc.
router.patch('/assign-cloth-roll/:id/log', AdminRoute, logClothRollUsage);

// Get all assigned records (with tailor name, cloth roll info, logs, etc.)
router.get('/assigned-cloth-rolls', AdminRoute, getAssignedClothRolls);

// assign order to tailor
router.put('/:orderId/assign/:tailorId', AdminRoute, assignOrderToTailor);

// getting assigned order
router.get('/assigned',AdminRoute,getAssignedOrders)

//getting unassigned order
router.get('/unassigned',AdminRoute,getUnassignedOrders)

export default router;
import express from 'express';
import AdminRoute from '../../middlewares/AdminRoute.js';

import getTailors from '../../controllers/Tailor/getTailors.js';
import addTailor from '../../controllers/Tailor/addTailor.js';
import editTailor from '../../controllers/Tailor/editTailor.js';
import deleteTailor from '../../controllers/Tailor/deleteTailor.js';
import { assignOrderToTailor,getAssignedOrders,getUnassignedOrders,rejectAssignedOrder } from "../../controllers/Order/orderController.js";
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
import getClothAmounts from '../../controllers/Tailor/getClothAmounts.js';
import { getMasterAssignments } from '../../controllers/Tailor/getMasterAssignments.js';
import { getTailorsWhoConfirmedOrdersSimple } from '../../controllers/Tailor/getTailorsWhoConfirmedOrdersSimple .js';
import { masterAllocateToTailor } from '../../controllers/Tailor/masterAllocateToTailor.js';

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
router.get('/cloth-amount', AdminRoute, getClothAmounts);
router.post('/create-cloth-roll', AdminRoute, addClothRoll);
router.put('/:id/edit-cloth-roll', AdminRoute, editClothRoll);
router.delete('/:id/delete-cloth-roll', AdminRoute, deleteClothRoll);

router.get('/master/assignments', protect, tailor, getMasterAssignments);

router.get('/assigned-cloth-rolls', AdminRoute, getAssignedClothRolls);

router.post('/master/allocate-to-tailor', protect, tailor, masterAllocateToTailor);
// Cloth Roll Assignment to Master Tailor
router.post('/assign-cloth-roll', AdminRoute, assignClothRoll);

// Log usage data like garments/size, waste, returned cloth etc.
router.patch('/assign-cloth-roll/:id/log', AdminRoute, logClothRollUsage);

// Get all assigned records (with tailor name, cloth roll info, logs, etc.)

// assign order to tailor
router.put('/:orderId/assign/:tailorId', AdminRoute, assignOrderToTailor);

// getting assigned order
router.get('/assigned',AdminRoute,getAssignedOrders)
router.get('/assigned-all-tailor', AdminRoute, getTailorsWhoConfirmedOrdersSimple)

//getting unassigned order
router.get('/unassigned',AdminRoute,getUnassignedOrders)

//reject order
 router.put('/:orderId/reject', protect, tailor ,rejectAssignedOrder)

export default router;
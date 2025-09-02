import express from 'express';
import AdminRoute from '../../middlewares/AdminRoute.js';
import dashboardData from '../../controllers/Dashboard/dashboardData.js';

const router = express.Router();


router.get('/', AdminRoute, dashboardData)


export default router;
import express from 'express';
import ProtectRoute from '../../middlewares/ProtectRoute.js';
import createCheckoutSession from '../../controllers/Payment/createCheckoutSession.js';
import checkoutSuccess from '../../controllers/Payment/checkoutSuccess.js';

const router = express.Router();


router.post('/create-checkout-session', ProtectRoute, createCheckoutSession);
router.post('/checkout-success', ProtectRoute, checkoutSuccess)



export default router;
import express from 'express';
import getCoupon from '../../controllers/Coupon/getCoupon.js';
// import addCoupon from '../../controllers/Coupon/addCoupon.js';
// import updateCoupon from '../../controllers/Coupon/updateCoupon.js';
// import deleteCoupon from '../../controllers/Coupon/deleteCoupon.js';
import ProtectRoute from '../../middlewares/ProtectRoute.js';
import validateCoupon from '../../controllers/Coupon/validateCoupon.js';

const router = express.Router();

router.get('/', ProtectRoute, getCoupon);
router.get('/validate', ProtectRoute, validateCoupon);


export default router;
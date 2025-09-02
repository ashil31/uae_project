import express from 'express'
import AdminRoute from '../../middlewares/AdminRoute.js';
import upload from '../../middlewares/Multer.js';
import getAllBanners from '../../controllers/Banner/getAllBanner.js';
import getBannerById from '../../controllers/Banner/getBannerById.js';
import addBanner from '../../controllers/Banner/addBanner.js';
import updateBanner from '../../controllers/Banner/updateBanner.js';
import deleteBanner from '../../controllers/Banner/deleteBanner.js';
import UpdateOrder from '../../controllers/Banner/updateBannerOrder.js';
import processMedia from '../../middlewares/mediaProcessor.js';

const router = express.Router();


// Public routes
router.get('/banners', getAllBanners);
router.get('/:id', getBannerById);  

// Admin routes
router.put('/bannerOrder', AdminRoute, UpdateOrder);
router.post('/addBanner', AdminRoute, upload.any(), processMedia, addBanner);
router.put('/:id', AdminRoute, upload.any(), processMedia, updateBanner);
router.delete('/:id', AdminRoute, deleteBanner);


export default router
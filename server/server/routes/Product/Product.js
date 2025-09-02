import express from 'express'
const router = express.Router();

import GetProductById from '../../controllers/Product/GetProductByIdController.js';
import GetCategories from '../../controllers/Product/GetCategoriesController.js'
import searchProducts from '../../controllers/Product/SearchProductsController.js'
import GetFilterOptions from '../../controllers/Product/GetFilterOptionsController.js';

import AdminRoute from '../../middlewares/AdminRoute.js';
import ProtectRoute from '../../middlewares/ProtectRoute.js';
import upload from '../../middlewares/Multer.js';

import GetProducts from '../../controllers/Product/GetProductsController.js'
import AddProduct from '../../controllers/Product/AddProduct.js';
import updateProduct from '../../controllers/Product/UpdateProduct.js';
import deleteProduct from '../../controllers/Product/DeleteProduct.js';

// Review controllers
import AddReview from '../../controllers/Product/AddReviewController.js';
import GetReviews from '../../controllers/Product/GetReviewsController.js';
import UpdateReviewHelpful from '../../controllers/Product/UpdateReviewHelpfulController.js';
import processMedia from '../../middlewares/mediaProcessor.js';

// Public routes
router.get('/', GetProducts);
router.get('/categories', GetCategories)
router.get('/filters', GetFilterOptions)
router.get('/search', searchProducts)

// Review routes
router.get('/:id/reviews', GetReviews);
router.post('/:id/reviews', ProtectRoute, AddReview);
router.put('/reviews/:reviewId/helpful', ProtectRoute, UpdateReviewHelpful);

// Product routes
router.get('/:id', GetProductById);

// Admin routes
router.post('/addProduct', AdminRoute, upload.any(), processMedia, AddProduct)
router.put('/:id', AdminRoute, upload.any(), processMedia, updateProduct)
router.delete('/:id', AdminRoute, deleteProduct)


export default router
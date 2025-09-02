import express from 'express';
import {
  getAllReviews,
  updateReviewStatus,
  deleteReview,
  getReviewById,
  bulkUpdateReviewStatus
} from '../../controllers/Admin/AdminReviewController.js';
import AdminRoute from '../../middlewares/AdminRoute.js';
import admin from '../../firebase/firebase-admin.js';

const router = express.Router();


// Get all reviews with filtering and pagination
router.get('/', AdminRoute, getAllReviews);

// Get specific review by ID
router.get('/:reviewId',AdminRoute, getReviewById);

// Update review status (approve/reject)
router.put('/:reviewId/status', AdminRoute, updateReviewStatus);

// Delete review
router.delete('/:reviewId', AdminRoute, deleteReview);

// Bulk update review status
router.put('/bulk/status', AdminRoute, bulkUpdateReviewStatus);

export default router;
import Review from '../../models/review.js';
import Product from '../../models/product.js';
import User from '../../models/user.js';

// Get all reviews for admin management
export const getAllReviews = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status = '', 
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Build search query
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { review: searchRegex },
        { title: searchRegex }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get reviews with populated product and user data
    const reviews = await Review.find(filter)
      .populate('product', 'name images price')
      .populate('user', 'name email')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const totalReviews = await Review.countDocuments(filter);

    // Calculate pagination info
    const totalPages = Math.ceil(totalReviews / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Get review statistics
    const stats = await Review.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const reviewStats = {
      total: totalReviews,
      pending: stats.find(s => s._id === 'pending')?.count || 0,
      approved: stats.find(s => s._id === 'approved')?.count || 0,
      rejected: stats.find(s => s._id === 'rejected')?.count || 0
    };

    res.json({
      success: true,
      reviews,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalReviews,
        hasNextPage,
        hasPrevPage,
        limit: parseInt(limit)
      },
      stats: reviewStats
    });

  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews',
      error: error.message
    });
  }
};

// Update review status (approve/reject)
export const updateReviewStatus = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { status, adminNote } = req.body;

    // Validate status
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be pending, approved, or rejected'
      });
    }

    // Find and update review
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    const oldStatus = review.status;
    review.status = status;
    if (adminNote) {
      review.adminNote = adminNote;
    }
    review.reviewedAt = new Date();
    if (req.user && req.user.id) {
      review.reviewedBy = req.user.id;
    }

    await review.save();

    // Update product rating if status changed to/from approved
    if (oldStatus !== status && (oldStatus === 'approved' || status === 'approved')) {
      await updateProductRating(review.product);
    }

    // Populate the updated review for response
    const updatedReview = await Review.findById(reviewId)
      .populate('product', 'name images price')
      .populate('user', 'name email')
      .lean();

    res.json({
      success: true,
      message: `Review ${status} successfully`,
      review: updatedReview
    });

  } catch (error) {
    console.error('Error updating review status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update review status',
      error: error.message
    });
  }
};

// Delete review
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    const productId = review.product;
    const wasApproved = review.status === 'approved';

    // Delete the review
    await Review.findByIdAndDelete(reviewId);

    // Update product rating if the deleted review was approved
    if (wasApproved) {
      await updateProductRating(productId);
    }

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete review',
      error: error.message
    });
  }
};

// Get review by ID
export const getReviewById = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId)
      .populate('product', 'name images price category')
      .populate('user', 'name email')
      .lean();

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.json({
      success: true,
      review
    });

  } catch (error) {
    console.error('Error fetching review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch review',
      error: error.message
    });
  }
};

// Bulk update review status
export const bulkUpdateReviewStatus = async (req, res) => {
  try {
    const { reviewIds, status, adminNote } = req.body;

    if (!reviewIds || !Array.isArray(reviewIds) || reviewIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Review IDs are required'
      });
    }

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Get reviews before update to track product rating changes
    const reviewsToUpdate = await Review.find({ _id: { $in: reviewIds } });
    
    // Update reviews
    const updateData = {
      status,
      reviewedAt: new Date()
    };
    
    if (req.user && req.user.id) {
      updateData.reviewedBy = req.user.id;
    }
    
    if (adminNote) {
      updateData.adminNote = adminNote;
    }

    await Review.updateMany(
      { _id: { $in: reviewIds } },
      updateData
    );

    // Update product ratings for affected products
    const affectedProducts = [...new Set(reviewsToUpdate.map(r => r.product.toString()))];
    for (const productId of affectedProducts) {
      await updateProductRating(productId);
    }

    res.json({
      success: true,
      message: `${reviewIds.length} reviews updated successfully`,
      updatedCount: reviewIds.length
    });

  } catch (error) {
    console.error('Error bulk updating reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update reviews',
      error: error.message
    });
  }
};

// Helper function to update product rating
const updateProductRating = async (productId) => {
  try {
    const reviews = await Review.find({ 
      product: productId, 
      status: 'approved' 
    });

    if (reviews.length === 0) {
      await Product.findByIdAndUpdate(productId, {
        averageRating: 0,
        totalReviews: 0
      });
      return;
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    await Product.findByIdAndUpdate(productId, {
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
      totalReviews: reviews.length
    });

  } catch (error) {
    console.error('Error updating product rating:', error);
  }
};

export default {
  getAllReviews,
  updateReviewStatus,
  deleteReview,
  getReviewById,
  bulkUpdateReviewStatus
};
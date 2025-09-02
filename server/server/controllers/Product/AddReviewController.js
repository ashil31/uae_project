import Review from '../../models/review.js';
import Product from '../../models/product.js';
import Order from '../../models/order.js';

const addReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, review, title, name, email, user } = req.body;

    // Check if product exists
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      product: id,
      user: user
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }

    // Check if user has purchased this product (for verified purchase)
    const hasPurchased = await Order.findOne({
      user: user,
      'items.product': id,
      status: 'delivered'
    });

    // Create new review
    const newReview = new Review({
      product: id,
      user,
      name,
      email,
      rating,
      review,
      title: title || '',
      isVerifiedPurchase: !!hasPurchased
    });

    await newReview.save();

    // Update product reviews array
    product.reviews.push(newReview._id);

    // Recalculate average rating and total reviews
    const allReviews = await Review.find({ 
      product: id, 
      status: 'approved' 
    });
    
    const totalReviews = allReviews.length;
    const averageRating = totalReviews > 0 
      ? allReviews.reduce((sum, rev) => sum + rev.rating, 0) / totalReviews 
      : 0;

    product.totalReviews = totalReviews;
    product.averageRating = Math.round(averageRating * 10) / 10; // Round to 1 decimal

    await product.save();

    // Populate the review with user info for response
    const populatedReview = await Review.findById(newReview._id)
      .populate('user', 'name email');

    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      review: populatedReview
    });

  } catch (error) {
    console.error('Error adding review:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to add review',
      error: error.message
    });
  }
};

export default addReview;
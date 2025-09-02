import Review from '../../models/review.js';

const updateReviewHelpful = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { userId } = req.body;

    // Find the review
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user already marked this review as helpful
    const alreadyMarked = review.helpfulBy.includes(userId);

    if (alreadyMarked) {
      // Remove from helpful
      review.helpfulBy = review.helpfulBy.filter(id => id.toString() !== userId);
      review.helpful = Math.max(0, review.helpful - 1);
    } else {
      // Add to helpful
      review.helpfulBy.push(userId);
      review.helpful += 1;
    }

    await review.save();

    res.json({
      success: true,
      message: alreadyMarked ? 'Removed from helpful' : 'Marked as helpful',
      helpful: review.helpful,
      isHelpful: !alreadyMarked
    });

  } catch (error) {
    console.error('Error updating review helpful:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update review helpful status',
      error: error.message
    });
  }
};

export default updateReviewHelpful;
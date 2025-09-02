import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    required: false
  },
  review: {
    type: String,
    required: true
  },
  isVerifiedPurchase: {
    type: Boolean,
    default: false
  },
  helpful: {
    type: Number,
    default: 0
  },
  helpfulBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },
  adminNote: {
    type: String,
    required: false
  },
  reviewedAt: {
    type: Date,
    required: false
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate reviews from same user for same product
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// Index for efficient querying
reviewSchema.index({ product: 1, status: 1 });
reviewSchema.index({ rating: 1 });

const Review = mongoose.model('Review', reviewSchema);

export default Review;
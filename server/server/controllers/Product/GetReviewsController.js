import Review from '../../models/review.js';
import Product from '../../models/product.js';

const getReviews = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, sort = 'newest' } = req.query;

    // Check if product exists
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Set up sorting
    let sortOption = {};
    switch (sort) {
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      case 'highest':
        sortOption = { rating: -1 };
        break;
      case 'lowest':
        sortOption = { rating: 1 };
        break;
      case 'helpful':
        sortOption = { helpful: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get reviews with pagination
    const reviews = await Review.find({
      product: id,
      status: 'approved'
    })
      .populate('user', 'name email')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const totalReviews = await Review.countDocuments({
      product: id,
      status: 'approved'
    });

    // Calculate rating distribution
    const ratingDistribution = await Review.aggregate([
      {
        $match: {
          product: product._id,
          status: 'approved'
        }
      },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: -1 }
      }
    ]);

    // Format rating distribution
    const formattedDistribution = [5, 4, 3, 2, 1].map(rating => {
      const found = ratingDistribution.find(item => item._id === rating);
      return {
        rating,
        count: found ? found.count : 0,
        percentage: totalReviews > 0 ? ((found ? found.count : 0) / totalReviews) * 100 : 0
      };
    });

    // Calculate pagination info
    const totalPages = Math.ceil(totalReviews / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

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
      summary: {
        averageRating: product.averageRating || 0,
        totalReviews: product.totalReviews || 0,
        ratingDistribution: formattedDistribution
      }
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

export default getReviews;
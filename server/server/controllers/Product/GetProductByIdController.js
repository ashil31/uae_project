import Product from '../../models/product.js';
import Deal from '../../models/deal.js';
import Review from '../../models/review.js';



const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const { includeReviews = 'false' } = req.query;
    
    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid product ID format' 
      });
    }
    
    const product = await Product.findById(id).lean();

    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }
    
    // Check for active deals
    const deal = await Deal.findOne({ 
      product: id,
      enabled: true,
      endDate: { $gt: new Date() }
    });

    let responseProduct = { ...product };

    if (deal) {
      responseProduct = {
        ...responseProduct,
        originalPrice: product.additionalInfo?.price,
        discountedPrice: deal.discountedPrice,
        discountPercentage: deal.discount,
        isOnSale: true
      };
    }

    // Include reviews if requested
    if (includeReviews === 'true') {
      const reviews = await Review.find({
        product: id,
        status: 'approved'
      })
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .limit(10) // Limit to recent 10 reviews
        .lean();

      responseProduct.reviews = reviews;
      
      // Add review statistics
      responseProduct.reviewStats = {
        totalReviews: reviews.length,
        averageRating: product.averageRating || 0
      };
    }

    // Ensure video data is properly formatted
    if (responseProduct.video && responseProduct.video.url) {
      responseProduct.video = {
        ...responseProduct.video,
        // Ensure duration is formatted properly (in seconds)
        duration: responseProduct.video.duration || null,
        // Add formatted duration for display (MM:SS)
        formattedDuration: responseProduct.video.duration 
          ? `${Math.floor(responseProduct.video.duration / 60)}:${Math.floor(responseProduct.video.duration % 60).toString().padStart(2, '0')}`
          : null
      };
    }

    res.json({
      success: true,
      product: responseProduct
    });
    
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: error.message
    });
  }   
};

export default getProductById
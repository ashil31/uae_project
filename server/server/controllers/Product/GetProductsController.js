import Deal from '../../models/deal.js';
import Product from '../../models/product.js';

const getProducts = async (req, res) => {
  try {
    // Query params - updated to match frontend parameter structure
    const {
      page = 1,
      limit = 12,
      search = '',
      sort = 'newest',
      category = '',
      subcategory = '',
      priceMin,
      priceMax,
      colors,
      sizes,
      brands,
      fabrics,
      // Special page flags
      onSale,
      newArrivals,
      bestSellers,
      // New admin status filter: featured | lowstock | outofstock
      status
    } = req.query;

    // Build filter
    const filter = {};
    const categoryLower = (category || '').toLowerCase();
    const subcategoryLower = (subcategory || '').toLowerCase();

    // Handle category filter with special case for 'sale'
    if (category) {
      if (category.toLowerCase() === 'sale') {
        // For /shop/sale - show all products that are on sale
        filter.isOnSale = true;
        // Don't set category filter - we want products from all categories
      } else {
        // Regular category filter
        filter.category = { $regex: `^${category}$`, $options: 'i' };
      }
    }

    // Handle special page flags (from frontend's isSpecialSubcategoryPage logic)
    if (onSale === 'true' || onSale === true) {
      filter.isOnSale = true;
    } else if (newArrivals === 'true' || newArrivals === true) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filter.createdAt = { $gte: thirtyDaysAgo };
    } else if (bestSellers === 'true' || bestSellers === true) {
      filter.soldQuantity = { $gt: 0 };
    } else if (subcategory) {
      // Handle regular subcategory (not special pages)
      filter.subCategory = { $regex: `^${subcategory}$`, $options: 'i' };
    }

    // Legacy support for URL-based special subcategories
    if (subcategory && !onSale && !newArrivals && !bestSellers) {
      if (subcategoryLower === 'sale') {
        filter.isOnSale = true;
      } else if (subcategoryLower === 'new-arrival' || subcategoryLower === 'new-arrivals') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        filter.createdAt = { $gte: thirtyDaysAgo };
      } else if (subcategoryLower === 'best-sellers' || subcategoryLower === 'best-seller') {
        filter.soldQuantity = { $gt: 0 };
      } else {
        // Regular subcategory
        filter.subCategory = { $regex: `^${subcategory}$`, $options: 'i' };
      }
    }

    // Status filter (admin) - featured, lowstock, outofstock
    if (status) {
      const s = String(status).toLowerCase();
      if (s === 'featured' || s === 'isfeatured') {
        filter.isFeatured = true;
      } else if (s === 'lowstock' || s === 'low-stock' || s === 'low stock') {
        filter['additionalInfo.stock'] = { $gt: 0, $lt: 10 };
      } else if (s === 'outofstock' || s === 'out-of-stock' || s === 'out of stock') {
        filter['additionalInfo.stock'] = { $lte: 0 };
      }
    }

    // Search filter
    if (search && search.trim()) {
      const searchTerm = search.trim();
      filter.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { brand: { $regex: searchTerm, $options: 'i' } },
        { category: { $regex: searchTerm, $options: 'i' } },
        { subCategory: { $regex: searchTerm, $options: 'i' } },
        { materials: { $elemMatch: { $regex: searchTerm, $options: 'i' } } },
        { tags: { $elemMatch: { $regex: searchTerm, $options: 'i' } } },
      ];
    }

    // Price range filter - updated to handle separate min/max parameters
    if (priceMin !== undefined || priceMax !== undefined) {
      const priceFilter = {};

      if (priceMin !== undefined && !isNaN(Number(priceMin))) {
        priceFilter.$gte = Number(priceMin);
      }

      if (priceMax !== undefined && !isNaN(Number(priceMax))) {
        priceFilter.$lte = Number(priceMax);
      }

      if (Object.keys(priceFilter).length > 0) {
        filter['additionalInfo.price'] = priceFilter;
      }
    }

    // Helper to parse array or comma string - improved
    const parseFilterArray = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value.filter(Boolean);
      if (typeof value === 'string') {
        return value.split(',').map(item => item.trim()).filter(Boolean);
      }
      return [];
    };

    // Color filter
    const colorArray = parseFilterArray(colors);
    if (colorArray.length > 0) {
      filter['additionalInfo.color'] = { $in: colorArray };
    }

    // Size filter
    const sizeArray = parseFilterArray(sizes);
    if (sizeArray.length > 0) {
      filter['additionalInfo.size'] = { $in: sizeArray };
    }

    // Brand filter
    const brandArray = parseFilterArray(brands);
    if (brandArray.length > 0) {
      filter.brand = { $in: brandArray };
    }

    // Fabric/Materials filter
    const fabricArray = parseFilterArray(fabrics);
    if (fabricArray.length > 0) {
      filter.materials = { $in: fabricArray };
    }

    // Sorting logic - improved with special handling for sale products
    let sortOption = { createdAt: -1 }; // default

    // Override based on special pages first
    if (category?.toLowerCase() === 'sale' || onSale === 'true' || onSale === true || subcategoryLower === 'sale') {
      // For sale products, sort by discount percentage first, then by rating
      sortOption = { discountPercentage: -1, averageRating: -1, createdAt: -1 };
    } else if (newArrivals === 'true' || newArrivals === true || subcategoryLower === 'new-arrivals') {
      sortOption = { createdAt: -1 };
    } else if (bestSellers === 'true' || bestSellers === true || subcategoryLower === 'best-sellers') {
      sortOption = { soldQuantity: -1, averageRating: -1 };
    } else {
      // Apply sort parameter
      switch (sort) {
        case 'price_low':
          sortOption = { 'additionalInfo.price': 1 };
          break;
        case 'price_high':
          sortOption = { 'additionalInfo.price': -1 };
          break;
        case 'relevance':
          sortOption = { averageRating: -1, totalReviews: -1, soldQuantity: -1 };
          break;
        case 'newest':
          sortOption = { createdAt: -1 };
          break;
        case 'oldest':
          sortOption = { createdAt: 1 };
          break;
        case 'name_asc':
          sortOption = { name: 1 };
          break;
        case 'name_desc':
          sortOption = { name: -1 };
          break;
        default:
          sortOption = { createdAt: -1 };
      }
    }

    // Pagination with validation
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 12)); // Max 100 items per page
    const skip = (pageNum - 1) * limitNum;

    // Prepare promises in parallel:
    // 1) paginated find + count
    // 2) active deals for these products (we'll fetch after getting product ids)
    // 3) facets (available filters with counts) - we compute facets using the same filter (without skip/limit)
    const productsPromise = Product.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum)
      .lean()
      .exec();

    const countPromise = Product.countDocuments(filter).exec();

    // facet aggregation - compute counts for categories, subCategories, brands, colors, sizes, materials
    // We'll run this without skip/limit so counts represent the full filtered set
    const facetsPipeline = [
      { $match: filter },
      {
        $facet: {
          categories: [
            { $match: { category: { $exists: true, $ne: null } } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          subCategories: [
            { $match: { subCategory: { $exists: true, $ne: null } } },
            { $group: { _id: '$subCategory', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          brands: [
            { $match: { brand: { $exists: true, $ne: null } } },
            { $group: { _id: '$brand', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          colors: [
            { $unwind: { path: '$additionalInfo.color', preserveNullAndEmptyArrays: false } },
            { $group: { _id: '$additionalInfo.color', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          sizes: [
            { $unwind: { path: '$additionalInfo.size', preserveNullAndEmptyArrays: false } },
            { $group: { _id: '$additionalInfo.size', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          fabrics: [
            { $unwind: { path: '$materials', preserveNullAndEmptyArrays: false } },
            { $group: { _id: '$materials', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ]
        }
      }
    ];

    const facetsPromise = Product.aggregate(facetsPipeline).exec();

    // run products and count in parallel
    const [products, total, facetsResult] = await Promise.all([productsPromise, countPromise, facetsPromise]);

    // Attach deals and calculate discounted prices
    const productIds = products.map(p => p._id);
    let activeDeals = [];
    if (productIds.length > 0) {
      activeDeals = await Deal.find({
        product: { $in: productIds },
        enabled: true,
        startDate: { $lte: new Date() },
        endDate: { $gt: new Date() }
      }).lean().exec();
    }

    const dealsMap = new Map();
    activeDeals.forEach(deal => {
      dealsMap.set(deal.product.toString(), deal);
    });

    const updatedProducts = products.map(product => {
      const deal = dealsMap.get(product._id.toString());
      let productWithDeal = { ...product };

      if (deal) {
        productWithDeal = {
          ...product,
          originalPrice: product.additionalInfo?.price,
          discountedPrice: deal.discountedPrice,
          discountPercentage: deal.discount,
          isOnSale: true,
          dealInfo: {
            dealId: deal._id,
            dealName: deal.name,
            startDate: deal.startDate,
            endDate: deal.endDate
          }
        };
      }

      return productWithDeal;
    });

    // Convert facets result into friendly shape
    const facetObj = (facetsResult && facetsResult[0]) || {};
    const mapFacet = (arr) => (Array.isArray(arr) ? arr.map(i => ({ value: i._id, count: i.count })) : []);

    const availableFilters = {
      categories: mapFacet(facetObj.categories),
      subCategories: mapFacet(facetObj.subCategories),
      brands: mapFacet(facetObj.brands),
      colors: mapFacet(facetObj.colors),
      sizes: mapFacet(facetObj.sizes),
      fabrics: mapFacet(facetObj.fabrics)
    };

    // Get additional data for homepage/featured sections (unchanged)
    const [featuredProducts, newArrivalsProducts] = await Promise.all([
      Product.find({ isFeatured: true })
        .sort({ createdAt: -1 })
        .limit(12)
        .lean()
        .exec(),
      Product.find({
        createdAt: {
          $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
        }
      })
        .sort({ createdAt: -1 })
        .limit(12)
        .lean()
        .exec()
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.status(200).json({
      success: true,
      data: {
        products: updatedProducts,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalProducts: total,
          limit: limitNum,
          hasNextPage,
          hasPrevPage,
          skip
        },
        filters: {
          applied: {
            category: category || null,
            subcategory: subcategory || null,
            priceRange: (priceMin || priceMax) ? { min: priceMin, max: priceMax } : null,
            colors: colorArray.length > 0 ? colorArray : null,
            sizes: sizeArray.length > 0 ? sizeArray : null,
            brands: brandArray.length > 0 ? brandArray : null,
            fabrics: fabricArray.length > 0 ? fabricArray : null,
            search: search || null,
            sort,
            status: status || null,
            specialPage: (category?.toLowerCase() === 'sale' || onSale) ? 'sale' : newArrivals ? 'new-arrivals' : bestSellers ? 'best-sellers' : null
          }
        },
        availableFilters
      },
      // Legacy support - keeping these for backward compatibility
      products: updatedProducts,
      featuredProducts,
      newArrivals: newArrivalsProducts,
      total,
      page: pageNum,
      limit: limitNum
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export default getProducts;

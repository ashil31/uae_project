import Deal from '../../models/deal.js';
import Product from '../../models/product.js';

const getAllProducts = async (req, res) => {
  try {
    const {
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
      onSale,
      newArrivals,
      bestSellers,
      status
    } = req.query;

    // -------------------- Build Filter --------------------
    const filter = {};
    const categoryLower = (category || '').toLowerCase();
    const subcategoryLower = (subcategory || '').toLowerCase();

    if (category) {
      if (categoryLower === 'sale') {
        filter.isOnSale = true;
      } else {
        filter.category = { $regex: `^${category}$`, $options: 'i' };
      }
    }

    if (onSale === 'true' || onSale === true) {
      filter.isOnSale = true;
    } else if (newArrivals === 'true' || newArrivals === true) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filter.createdAt = { $gte: thirtyDaysAgo };
    } else if (bestSellers === 'true' || bestSellers === true) {
      filter.soldQuantity = { $gt: 0 };
    } else if (subcategory) {
      filter.subCategory = { $regex: `^${subcategory}$`, $options: 'i' };
    }

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
        filter.subCategory = { $regex: `^${subcategory}$`, $options: 'i' };
      }
    }

    if (status) {
      const s = String(status).toLowerCase();
      if (s === 'featured') {
        filter.isFeatured = true;
      } else if (s.includes('low')) {
        filter['additionalInfo.stock'] = { $gt: 0, $lt: 10 };
      } else if (s.includes('out')) {
        filter['additionalInfo.stock'] = { $lte: 0 };
      }
    }

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

    if (priceMin !== undefined || priceMax !== undefined) {
      const priceFilter = {};
      if (!isNaN(Number(priceMin))) priceFilter.$gte = Number(priceMin);
      if (!isNaN(Number(priceMax))) priceFilter.$lte = Number(priceMax);
      if (Object.keys(priceFilter).length > 0) {
        filter['additionalInfo.price'] = priceFilter;
      }
    }

    const parseFilterArray = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value.filter(Boolean);
      if (typeof value === 'string') {
        return value.split(',').map(item => item.trim()).filter(Boolean);
      }
      return [];
    };

    const colorArray = parseFilterArray(colors);
    if (colorArray.length > 0) filter['additionalInfo.color'] = { $in: colorArray };

    const sizeArray = parseFilterArray(sizes);
    if (sizeArray.length > 0) filter['additionalInfo.size'] = { $in: sizeArray };

    const brandArray = parseFilterArray(brands);
    if (brandArray.length > 0) filter.brand = { $in: brandArray };

    const fabricArray = parseFilterArray(fabrics);
    if (fabricArray.length > 0) filter.materials = { $in: fabricArray };

    // -------------------- Sorting --------------------
    let sortOption = { createdAt: -1 };
    if (categoryLower === 'sale' || onSale === 'true' || subcategoryLower === 'sale') {
      sortOption = { discountPercentage: -1, averageRating: -1, createdAt: -1 };
    } else if (newArrivals === 'true' || subcategoryLower === 'new-arrivals') {
      sortOption = { createdAt: -1 };
    } else if (bestSellers === 'true' || subcategoryLower === 'best-sellers') {
      sortOption = { soldQuantity: -1, averageRating: -1 };
    } else {
      switch (sort) {
        case 'price_low': sortOption = { 'additionalInfo.price': 1 }; break;
        case 'price_high': sortOption = { 'additionalInfo.price': -1 }; break;
        case 'relevance': sortOption = { averageRating: -1, totalReviews: -1, soldQuantity: -1 }; break;
        case 'oldest': sortOption = { createdAt: 1 }; break;
        case 'name_asc': sortOption = { name: 1 }; break;
        case 'name_desc': sortOption = { name: -1 }; break;
        default: sortOption = { createdAt: -1 };
      }
    }

    // -------------------- Fetch Products (NO PAGINATION) --------------------
    const products = await Product.find(filter).sort(sortOption).lean().exec();
    const total = await Product.countDocuments(filter);

    // -------------------- Facets --------------------
    const facetsPipeline = [
      { $match: filter },
      {
        $facet: {
          categories: [
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          subCategories: [
            { $group: { _id: '$subCategory', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          brands: [
            { $group: { _id: '$brand', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          colors: [
            { $unwind: '$additionalInfo.color' },
            { $group: { _id: '$additionalInfo.color', count: { $sum: 1 } } }
          ],
          sizes: [
            { $unwind: '$additionalInfo.size' },
            { $group: { _id: '$additionalInfo.size', count: { $sum: 1 } } }
          ],
          fabrics: [
            { $unwind: '$materials' },
            { $group: { _id: '$materials', count: { $sum: 1 } } }
          ]
        }
      }
    ];

    const [facetsResult] = await Product.aggregate(facetsPipeline).exec();
    const mapFacet = (arr) => (Array.isArray(arr) ? arr.map(i => ({ value: i._id, count: i.count })) : []);
    const availableFilters = {
      categories: mapFacet(facetsResult?.categories),
      subCategories: mapFacet(facetsResult?.subCategories),
      brands: mapFacet(facetsResult?.brands),
      colors: mapFacet(facetsResult?.colors),
      sizes: mapFacet(facetsResult?.sizes),
      fabrics: mapFacet(facetsResult?.fabrics)
    };

    // -------------------- Attach Deals --------------------
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

    const dealsMap = new Map(activeDeals.map(d => [d.product.toString(), d]));
    const updatedProducts = products.map(product => {
      const deal = dealsMap.get(product._id.toString());
      if (!deal) return product;
      return {
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
    });

    // -------------------- Extra Sections --------------------
    const [featuredProducts, newArrivalsProducts] = await Promise.all([
      Product.find({ isFeatured: true }).sort({ createdAt: -1 }).limit(12).lean(),
      Product.find({ createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } })
        .sort({ createdAt: -1 }).limit(12).lean()
    ]);

    // -------------------- Response --------------------
    res.status(200).json({
      success: true,
      data: {
        products: updatedProducts,
        totalProducts: total,
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
            status: status || null
          }
        },
        availableFilters
      },
      products: updatedProducts, // legacy
      featuredProducts,
      newArrivals: newArrivalsProducts,
      total
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

export default getAllProducts;

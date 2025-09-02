import Product from '../../models/product.js';

const getFilterOptions = async (req, res) => {
  try {
    const [categories, subcategories, colors, brands, sizes, fabrics] = await Promise.all([
      Product.distinct('category'),
      Product.distinct('subCategory'),
      Product.distinct('additionalInfo.color'),
      Product.distinct('brand'),
      Product.distinct('additionalInfo.size'),
      Product.distinct('materials'),
    ]);
    res.json({
      categories: categories.filter(Boolean),
      subcategories: subcategories.filter(Boolean),
      colors: colors.filter(Boolean),
      brands: brands.filter(Boolean),
      sizes: sizes.filter(Boolean),
      fabrics: fabrics.filter(Boolean),
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({ message: 'Server error while fetching filter options' });
  }
};

export default getFilterOptions;

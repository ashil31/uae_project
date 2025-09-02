import Product from '../../models/product.js'


const searchProducts = async (req, res) => {
  try {
    const { q } = req.query;
    
    const products = await Product.find({
      $text: { $search: q }
    }, {
      score: { $meta: "textScore" }
    })
    .sort({ score: { $meta: "textScore" } })
    .limit(10)
    .lean();
    
    res.json(products.map(p => ({
      id: p._id,
      name: p.name,
      price: p.additionalInfo.price,
      image: p.images[0]?.url,
      brand: p.brand,
      category: p.category
    })));
    
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ message: 'Server error while searching products' });
  }
};

export default searchProducts
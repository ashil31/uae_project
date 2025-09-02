import Cart from "../../models/cart.js";


const deleteCart = async (req, res) => {
  try {

    console.log('Clearing cart for user:', req.user);
    if (!req.user || !req.user._id) {
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized access',
      });
    }

    const userId = req.user._id;

    // Find the user's cart and clear it
    const cart = await Cart.findOneAndUpdate(
      { userId },
      { items: [], lastUpdated: new Date() },
      { new: true }
    );

    console.log('Cart after clearing:', cart);

    if (!cart) {
      return res.status(404).json({ 
        success: false,
        message: 'Cart not found',
      });
    }

    res.status(200).json({ 
      success: true,
      message: 'Cart cleared successfully',
    });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
    });
  }
}

export default deleteCart;
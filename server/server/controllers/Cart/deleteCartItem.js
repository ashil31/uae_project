import Cart from "../../models/cart.js";
import mongoose from "mongoose";

const deleteCartItem = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Validate inputs
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        success: false,
        message: 'Invalid ID format',
        errorCode: 'INVALID_ID_FORMAT'
      });
    }

    const cart = await Cart.findOne({ userId }).session(session);
    if (!cart) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ 
        success: false,
        message: 'Cart not found',
        errorCode: 'CART_NOT_FOUND'
      });
    }

    // Find the specific item to get its details
    const itemToRemove = cart.items.find(item => item._id.equals(id));
    if (!itemToRemove) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ 
        success: false,
        message: 'Item not found in cart',
        errorCode: 'ITEM_NOT_IN_CART'
      });
    }

    // Remove the item using the correct method
    cart.items = cart.items.filter(item => !item._id.equals(id));
    cart.lastUpdated = new Date();
    await cart.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ 
      success: true,
      message: 'Item removed from cart successfully',
      remainingItems: cart.items.length,
      metadata: {
        removedItemId: id,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Error removing item from cart:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to remove item from cart',
      errorCode: 'SERVER_ERROR',
      systemMessage: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default deleteCartItem;  
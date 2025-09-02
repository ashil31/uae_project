import Product from '../models/product.js';

/**
 * Update sold quantity for products when order status changes to delivered
 * @param {Array} products - Array of products from order
 */
export const updateSoldQuantity = async (products) => {
  try {
    for (const item of products) {
      await Product.findByIdAndUpdate(
        item.productId,
        {
          $inc: { 
            soldQuantity: item.quantity,
            'additionalInfo.stock': -item.quantity // Decrease stock
          }
        },
        { new: true }
      );
    }
    console.log('Sold quantities updated successfully');
  } catch (error) {
    console.error('Error updating sold quantities:', error);
    throw error;
  }
};

/**
 * Revert sold quantity for products when order is cancelled
 * @param {Array} products - Array of products from order
 */
export const revertSoldQuantity = async (products) => {
  try {
    for (const item of products) {
      await Product.findByIdAndUpdate(
        item.productId,
        {
          $inc: { 
            soldQuantity: -item.quantity,
            'additionalInfo.stock': item.quantity // Increase stock back
          }
        },
        { new: true }
      );
    }
    console.log('Sold quantities reverted successfully');
  } catch (error) {
    console.error('Error reverting sold quantities:', error);
    throw error;
  }
};
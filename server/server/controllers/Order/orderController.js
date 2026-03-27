import Order from '../../models/order.js';
import Cart from '../../models/cart.js';
import Product from '../../models/product.js';
import User from '../../models/user.js';
import { updateSoldQuantity, revertSoldQuantity } from '../../utils/updateSoldQuantity.js';

// Get all orders (admin)
export const getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    const ands = [];

    // Status filter
    if (typeof status === 'string' && status.trim() !== '') {
      ands.push({ status: status.trim() });
    }

    // Search filter
    if (typeof search === 'string' && search.trim() !== '') {
      const term = search.trim();
      const searchRegex = new RegExp(term, 'i');

      // Find users by firstName/lastName/email
      const users = await User.find({
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex },
        ],
      }).select('_id');

      const userIds = users.map(u => u._id);

      const orClauses = [{ paymentSessionId: searchRegex }];

      // Only add userId clause if there are matches
      if (userIds.length > 0) {
        orClauses.push({ userId: { $in: userIds } });
      }

      ands.push({ $or: orClauses });
    }

    // Final query
    const query = ands.length ? { $and: ands } : {};

    // Optional: verify it's not {}
    // console.log('Final query:', JSON.stringify(query, null, 2));

    const totalOrders = await Order.countDocuments(query);

    const orders = await Order.find(query)
      .populate('userId', 'displayName username email phone addresses')
      .populate('products.productId', 'name images price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    if (!orders || orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Orders not found' });
    }

    const formattedOrders = orders.map(order => ({
      id: order?._id,
      customer: `${order?.userId?.displayName || order?.userId?.username || ''}`,
      email: order?.userId?.email || 'N/A',
      phone: order?.userId?.phone || 'N/A',
      items: order?.products?.length,
      total: order?.totalAmount,
      status: order?.status,
      date: order?.createdAt?.toISOString().split('T')[0],
      paymentMethod: order?.paymentMethod,
      tracking: order?.tracking,
      products: order?.products,
      createdAt: order?.createdAt,
      updatedAt: order?.updatedAt,
    }));

    res.status(200).json({
      success: true,
      orders: formattedOrders,
      pagination: {
        page: pageNum,
        totalPages: Math.ceil(totalOrders / limitNum),
        totalItems: totalOrders,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get user orders
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    const orders = await Order.find({ userId })
      .populate('products.productId')
      .populate('userId', 'addresses firstName lastName email phone');
    res.status(200).json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get order by ID
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    // Find order and ensure it belongs to the requesting user (unless admin)
    const order = await Order.findById(id)
      .populate('userId', 'addresses firstName lastName email phone')
      .populate('products.productId', 'name images price category');
    
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    
    // Check if user owns this order (unless admin)
    if (req.user.role !== 'admin' && order.userId._id.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Format order for response
    const formattedOrder = {
      id: order._id,
      customer: `${order.userId?.firstName || ''} ${order.userId?.lastName || ''}`.trim() || 'Unknown Customer',
      email: order.userId?.email || 'N/A',
      phone: order.userId?.phone || 'N/A',
      addresses: order.userId?.addresses || [],
      items: order.products.length,
      total: order.totalAmount,
      status: order.status,
      date: order.createdAt.toISOString().split('T')[0],
      paymentMethod: order.paymentMethod,
      paymentSessionId: order.paymentSessionId,
      tracking: order.tracking,
      products: order.products.map(product => ({
        productId: product.productId,
        color: product.color,
        size: product.size,
        quantity: product.quantity,
        price: product.price,
        name: product.productId?.name || 'Unknown Product',
        images: product.productId?.images || [],
        category: product.productId?.category || 'Unknown'
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    };
    
    res.status(200).json({ success: true, order: formattedOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Create order directly from cart
export const createOrderFromCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const cart = await Cart.findOne({ userId }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }
    // Calculate total
    let totalAmount = 0;
    const products = cart.items.map(item => {
      totalAmount += item.priceAtAddition * item.quantity;
      return {
        productId: item.productId._id,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        price: item.priceAtAddition
      };
    });
    const newOrder = new Order({
      userId,
      products,
      totalAmount,
      paymentSessionId: `manual_${Date.now()}_${userId}`, // Generate unique session ID for manual orders
      status: 'pending',
      paymentMethod: 'manual',
      tracking: [{ stage: 'confirmed', message: 'Order placed from cart' }]
    });
    await newOrder.save();
    // Optionally clear cart
    cart.items = [];
    await cart.save();
    res.status(201).json({ success: true, order: newOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Admin: Update order status
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, trackingMessage, reason } = req.body;
    
    const validStatuses = ['pending', 'confirmed', 'packed', 'shipped', 'out-for-delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    
    const order = await Order.findById(id)
      .populate('userId', 'firstName lastName email phone')
      .populate('products.productId', 'name images price');
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    // Store previous status for sold quantity logic
    const previousStatus = order.status;
    
    // Update status
    order.status = status;
    order.updatedAt = new Date();
    
    // Default tracking messages
    const defaultMessages = {
      'pending': 'Order is pending confirmation',
      'confirmed': 'Order has been confirmed and is being processed',
      'packed': 'Items have been packed and ready for shipping',
      'shipped': 'Package has been shipped and is on the way',
      'out-for-delivery': 'Package is out for delivery',
      'delivered': 'Package has been delivered successfully',
      'cancelled': 'Order has been cancelled'
    };
    
    // Add tracking information
    const message = trackingMessage || defaultMessages[status] || `Order status updated to ${status}`;
    order.tracking.push({
      stage: status,
      message: reason ? `${message}. Reason: ${reason}` : message,
      timestamp: new Date()
    });
    
    await order.save();
    
    // Update sold quantities based on status change
    try {
      if (status === 'delivered' && previousStatus !== 'delivered') {
        // Order was just delivered - update sold quantities
        await updateSoldQuantity(order.products);
      } else if (status === 'cancelled' && previousStatus === 'delivered') {
        // Order was cancelled after being delivered - revert sold quantities
        await revertSoldQuantity(order.products);
      }
    } catch (error) {
      console.error('Error updating sold quantities:', error);
      // Don't fail the order status update if sold quantity update fails
    }
    
    // Format response
    const formattedOrder = {
      id: order._id,
      customer: `${order.userId?.firstName || ''} ${order.userId?.lastName || ''}`.trim() || 'Unknown Customer',
      email: order.userId?.email || 'N/A',
      phone: order.userId?.phone || 'N/A',
      items: order.products.length,
      total: order.totalAmount,
      status: order.status,
      date: order.createdAt.toISOString().split('T')[0],
      paymentMethod: order.paymentMethod,
      tracking: order.tracking,
      products: order.products,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    };
    
    res.status(200).json({ 
      success: true, 
      message: 'Order status updated successfully',
      order: formattedOrder
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Admin: Delete order
export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    await Order.findByIdAndDelete(id);
    
    res.status(200).json({ 
      success: true, 
      message: 'Order deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Admin: Get order statistics
export const getOrderStatistics = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const confirmedOrders = await Order.countDocuments({ status: 'confirmed' });
    const packedOrders = await Order.countDocuments({ status: 'packed' });
    const shippedOrders = await Order.countDocuments({ status: 'shipped' });
    const outForDeliveryOrders = await Order.countDocuments({ status: 'out-for-delivery' });
    const deliveredOrders = await Order.countDocuments({ status: 'delivered' });
    const cancelledOrders = await Order.countDocuments({ status: 'cancelled' });
    
    // Calculate total revenue
    const revenueResult = await Order.aggregate([
      { $match: { status: { $in: ['delivered', 'shipped', 'packed', 'out-for-delivery'] } } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;
    
    res.status(200).json({
      success: true,
      statistics: {
        totalOrders,
        pendingOrders,
        confirmedOrders,
        packedOrders,
        shippedOrders,
        outForDeliveryOrders,
        deliveredOrders,
        cancelledOrders,
        totalRevenue
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// User: Track specific order
export const trackOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    const order = await Order.findById(id)
      .populate('products.productId', 'name images')
      .select('status tracking totalAmount createdAt');
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    // Check if user owns this order
    if (order.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    res.status(200).json({ 
      success: true, 
      tracking: {
        orderId: order._id,
        status: order.status,
        tracking: order.tracking,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        products: order.products
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// User: Cancel order
export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    // Check if user owns this order
    if (order.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Check if order can be cancelled
    if (['shipped', 'out-for-delivery', 'delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot cancel order with status: ${order.status}` 
      });
    }
    
    // Update order status to cancelled
    order.status = 'cancelled';
    order.tracking.push({
      stage: 'cancelled',
      message: 'Order cancelled by user',
      timestamp: new Date()
    });
    
    await order.save();
    
    res.status(200).json({ 
      success: true, 
      message: 'Order cancelled successfully',
      order 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// assigned order to tailors

export const assignOrderToTailor = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { tailorId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Only allow assignment if order is confirmed
    if (order.status !== "confirmed") {
      return res.status(400).json({ message: "Only confirmed orders can be assigned" });
    }

    order.assignedTo = tailorId;
    await order.save();

    res.status(200).json({ message: "Order assigned successfully", order });
  } catch (error) {
    res.status(500).json({ message: "Error assigning order", error: error.message });
  }
};

// get assigned orders

export const getAssignedOrders = async (req, res) => {
  try {
    const orders = await Order.find({ assignedTo: { $ne: null } })
      .populate("assignedTo", "username phone skillLevel") // populate tailor details
      .populate("products.productId", "name images"); 
      
    res.json({
  success: true,
  orders  
  
});
;
  } catch (error) {
    res.status(500).json({ message: "Error fetching assigned orders", error });
  }
};

//get unassigned orders

export const getUnassignedOrders = async (req, res) => {
  try {
    const orders = await Order.find({ assignedTo: null, status: "confirmed" })
     .populate("products.productId", "name images");

    res.json({
  success: true,
  orders 

});
;
  } catch (error) {
    res.status(500).json({ message: "Error fetching unassigned orders", error });
  }
};
// Admin/Tailor: Reject (unassign) an order
export const rejectAssignedOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log(orderId);    
    const order = await Order.findById(orderId);
    console.log(order);    
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Only allow rejection if order is currently assigned
    if (!order.assignedTo) {
      return res.status(400).json({ success: false, message: "Order is not assigned to any tailor" });
    }

    order.assignedTo = null; // Unassign the order
    await order.save();

    res.status(200).json({
      success: true,
      message: "Order has been unassigned successfully",
      order
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error unassigning order", error: error.message });
  }
};

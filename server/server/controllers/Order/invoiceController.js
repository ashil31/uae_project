import Order from '../../models/order.js';
import User from '../../models/user.js';
import Product from '../../models/product.js';

// Generate invoice data from order
export const generateInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId)
      .populate('userId', 'displayName username email phone addresses firstName lastName')
      .populate('products.productId', 'name images price category description');
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Calculate invoice details
    const subtotal = order.products.reduce((sum, product) => sum + (product.price * product.quantity), 0);
    const taxRate = 0.05; // 5% VAT for UAE
    const tax = subtotal * taxRate;
    const shipping = order.totalAmount - subtotal - tax > 0 ? order.totalAmount - subtotal - tax : 15.00;
    const discount = 0; // Can be implemented later
    
    // Get customer address (use default or first available)
    const customerAddresses = order.userId.addresses || [];
    const defaultAddress = customerAddresses.find(addr => addr.isDefault) || customerAddresses[0];
    
    const invoice = {
      invoiceNumber: `INV-${order._id.toString().slice(-8).toUpperCase()}`,
      orderId: order._id,
      issueDate: order.createdAt.toISOString().split('T')[0],
      dueDate: new Date(order.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from issue
      
      customer: {
        name: order.userId.displayName || order.userId.username || `${order.userId.firstName || ''} ${order.userId.lastName || ''}`.trim() || 'Unknown Customer',
        email: order.userId.email || 'N/A',
        phone: order.userId.phone || 'N/A',
        address: defaultAddress ? {
          street: defaultAddress.street || 'N/A',
          city: defaultAddress.city || 'N/A',
          state: defaultAddress.state || 'N/A',
          zip: defaultAddress.zipCode || 'N/A',
          country: defaultAddress.country || 'UAE'
        } : {
          street: 'N/A',
          city: 'N/A',
          state: 'N/A',
          zip: 'N/A',
          country: 'UAE'
        }
      },
      
      company: {
        name: 'UAE Fashion',
        address: {
          street: 'Business Bay, Level 25',
          city: 'Dubai',
          state: 'Dubai',
          zip: '54321',
          country: 'UAE'
        },
        phone: '+971 4 123 4567',
        email: 'info@uaefashion.com',
        website: 'www.uaefashion.com',
        taxNumber: 'TRN: 123456789012345'
      },
      
      items: order.products.map(product => ({
        id: product.productId._id,
        name: product.productId.name,
        description: `${product.productId.description || 'Premium quality item'} - ${product.color}, Size: ${product.size}`,
        quantity: product.quantity,
        unitPrice: product.price,
        total: product.price * product.quantity
      })),
      
      subtotal: subtotal,
      tax: tax,
      shipping: shipping,
      discount: discount,
      total: order.totalAmount,
      
      paymentMethod: order.paymentMethod || 'Credit Card',
      paymentStatus: order.status === 'delivered' ? 'Paid' : order.status === 'cancelled' ? 'Cancelled' : 'Pending',
      notes: 'Thank you for your business! We hope you love your new items.',
      
      // Additional order info
      orderStatus: order.status,
      tracking: order.tracking
    };
    
    res.status(200).json({ success: true, invoice });
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get all invoices (for admin invoice list)
export const getAllInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (page - 1) * limit;
    
    // Build query - only include orders that can have invoices
    let query = { status: { $nin: ['pending'] } }; // Exclude pending orders
    
    if (status && status !== '') {
      query.status = status;
    }
    
    // Search functionality
    if (search && search !== '') {
      const searchRegex = new RegExp(search, 'i');
      const userIds = await User.find({
        $or: [
          { displayName: searchRegex },
          { username: searchRegex },
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex }
        ]
      }).select('_id');
      
      query.$or = [
        { userId: { $in: userIds.map(u => u._id) } },
        { paymentSessionId: searchRegex }
      ];
    }
    
    const totalInvoices = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('userId', 'displayName username email phone firstName lastName')
      .populate('products.productId', 'name price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Format as invoices
    const invoices = orders.map(order => ({
      id: order._id,
      invoiceNumber: `INV-${order._id.toString().slice(-8).toUpperCase()}`,
      orderId: order._id,
      customer: order.userId.displayName || order.userId.username || `${order.userId.firstName || ''} ${order.userId.lastName || ''}`.trim() || 'Unknown Customer',
      email: order.userId.email || 'N/A',
      total: order.totalAmount,
      status: order.status === 'delivered' ? 'Paid' : order.status === 'cancelled' ? 'Cancelled' : 'Pending',
      issueDate: order.createdAt.toISOString().split('T')[0],
      paymentMethod: order.paymentMethod || 'Credit Card',
      itemCount: order.products.length
    }));
    
    res.status(200).json({ 
      success: true, 
      invoices,
      pagination: {
        page: parseInt(page),
        totalPages: Math.ceil(totalInvoices / limit),
        totalItems: totalInvoices,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get invoice statistics
export const getInvoiceStatistics = async (req, res) => {
  try {
    const totalInvoices = await Order.countDocuments({ status: { $nin: ['pending'] } });
    const paidInvoices = await Order.countDocuments({ status: 'delivered' });
    const pendingInvoices = await Order.countDocuments({ 
      status: { $in: ['confirmed', 'packed', 'shipped', 'out-for-delivery'] } 
    });
    const cancelledInvoices = await Order.countDocuments({ status: 'cancelled' });
    
    // Calculate total revenue from paid invoices
    const revenueResult = await Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;
    
    // Calculate pending revenue
    const pendingRevenueResult = await Order.aggregate([
      { $match: { status: { $in: ['confirmed', 'packed', 'shipped', 'out-for-delivery'] } } },
      { $group: { _id: null, pendingRevenue: { $sum: '$totalAmount' } } }
    ]);
    const pendingRevenue = pendingRevenueResult.length > 0 ? pendingRevenueResult[0].pendingRevenue : 0;
    
    res.status(200).json({
      success: true,
      statistics: {
        totalInvoices,
        paidInvoices,
        pendingInvoices,
        cancelledInvoices,
        totalRevenue,
        pendingRevenue
      }
    });
  } catch (error) {
    console.error('Error fetching invoice statistics:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
import Order from "../../models/order.js";
import Product from "../../models/product.js";
import User from "../../models/user.js";


const getAnalyticsData = async () => {
  try {
    // Retrieve analytics data from your database
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();
    

    const salesData = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
        },
      },
    ]);

    const { totalSales = 0, totalRevenue = 0 } = salesData[0] || {};

    return {
      totalUsers,
      totalProducts,
      totalSales,
      totalRevenue,
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export default getAnalyticsData;
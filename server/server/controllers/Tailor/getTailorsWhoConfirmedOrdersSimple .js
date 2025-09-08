import Order from "../../models/order.js";


export const getTailorsWhoConfirmedOrdersSimple = async (req, res) => {
  try {
    // find orders that are confirmed either by main status or having a tracking entry 'confirmed'
    const orders = await Order.find({
      assignedTo: { $ne: null },
      $or: [
        { status: "confirmed" },
        { tracking: { $elemMatch: { stage: "confirmed" } } },
      ],
    }).populate("assignedTo", "username phone skillLevel email") // select whatever fields you need
      .populate("products.productId", "name images");

    // Build unique tailors map (remove duplicates if a tailor has multiple orders)
    const tailorsMap = new Map();
    for (const order of orders) {
      const tailor = order.assignedTo;
      if (!tailor) continue;
      const id = tailor._id.toString();
      if (!tailorsMap.has(id)) {
        tailorsMap.set(id, {
          _id: tailor._id,
          username: tailor.username,
          phone: tailor.phone,
          skillLevel: tailor.skillLevel,
          email: tailor.email,
          confirmedOrders: [], // optionally list orders they confirmed
        });
      }
      tailorsMap.get(id).confirmedOrders.push({
        orderId: order._id,
        status: order.status,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        products: order.products,
      });
    }

    const tailors = Array.from(tailorsMap.values());

    return res.json({ success: true, totalTailors: tailors.length, tailors });
  } catch (error) {
    console.error("getTailorsWhoConfirmedOrdersSimple:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching tailors who confirmed orders",
      error: error.message,
    });
  }
};

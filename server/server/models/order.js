import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      color: { type: String, required: true },
      size: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
      price: { type: Number, required: true, min: 0 },
    },
  ],
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  paymentSessionId: {
    type: String,
    unique: true,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "confirmed", "packed", "shipped", "out-for-delivery", "delivered", "cancelled"],
    default: "pending",
  },
  paymentMethod: { type: String },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // User reference
    default: null
  },

  tracking: [
    {
      stage: {
        type: String,
        enum: ["confirmed", "packed", "shipped", "out-for-delivery", "delivered", "cancelled"],
        required: true,
      },
      message: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
    }
  ],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Order = mongoose.model("Order", orderSchema);
export default Order;


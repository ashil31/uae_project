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
  ref: 'Tailor', // Tailor reference
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




// {
//   "userId": "64aabc123...",
//   "products": [
//     {
//       "productId": "64ffde321...",
//       "color": "Black",
//       "size": "M",
//       "quantity": 1
//     },
//     {
//       "productId": "64ffde543...",
//       "color": "Beige",
//       "size": "One Size",
//       "quantity": 1
//     }
//   ],
//   "totalAmount": 349,
//   "status": "delivered",
//   "tracking": [
//     {
//       "stage": "confirmed",
//       "message": "Order confirmed by customer service",
//       "timestamp": "2024-01-20T10:30:00.000Z"
//     },
//     {
//       "stage": "packed",
//       "message": "Items packed in warehouse",
//       "timestamp": "2024-01-21T14:15:00.000Z"
//     },
//     {
//       "stage": "shipped",
//       "message": "Shipped via DHL Express",
//       "timestamp": "2024-01-22T09:00:00.000Z"
//     },
//     {
//       "stage": "out-for-delivery",
//       "message": "Package is on the way to customer",
//       "timestamp": "2024-01-23T10:00:00.000Z"
//     },
//     {
//       "stage": "delivered",
//       "message": "Package has been delivered successfully",
//       "timestamp": "2024-01-23T14:45:00.000Z"
//     }
//   ]
// }

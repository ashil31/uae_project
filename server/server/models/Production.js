import mongoose from "mongoose";

const productionLogSchema = new mongoose.Schema(
  {
    tailorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tailor",
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    unitsCompleted: { type: Number, required: true },
    materialsUsed: [
      {
        item: { type: String, required: true },
        quantity: { type: Number, required: true },
        unit: { type: String, required: true }, // e.g., "meters", "pieces"
      },
    ],
    date: { type: Date, default: Date.now },
    note: { type: String },
  },
  { timestamps: true }
);

const ProductionLog = mongoose.model("ProductionLog", productionLogSchema);

export default ProductionLog;

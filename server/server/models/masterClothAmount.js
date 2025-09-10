// models/masterClothAmount.js
import mongoose from "mongoose";

const masterClothAmountSchema = new mongoose.Schema({
  masterTailorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  fabricType: { type: String, required: true, set: v => (v===undefined||v===null?v:String(v).toLowerCase().trim()) },
  itemType: { type: String, required: true, set: v => (v===undefined||v===null?v:String(v).toLowerCase().trim()) },
  unitType: { type: String, required: true, set: v => (v===undefined||v===null?v:String(v).toLowerCase().trim()) },
  amount: { type: Number, required: true, default: 0, min: 0 },
  // optional reference back to global ClothAmount (for audit)
  clothAmountRef: { type: mongoose.Schema.Types.ObjectId, ref: "ClothAmount", default: null },
}, {
  timestamps: true,
});

masterClothAmountSchema.index({ masterTailorId: 1, fabricType: 1, itemType: 1, unitType: 1 }, { unique: true });

export default mongoose.model("MasterClothAmount", masterClothAmountSchema);

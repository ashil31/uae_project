import mongoose from "mongoose";

const lowerTrim = (v) => {
  if (v === undefined || v === null) return v;
  return String(v).toLowerCase().trim();
};

const capitalizeFirst = (v) => {
  if (!v && v !== "") return v;
  v = String(v);
  return v.charAt(0).toUpperCase() + v.slice(1);
};

const clothAmountSchema = new mongoose.Schema({
  fabricType: {
    type: String,
    required: true,
    set: lowerTrim,
    get: capitalizeFirst,
  },
  itemType: {
    type: String,
    required: true,
    set: lowerTrim,
    get: capitalizeFirst,
  },
  unitType: {
    type: String,
    required: true,
    set: lowerTrim,
    get: capitalizeFirst,
  },
  amount: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  }
}, {
  timestamps: true,
  toObject: { getters: true },
  toJSON: { getters: true },
});

// Ensure one doc per (fabricType, itemType, unitType)
clothAmountSchema.index({ fabricType: 1, itemType: 1, unitType: 1 }, { unique: true });

export default mongoose.model("ClothAmount", clothAmountSchema);

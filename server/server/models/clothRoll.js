import mongoose from 'mongoose';

const capitalizeFirst = (v) => {
  if (!v) return v;
  v = String(v);
  return v.charAt(0).toUpperCase() + v.slice(1); // "cotton" => "Cotton"
};

const lowerTrim = (v) => {
  if (v === undefined || v === null) return v;
  return String(v).toLowerCase().trim();
};

const clothRollSchema = new mongoose.Schema({
  rollNo: {
    type: String,
    unique: true,
  },

  amount: {
    type: Number,
    required: true,
    min: 0
  },

  itemType: {
    type: String,
    set: lowerTrim,           // store lowercase
    get: capitalizeFirst      // present with first char uppercase
  },

  fabricType: {
    type: String,
    set: lowerTrim,
    get: capitalizeFirst
  },

  unitType: {
    type: String,
    enum: ['meters', 'kilos', 'unit'], // keep enum values lowercase
    required: true,
    set: lowerTrim,
    get: capitalizeFirst
  },

  status: {
    type: String,
    required: true,
    default: 'available',
    set: lowerTrim,
    get: capitalizeFirst
  }
}, {
  timestamps: true,
  toObject: { getters: true }, // apply getters when using doc.toObject()
  toJSON: { getters: true }    // apply getters when converting to JSON (res.json)
});

// optional: ensure unique index (helps in some deployments)
clothRollSchema.index({ rollNo: 1 }, { unique: true });

const ClothRoll = mongoose.model('ClothRoll', clothRollSchema);
export default ClothRoll;

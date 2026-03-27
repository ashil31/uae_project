// models/rollAssignment.js
import mongoose from 'mongoose';

const lowerTrimOrNull = (v) => {
  if (v === undefined || v === null) return v;
  return String(v).toLowerCase().trim();
};

const ConsumptionSchema = new mongoose.Schema({
  // Optional physical roll reference (audit only)
  rollId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClothRoll' },

  // Prefer clothAmountId to resolve aggregate inventory (global pool)
  clothAmountId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClothAmount' },

  // Master pool reference (when a master has been credited and later allocates to tailors)
  masterClothAmountId: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterClothAmount' },

  fabricType: { type: String }, // optional fallback (human readable)
  itemType: { type: String },   // optional fallback (human readable)
  unitType: { type: String, required: true, set: v => (v===undefined||v===null? 'meters': String(v).toLowerCase().trim()) },

  amount: { type: Number, required: true, min: 0 },
  approvedAmount: { type: Number }, // set when approved

  // Parent refs (when this consumption is created as an allocation from another assignment)
  parentAssignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'RollAssignment' },
  parentConsumptionId: { type: mongoose.Schema.Types.ObjectId }, // subdoc _id of the parent consumption
  allocated: { type: Number, default: 0 },
}, {
  _id: true,        // ensure each consumption has an _id (addressable)
  timestamps: false
});

// top-level assignment schema
const rollassignmentSchema = new mongoose.Schema({
  tailorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Main new structure: array of consumption rows
  clothConsumptions: { type: [ConsumptionSchema], default: [] },

  assignedDate: { type: Date },     // scheduled date
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'inprogress', 'allocated', 'completed'], default: 'pending' },

  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },

  assignDate: { type: Date, default: Date.now },
  logs: [{
    used: { type: Number },
    returned: { type: Number },
    waste: { type: Number },
    garments: { S: Number, M: Number, L: Number, XL: Number, XXL: Number, XXXL: Number },
    timeSpent: Number,
    remark: String,
    date: Date
  }]
}, {
  timestamps: true
});

// Index for faster queries when listing assignments for a tailor or master
rollassignmentSchema.index({ tailorId: 1, createdAt: -1 });

// Optional convenience virtuals (if you want to use them later)
rollassignmentSchema.virtual('consumptionCount').get(function () {
  return Array.isArray(this.clothConsumptions) ? this.clothConsumptions.length : 0;
});

// When converting to JSON/XML/etc you might want to preserve getters
rollassignmentSchema.set('toJSON', { virtuals: true });
rollassignmentSchema.set('toObject', { virtuals: true });

const RollAssignment = mongoose.model('RollAssignment', rollassignmentSchema);
export default RollAssignment;

// models/rollAssignment.js
import mongoose from 'mongoose';

const ConsumptionSchema = new mongoose.Schema({
  // Optional physical roll reference (audit only)
  rollId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClothRoll' },

  // Prefer clothAmountId to resolve aggregate inventory
  clothAmountId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClothAmount' },

  fabricType: { type: String }, // optional fallback
  itemType: { type: String },   // optional fallback
  unitType: { type: String, required: true },

  amount: { type: Number, required: true, min: 0 },
  approvedAmount: { type: Number }, // set when approved

  // Parent refs (when this consumption is created as an allocation from another assignment)
  parentAssignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'RollAssignment' },
  parentConsumptionId: { type: mongoose.Schema.Types.ObjectId }, // subdoc _id of the parent consumption
  allocated: { type: Number, default: 0 },
}, {
  _id: true,        // <--- ensure each consumption has an _id (addressable)
  timestamps: false
});

const rollassignmentSchema = new mongoose.Schema({
  tailorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Main new structure: array of consumption rows
  clothConsumptions: { type: [ConsumptionSchema], default: [] },

  assignedDate: { type: Date },     // scheduled date
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'inprogress', 'completed'], default: 'pending' },

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

const RollAssignment = mongoose.model('RollAssignment', rollassignmentSchema);
export default RollAssignment;

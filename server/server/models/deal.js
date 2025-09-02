import mongoose from 'mongoose';

const dealSchema = new mongoose.Schema({
  product: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true 
  },
  discount: { 
    type: Number, 
    required: true,
    min: 1,
    max: 99
  },
  discountedPrice: { 
    type: Number, 
    required: true 
  },
  endDate: { 
    type: Date, 
    required: true 
  },
  enabled: { 
    type: Boolean, 
    default: false 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});


const Deal = mongoose.model('Deal', dealSchema);

export default Deal;
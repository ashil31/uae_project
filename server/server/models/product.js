import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  basePrice: { 
    type: Number, 
    required: [true, 'Base price is required'],
    min: [0, 'Price cannot be negative'] 
  },
  flatDiscount: { 
    type: Number, 
    default: 0,
    min: [0, 'Discount cannot be negative'] 
  },
  percentDiscount: { 
    type: Number, 
    default: 0,
    min: [0, 'Discount cannot be negative'] 
  },
  category: { 
    type: String, 
    required: [true, 'Category is required'], 
  },
  subCategory: { type: String },
  brand: { 
    type: String, 
    required: [true, 'Brand is required'] 
  },
  materials: { 
    type: [String], 
    required: [true, 'At least one material is required'] 
  },
  careInstructions: { type: String },
  tags: [{ type: String }],
  isFeatured: { 
    type: Boolean, 
    default: false 
  },
  isOnSale: { 
    type: Boolean, 
    default: false 
  },
  additionalInfo: {
    weight: { 
      type: Number, 
      min: [0, 'Weight cannot be negative'] 
    },
    dimensions: { type: String },
    size: [{ 
      type: String, 
      required: true, 
      enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'One Size'], 
    }],
    color: [{ 
      type: String, 
      required: [true, 'Color is required'] 
    }],
    sku: { 
      type: String, 
      required: true 
    },
    stock: { 
      type: Number, 
      required: [true, 'Stock is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0 
    },
    price: { 
      type: Number, 
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'] 
    }
  },
  images: [{
    url: { type: String, required: true },
    altText: { type: String }
  }],
  video: {
    url: { type: String },
    originalName: { type: String },
    size: { type: Number },
    format: { type: String, default: 'mp4' },
    duration: { type: Number }, // Video duration in seconds
    width: { type: Number }, // Video width in pixels
    height: { type: Number } // Video height in pixels
  },
  reviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  }],
  soldQuantity: {
    type: Number,
    default: 0,
    min: [0, 'Sold quantity cannot be negative']
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0,
    min: 0
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual property for isNew (less than 30 days old)
productSchema.virtual('isNew').get(function() {
  return Date.now() - this.createdAt < 30 * 24 * 60 * 60 * 1000;
});

const Product = mongoose.model('Product', productSchema);

export default Product;
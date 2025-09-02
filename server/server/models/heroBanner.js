  // models/heroBanner.model.js
  import mongoose from 'mongoose';

  const heroBannerSchema = new mongoose.Schema({
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters']
    },
    subtitle: {
      type: String,
      trim: true,
      maxlength: [200, 'Subtitle cannot exceed 200 characters']
    },
    cta: {
      type: String,
      default: 'Shop Now',
      trim: true,
      maxlength: [50, 'CTA text cannot exceed 50 characters']
    },
    link: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          return v === '' || /^\/[a-zA-Z0-9/-]*$/.test(v);
        },
        message: 'Link must be a valid relative URL path'
      }
    },
    textPosition: {
      type: String,
      enum: ['left', 'center', 'right'],
      default: 'left'
    },
    media: {
      type: {
        type: String,
        enum: ['image', 'video'],
        required: [true, 'Media type is required'],
        default: 'image'
      },
      url: {
        type: String,
        required: [true, 'Media URL is required']
      },
      altText: {
        type: String,
      },
      public_id: {
        type: String,
        required: [true, 'Media public ID is required']
      },
      // Video-specific fields
      duration: { type: Number }, // Video duration in seconds
      width: { type: Number }, // Media width in pixels
      height: { type: Number }, // Media height in pixels
      size: { type: Number }, // File size in bytes
      format: { type: String } // File format (webp, mp4, etc.)
    },
    // Keep image field for backward compatibility
    image: {
      url: { type: String },
      altText: { type: String },
      public_id: { type: String }
    },
    order: {
      type: Number,
      required: [true, 'Order is required'],
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true
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

  // Update the updatedAt field before saving
  heroBannerSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
  });

  // Auto-increment order for new banners
  heroBannerSchema.pre('save', async function(next) {
    if (this.isNew) {
      const count = await this.constructor.countDocuments();
      this.order = count;
    }
    next();
  });

  const HeroBanner = mongoose.model('HeroBanner', heroBannerSchema);

  export default HeroBanner;
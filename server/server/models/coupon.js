import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
    code: { 
        type: String,
        required: true,
        unique: true,
    },
    discountPercentage: {
        type: Number,
        required: true,
        min: 1,
        max: 99
    },
    expirationDate: {
        type: Date,
        required: true,
    },
    isActive: {
        type: Boolean,
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    }
},{
    timestamps: true
}
)

const Coupon = mongoose.model('Coupon', couponSchema);

export default Coupon;
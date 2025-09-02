import mongoose from 'mongoose'


const userSchema = new mongoose.Schema({
    username: { type: String },
    email: { type: String, required: true, unique: true },
    firstName: { type: String },
    lastName: { type: String },
    profileImg: { type: String},
    displayName: {type:String},
    photoURL: {type:String},
    password: { 
        type: String, 
        required: true
    },
    phone: { type: Number },
    customerId: { 
        type: String, 
        unique: true, 
        default: () => Math.floor(100000000 + Math.random() * 900000000).toString()
    },
    role: { 
        type: String, 
        required: true, 
        enum:['customer','wholesaler','admin', 'Tailor', 'MasterTailor'], 
        default: 'customer' 
    },
    firebaseUid: { type: String },
    verifiedAt: { type: Date },
    isEmailVerified: {
        type: Boolean,
        default: false,
    },
    addresses: [{
        type: { 
            type: String, 
            enum: ['home', 'work', 'other'], 
            default: 'home' 
        },
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        street: { type: String, required: true },
        city: { type: String, required: true },
        emirate: { 
            type: String, 
            enum: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'],
            default: 'Dubai'
        },
        postalCode: { type: String },
        country: { type: String, default: 'UAE' },
        phone: { type: String, required: true },
        isDefault: { type: Boolean, default: false }
    }],
    provider: { type: String },
    profileImg: { type: String },
    createdAt: { type: Date, default: Date.now },
    productVisited: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
        },
        count: {
            type: Number,
            default: 0,
        },
        visitedAt: {
            type: Date,
            default: Date.now
        },
    }],
    wishlist: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    orders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    }],
    refreshToken: { type: String },
    lastLogin: { type:Date },
    isBanned: { type: Boolean, default: false }
}, {
    timestamps: true
})


const User = mongoose.model('User', userSchema);

export default User;
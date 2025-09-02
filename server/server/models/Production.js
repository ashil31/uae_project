import mongoose from 'mongoose';

const productionSchema = new mongoose.Schema({
    tailor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    clothesMade: {
        type: Number,
        required: true,
        min: 0,
    },
    notes: {
        type: String,
        trim: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

const Production = mongoose.model('Production', productionSchema);

export default Production;

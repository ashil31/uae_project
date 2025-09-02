import mongoose from 'mongoose';

const updateSchema = new mongoose.Schema({
    from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // The tailor sending the update
        required: true,
    },
    // You could add a 'to' field if updates can be sent to specific MasterTailors
    // to: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'User', 
    // },
    message: {
        type: String,
        required: true,
        trim: true,
    },
    isRead: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});

const Update = mongoose.model('Update', updateSchema);

export default Update;

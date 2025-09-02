import mongoose from 'mongoose';

const rollassignmentSchema = new mongoose.Schema({
    tailorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tailor',
    },
    rollId:{
        type: mongoose.Schema.Types.ObjectId,
        ref:'ClothRoll'
    },
    assignedDate:{
        type: Date,
    },
    status:{
        type:String,
        default:'InProgress'
    },
    assignDate: {
        type: Date,
        default: Date.now
    },
    logs: [{
        used: {
            type: Number,
        },
        returned: {
            type:Number,
        },
        waste:{
            type:Number,
        },
        garments: {
            S: Number,
            M: Number,
            L: Number,
            XL: Number,
            XXL: Number,
            XXXL: Number,
        },
        timeSpent: Number,
        remark: String,
        date: Date
    }]
});

const RollAssignment = mongoose.model('RollAssignment', rollassignmentSchema);

export default RollAssignment;
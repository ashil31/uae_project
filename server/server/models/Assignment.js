import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema({
    clothRoll: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ClothRoll', // Assumes you have a 'ClothRoll' model
        required: true,
    },
    tailor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // References the User model
        required: true,
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // The MasterTailor or Admin who assigned the work
        required: true,
    },
    status: {
        type: String,
        enum: ['In Progress', 'Completed', 'On Hold'],
        default: 'In Progress',
    },
    notes: {
        type: String,
        trim: true,
    },
}, {
    timestamps: true, // Adds createdAt and updatedAt fields
});

const Assignment = mongoose.model('Assignment', assignmentSchema);

export default Assignment;

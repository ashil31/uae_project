import mongoose from 'mongoose';

const clothRollSchema = new mongoose.Schema({
    rollNo: {
        type:String,
        required:true
    },
    amount: {
        type: Number,
        required: true
    },
    // length:{
    //     type:Number,
    //     required:true
    // },
    // quantity: {
    //     type: Number,
    // },
    itemType: {
        type: String,
    },
    fabricType:{
        type:String,
    },
    unitType:{
        type:String,
        enum:['meters','kilos'],
        required:true
    },
    status:{
        type: String,
        required:true,
        default:"Available"
    }
},{
    timestamps: true
})

const ClothRoll = mongoose.model('ClothRoll',clothRollSchema);

export default ClothRoll;
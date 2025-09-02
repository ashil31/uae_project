import mongoose from 'mongoose';

const tailorSchema = new mongoose.Schema({
    name: {
        type:String,
        required:true
    },
    contact:{
        type:Number,
        required:true
    },
    skillLevel:{
        type: String,
    }
});

const Tailor = mongoose.model('Tailor',tailorSchema);

export default Tailor
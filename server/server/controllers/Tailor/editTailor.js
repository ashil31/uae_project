import Tailor from "../../models/tailor.js";


const editTailor = async (req, res) => {
    try {
        const tailorId = req.params.id;
        const allowedFields = ['name', 'contact', 'skillLevel'];

        const updateTailor = {};
        allowedFields.forEach(field => {
            if(req.body[field] !== undefined) {
                updateTailor[field] = req.body[field];
            }
        });

        const tailor = await Tailor.findByIdAndUpdate(tailorId, {$set: updateTailor}, {new:true});
        if(!tailor){
            return res.status(401).json({message:"Tailor not found"})
        };

        res.status(200).json({
            message:'Tailor updated successfully',
            tailor
        })
    } catch (error) {
        console.log('Error in editing Tailor:', error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}


export default editTailor;
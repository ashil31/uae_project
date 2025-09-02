import ClothRoll from "../../models/clothRoll.js";


const editClothRoll = async (req, res) => {
    try {
        const rollId = req.params.id;

        const allowedFields = ["rollNo", "fabricType", "amount", "unitType"];
        const updates = {}

        allowedFields.forEach(field => {
            if(req.body[field] !== undefined ){
                updates[field] = req.body[field]
            };
        });

        const updatedRoll = await ClothRoll.findByIdAndUpdate(
            rollId,
            { $set: updates},
            { new: true }
        );

        if(!updatedRoll){
            return res.status(404).json({ message: "Cloth roll not found" })
        };

        res.status(200).json(updatedRoll)
    } catch (error) {
        console.error('Error updating cloth roll', error)
        res.status(500).json({ messsage: "Internal server error" })
    }
};

export default editClothRoll;
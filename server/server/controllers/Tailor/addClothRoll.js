import ClothRoll from "../../models/clothRoll.js";


const addClothRoll = async (req, res) => {
    try {
        const { rollNo, amount, fabricType, unitType, itemType } = req.body;

        const exists = await ClothRoll.findOne({rollNo});
        if(exists){
            return res.status(401).json({
                message: "This cloth roll already exists"
            })
        }

        const newClothRoll = new ClothRoll({
            rollNo,
            amount,
            fabricType,
            unitType,
            itemType
        });
        await newClothRoll.save();

        res.status(201).json({
            message: "Successfully added the cloth roll",
            newClothRoll,
        })
    } catch (error) {
        res.status(500).json({
            message: "Something went wrong",
            error: error.message
        })
    }
}


export default addClothRoll;
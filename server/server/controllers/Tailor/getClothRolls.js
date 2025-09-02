import ClothRoll from "../../models/clothRoll.js";


const getClothRolls = async (req, res) => {
    try {
        const clothRolls = await ClothRoll.find().sort({ createdAt:-1 });
        
        return res.status(201).json(clothRolls);
    } catch(err){
        console.log("Error in getClothRolls", err.message);
        return res.status(500).send({message: "Internal Server Error"})
    }
}

export default getClothRolls;
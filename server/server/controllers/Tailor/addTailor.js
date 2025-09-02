import Tailor from "../../models/tailor.js";



const addTailor = async (req, res) => {
    try{
        const { name, contact, skillLevel } = req.body;
        const tailor = new Tailor({
            name,
            contact,
            skillLevel
        });
        await tailor.save();
        return res.status(201).json({message: "tailor added successfully", tailor})
    }catch(err){
        console.log("error", err.message);
        return res.status(500).send(err.message);
    }
}

export default addTailor;
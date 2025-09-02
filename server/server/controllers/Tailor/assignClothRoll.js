import ClothRoll from "../../models/clothRoll.js";
import RollAssignment from "../../models/rollAssignment.js";



const assignClothRoll = async(req, res) => {
    try {
        const { tailorId, rollId } = req.body;
        
        const roll = await ClothRoll.findById(rollId);
        if(!roll) {
            return res.status(404).json({ message: "Roll not found" });
        };

        if(roll.status === "assigned") {
            return res.status(400).json({ message: "Roll is not available" });
        };

        const assignment = new RollAssignment({
            tailorId,
            rollId,
        });
        await assignment.save();

        roll.status = "assigned";
        await roll.save();

        return res.status(200).json({ message: "Roll assigned successfully", assignment });
    } catch (error) {
        console.log("Error in assignClothRoll:", error.message);
        return res.status(500).json({ message: "Server Error", error: error.message });
    }
}

export default assignClothRoll;
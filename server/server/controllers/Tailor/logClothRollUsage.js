import ClothRoll from "../../models/clothRoll.js";
import RollAssignment from "../../models/rollAssignment.js";



const logClothRollUsage = async(req,res)=>{
    try {
        const { id } = req.params;
        const { used, returned, waste, garments, timeSpent, remarks } = req.body;

        const assignment = await RollAssignment.findById(id);
        if(!assignment) {
            return res.status(404).json({ message: "Assignment not found" });
        };

        assignment.logs.push({ used, returned, waste, garments, timeSpent, remarks });
        await assignment.save();

        // Optional: mark as completed based on total rolls used
        if (assignment.logs.length > 0) {
            assignment.status = 'Completed';
            await assignment.save();
        }

        const roll = await ClothRoll.findById(assignment.rollId);
        roll.status = 'used';
        await roll.save();

        return res.status(200).json({ message: "Log added successfully", assignment });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error });
    }
}

export default logClothRollUsage;
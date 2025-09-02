import ClothRoll from "../../models/clothRoll.js";
import RollAssignment from "../../models/rollAssignment.js";


const deleteClothRoll = async (req, res) => {
    try {
        const rollId = req.params.id;

        const clothRoll = await ClothRoll.findByIdAndDelete(rollId);
        if(!clothRoll) {
            return res.status(404).json({ message: "Cloth roll not found" });
        };

        if(clothRoll.status === 'assigned') {
            return res.status(403).json({message: `Cannot delete a roll that is ${clothRoll.status}`})
        };

        const hasAssignedRolls = await RollAssignment.exists({ rollId });
        if(hasAssignedRolls) {
            return res.status(409).json({message: "Cannot delete a roll that has been assigned to a tailor"})
        };

        await clothRoll.deleteOne();
        res.status(200).json({message: "Successfully deleted the cloth roll"});
    } catch(err){
        console.log("Error in delete cloth roll", err);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
}


export default deleteClothRoll; 
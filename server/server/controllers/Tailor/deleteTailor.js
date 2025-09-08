import RollAssignment from "../../models/rollAssignment.js";
import User from "../../models/user.js";



const deleteTailor = async (req, res) => {
    try {
        const userId = req.params.id;

       const tailor = await User.findById(userId);
       if(!tailor){
           return res.status(404).json({message:"Tailor not found"})
       };

       const relatedAssignments = await RollAssignment.find({userId});
       if(relatedAssignments.length > 0){
           return res.status(400).json({message:"Tailor has assigned cloth rolls, cannot be deleted"})
       };

       await tailor.deleteOne();

       res.status(200).json({message:"Tailor Deleted Successfully"})
    } catch(err){
        console.log("Error in deleteTailor", err.message);
        return res.status(500).json({
            message: "Internal Server Error",
            error: err
        });
    }
}

export default deleteTailor;
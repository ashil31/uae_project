import RollAssignment from "../../models/rollAssignment.js";



const getAssignedClothRolls = async (req, res) => {
    try {
        const assignments = await RollAssignment.find()
            .populate('tailorId', '-__v')
            .populate('rollId', '-__v')
            .select('-__v')
            .sort({createdAt:-1});

        return res.status(201).json({
            message:"Successfully fetched all assigned cloth rolls",
            assignments
        })
    } catch(err){
        console.log("Error in getting assigned cloth rolls", err);
        return res.status(500).json({
            success:false,
            message:"Internal server error"
        });
    }
}

export default getAssignedClothRolls;
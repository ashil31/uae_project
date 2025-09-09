// controllers/Tailor/getAssignedClothRolls.js
import RollAssignment from "../../models/rollAssignment.js";

const getAssignedClothRolls = async (req, res) => {
  try {
    const assignments = await RollAssignment.find()
      .populate('tailorId', '-__v')
      // populate nested refs inside clothConsumptions
      .populate({ path: 'clothConsumptions.rollId', select: '-__v' })
      .populate({ path: 'clothConsumptions.clothAmountId', select: '-__v' })
      .select('-__v')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Successfully fetched all assigned cloth rolls",
      assignments
    });
  } catch (err) {
    console.error("Error in getting assigned cloth rolls", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export default getAssignedClothRolls;

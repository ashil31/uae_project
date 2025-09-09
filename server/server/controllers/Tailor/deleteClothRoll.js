import ClothRoll from "../../models/clothRoll.js";
import RollAssignment from "../../models/rollAssignment.js";
import ClothAmount from "../../models/clothAmount.js";

const deleteClothRoll = async (req, res) => {
  try {
    const rollId = req.params.id;

    // Find the roll
    const clothRoll = await ClothRoll.findById(rollId);
    if (!clothRoll) {
      return res.status(404).json({ message: "Cloth roll not found" });
    }

    // Prevent deletion if assigned
    if (clothRoll.status === "assigned") {
      return res.status(403).json({
        message: `Cannot delete a roll that is ${clothRoll.status}`,
      });
    }

    // Check if assigned in RollAssignment collection
    const hasAssignedRolls = await RollAssignment.exists({ rollId });
    if (hasAssignedRolls) {
      return res.status(409).json({
        message: "Cannot delete a roll that has been assigned to a tailor",
      });
    }

    // Decrease ClothAmount total for this roll
    await ClothAmount.findOneAndUpdate(
      {
        fabricType: clothRoll.fabricType,
        itemType: clothRoll.itemType,
        unitType: clothRoll.unitType,
      },
      { $inc: { amount: -clothRoll.amount } }
    );

    // Delete the roll
    await clothRoll.deleteOne();

    return res.status(200).json({ message: "Successfully deleted the cloth roll" });
  } catch (err) {
    console.log("Error in delete cloth roll", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export default deleteClothRoll;

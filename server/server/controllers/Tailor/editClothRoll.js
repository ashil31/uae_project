import ClothRoll from "../../models/clothRoll.js";
import ClothAmount from "../../models/clothAmount.js";

const editClothRoll = async (req, res) => {
  try {
    const rollId = req.params.id;

    const allowedFields = ["rollNo", "fabricType", "amount", "unitType"];
    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Find the old roll before updating (to adjust totals properly)
    const oldRoll = await ClothRoll.findById(rollId);
    if (!oldRoll) {
      return res.status(404).json({ message: "Cloth roll not found" });
    }

    // Update the roll
    const updatedRoll = await ClothRoll.findByIdAndUpdate(
      rollId,
      { $set: updates },
      { new: true }
    );

    // If amount/fabricType/itemType/unitType changed, update ClothAmount totals
    if (
      updates.amount !== undefined ||
      updates.fabricType !== undefined ||
      updates.itemType !== undefined ||
      updates.unitType !== undefined
    ) {
      // Decrease old total
      await ClothAmount.findOneAndUpdate(
        {
          fabricType: oldRoll.fabricType,
          itemType: oldRoll.itemType,
          unitType: oldRoll.unitType,
        },
        { $inc: { amount: -oldRoll.amount } },
        { new: true }
      );

      // Increase new total
      await ClothAmount.findOneAndUpdate(
        {
          fabricType: updatedRoll.fabricType,
          itemType: updatedRoll.itemType,
          unitType: updatedRoll.unitType,
        },
        { $inc: { amount: updatedRoll.amount } },
        { upsert: true, new: true }
      );
    }

    res.status(200).json(updatedRoll);
  } catch (error) {
    console.error("Error updating cloth roll", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export default editClothRoll;

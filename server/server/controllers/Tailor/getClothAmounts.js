// controllers/getClothAmounts.js
import ClothAmount from "../../models/clothAmount.js";

const getClothAmounts = async (req, res) => {
  try {
    const clothAmounts = await ClothAmount.find().sort({ createdAt: -1 }).lean();
    return res.status(200).json(clothAmounts);
  } catch (err) {
    console.error("Error in getClothAmounts:", err.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export default getClothAmounts;

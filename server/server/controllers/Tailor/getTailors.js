import Tailor from "../../models/tailor.js";


const getTailors = async (req, res) => {
  try {
    const tailors = await Tailor.find().sort({ createdAt: -1 });
    return res.status(201).json(tailors);
  } catch (error) {
    console.log(error.message);
  }
};

export default getTailors;
import User from "../../models/user.js";

const getTailors = async (req, res) => {
  try {
    // Fetch users with role = 'Tailor' or 'MasterTailor'
    const tailors = await User.find(
      { role: { $in: ['Tailor', 'MasterTailor'] } },
      { username: 1, role:1, firstName: 1, lastName: 1, email: 1, skillLevel:1 } // only return useful fields
    ).sort({ createdAt: -1 });

    return res.status(200).json(tailors);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: "Failed to fetch tailors" });
  }
};

export default getTailors;

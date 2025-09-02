import User from "../../models/user.js"

const getUserAddresses = async(req, res) => {
    try {
        console.log('Fetching addresses for user:', req.params.id);
        const userId = req.params.id;

        // Find user and return addresses
        const user = await User.findById(userId).select('addresses');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            addresses: user.addresses
        });

    } catch (error) {
        console.error('Error fetching addresses:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
}

export default getUserAddresses
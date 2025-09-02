import User from "../../models/user.js"

const deleteAddress = async(req, res) => {
    try {
        const userId = req.params.id;
        const addressId = req.params.addressId;

        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Find and remove the address
        const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === addressId);
        if (addressIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        // Remove the address
        user.addresses.splice(addressIndex, 1);
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Address deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
}

export default deleteAddress
import User from "../../models/user.js"

const setDefaultAddress = async(req, res) => {
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

        // Find the address
        const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === addressId);
        if (addressIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        // Set all addresses to non-default
        user.addresses.forEach(addr => {
            addr.isDefault = false;
        });

        // Set the selected address as default
        user.addresses[addressIndex].isDefault = true;

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Default address updated successfully',
            address: user.addresses[addressIndex]
        });

    } catch (error) {
        console.error('Error setting default address:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
}

export default setDefaultAddress
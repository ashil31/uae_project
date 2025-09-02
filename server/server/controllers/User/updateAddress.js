import User from "../../models/user.js"

const updateAddress = async(req, res) => {
    try {
        const userId = req.params.id;
        const addressId = req.params.addressId;
        const { type, firstName, lastName, street, city, emirate, postalCode, country, phone, isDefault } = req.body;
 
        // Validate required fields
        if (!firstName || !lastName || !street || !city || !emirate || !phone) {
           return res.status(400).json({
                success: false,
                message: 'All required fields must be provided'
            });
        }

        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Find and update the address
        const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === addressId);
        if (addressIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        // If this address is set as default, remove default from other addresses
        if (isDefault) {
            user.addresses.forEach((addr, index) => {
                if (index !== addressIndex) {
                    addr.isDefault = false;
                }
            });
        }

        // Update the address
        user.addresses[addressIndex] = {
            ...user.addresses[addressIndex],
            type: type || 'home',
            firstName,
            lastName,
            street,
            city,
            emirate: emirate || 'Dubai',
            postalCode: postalCode || '',
            country: country || 'UAE',
            phone,
            isDefault: isDefault || false
        };

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Address updated successfully',
            address: user.addresses[addressIndex]
        });

    } catch (error) {
        console.error('Error updating address:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
}

export default updateAddress
import User from "../../models/user.js"

const addAddress = async(req, res) => {
    try {
        const userId = req.user.id; 
        const { type, firstName, lastName, street, city, emirate, postalCode, country, phone, isDefault } = req.body;

        
        // Validate required fields
        if (!firstName || !lastName || !street || !city || !emirate || !phone) {
            return res.status(400).json({
                success: false,
                message: 'All required fields must be provided'
            });
        }

        // Find user and add address
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // If this address is set as default, remove default from other addresses
        if (isDefault) {
            user.addresses.forEach(addr => {
                addr.isDefault = false;
            });
        }

        const newAddress = {
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

        user.addresses.push(newAddress);
        await user.save();

        // Return the newly added address
        const addedAddress = user.addresses[user.addresses.length - 1];

        res.status(201).json({
            success: true,
            message: 'Address added successfully',
            address: addedAddress
        });

    } catch (error) {
        console.error('Error adding address:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
}

export default addAddress
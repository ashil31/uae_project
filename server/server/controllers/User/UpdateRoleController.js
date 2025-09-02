import User from '../../models/user.js';

const updateUserRole = async (req, res) => {
    try {
        const { userId, newRole } = req.body;

        // Validate required fields
        if (!userId || !newRole) {
            return res.status(400).json({
                success: false,
                message: 'User ID and new role are required'
            });
        }

        // Validate role
        const validRoles = ['customer', 'wholesaler', 'admin'];
        if (!validRoles.includes(newRole)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role. Must be customer, wholesaler, or admin'
            });
        }

        // Find user by ID
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent admin from changing their own role
        if (user._id.toString() === req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'You cannot change your own role'
            });
        }

        // Update user role
        user.role = newRole;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'User role updated successfully',
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                status: user.isBanned ? 'banned' : 'active',
                lastLogin: user.lastLogin,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

export default updateUserRole;
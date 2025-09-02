import User from '../../models/user.js'


const getAllUsers = async(req,res) => {
    try {
        // Get all Users with no filtering
        const users = await User.find({})
            .select('-password -refreshTokens -__v') // Exclude sensitive fields
            .lean(); // Convert to plain JS objects

        res.status(200).json({
            success: true,
            users,
            count: users.length,
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users',
            error: error.message,
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        });
    }
}

export default getAllUsers


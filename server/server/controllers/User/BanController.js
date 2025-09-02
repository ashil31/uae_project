import User from '../../models/user.js'
import mongoose from 'mongoose';


const banUser = async(req,res) => {
    try {
        const {id, banStatus} = req.body
        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid product ID' });
        }

        // Validate input
        if (typeof banStatus !== 'boolean') {
            return res.status(400).json({ message: 'isBanned must be a boolean value' });
        }

        const user = await User.findById(req.body.id).lean();
        // console.log(user)

        // Find and update the User
        // Update user ban status
        const updatedUser = await User.findByIdAndUpdate(
            id,
            { $set: { isBanned: banStatus } },
            { new: true, runValidators: true }
        ).select('-password');

        return res.status(200).json({
            success: true,
            message: `User ${banStatus ? 'banned' : 'unbanned'} successfully`,
            user: updatedUser
        });


    } catch (error) {
        
    }
}

export default banUser
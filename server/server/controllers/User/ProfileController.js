import User from '../../models/user.js';

export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const user = await User.findById(userId).select('-password -refreshToken');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: 'Account suspended',
        code: 'ACCOUNT_SUSPENDED'
      });
    }

    return res.status(200).json({
      success: true,
      user: user
    });

  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

export default getUserProfile;
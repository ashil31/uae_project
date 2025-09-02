// middlewares/RefreshTokenCheck.js
import jwt from 'jsonwebtoken';
import User from '../models/user.js';

/**
 * Middleware to check if refresh token is still valid
 * This can be used on sensitive operations to ensure user session is still valid
 */
const RefreshTokenCheck = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'No refresh token found',
        shouldLogout: true
      });
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      
      const user = await User.findById(decoded.userId);
      
      if (!user || user.isBanned) {
        return res.status(401).json({
          success: false,
          message: 'Invalid user or account suspended',
          shouldLogout: true
        });
      }

      if (user.refreshToken !== refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token',
          shouldLogout: true
        });
      }

      // Add user to request for use in route handlers
      req.refreshTokenUser = user;
      next();

    } catch (jwtError) {
      console.log('❌ Refresh token expired in middleware:', jwtError.message);
      
      // Clear cookies
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });
      
      res.clearCookie('accessToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });

      return res.status(401).json({
        success: false,
        message: 'Refresh token expired - please login again',
        shouldLogout: true
      });
    }

  } catch (error) {
    console.error('❌ RefreshTokenCheck middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export default RefreshTokenCheck;
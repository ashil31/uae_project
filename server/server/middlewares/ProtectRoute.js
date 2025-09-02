import jwt from 'jsonwebtoken';
import User from '../models/user.js';

const ProtectRoute = async (req, res, next) => {
  try {

    // Try to get token from multiple sources
    let accessToken = req.cookies?.accessToken || 
                     req.headers['x-access-token'] || 
                     req.headers.authorization?.replace('Bearer ', '');


    // If no token, return unauthorized
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Token missing',
        code: 'TOKEN_MISSING'
      });
    }

    try {
      const decode = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);

      const user = await User.findById(decode.userId).select('-password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: User not found',
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

      req.user = user;
      next(); // Proceed to route
      
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: Access Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: Invalid token',
          code: 'TOKEN_INVALID'
        });
      }
      
      throw error;
    }
  } catch (error) {
    console.error('ProtectRoute error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
}

export default ProtectRoute;



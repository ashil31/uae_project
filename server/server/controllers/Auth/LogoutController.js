import express from 'express'
const router = express.Router();
import jwt from 'jsonwebtoken'
import User from '../../models/user.js';
import { clearAuthCookies } from '../../utils/cookieConfig.js';

const logout = async (req, res) => {
  try {
    console.log('🚪 Logout request received');
    
    const refreshToken = req.cookies?.refreshToken;
    
    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        
        // Use userId instead of id (matching the token generation)
        const user = await User.findById(decoded.userId);
        if (user) {
          user.refreshToken = null;
          await user.save();
          console.log('✅ Refresh token cleared from database for user:', user.email);
        }
      } catch (jwtError) {
        // If refresh token is invalid/expired, still proceed with logout
        console.log('⚠️ Invalid refresh token during logout, proceeding anyway:', jwtError.message);
      }
    }
    
    // Clear cookies regardless of token validity
    clearAuthCookies(res);
     
    console.log('✅ Logout successful, cookies cleared');
    
    return res.status(200).json({ 
      success: true,
      message: 'Logout successful' 
    });

  } catch (error) {
    console.error('❌ Logout error:', error);
    
    // Even if there's an error, clear cookies and return success
    // to ensure user is logged out on client side
    clearAuthCookies(res);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Logout completed with warnings' 
    });
  }
};



export default logout;
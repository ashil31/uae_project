import User from "../../models/user.js";
import jwt from "jsonwebtoken";
import { generateAccessToken } from "../../utils/token.js";
import { clearAuthCookies, getCookieConfig } from "../../utils/cookieConfig.js";
import rateLimit from "express-rate-limit";

const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per IP
  message: 'Too many refresh attempts, please try again later.'
});

export const refreshAccessToken = async (req, res) => {
  try {
    console.log('🔄 Refresh token request received');

    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      console.log('❌ No refresh token found in cookies');
      return res.status(401).json({
        success: false,
        message: "No refresh token found"
      });
    }

    let decode;
    try {
      decode = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (jwtError) {
      console.log('❌ Invalid/expired refresh token:', jwtError.message);
      
      // Clear cookies when refresh token is invalid/expired
      clearAuthCookies(res);
      
      return res.status(401).json({
        success: false,
        message: "Refresh token expired - please login again",
        shouldLogout: true
      });
    }

    const user = await User.findById(decode.userId);

    if (!user) {
      console.log('❌ User not found for refresh token');
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.isBanned) {
      console.log('❌ User is banned');
      return res.status(403).json({
        success: false,
        message: "Account suspended"
      });
    }

    if(user.refreshToken !== refreshToken) {
      console.log('❌ Refresh token mismatch');
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token"
      });
    } 

    const newAccessToken = generateAccessToken(user);
    
    // Set cookie with cross-origin configuration
    const cookieConfig = getCookieConfig();
    res.cookie('accessToken', newAccessToken, {
      ...cookieConfig,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    console.log('✅ Access token refreshed successfully for user:', user.email);

    return res.status(200).json({ 
      success: true, 
      accessToken: newAccessToken,
      message: "Token refreshed successfully"
    });

  } catch (err) {
    console.error("❌ RefreshToken error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};



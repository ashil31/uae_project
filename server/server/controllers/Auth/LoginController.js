import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../../models/user.js';
import { generateAccessToken, generateRefreshToken } from '../../utils/token.js';
import { setAuthCookies } from '../../utils/cookieConfig.js';
import rateLimit from "express-rate-limit";


// Rate limiting for login attempts
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per IP
  message: 'Too many login attempts, please try again later.'
});

  
// Constants for cookie duration
const ACCESS_TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 1 day

export const login = async (req, res) => {
  try {
    const { email, password, provider, displayName, photoURL } = req.body;

    // Social login handling
    if (provider && ['google', 'facebook'].includes(provider.toLowerCase())) {
      return handleSocialLogin(req, res, email, password, provider, displayName, photoURL);
    }

    // Email/password login
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    if (user.isBanned) {
      return res.status(403).json({ 
        success: false, 
        message: 'Account suspended' 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email address'
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // Update user's token version (invalidates old refresh tokens)
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    // Set authentication cookies
    setAuthCookies(res, accessToken, refreshToken);

    // Return tokens in response
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

const handleSocialLogin = async (req, res, email, password, provider, displayName, photoURL) => {
  try {
    let user = await User.findOne({ email });

     const hashedPassword = await bcrypt.hash(password || email, 12);

    if (!user) {
      // Create new user for social login
      user = new User({
        email,
        username: email.split("@")[0],
        displayName: displayName || email.split("@")[0],
        password: hashedPassword, 
        photoURL: photoURL || '',
        role: 'customer',
        provider: provider.toLowerCase(),
        isEmailVerified: true
      });
      await user.save();
    } else if (user.provider && user.provider !== provider.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: `Please login using ${user.provider}`
      });
    }

    if (user.isBanned) {
      return res.status(403).json({ 
        success: false, 
        message: 'Account suspended' 
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    // Set authentication cookies
    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Social login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Social login failed' 
    });
  }
};

export default login
// controllers/Auth/DebugController.js
import jwt from 'jsonwebtoken';

export const debugAuth = async (req, res) => {
  try {
    const debug = {
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      cookies: {},
      headers: {},
      tokens: {}
    };

    // Check cookies
    debug.cookies = {
      accessToken: req.cookies?.accessToken ? 'Present' : 'Missing',
      refreshToken: req.cookies?.refreshToken ? 'Present' : 'Missing',
      allCookies: Object.keys(req.cookies || {})
    };

    // Check headers
    debug.headers = {
      authorization: req.headers.authorization ? 'Present' : 'Missing',
      'x-access-token': req.headers['x-access-token'] ? 'Present' : 'Missing',
      origin: req.headers.origin,
      'user-agent': req.headers['user-agent']?.substring(0, 50) + '...'
    };

    // Analyze tokens if present
    const accessToken = req.cookies?.accessToken || req.headers['x-access-token'] || req.headers.authorization?.replace('Bearer ', '');
    const refreshToken = req.cookies?.refreshToken;

    if (accessToken) {
      try {
        const decoded = jwt.decode(accessToken);
        debug.tokens.accessToken = {
          valid: 'Unknown',
          payload: decoded,
          expired: decoded ? (decoded.exp * 1000 < Date.now()) : 'Cannot determine'
        };

        // Try to verify
        try {
          jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
          debug.tokens.accessToken.valid = 'Valid';
        } catch (verifyError) {
          debug.tokens.accessToken.valid = verifyError.name;
        }
      } catch (decodeError) {
        debug.tokens.accessToken = { error: 'Cannot decode token' };
      }
    }

    if (refreshToken) {
      try {
        const decoded = jwt.decode(refreshToken);
        debug.tokens.refreshToken = {
          valid: 'Unknown',
          payload: decoded,
          expired: decoded ? (decoded.exp * 1000 < Date.now()) : 'Cannot determine'
        };

        // Try to verify
        try {
          jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
          debug.tokens.refreshToken.valid = 'Valid';
        } catch (verifyError) {
          debug.tokens.refreshToken.valid = verifyError.name;
        }
      } catch (decodeError) {
        debug.tokens.refreshToken = { error: 'Cannot decode token' };
      }
    }

    return res.status(200).json({
      success: true,
      debug
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Debug endpoint error',
      error: error.message
    });
  }
};

export default debugAuth;
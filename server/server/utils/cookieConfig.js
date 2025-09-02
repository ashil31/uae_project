// utils/cookieConfig.js

import path from "path";

/**
 * Get cookie configuration based on environment
 * @returns {Object} Cookie configuration object
 */
export const getCookieConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    // domain: isProduction ? '.vercel.app' : undefined,
  };
};

/**
 * Get cookie configuration for clearing cookies
 * @returns {Object} Cookie configuration object for clearing
 */
export const getClearCookieConfig = () => {
  return getCookieConfig();
};

/**
 * Set authentication cookies
 * @param {Object} res - Express response object
 * @param {string} accessToken - Access token
 * @param {string} refreshToken - Refresh token
 */
export const setAuthCookies = (res, accessToken, refreshToken) => {
  const cookieConfig = getCookieConfig();
  
  res.cookie('accessToken', accessToken, {
    ...cookieConfig,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie('refreshToken', refreshToken, {
    ...cookieConfig,
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  });
};

/**
 * Clear authentication cookies
 * @param {Object} res - Express response object
 */
export const clearAuthCookies = (res) => {
  const clearConfig = getClearCookieConfig();
  
  res.clearCookie('accessToken', clearConfig);
  res.clearCookie('refreshToken', clearConfig);
};

export default {
  getCookieConfig,
  getClearCookieConfig,
  setAuthCookies,
  clearAuthCookies
};
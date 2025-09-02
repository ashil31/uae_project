// utils/authTest.js - Test authentication flow
import jwt from 'jsonwebtoken';

/**
 * Test JWT token generation and verification
 */
export const testTokenGeneration = () => {
  console.log('🧪 Testing JWT token generation...');
  
  try {
    // Test access token
    const testPayload = { userId: '507f1f77bcf86cd799439011' };
    const accessToken = jwt.sign(testPayload, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(testPayload, process.env.JWT_REFRESH_SECRET, { expiresIn: '1d' });
    
    console.log('✅ Access token generated:', accessToken.substring(0, 50) + '...');
    console.log('✅ Refresh token generated:', refreshToken.substring(0, 50) + '...');
    
    // Test verification
    const decodedAccess = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
    const decodedRefresh = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    console.log('✅ Access token verified:', decodedAccess);
    console.log('✅ Refresh token verified:', decodedRefresh);
    
    return true;
  } catch (error) {
    console.error('❌ Token test failed:', error.message);
    return false;
  }
};

/**
 * Test environment variables
 */
export const testEnvironmentVariables = () => {
  console.log('🧪 Testing environment variables...');
  
  const requiredVars = [
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'NODE_ENV'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing);
    return false;
  }
  
  console.log('✅ All required environment variables present');
  console.log('✅ NODE_ENV:', process.env.NODE_ENV);
  
  return true;
};

/**
 * Run all authentication tests
 */
export const runAuthTests = () => {
  console.log('🚀 Running authentication tests...\n');
  
  const envTest = testEnvironmentVariables();
  const tokenTest = testTokenGeneration();
  
  console.log('\n📊 Test Results:');
  console.log('Environment Variables:', envTest ? '✅ PASS' : '❌ FAIL');
  console.log('Token Generation:', tokenTest ? '✅ PASS' : '❌ FAIL');
  
  const allPassed = envTest && tokenTest;
  console.log('Overall:', allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
  
  return allPassed;
};

export default {
  testTokenGeneration,
  testEnvironmentVariables,
  runAuthTests
};
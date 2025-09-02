
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginUser, clearError } from '../store/slices/authSlice';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { rateLimiter } from '../utils/authUtils';
import { sanitizeInput, validateAdminEmail } from '../utils/security';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading, error, isAuthenticated, user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && user) {
      localStorage.setItem('adminUser', JSON.stringify(user));
      toast.success(`Welcome back, ${user.username || user.email}!`);
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleSubmit = async(e) => {
    e.preventDefault();
    try {
      // 2. Sanitize inputs
      const sanitizedEmail = sanitizeInput(email.trim().toLowerCase());
      const sanitizedPassword = sanitizeInput(password);

      // 3. Validate email format and domain
      if (!validateAdminEmail(sanitizedEmail)) {
        toast.error('Invalid admin email address');
        return;
      }
      // 4. Password strength check
      if (sanitizedPassword.length < 8) {
        toast.error('Password must be at least 8 characters');
        return;
      }
      // 6. Dispatch login action with sanitized inputs
      dispatch(loginUser({ 
        email: sanitizedEmail, 
        password: sanitizedPassword 
      }));

    } catch (error) {
      console.error('Login error:', error);
      toast.error('An error occurred during login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 w-full max-w-md border border-white/20"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <LogIn className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Admin Login</h1>
          <p className="text-gray-600">Access your admin dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              placeholder="admin@uaefashion.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 pr-12"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 disabled:opacity-50"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;

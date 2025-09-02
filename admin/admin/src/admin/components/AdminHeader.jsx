
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Menu, Bell, User, LogOut, Sun, Moon } from 'lucide-react';
import { logoutUser } from '../../store/slices/authSlice';
import adminApi from '../services/adminApi';
import { useEffect } from 'react';


const AdminHeader = ({ onMenuClick, sidebarOpen }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [stats, setStats] = useState(null);

  const handleLogout = () => {
    dispatch(logoutUser());
    localStorage.removeItem('adminUser');
    navigate('/login');
  };

  // Fetch contact statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await adminApi.getContactStats();
        setStats(response.data);
      } catch (err) {
        console.error('Failed to fetch contact stats:', err);
      }
    };

    fetchStats();
  },[])


  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          
          <div className="hidden md:block">
            <h1 className="text-xl font-semibold text-gray-800">Admin Dashboard</h1>
            <p className="text-sm text-gray-600">Manage your eCommerce platform</p>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 relative"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1 right-1 h-3 w-3 bg-red-500 text-[10px] font-bold text-white rounded-full flex items-center justify-center px-1">{stats?.overview?.pendingContacts}</span>
          </motion.button>

          {/* Theme toggle */}
          {/* <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
          >
            <Sun className="w-5 h-5 text-gray-600" />
          </motion.button> */}

          {/* User menu */}
          <div className="relative group">
            <motion.button
              whileHover={{ scale: 1.05 }}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium text-gray-800">{user?.name}</div>
                <div className="text-xs text-gray-600 capitalize">{user?.role}</div>
              </div>
            </motion.button>

            {/* Dropdown menu */}
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="p-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 w-full p-2 text-left rounded-lg hover:bg-red-50 text-red-600 transition-colors duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;

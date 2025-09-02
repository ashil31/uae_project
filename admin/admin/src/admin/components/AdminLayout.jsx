
import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import { useSelector } from 'react-redux';
import { useEffect } from 'react';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { isLoading, error, isAuthenticated, user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      navigate('/login', { replace: true });
    }
  }, [isLoading, isAuthenticated, user, navigate]);
  

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <AdminHeader 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />
        
        <main className="p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

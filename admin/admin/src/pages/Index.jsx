
import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Users, Shield, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="container mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-6">
              UAE Fashion Admin
            </h1>
            <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
              Complete eCommerce management dashboard for fashion retailers in the UAE
            </p>
            
            <div className="flex justify-center gap-6">
              <Link
                to="/admin"
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                Access Admin Dashboard
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-white/20">
            <ShoppingBag className="w-12 h-12 text-purple-600 mb-4" />
            <h3 className="text-xl font-semibold mb-3">Product Management</h3>
            <p className="text-gray-600">Comprehensive product catalog with inventory tracking</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-white/20">
            <Users className="w-12 h-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-3">User Management</h3>
            <p className="text-gray-600">Role-based access control and user administration</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-white/20">
            <Shield className="w-12 h-12 text-green-600 mb-4" />
            <h3 className="text-xl font-semibold mb-3">Order Tracking</h3>
            <p className="text-gray-600">Real-time order management and shipping updates</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-white/20">
            <BarChart3 className="w-12 h-12 text-orange-600 mb-4" />
            <h3 className="text-xl font-semibold mb-3">Analytics</h3>
            <p className="text-gray-600">Comprehensive business insights and reporting</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;

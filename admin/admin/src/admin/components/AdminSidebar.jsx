import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  ShoppingBag,
  Package,
  Users,
  Image,
  Tag,
  Shield,
  MapPin,
  Star,
  X,
  Receipt,
  Mail,
  Ruler,
  Calculator,
} from 'lucide-react';

const AdminSidebar = ({ isOpen, onClose }) => {
  const location = useLocation();

  const menuItems = [
    { icon: BarChart3, label: 'Dashboard', path: '/admin' },
    { icon: Package, label: 'Products', path: '/admin/products' },
    { icon: ShoppingBag, label: 'Orders', path: '/admin/orders' },
    { icon: Users, label: 'Users', path: '/admin/users' },
    // { icon: Ruler, label: 'Tailor Manager', path: '/admin/tailors' },
    { icon: Image, label: 'Banners', path: '/admin/banners' },
    { icon: Tag, label: 'Deals', path: '/admin/deals' },
    { icon: Shield, label: 'Access Control', path: '/admin/access' },
    { icon: MapPin, label: 'Order Tracking', path: '/admin/tracking' },
    { icon: Star, label: 'Review Manager', path: '/admin/reviews' },
    { icon: Receipt, label: 'Invoice Generator', path: '/admin/invoices'},
    { icon: Calculator, label: 'Cloth Calculator', path: '/admin/cloth-calculator' },
    { icon: Mail, label: 'Query manager', path: '/admin/queries' },
    { icon: Ruler, label: 'Tailors Manager', path: '/admin/tailors' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay for mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 z-50 h-full w-64 bg-white shadow-xl border-r border-gray-200 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">UA</span>
                </div>
                <span className="font-semibold text-gray-800 text-base">UAE Fashion</span>
              </div>
              <button
                onClick={onClose}
                className="lg:hidden text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu List */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {menuItems.map(({ icon: Icon, label, path }) => {
                const isActive = location.pathname === path;
                return (
                  <Link
                  onClick={onClose}
                    key={path}
                    to={path}
                    className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="border-t border-gray-200 p-4 text-center text-xs text-gray-500">
              © 2025 UAE Fashion · v1.0.0
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default AdminSidebar;

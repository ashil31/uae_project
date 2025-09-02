import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Plus, Users, Package, BarChart3, TrendingUp, RefreshCw, AlertCircle } from 'lucide-react';
import { getTailors } from '../../store/slices/tailorSlice';
import { getClothRolls } from '../../store/slices/clothRollSlice';
import { getAssignments } from '../../store/slices/assignmentSlice';
import TailorList from '../components/Tailors/TailorList';
import ClothRollList from '../components/ClothRolls/ClothRollList';
import RollAssignmentList from '../components/Assignments/RollAssignmentList';
import ProductivityDashboard from '../components/Dashboard/ProductivityDashboard';
import toast from 'react-hot-toast';

const TailorManager = () => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Get loading states from all slices
  const { loading: tailorsLoading, error: tailorsError } = useSelector((state) => state.tailors);
  const { loading: clothRollsLoading, error: clothRollsError } = useSelector((state) => state.clothRolls);
  const { loading: assignmentsLoading, error: assignmentsError } = useSelector((state) => state.assignments);

  const isLoading = tailorsLoading || clothRollsLoading || assignmentsLoading;
  const hasError = tailorsError || clothRollsError || assignmentsError;

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'tailors', label: 'Tailors', icon: Users },
    { id: 'cloth-rolls', label: 'Cloth Rolls', icon: Package },
    { id: 'assignments', label: 'Assignments', icon: TrendingUp },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <ProductivityDashboard />;
      case 'tailors':
        return <TailorList />;
      case 'cloth-rolls':
        return <ClothRollList />;
      case 'assignments':
        return <RollAssignmentList />;
      default:
        return <ProductivityDashboard />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tailor Management</h1>
          <p className="text-gray-600">Manage tailors, cloth rolls, and track productivity</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {renderContent()}
      </motion.div>
    </div>
  );
};

export default TailorManager;

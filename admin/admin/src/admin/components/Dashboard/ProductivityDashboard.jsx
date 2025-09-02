import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Users, 
  Package, 
  Clock, 
  AlertTriangle, 
  Award,
  BarChart3,
  PieChart,
  Filter,
  Download,
  Calendar
} from 'lucide-react';
import { getAssignments } from '../../../store/slices/assignmentSlice';
import { getTailors } from '../../../store/slices/tailorSlice';
import { getClothRolls } from '../../../store/slices/clothRollSlice';
import ProductivityChart from './ProductivityChart';
import WasteAnalysisChart from './WasteAnalysisChart';
import SizeDistributionChart from './SizeDistributionChart';

const ProductivityDashboard = () => {
  const dispatch = useDispatch();
  
  // ✅ Add default empty arrays to prevent undefined errors
  const { assignments = [] } = useSelector((state) => state.assignments);
  const { tailors = [] } = useSelector((state) => state.tailors);
  const { clothRolls = [] } = useSelector((state) => state.clothRolls);
  
  const [dateFilter, setDateFilter] = useState('30'); // Last 30 days
  const [selectedMetric, setSelectedMetric] = useState('productivity');

  if (!Array.isArray(assignments) || !Array.isArray(tailors) || !Array.isArray(clothRolls)) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading dashboard data...</div>
      </div>
    );
  }

  useEffect(() => {
    dispatch(getTailors());
    dispatch(getClothRolls());
    dispatch(getAssignments());
  }, [dispatch]);

  // Calculate comprehensive statistics
  const calculateStats = () => {
    const now = new Date();
    const filterDate = new Date(now.getTime() - (parseInt(dateFilter) * 24 * 60 * 60 * 1000));
    
    // ✅ Safe filtering with fallback
    const safeAssignments = Array.isArray(assignments) ? assignments : [];
    const safeTailors = Array.isArray(tailors) ? tailors : [];
    const safeClothRolls = Array.isArray(clothRolls) ? clothRolls : [];
    
    const recentAssignments = safeAssignments.filter(assignment => 
      new Date(assignment.assignedDate) >= filterDate
    );

    const stats = {
      totalAssignments: safeAssignments.length,
      recentAssignments: recentAssignments.length,
      activeTailors: safeTailors.length,
      totalRolls: safeClothRolls.length,
      availableRolls: safeClothRolls.filter(roll => roll.status === 'available').length,
      assignedRolls: safeClothRolls.filter(roll => roll.status === 'assigned').length,
      usedRolls: safeClothRolls.filter(roll => roll.status === 'used').length,
      completedAssignments: safeAssignments.filter(a => a.status === 'Completed').length,
      inProgressAssignments: safeAssignments.filter(a => a.status === 'In Progress').length,
    };

    console.log("safe assignments :", safeAssignments);
    // ✅ Safe totals calculation with logs safety check
    const totals = safeAssignments.reduce((acc, assignment) => {
      const logs = Array.isArray(assignment.logs) ? assignment.logs : [];
      logs.forEach(log => {
        if (log && typeof log === 'object') {
          acc.totalClothUsed += log.used || 0;
          acc.totalClothWasted += log.waste || 0;
          acc.totalClothReturned += log.returned || 0;
          acc.totalTimeSpent += log.timeSpent || 0;
          acc.totalGarments += (log.garments?.S || 0) + (log.garments?.M || 0) + 
                             (log.garments?.L || 0) + (log.garments?.XL || 0) + 
                             (log.garments?.XXL || 0);
        }
      });
      return acc;
    }, {
      totalClothUsed: 0,
      totalClothWasted: 0,
      totalClothReturned: 0,
      totalTimeSpent: 0,
      totalGarments: 0,
    });

    const wastePercentage = totals.totalClothUsed > 0 
      ? ((totals.totalClothWasted / totals.totalClothUsed) * 100).toFixed(1)
      : 0;

    const avgProductivity = totals.totalClothUsed > 0
      ? (totals.totalGarments / totals.totalClothUsed).toFixed(2)
      : 0;

    return { ...stats, ...totals, wastePercentage, avgProductivity };
  };

  // Calculate tailor performance rankings
  const getTailorRankings = () => {
    // ✅ Safe array checks
    const safeTailors = Array.isArray(tailors) ? tailors : [];
    const safeAssignments = Array.isArray(assignments) ? assignments : [];
    
    const tailorStats = safeTailors.map(tailor => {
      const tailorAssignments = safeAssignments.filter(a => a.tailorId?._id === tailor._id);
      
      const performance = tailorAssignments.reduce((acc, assignment) => {
        const logs = Array.isArray(assignment.logs) ? assignment.logs : [];
        logs.forEach(log => {
          if (log && typeof log === 'object') {
            acc.clothUsed += log.used || 0;
            acc.clothWasted += log.waste || 0;
            acc.timeSpent += log.timeSpent || 0;
            acc.garments += (log.garments?.S || 0) + (log.garments?.M || 0) + 
                           (log.garments?.L || 0) + (log.garments?.XL || 0) + 
                           (log.garments?.XXL || 0);
          }
        });
        return acc;
      }, { clothUsed: 0, clothWasted: 0, timeSpent: 0, garments: 0 });

      const wastePercentage = performance.clothUsed > 0 
        ? ((performance.clothWasted / performance.clothUsed) * 100)
        : 0;

      const productivity = performance.clothUsed > 0
        ? (performance.garments / performance.clothUsed)
        : 0;

      return {
        ...tailor,
        ...performance,
        wastePercentage,
        productivity,
        assignments: tailorAssignments.length,
      };
    });

    return tailorStats.sort((a, b) => b.productivity - a.productivity);
  };

  const stats = calculateStats();
  const topTailors = getTailorRankings().slice(0, 5);

  const statCards = [
    {
      title: 'Total Assignments',
      value: stats.totalAssignments,
      change: `+${stats.recentAssignments}`,
      changeLabel: `in last ${dateFilter} days`,
      icon: TrendingUp,
      color: 'blue',
    },
    {
      title: 'Active Tailors',
      value: stats.activeTailors,
      change: `${stats.completedAssignments}`,
      changeLabel: 'completed assignments',
      icon: Users,
      color: 'green',
    },
    {
      title: 'Available Rolls',
      value: stats.availableRolls,
      change: `${stats.assignedRolls}`,
      changeLabel: 'currently assigned',
      icon: Package,
      color: 'yellow',
    },
    {
      title: 'Total Garments',
      value: stats.totalGarments,
      change: `${stats.avgProductivity}`,
      changeLabel: 'avg per meter',
      icon: Award,
      color: 'purple',
    },
    {
      title: 'Waste Percentage',
      value: `${stats.wastePercentage}%`,
      change: `${stats.totalClothWasted}m`,
      changeLabel: 'total waste',
      icon: AlertTriangle,
      color: stats.wastePercentage > 10 ? 'red' : 'green',
    },
    {
      title: 'Total Time',
      value: `${stats.totalTimeSpent}h`,
      change: `${(stats.totalTimeSpent / stats.totalGarments || 0).toFixed(1)}h`,
      changeLabel: 'avg per garment',
      icon: Clock,
      color: 'indigo',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Productivity Dashboard</h2>
          <p className="text-gray-600">Comprehensive overview of tailor performance and efficiency</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          
          <button className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-4 rounded-lg shadow border"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <div className="flex items-center mt-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full bg-${stat.color}-100 text-${stat.color}-800`}>
                    {stat.change}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">{stat.changeLabel}</span>
                </div>
              </div>
              <div className={`p-2 rounded-full bg-${stat.color}-100`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Productivity Trends Chart */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Productivity Trends</h3>
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-400 hover:text-gray-600">
                  <BarChart3 className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600">
                  <PieChart className="w-4 h-4" />
                </button>
              </div>
            </div>
            <ProductivityChart assignments={assignments} />
          </div>

          {/* Waste Analysis Chart */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Waste Analysis</h3>
            <WasteAnalysisChart assignments={assignments} />
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Top Performers */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
            <div className="space-y-3">
              {topTailors.length > 0 ? topTailors.map((tailor, index) => (
                <div key={tailor._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-purple-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{tailor.name}</p>
                      <p className="text-xs text-gray-500">{tailor.assignments} assignments</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">{tailor.productivity.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">productivity</p>
                  </div>
                </div>
              )) : (
                <p className="text-gray-500 text-center py-4">No tailor data available</p>
              )}
            </div>
          </div>

          {/* Size Distribution */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Size Distribution</h3>
            <SizeDistributionChart assignments={assignments} />
          </div>

          {/* Quick Actions */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full px-4 py-2 text-left text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors">
                Generate Monthly Report
              </button>
              <button className="w-full px-4 py-2 text-left text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                Export Tailor Performance
              </button>
              <button className="w-full px-4 py-2 text-left text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
                Schedule Inventory Check
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {/* ✅ Safe recent activity filtering */}
          {(assignments || [])
            .filter(a => Array.isArray(a.logs) && a.logs.length > 0)
            .sort((a, b) => new Date(b.logs[b.logs.length - 1].date) - new Date(a.logs[a.logs.length - 1].date))
            .slice(0, 5)
            .map((assignment) => {
              const lastLog = assignment.logs[assignment.logs.length - 1];
              const totalGarments = Object.values(lastLog.garments || {}).reduce((sum, count) => sum + (count || 0), 0);
              
              return (
                <div key={assignment._id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {assignment.tailorId?.name || 'Unknown'} - {assignment.rollId?.rollNumber || assignment.rollId?.rollNo || 'Unknown'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Produced {totalGarments} garments • Used {lastLog.used || 0}m cloth • {lastLog.timeSpent || 0}h
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {new Date(lastLog.date).toLocaleDateString()}
                      </p>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        assignment.status === 'Completed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {assignment.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          {(assignments || []).filter(a => Array.isArray(a.logs) && a.logs.length > 0).length === 0 && (
            <div className="p-4 text-center text-gray-500">
              No recent activity found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductivityDashboard;

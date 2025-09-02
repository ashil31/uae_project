import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Plus, Edit2, Eye, Search, Calendar, TrendingUp, Package } from 'lucide-react';
import { getAssignments } from '../../../store/slices/assignmentSlice';
import RollAssignmentFormModal from './RollAssignmentFormModal';
import AssignmentUsageLog from './AssignmentUsageLog';

const RollAssignmentList = () => {
  const dispatch = useDispatch();
  const { assignments = [], loading } = useSelector(state => state.assignments);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    dispatch(getAssignments());
  }, [dispatch]);

  const filteredAssignments = (assignments || []).filter(assignment => {
    const tailorName = assignment.tailorId?.name || '';
    const rollNumber = assignment.rollId?.rollNumber || assignment.rollId?.rollNo || '';
    const matchesSearch = tailorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        rollNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || assignment.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const calculateTotals = (logs = []) => {
    return (logs || []).reduce((acc, log) => {
      if (!log) return acc;
      
      acc.used += log.used || 0;
      acc.returned += log.returned || 0;
      acc.waste += log.waste || 0;
      acc.garments += (log.garments?.S || 0) + (log.garments?.M || 0) + 
                    (log.garments?.L || 0) + (log.garments?.XL || 0) + 
                    (log.garments?.XXL || 0);
      acc.timeSpent += log.timeSpent || 0;
      return acc;
    }, { used: 0, returned: 0, waste: 0, garments: 0, timeSpent: 0 });
  };

  // ✅ This stays in RollAssignmentList - it's for the stats cards
  const stats = {
    total: (assignments || []).length,
    inProgress: (assignments || []).filter(a => a.status === 'InProgress').length,
    completed: (assignments || []).filter(a => a.status === 'Completed').length,
    totalGarments: (assignments || []).reduce((sum, a) => sum + calculateTotals(a.logs || []).garments, 0),
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'InProgress':
        return 'bg-blue-100 text-blue-800';
      case 'Completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="flex justify-center py-10">Loading assignments...</div>;
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Roll Assignments</h2>
          <p className="text-sm text-gray-600">Track cloth roll assignments and productivity</p>
        </div>
        <button
          onClick={() => setShowAssignModal(true)}
          className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Assign Roll</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Assignments', value: stats.total, color: 'blue', icon: Package },
          { label: 'In Progress', value: stats.inProgress, color: 'yellow', icon: Calendar },
          { label: 'Completed', value: stats.completed, color: 'green', icon: TrendingUp },
          { label: 'Total Garments', value: stats.totalGarments, color: 'purple', icon: TrendingUp },
        ].map((stat, index) => (
          <div key={index} className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`p-2 rounded-full bg-${stat.color}-100`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by tailor or roll number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tailor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roll Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Garments
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roll Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Used/Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Waste %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAssignments.length === 0 ? (
                <tr>

                  <td colSpan="9" className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      <Package className="mx-auto h-8 w-8 mb-4" />
                      <h3 className="text-sm font-medium text-gray-900">No assignments found</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {searchTerm || filterStatus !== 'all' 
                          ? 'Try adjusting your search or filters' 
                          : 'Get started by assigning a cloth roll to a tailor'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((assignment) => {
                  const totals = calculateTotals(assignment.logs || []);
                  const waste = totals.waste || 0;
                  const wastePercentage = Math.round(((waste / (assignment.rollId?.length || 1)) * 100));
                  
                  return (
                    <motion.tr
                      key={assignment._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50"
                    >
                      {console.log(assignment)}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {assignment.tailorId?.name || 'Unknown'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {assignment.rollId?.rollNumber || assignment.rollId?.rollNo || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {assignment.assignDate ? new Date(assignment.assignDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(assignment.status)}`}>
                          {assignment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {totals.garments}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {assignment.rollId?.length || 0}m
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {totals.used}/{assignment.rollId?.length || 0}m
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          wastePercentage > 15 ? 'bg-red-100 text-red-800' : 
                          wastePercentage > 10 ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-green-100 text-green-800'
                        }`}>
                          {wastePercentage}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedAssignment(assignment);
                              setShowLogModal(true);
                            }}
                            className="text-purple-600 hover:text-purple-900"
                            title="Log Usage"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedAssignment(assignment);
                              // Show detailed view modal
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <RollAssignmentFormModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
      />

      <AssignmentUsageLog
        isOpen={showLogModal}
        onClose={() => {
          setShowLogModal(false);
          setSelectedAssignment(null);
        }}
        assignment={selectedAssignment}
      />
    </div>
  );
};

export default RollAssignmentList;

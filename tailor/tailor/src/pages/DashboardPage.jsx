import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser, selectUserRole } from '../features/auth/authSlice';
import { motion } from 'framer-motion';
import { Users, Scissors, Shirt, Clock, Loader2, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fetchUnassignedOrders, fetchAssignedWork, getTailors, fetchOrderStatistics } from '../features/tailor/tailorSlice';

// Mock data for the chart
const productionData = [
  { name: 'Mon', completed: 4 }, { name: 'Tue', completed: 6 }, { name: 'Wed', completed: 5 },
  { name: 'Thu', completed: 8 }, { name: 'Fri', completed: 7 }, { name: 'Sat', completed: 9 },
];

// Reusable Stat Card Component
const StatCard = ({ icon, title, value, color, isLoading }) => (
  <motion.div 
    whileHover={{ scale: 1.05 }}
    className="bg-white p-6 rounded-xl shadow-md flex items-center space-x-4 border border-gray-200"
  >
    <div className={`p-3 rounded-full ${color}`}>{icon}</div>
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      {isLoading ? 
        <Loader2 className="h-7 w-7 animate-spin text-gray-400 mt-1" /> : 
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      }
    </div>
  </motion.div>
);

// Master Tailor Dashboard
const MasterTailorDashboard = ({ user, unassignedOrders, assignedWork, tailors, statistics, loading, isLoadingStats }) => (
  <div>
    <h2 className="text-2xl font-semibold text-gray-800">Master Tailor Dashboard</h2>
    <p className="mt-1 text-gray-600">Welcome back, {user?.name}!</p>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
      <StatCard icon={<Shirt size={24} className="text-blue-600"/>} title="Unassigned Orders" value={unassignedOrders.length} color="bg-blue-100" isLoading={loading} />
      <StatCard icon={<Scissors size={24} className="text-yellow-600"/>} title="Orders In Progress" value={assignedWork.filter(o => o.status === 'In Progress').length} color="bg-yellow-100" isLoading={loading} />
      <StatCard icon={<DollarSign size={24} className="text-green-600"/>} title="Total Revenue" value={`$${(statistics?.totalRevenue || 0).toLocaleString()}`} color="bg-green-100" isLoading={isLoadingStats} />
      <StatCard icon={<Users size={24} className="text-purple-600"/>} title="Active Tailors" value={tailors.length} color="bg-purple-100" isLoading={loading} />
    </div>

    <div className="mt-8 bg-white p-6 rounded-xl shadow-md border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Order Status Breakdown</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <p className="text-3xl font-bold text-blue-600">{isLoadingStats ? '...' : statistics?.confirmedOrders || 0}</p>
          <p className="text-sm text-gray-500">Confirmed</p>
        </div>
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <p className="text-3xl font-bold text-purple-600">{isLoadingStats ? '...' : statistics?.packedOrders || 0}</p>
          <p className="text-sm text-gray-500">Packed</p>
        </div>
        <div className="text-center p-4 bg-indigo-50 rounded-lg">
          <p className="text-3xl font-bold text-indigo-600">{isLoadingStats ? '...' : statistics?.shippedOrders || 0}</p>
          <p className="text-sm text-gray-500">Shipped</p>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <p className="text-3xl font-bold text-green-600">{isLoadingStats ? '...' : statistics?.deliveredOrders || 0}</p>
          <p className="text-sm text-gray-500">Delivered</p>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
      <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-4">Weekly Production</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={productionData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="completed" fill="#4f46e5" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);

// Tailor Dashboard
const TailorDashboard = ({ user, assignedWork, loading }) => {
  const myWork = assignedWork.filter(work => work.assignedTailor?._id === user?.id);
  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-800">Tailor Dashboard</h2>
      <p className="mt-1 text-gray-600">Welcome, {user?.name}!</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <StatCard icon={<Clock size={24} className="text-orange-600"/>} title="Pending Tasks" value={myWork.filter(o => o.status === 'Assigned').length} color="bg-orange-100" isLoading={loading} />
        <StatCard icon={<Scissors size={24} className="text-yellow-600"/>} title="Tasks In Progress" value={myWork.filter(o => o.status === 'In Progress').length} color="bg-yellow-100" isLoading={loading} />
      </div>
    </div>
  );
};

// Main DashboardPage
const DashboardPage = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const role = useSelector(selectUserRole);
  const { unassignedOrders, assignedWork, tailors, statistics, loading, isLoadingStats } = useSelector((state) => state.tailor);

  useEffect(() => {
    if (role === 'MasterTailor') {
      dispatch(fetchUnassignedOrders());
      dispatch(fetchAssignedWork());
      dispatch(getTailors());
      dispatch(fetchOrderStatistics());
    } else if (role === 'Tailor') {
      dispatch(fetchAssignedWork());
    }
  }, [dispatch, role]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-6 bg-gray-50 min-h-screen"
    >
      {role === 'MasterTailor' ? (
        <MasterTailorDashboard
          user={user}
          unassignedOrders={unassignedOrders}
          assignedWork={assignedWork}
          tailors={tailors}
          statistics={statistics}
          loading={loading}
          isLoadingStats={isLoadingStats}
        />
      ) : (
        <TailorDashboard
          user={user}
          assignedWork={assignedWork}
          loading={loading}
        />
      )}
    </motion.div>
  );
};

export default DashboardPage;

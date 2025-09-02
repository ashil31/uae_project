
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { CartesianGrid, LineChart, Tooltip, Line, Legend, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { fetchDashboardData } from '../../store/slices/adminSlice';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
);

const Dashboard = () => {
  const dispatch = useDispatch();
  const { dashboardData, dailySalesData, topProducts, isLoading } = useSelector((state) => state.admin);

  useEffect(() => {
    dispatch(fetchDashboardData());
  }, [dispatch]);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Weekly Revenue',
      },
    },
  };

  const chartData = {
    labels: dailySalesData.map((item) => item.date),
    datasets: [
      {
        label: 'Revenue',
        data: dailySalesData.map((item) => item.revenue),
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        borderColor: 'rgba(53, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <HelmetProvider>
      
      <Helmet>
        <title>Dashboard - UAE Fashion Admin</title>
      </Helmet>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome to UAE Fashion Admin</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="bg-white rounded-lg shadow-sm border p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
                <p className="text-2xl font-bold text-gray-900">${dashboardData.totalRevenue?.toLocaleString()}</p>
                <p className="text-xs text-green-600">+20.1% from last month</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v20m9-9H3" />
                </svg>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="bg-white rounded-lg shadow-sm border p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Total Orders</h3>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.totalSales?.toLocaleString()}</p>
                <p className="text-xs text-blue-600">+180 new orders</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="bg-white rounded-lg shadow-sm border p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Products</h3>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.totalProducts}</p>
                <p className="text-xs text-purple-600">+12 new products</p>
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                </svg>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="bg-white rounded-lg shadow-sm border p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.totalUsers?.toLocaleString()}</p>
                <p className="text-xs text-orange-600">+201 new users</p>
              </div>
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
            </div>
          </motion.div>

        </div>

        {/* Charts and Top Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Weekly Revenue</h3>
            <Bar data={chartData} options={chartOptions} />
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Top Selling Products</h3>
            <div className="space-y-4">
              {/* {topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full text-sm">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-gray-500">{product.sales} sales</p>
                    </div>
                  </div>
                  <span className="font-semibold">${product.revenue?.toLocaleString()}</span>
                </div>
              ))} */}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div 
        className='bg-gray-50 rounded-lg shadow-sm border p-6'
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}  
      >
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={dailySalesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey='date' stroke='#8884d8' />
            <YAxis yAxisId="left" stroke="#82ca9d" />
            <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="sales" stroke="#8884d8" yAxisId="left" activeDot={{ r: 8 }} name='Sales' />
            <Line type="monotone" dataKey="revenue" stroke="#82ca9d" yAxisId="right" activeDot={{ r: 8 }} name='Revenue' />
          </LineChart>
        </ResponsiveContainer>

      </motion.div>

    </HelmetProvider>
  );
};

export default Dashboard;

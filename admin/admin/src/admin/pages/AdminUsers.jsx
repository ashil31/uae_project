import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import AdminTable from '../components/AdminTable';
import StatusBadge from '../components/StatusBadge';
import { fetchUsers, banUser } from '../../store/slices/usersSlice';

const AdminUsers = () => {
  const dispatch = useDispatch();
  const { users, isLoading } = useSelector((state) => state.users);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [expandedRows, setExpandedRows] = useState({});

  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const searchFields = [
        user.username?.toLowerCase(),
        user.email?.toLowerCase(),
        user.displayName?.toLowerCase(),
        user.customerId?.toLowerCase(),
        `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().trim()
      ].filter(Boolean);

      const matchesSearch = searchTerm === '' || 
        searchFields.some(field => field.includes(searchTerm.toLowerCase()));
      
      const matchesRole = !roleFilter || user.role === roleFilter;
      
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const toggleRowExpansion = useCallback((userId, contentType) => {
    setExpandedRows(prev => ({
      ...prev,
      [userId]: prev[userId] === contentType ? null : contentType
    }));
  }, []);

  const handleBanToggle = useCallback(async (user) => {
    try {
      const newBanStatus = !user.isBanned;
      await dispatch(banUser({ 
        id: user._id, 
        banned: newBanStatus 
      })).unwrap();
      
      toast.success(`User ${newBanStatus ? 'banned' : 'unbanned'} successfully`);
    } catch (error) {
      toast.error(error.message || 'Failed to update user status');
    }
  }, [dispatch]);

  const renderUserAvatar = (user) => {
    if (user.photoURL) {
      return (
        <div className="flex items-center">
          <img 
            src={user.photoURL} 
            alt={user.displayName || user.username} 
            className="w-8 h-8 rounded-full mr-2"
          />
          <span>{user.displayName || user.username}</span>
        </div>
      );
    }
    return user.displayName || user.username;
  };

  const renderAuthProvider = (provider) => {
    const providers = {
      google: 'Google',
      email: 'Email',
      facebook: 'Facebook'
    };
    return providers[provider] || provider;
  };

  const headers = [
    'srno',
    'userName', 
    'Email', 
    'Provider',
    'Role', 
    'Status', 
    'Joined', 
    'Last Login',
    'Orders', 
    'Addresses',
    'Customer ID',
    'Actions'
  ];

  const tableData = filteredUsers.map((user,index) => ({
    'srno': index+1,
    'userName': user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
    'Email': user.email,
    'Provider': renderAuthProvider(user.provider),
    'Role': <StatusBadge status={user.role} type="role" />,
    'Status': <StatusBadge status={user.isBanned ? 'banned' : 'active'} type="user" />,
    'Joined': new Date(user.createdAt).toLocaleDateString(),
    'Last Login': new Date(user.lastLogin).toLocaleDateString(),
    'Orders': (
      <button 
        onClick={() => toggleRowExpansion(user._id, 'orders')}
        className={`text-blue-600 hover:text-blue-800 ${
          !user.orders?.length ? 'text-gray-400 cursor-default' : ''
        }`}
        disabled={!user.orders?.length}
      >
        {user.orders?.length || 0}
      </button>
    ),
    'Addresses': (
      <button 
        onClick={() => toggleRowExpansion(user._id, 'addresses')}
        className={`text-blue-600 hover:text-blue-800 ${
          !user.addresses?.length ? 'text-gray-400 cursor-default' : ''
        }`}
        disabled={!user.addresses?.length}
      >
        {user.addresses?.length || 0}
      </button>
    ),
    'Customer ID': user.customerId || 'N/A',
    'Actions': (
      <div className="flex space-x-2">
        <button
          onClick={() => handleBanToggle(user)}
          className={user.isBanned ? 
            'text-green-600 hover:text-green-900' : 
            'text-red-600 hover:text-red-900'}
        >
          {user.isBanned ? 'Unban' : 'Ban'}
        </button>
      </div>
    ),
    // Internal data
    originalUser: user,
    id: user._id
  }));
  console.log(filteredUsers)

  return (
    <>
      <Helmet>
        <title>User Management - Admin Dashboard</title>
      </Helmet>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">User Management</h1>
          <div className="text-sm text-gray-500">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="search-users" className="block text-sm font-medium text-gray-700 mb-1">
                Search Users
              </label>
              <input
                id="search-users"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, ID..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="role-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Role
              </label>
              <select
                id="role-filter"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="wholesaler">Wholesaler</option>
                <option value="customer">Customer</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <AdminTable
            headers={headers}
            data={tableData}
            isLoading={isLoading}
          />
          
          {/* Expanded content */}
          {filteredUsers.map(user => {
            const expandedContent = expandedRows[user._id];
            if (!expandedContent) return null;
            
            return (
              <motion.div
                key={`expanded-${user._id}`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-t"
              >
                {expandedContent === 'orders' && (
                  <div className="p-4 bg-gray-50">
                    <h4 className="font-medium mb-2">Order History</h4>
                    {user.orders?.length ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {user.orders.map((order) => (
                              <tr key={order._id}>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                  {order._id.substring(0, 8)}...
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                  {new Date(order.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                  ${order.totalAmount?.toFixed(2)}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm">
                                  <StatusBadge status={order.status} type="order" />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-4 text-gray-500">No orders found</div>
                    )}
                  </div>
                )}
                
                {expandedContent === 'addresses' && (
                  <div className="p-4 bg-gray-50">
                    <h4 className="font-medium mb-2">Saved Addresses</h4>
                    {user.addresses?.length ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {user.addresses.map((address, index) => (
                          <div key={index} className="border rounded-lg p-4 bg-white">
                            <h5 className="font-medium mb-2 flex items-center">
                              {address.label || `Address ${index + 1}`}
                              {address.isDefault && (
                                <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                  Default
                                </span>
                              )}
                            </h5>
                            <address className="text-sm not-italic">
                              {address.houseNo}, {address.area}<br />
                              {address.city}, {address.state} - {address.pincode}<br />
                              {address.country}
                            </address>
                            <p className="text-sm mt-2">
                              <span className="font-medium">Contact:</span> {address.phone}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-gray-500">No addresses found</div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </>
  );
};

export default AdminUsers;
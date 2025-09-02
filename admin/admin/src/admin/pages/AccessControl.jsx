import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { useSelector, useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import AdminTable from '../components/AdminTable';
import StatusBadge from '../components/StatusBadge';
import EditModal from '../components/EditModal';
import { fetchUsers, updateUserRole } from '../../store/slices/usersSlice';

const AccessControl = () => {
  const dispatch = useDispatch();
  const { user: currentUser } = useSelector((state) => state.auth);
  const { users, loading, error } = useSelector((state) => state.users);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newRole, setNewRole] = useState('');

  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleRoleUpdate = async () => {
    if (!selectedUser || !newRole) return;

    if (selectedUser._id === currentUser?._id) {
      toast.error('You cannot change your own role');
      return;
    }

    try {
      await dispatch(updateUserRole({
        userId: selectedUser._id,
        newRole
      }));
      toast.success('User role updated successfully');
      setIsEditModalOpen(false);
      setSelectedUser(null);
    } catch (error) {
      toast.error('Failed to update user role');
    }
  };

  const getPermissionsByRole = (role) => {
    const permissions = {
      admin: ['read', 'write', 'delete', 'manage_users'],
      wholesaler: ['read', 'Bulk Purchase'],
      customer: ['read']
    };
    return permissions[role] || [];
  };

  const getRoleDescription = (role) => {
    const descriptions = {
      admin: 'Full access to all features',
      wholesaler: 'Can view and buy products in bulk',
      customer: 'Read-only access'
    };
    return descriptions[role] || 'No access';
  };
  console.log(users)

  const headers = [ 'Sr No','User', 'Email', 'Role', 'Status', 'lastLogin','Permissions'];

  const tableData = users.map((user,index) => ({
    srno: index+1,
    id: user._id,
    user: user.username,
    email: user.email,
    role: <StatusBadge status={user.role} type="role" />,
    status: <StatusBadge status={user.status} type="user" />,
    lastLogin: new Date(user.lastLogin).toLocaleDateString(),
    permissions: (
      <div className="flex flex-wrap gap-1">
        {getPermissionsByRole(user.role).map(permission => (
          <span
            key={permission}
            className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
          >
            {permission}
          </span>
        ))}
      </div>
    )
  }));

 const actions = (row) => [
    <button
      key="change-role"
      onClick={() => {
        const user = users.find(u => u._id === row.id);
        if (user._id === currentUser?._id) {
          toast.error('You cannot modify your own role');
          return;
        }
        setSelectedUser(user);
        setNewRole(user.role);
        setIsEditModalOpen(true);
      }}
      className="text-blue-600 hover:text-blue-900 font-medium"
    >
      Change Role
    </button>
  ];

  return (
    <>
      <Helmet>
        <title>Access Control - UAE Fashion Admin</title>
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Access Control</h1>
        </div>

        {/* Role Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['admin', 'wholesaler', 'customer'].map((role) => (
            <div key={role} className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center space-x-2 mb-2">
                <StatusBadge status={role} type="role" />
                <span className="font-medium capitalize">{role}</span>
              </div>
              <p className="text-sm text-gray-600">{getRoleDescription(role)}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {getPermissionsByRole(role).map(permission => (
                  <span 
                    key={permission} 
                    className={`px-2 py-1 rounded-full text-xs ${
                      role === 'admin' ? 'bg-purple-100 text-purple-800' :
                      role === 'wholesaler' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {permission}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Warning Banner */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Access Control Warning
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                Be careful when changing user roles. You cannot modify your own role. 
                Make sure you understand the permissions associated with each role before making changes.
              </p>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <AdminTable
          headers={headers}
          data={tableData}
          actions={actions}
          isLoading={loading}
        />

        {/* Change Role Modal */}
        {selectedUser && (
          <EditModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            title="Change User Role"
            onSave={handleRoleUpdate}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User: {selectedUser.username}
                </label>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email: {selectedUser.email}
                </label>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Role: <StatusBadge status={selectedUser.role} type="role" />
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="customer">Customer</option>
                  <option value="wholesaler">Wholesaler</option>
                  {/* <option value="admin">Administrator</option> */}
                </select>
                {newRole && (
                  <p className="mt-2 text-sm text-gray-600">
                    {getRoleDescription(newRole)}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Permissions:
                </label>
                <div className="flex flex-wrap gap-1">
                  {getPermissionsByRole(newRole || selectedUser.role).map(permission => (
                    <span
                      key={permission}
                      className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                    >
                      {permission}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </EditModal>
        )}
      </motion.div>
    </>
  );
};

export default AccessControl;
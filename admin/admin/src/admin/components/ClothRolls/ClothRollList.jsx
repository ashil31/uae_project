import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Search, Package, AlertCircle } from 'lucide-react';
import { getClothRolls, deleteClothRoll } from '../../../store/slices/clothRollSlice';
import ClothRollFormModal from './ClothRollFormModal';
import toast from 'react-hot-toast';
import DeleteConfirmModal from '../DeleteConfirmModal';

const ClothRollList = () => {
  const dispatch = useDispatch();
  const { clothRolls, loading } = useSelector((state) => state.clothRolls);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRoll, setEditingRoll] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedRollId, setSelectedRollId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    dispatch(getClothRolls());
  }, [dispatch]);

  const confirmDelete = (id) => {
    setSelectedRollId(id);
    setConfirmModalOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedRollId) return;
    setIsDeleting(true);
    try {
      await dispatch(deleteClothRoll(selectedRollId)).unwrap();
      toast.success('Cloth roll deleted successfully');
    } catch (error) {
      toast.error('Failed to delete cloth roll');
    } finally {
      setIsDeleting(false);
      setConfirmModalOpen(false);
      setSelectedRollId(null);
    }
  };

  const filteredRolls = Array.isArray(clothRolls)
  ? clothRolls.filter((roll) => {
      const matchesSearch =
        typeof roll.rollNo === 'string' &&
        roll.rollNo.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        filterStatus === 'all' || roll.status === filterStatus;

      return matchesSearch && matchesStatus;
    })
  : [];


  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'assigned':
        return 'bg-yellow-100 text-yellow-800';
      case 'used':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const stats = {
    total: clothRolls.length,
    available: clothRolls.filter(r => r.status === 'available').length,
    assigned: clothRolls.filter(r => r.status === 'assigned').length,
    used: clothRolls.filter(r => r.status === 'used').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Cloth Roll Inventory</h2>
          <p className="text-sm text-gray-600">Manage your cloth roll stock</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Cloth Roll</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Rolls', value: stats.total, color: 'blue', icon: Package },
          { label: 'Available', value: stats.available, color: 'green', icon: Package },
          { label: 'Assigned', value: stats.assigned, color: 'yellow', icon: AlertCircle },
          { label: 'Used', value: stats.used, color: 'gray', icon: Package },
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
            placeholder="Search by roll number..."
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
          <option value="available">Available</option>
          <option value="assigned">Assigned</option>
          <option value="used">Used</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roll Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fabric Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {console.log(filteredRolls)}
              {filteredRolls.map((roll) => (
                <motion.tr
                  key={roll._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{roll.rollNo}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {roll.fabricType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {roll.itemType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {roll.amount}
                  </td>
                   <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {roll.unitType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(roll.status)}`}>
                      {roll.status.charAt(0).toUpperCase() + roll.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {new Date(roll.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setEditingRoll(roll);
                          setShowModal(true);
                        }}
                        className="text-purple-600 hover:text-purple-900"
                        disabled={roll.status === 'used'}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => confirmDelete(roll._id)}
                        className="text-red-600 hover:text-red-900"
                        disabled={roll.status === 'assigned'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <ClothRollFormModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingRoll(null);
        }}
        roll={editingRoll}
      />

      <DeleteConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => {
          setConfirmModalOpen(false);
          setSelectedRollId(null);
        }}
        title="Delete Cloth Roll"
        message="Are you sure you want to permanently delete this cloth roll? This action cannot be undone."
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default ClothRollList;

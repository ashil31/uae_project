// src/components/cloths/ClothRollList.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Search, Package, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getClothRolls, deleteClothRoll } from '../../../store/slices/clothRollSlice';

// IMPORT your standalone modal component (adjust path if needed)
import ClothRollFormModal from './ClothRollFormModal';

/* --------------------- DeleteConfirmModal --------------------- */
export const DeleteConfirmModal = ({ isOpen, onClose, title = 'Confirm', message = '', onConfirm, isLoading = false }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 w-full max-w-md">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <span className="sr-only">Close</span>
            ✕
          </button>
        </div>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{message}</p>
        <div className="mt-6 flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 rounded border">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded bg-red-600 text-white" disabled={isLoading}>
            {isLoading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* --------------------- ClothRollList --------------------- */
const ClothRollList = () => {
  const dispatch = useDispatch();
  const { clothRolls = [], overall = {}, loading } = useSelector((state) => state.clothRolls || {});

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

  // defensive: ensure clothRolls is an array and remove falsy entries
  const clothRollsSafe = Array.isArray(clothRolls) ? clothRolls.filter(Boolean) : [];

  /**
   * displayRolls:
   * - If server returned `type: 'roll'` entries (or raw roll objects), we use those.
   * - If server returned `group` entries, we expand sampleRolls into rows (or you can choose 1-per-group).
   * - This keeps UI consistent regardless of server grouping.
   */
  const displayRolls = useMemo(() => {
    return clothRollsSafe.flatMap((entry) => {
      if (!entry) return [];

      // 1) sometimes entry can be a raw roll doc (has rollNo or _id and no 'type')
      if ((entry.rollNo && (entry._id || entry.rollId)) || (!entry.type && entry._id)) {
        // return as-is (ensure _id exists)
        return [{ ...(entry), _id: entry._id || entry.rollId || entry.id }];
      }

      // 2) server 'roll' entry shape: sampleRolls exists (1 item)
      if (entry.type === 'roll' && Array.isArray(entry.sampleRolls) && entry.sampleRolls.length > 0) {
        return entry.sampleRolls.map((r) => ({ ...(r), _id: r._id || r.rollId || Math.random().toString(36).slice(2) }));
      }

      // 3) server 'group' entries -> expand sampleRolls (representative rows)
      if (entry.type === 'group' && Array.isArray(entry.sampleRolls) && entry.sampleRolls.length > 0) {
        // choose to show all sample rolls (you can change to sampleRolls[0] to show one per group)
        return entry.sampleRolls.map((r) => ({
          ...(r),
          _id: r._id || Math.random().toString(36).slice(2),
          // attach some group metadata if needed
          parentGroupId: entry.clothAmountId || entry.id || null,
          parentTotalAssigned: entry.totalAssigned ?? undefined,
          parentAvailable: entry.available ?? undefined,
        }));
      }

      // 4) fallback: fabricate a representative row from clothAmount
      if (entry.clothAmount) {
        const id = entry.clothAmountId || entry.id || Math.random().toString(36).slice(2);
        return [{
          _id: id,
          rollNo: `GROUP-${String(id).slice(-6)}`,
          amount: entry.totalAssigned ?? '-',
          fabricType: entry.clothAmount.fabricType ?? '-',
          itemType: entry.clothAmount.itemType ?? '-',
          unitType: entry.clothAmount.unitType ?? '',
          status: 'grouped',
          createdAt: entry.clothAmount._id ? undefined : undefined
        }];
      }

      return [];
    });
  }, [clothRollsSafe]);

  // now apply search and status filter to displayRolls
  const filteredRolls = useMemo(() => {
    const term = String(searchTerm ?? '').toLowerCase().trim();
    return displayRolls.filter((roll) => {
      if (!roll) return false;
      const rollNo = typeof roll.rollNo === 'string' ? roll.rollNo : String(roll.rollNo ?? '');
      const matchesSearch = rollNo.toLowerCase().includes(term);
      const matchesStatus = filterStatus === 'all' || String(roll.status ?? '').toLowerCase() === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [displayRolls, searchTerm, filterStatus]);

  const getStatusColor = (statusRaw) => {
    const status = String(statusRaw ?? '').toLowerCase();
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'assigned':
        return 'bg-yellow-100 text-yellow-800';
      case 'used':
        return 'bg-gray-100 text-gray-800';
      case 'grouped':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Stats: prefer server overall if available, else compute from displayRolls
  const stats = useMemo(() => {
    if (overall && Object.keys(overall).length) {
      return {
        total: (displayRolls.length || 0),
        available: displayRolls.filter((r) => String(r?.status ?? '').toLowerCase() === 'available').length,
        assigned: displayRolls.filter((r) => String(r?.status ?? '').toLowerCase() === 'assigned').length,
        used: displayRolls.filter((r) => String(r?.status ?? '').toLowerCase() === 'used').length,
        // also expose server totals
        serverTotalAssigned: overall.totalAssigned ?? null,
        serverTotalClothAmount: overall.totalClothAmount ?? null,
        serverTotalAvailable: overall.totalAvailable ?? null,
      };
    }
    return {
      total: displayRolls.length,
      available: displayRolls.filter((r) => String(r?.status ?? '').toLowerCase() === 'available').length,
      assigned: displayRolls.filter((r) => String(r?.status ?? '').toLowerCase() === 'assigned').length,
      used: displayRolls.filter((r) => String(r?.status ?? '').toLowerCase() === 'used').length,
    };
  }, [overall, displayRolls]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Cloth Roll Inventory</h2>
          <p className="text-sm text-gray-600">Manage your cloth roll stock</p>
        </div>
        <button
          onClick={() => {
            setEditingRoll(null);
            setShowModal(true);
          }}
          className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Cloth Roll</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Rows', value: stats.total, bg: 'bg-blue-50', icon: Package },
          { label: 'Available', value: stats.available, bg: 'bg-green-50', icon: Package },
          { label: 'Assigned', value: stats.assigned, bg: 'bg-yellow-50', icon: AlertCircle },
          { label: 'Used', value: stats.used, bg: 'bg-gray-50', icon: Package },
        ].map((stat, index) => (
          <div key={index} className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`${stat.bg} p-2 rounded-full`}>
                <stat.icon className="w-5 h-5 text-gray-700" />
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
          <option value="grouped">Grouped</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item & Fabric</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount & Unit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRolls.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No cloth rolls found.</td>
                </tr>
              )}

              {filteredRolls.map((roll) => {
                const id = roll?._id ?? Math.random().toString(36).slice(2);
                const rollNo = roll?.rollNo ?? '-';
                const itemType = roll?.itemType ?? '-';
                const fabricType = roll?.fabricType ?? '-';
                const amount = roll?.amount ?? '-';
                const unitType = roll?.unitType ?? '';
                const statusStr = String(roll?.status ?? 'unknown');
                const createdAt = roll?.createdAt ? new Date(roll.createdAt).toLocaleDateString() : '-';

                return (
                  <motion.tr key={id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{rollNo}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      <div className="flex flex-col">
                        <span className="font-medium">{itemType}</span>
                        <span className="text-sm text-gray-500">{fabricType}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {amount} {unitType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(statusStr)}`}>
                        {String(statusStr).charAt(0).toUpperCase() + String(statusStr).slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{createdAt}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setEditingRoll(roll);
                            setShowModal(true);
                          }}
                          className="text-purple-600 hover:text-purple-900"
                          disabled={String(statusStr).toLowerCase() === 'used'}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => confirmDelete(roll?._id)}
                          className="text-red-600 hover:text-red-900"
                          disabled={String(statusStr).toLowerCase() === 'assigned'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <ClothRollFormModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingRoll(null);
          // re-fetch after closing to reflect any server-side totals changes
          dispatch(getClothRolls());
        }}
        roll={editingRoll}
        onSaved={() => {
          // re-fetch list when modal saved
          dispatch(getClothRolls());
        }}
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

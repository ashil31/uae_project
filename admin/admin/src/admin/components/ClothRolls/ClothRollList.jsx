import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Search, Package, AlertCircle, X } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getClothRolls, deleteClothRoll } from '../../../store/slices/clothRollSlice';

// This file groups three components used in the admin area:
// 1) ClothRollList - main list + stats + search/filter
// 2) ClothRollFormModal - modal used for Add / Edit (posts to /api/cloths/add)
// 3) DeleteConfirmModal - generic delete confirmation modal
//
// Drop this file into your components folder and split into separate files if desired.

/* --------------------- DeleteConfirmModal --------------------- */
export const DeleteConfirmModal = ({ isOpen, onClose, title = 'Confirm', message = '', onConfirm, isLoading = false }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 w-full max-w-md">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X /></button>
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

/* --------------------- ClothRollFormModal --------------------- */
export const ClothRollFormModal = ({ isOpen, onClose, initial = null, onSaved }) => {
  const [form, setForm] = useState({ rollNo: '', amount: '', fabricType: '', unitType: '', itemType: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initial) {
      setForm({
        rollNo: initial.rollNo ?? '',
        amount: initial.amount ?? '',
        fabricType: initial.fabricType ?? '',
        unitType: initial.unitType ?? '',
        itemType: initial.itemType ?? '',
      });
    } else {
      setForm({ rollNo: '', amount: '', fabricType: '', unitType: '', itemType: '' });
    }
  }, [initial, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Basic client-side validation
      if (!form.amount || Number(form.amount) <= 0) throw new Error('Amount must be a positive number');

      const payload = {
        rollNo: form.rollNo || undefined,
        amount: Number(form.amount),
        fabricType: form.fabricType || undefined,
        unitType: form.unitType || undefined,
        itemType: form.itemType || undefined,
      };

      const { data } = await axios.post('/api/cloths/add', payload);

      toast.success(data?.message || 'Cloth roll added');

      // notify parent so it can refresh table or optimistically add
      onSaved?.(data?.data ?? null);

      onClose?.();
    } catch (err) {
      console.error('Save error', err?.response ?? err);
      const message = err?.response?.data?.message || err?.message || 'Failed to save cloth roll';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 w-full max-w-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{initial ? 'Edit Cloth Roll' : 'Add Cloth Roll'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X /></button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-3">
          <label className="text-sm text-gray-600">Roll Number (optional)</label>
          <input name="rollNo" value={form.rollNo} onChange={handleChange} className="px-3 py-2 border rounded" />

          <label className="text-sm text-gray-600 mt-2">Amount</label>
          <input name="amount" type="number" value={form.amount} onChange={handleChange} className="px-3 py-2 border rounded" required />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600">Fabric Type</label>
              <input name="fabricType" value={form.fabricType} onChange={handleChange} className="px-3 py-2 border rounded" />
            </div>
            <div>
              <label className="text-sm text-gray-600">Unit Type</label>
              <input name="unitType" value={form.unitType} onChange={handleChange} className="px-3 py-2 border rounded" />
            </div>
          </div>

          <label className="text-sm text-gray-600">Item Type</label>
          <input name="itemType" value={form.itemType} onChange={handleChange} className="px-3 py-2 border rounded" />

          <div className="flex justify-end space-x-3 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded border">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded bg-purple-600 text-white" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* --------------------- ClothRollList --------------------- */
const ClothRollList = () => {
  const dispatch = useDispatch();
  const { clothRolls = [], loading } = useSelector((state) => state.clothRolls || {});

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

  const filteredRolls = clothRollsSafe.filter((roll) => {
    if (!roll) return false;

    const rollNo = typeof roll.rollNo === 'string' ? roll.rollNo : String(roll.rollNo ?? '');
    const matchesSearch = rollNo.toLowerCase().includes(String(searchTerm ?? '').toLowerCase());
    const matchesStatus = filterStatus === 'all' || String(roll.status ?? '').toLowerCase() === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (statusRaw) => {
    const status = String(statusRaw ?? '').toLowerCase();
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
    total: clothRollsSafe.length,
    available: clothRollsSafe.filter((r) => String(r?.status ?? '').toLowerCase() === 'available').length,
    assigned: clothRollsSafe.filter((r) => String(r?.status ?? '').toLowerCase() === 'assigned').length,
    used: clothRollsSafe.filter((r) => String(r?.status ?? '').toLowerCase() === 'used').length,
  };

  // Called by modal when a new roll saved
  const handleNewRollSaved = (newRoll) => {
    // prefer to re-fetch from server so aggregated totals and server-side defaults are accurate
    dispatch(getClothRolls());

    // optionally, if you want optimistic behaviour you could push to store directly
    // but here we keep server as source of truth.
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
        }}
        initial={editingRoll}
        onSaved={handleNewRollSaved}
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

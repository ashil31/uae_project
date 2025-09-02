import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Package } from 'lucide-react';
import { assignClothRoll } from '../../../store/slices/assignmentSlice';
import { getTailors } from '../../../store/slices/tailorSlice';
import { getClothRolls } from '../../../store/slices/clothRollSlice';
import toast from 'react-hot-toast';

const RollAssignmentFormModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { tailors } = useSelector((state) => state.tailors);
  const { clothRolls } = useSelector((state) => state.clothRolls);
  const [formData, setFormData] = useState({
    tailorId: '',
    rollId: '',
    assignedDate: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      dispatch(getTailors());
      dispatch(getClothRolls());
    }
  }, [isOpen, dispatch]);

  const availableRolls = (clothRolls || []).filter(roll => 
    roll?.status && roll.status.toLowerCase() === 'available'
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await dispatch(assignClothRoll(formData)).unwrap();
      toast.success('Roll assigned successfully');
      onClose();
      setFormData({
        tailorId: '',
        rollId: '',
        assignedDate: new Date().toISOString().split('T')[0],
      });
    } catch (error) {
      toast.error(error.message || 'Failed to assign roll');
    } finally {
      setLoading(false);
    }
  };

  const selectedRoll = (clothRolls || []).find(roll => roll._id === formData.rollId);
  const selectedTailor = (tailors || []).find(tailor => tailor._id === formData.tailorId);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={onClose}
          />
          
          {/* Modal Container - Key Changes Here */}
          <div className="flex min-h-screen items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              {/* Header - Sticky */}
              <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-gray-200 rounded-t-lg">
                <h3 className="text-lg font-semibold text-gray-900">
                  Assign Cloth Roll
                </h3>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form - Scrollable Content */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="inline w-4 h-4 mr-1" />
                    Select Tailor
                  </label>
                  <select
                    required
                    value={formData.tailorId}
                    onChange={(e) => setFormData({ ...formData, tailorId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Choose a tailor...</option>
                    {(tailors || []).map((tailor) => (
                      <option key={tailor._id} value={tailor._id}>
                        {tailor.name} ({tailor.skillLevel})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Package className="inline w-4 h-4 mr-1" />
                    Select Cloth Roll
                  </label>
                  <select
                    required
                    value={formData.rollId}
                    onChange={(e) => setFormData({ ...formData, rollId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Choose a roll...</option>
                    {availableRolls.map((roll) => (
                      <option key={roll._id} value={roll._id}>
                        {roll.rollNo} - {roll.length}m × {roll.quantity || 1} rolls
                      </option>
                    ))}
                  </select>
                  {availableRolls.length === 0 && (
                    <p className="text-sm text-red-600 mt-1">
                      No available rolls found. Please add new rolls first.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assignment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.assignedDate}
                    onChange={(e) => setFormData({ ...formData, assignedDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                {/* Summary */}
                {selectedTailor && selectedRoll && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Assignment Summary</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Tailor:</strong> {selectedTailor.name}</p>
                      <p><strong>Roll:</strong> {selectedRoll.rollNo}</p>
                      <p><strong>Length:</strong> {selectedRoll.length} meters</p>
                      <p><strong>Quantity:</strong> {selectedRoll.quantity || 1} rolls</p>
                      <p><strong>Date:</strong> {new Date(formData.assignedDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}

                {/* Buttons - Sticky Bottom */}
                <div className="sticky bottom-0 bg-white flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || availableRolls.length === 0}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Assigning...' : 'Assign Roll'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default RollAssignmentFormModal;

import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Save, Clock, Scissors, Package2, Trash2 } from 'lucide-react';
import { logClothRollUsage } from '../../../store/slices/assignmentSlice';
import toast from 'react-hot-toast';

const AssignmentUsageLog = ({ isOpen, onClose, assignment }) => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    used: '',
    returned: '',
    waste: '',
    garments: {
      S: '',
      M: '',
      L: '',
      XL: '',
      XXL: '',
    },
    timeSpent: '',
    remarks: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (assignment) {
      const lastLog = assignment.logs[assignment.logs.length - 1];
      if (lastLog) {
        setFormData({
          used: lastLog.used || '',
          returned: lastLog.returned || '',
          waste: lastLog.waste || '',
          garments: {
            S: lastLog.garments?.S || '',
            M: lastLog.garments?.M || '',
            L: lastLog.garments?.L || '',
            XL: lastLog.garments?.XL || '',
            XXL: lastLog.garments?.XXL || '',
          },
          timeSpent: lastLog.timeSpent || '',
          remarks: lastLog.remarks || '',
        });
      }
    }
  }, [assignment]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        used: Number(formData.used) || 0,
        returned: Number(formData.returned) || 0,
        waste: Number(formData.waste) || 0,
        garments: {
          S: Number(formData.garments.S) || 0,
          M: Number(formData.garments.M) || 0,
          L: Number(formData.garments.L) || 0,
          XL: Number(formData.garments.XL) || 0,
          XXL: Number(formData.garments.XXL) || 0,
        },
        timeSpent: Number(formData.timeSpent) || 0,
        remarks: formData.remarks,
      };

      await dispatch(logClothRollUsage({ id: assignment._id, data })).unwrap();
      toast.success('Usage logged successfully');
      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to log usage');
    } finally {
      setLoading(false);
    }
  };

  const calculateWastePercentage = () => {
    const used = Number(formData.used) || 0;
    const waste = Number(formData.waste) || 0;
    return used > 0 ? ((waste / used) * 100).toFixed(1) : 0;
  };

  const getTotalGarments = () => {
    return Object.values(formData.garments).reduce((sum, count) => sum + (Number(count) || 0), 0);
  };

  const clearForm = () => {
    setFormData({
      used: '',
      returned: '',
      waste: '',
      garments: { S: '', M: '', L: '', XL: '', XXL: '' },
      timeSpent: '',
      remarks: '',
    });
  };

  if (!assignment) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Log Usage - {assignment.rollId?.rollNumber}
                </h3>
                <p className="text-sm text-gray-600">
                  Tailor: {assignment.tailorId?.name} • Roll Size: {assignment.rollId?.length}m
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Cloth Usage Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Scissors className="inline w-4 h-4 mr-1" />
                    Used (meters)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.used}
                    onChange={(e) => setFormData({ ...formData, used: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Package2 className="inline w-4 h-4 mr-1" />
                    Returned (meters)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.returned}
                    onChange={(e) => setFormData({ ...formData, returned: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Trash2 className="inline w-4 h-4 mr-1" />
                    Waste (meters)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.waste}
                    onChange={(e) => setFormData({ ...formData, waste: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  {formData.waste && (
                    <p className="text-xs text-red-600 mt-1">
                      Waste: {calculateWastePercentage()}%
                    </p>
                  )}
                </div>
              </div>

              {/* Garments by Size Section */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Garments Produced by Size
                </h4>
                <div className="grid grid-cols-5 gap-3">
                  {Object.keys(formData.garments).map((size) => (
                    <div key={size}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Size {size}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.garments[size]}
                        onChange={(e) => setFormData({
                          ...formData,
                          garments: {
                            ...formData.garments,
                            [size]: e.target.value
                          }
                        })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Total Garments: {getTotalGarments()}
                </p>
              </div>

              {/* Time and Remarks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="inline w-4 h-4 mr-1" />
                    Time Spent (hours)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.timeSpent}
                    onChange={(e) => setFormData({ ...formData, timeSpent: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Remarks
                  </label>
                  <textarea
                    rows="2"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Any additional notes..."
                  />
                </div>
              </div>

              {/* Previous Logs */}
              {assignment.logs && assignment.logs.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Previous Logs</h4>
                  <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg">
                    {assignment.logs.map((log, index) => (
                      <div key={index} className="p-3 border-b border-gray-100 last:border-b-0">
                        <div className="flex justify-between items-start">
                          <div className="text-xs text-gray-600">
                            <span className="font-medium">Log {index + 1}</span> - {new Date(log.date).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {Object.values(log.garments || {}).reduce((sum, count) => sum + (count || 0), 0)} garments
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Used: {log.used || 0}m • Waste: {log.waste || 0}m • Time: {log.timeSpent || 0}h
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={clearForm}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? 'Saving...' : 'Save Log'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AssignmentUsageLog;

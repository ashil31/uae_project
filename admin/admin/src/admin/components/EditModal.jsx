
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const EditModal = ({ isOpen, onClose, title, children, onSave, isLoading = false , thumbnailUrl = null }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={onClose}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">{title}</h3>
              </div>
              {/*img thumbnail  */}
 {thumbnailUrl && (
                <div className="flex justify-center py-4 border-b border-gray-200">
                  <img
                    src={thumbnailUrl}
                    alt={title} // Use the title as alt text for accessibility
                    className="w-24 h-24 object-cover rounded-lg shadow-md"
                  />
                </div>
              )}

              <div className="px-6 py-4">
                {children}
              </div>
              
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default EditModal;

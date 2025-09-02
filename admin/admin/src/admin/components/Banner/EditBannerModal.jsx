import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { updateBanner } from '../../../store/slices/heroBannerSlice';
import BannerForm from './BannerForm';

const EditBannerModal = ({ isOpen, onClose, banner }) => {
  const dispatch = useDispatch();
  const { isLoading, uploadProgress, warnings } = useSelector((state) => state.heroBanner);

  const handleUpdateBanner = async (formData) => {
    try {
      const result = await dispatch(updateBanner({ 
        bannerId: banner._id, 
        formData 
      })).unwrap();
      
      toast.success('Banner updated successfully');
      
      // Show warnings if any
      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach(warning => {
          toast.warning(warning, { duration: 4000 });
        });
      }
      
      onClose();
    } catch (error) {
      console.error('Update banner error:', error);
      
      if (error.message?.includes('File too large')) {
        toast.error('Media file size exceeds maximum limit');
      } else if (error.message?.includes('invalid file type')) {
        toast.error('Invalid file type. Only images and videos are allowed');
      } else if (error.errors) {
        // Handle validation errors
        Object.values(error.errors).forEach(err => {
          toast.error(err);
        });
      } else {
        toast.error(error.message || 'Failed to update banner');
      }
    }
  };

  if (!isOpen || !banner) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="flex min-h-full items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Edit Banner: {banner.title}
              </h2>
              <button
                onClick={onClose}
                disabled={isLoading}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <BannerForm
                banner={banner}
                onSubmit={handleUpdateBanner}
                onCancel={onClose}
                isLoading={isLoading}
                uploadProgress={uploadProgress}
                title="Update Banner Information"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default EditBannerModal;
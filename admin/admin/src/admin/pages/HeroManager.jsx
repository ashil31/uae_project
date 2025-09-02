import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchBanners,
  addBanner,
  deleteBanner,
  updateBannerOrder,
  resetBannerState
} from '../../store/slices/heroBannerSlice';
import BannerForm from '../components/Banner/BannerForm';
import EditBannerModal from '../components/Banner/EditBannerModal';
import MediaPreview from '../components/Banner/MediaPreview';

const HeroManager = () => {
  const dispatch = useDispatch();
  const { banners, status, error, isLoading, uploadProgress, warnings } = useSelector((state) => state.heroBanner);
  const [selectedBanner, setSelectedBanner] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [resetFormKey, setResetFormKey] = useState(0);

  useEffect(() => {
    dispatch(fetchBanners());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  useEffect(() => {
    if (warnings && warnings.length > 0) {
      warnings.forEach(warning => {
        toast.error(warning, { duration: 4000 });
      });
    }
  }, [warnings]);

  const handleAddBanner = async (formData) => {
    try {
      const result = await dispatch(addBanner(formData)).unwrap();
      toast.success('Banner added successfully');

      setResetFormKey(prev => prev + 1);
      
      // Show warnings if any
      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach(warning => {
          toast.error(warning, { duration: 4000 });
        });
      }
      
      // Scroll to new banner
      setTimeout(() => {
        const bannerId = result.banner?._id || result._id;
        if (bannerId) {
          const element = document.getElementById(`banner-${bannerId}`);
          element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 500);
    } catch (error) {
      console.error('Add banner error:', error);
      
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
        toast.error(error.message || 'Failed to add banner');
      }
    }
  };

  const getTextPositionForOrder = (order) => {
    const positionIndex = (order + 1) % 3;
    return positionIndex === 1 ? 'left' : positionIndex === 2 ? 'center' : 'right';
  };

  const handleEditBanner = (banner) => {
    setEditingBanner(banner);
    setIsEditModalOpen(true);
  };

  const handleDeleteBanner = async () => {
    try {
      const result = await dispatch(deleteBanner(selectedBanner._id)).unwrap();
      toast.success('Banner deleted successfully');
      
      // Show cleanup info if available
      if (result.response?.filesDeleted) {
        toast.success(`${result.response.filesDeleted} media file(s) cleaned up`);
      }
      
      setIsDeleteModalOpen(false);
      setSelectedBanner(null);
    } catch (error) {
      console.error('Delete banner error:', error);
      toast.error(error.message || 'Failed to delete banner');
    }
  };

  const moveBanner = (index, direction) => {
    const newBanners = [...banners];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newBanners.length) {
      [newBanners[index], newBanners[targetIndex]] = [newBanners[targetIndex], newBanners[index]];
      
      // Update order and textPosition based on new order
      const updatedBanners = newBanners.map((banner, idx) => ({
        ...banner,
        order: idx,
        textPosition: getTextPositionForOrder(idx)
      }));

      dispatch(updateBannerOrder(updatedBanners))
        .unwrap()
        .then(() => toast.success('Banner order updated'))
        .catch(() => toast.error('Failed to update banner order'));
    }
  };

  return (
    <>
      <Helmet>
        <title>Hero Banner Management - Admin Dashboard</title>
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Hero Banner Management</h1>
        </div>

        {/* Add New Banner */}
        <BannerForm
          onSubmit={handleAddBanner}
          isLoading={isLoading}
          uploadProgress={uploadProgress}
          title="Add New Banner"
          resetTrigger={resetFormKey}
        />

        {/* Existing Banners */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Current Banners ({banners.length})</h2>
            <p className="text-sm text-gray-500 mt-1">
              Note: Text position follows pattern (1=left, 2=center, 3=right, 4=left, etc.)
            </p>
          </div>
          
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : banners.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No banners found. Add your first banner above.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {banners.map((banner, index) => (
                <motion.div
                  key={banner._id || banner.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-6">
                    <div className="w-full md:w-1/3 lg:w-1/4">
                      <div className="relative bg-gray-100 rounded-md overflow-hidden">
                        <MediaPreview
                          media={banner.media}
                          image={banner.image}
                          title={banner.title}
                          className="absolute inset-0 w-full h-full"
                          showControls={false}
                          autoPlay={false}
                          muted={true}
                          loop={false}
                        />
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{banner.title}</h3>
                          <p className="text-sm text-gray-600">{banner.subtitle || banner.description}</p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Position: {index + 1}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              Text: {banner.textPosition || getTextPositionForOrder(index)}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                              {banner.media?.type?.toUpperCase() || 'IMAGE'}
                            </span>
                            {banner.link && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Link: {banner.link}
                              </span>
                            )}
                            {banner.media?.formattedDuration && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Duration: {banner.media.formattedDuration}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => moveBanner(index, 'up')}
                            disabled={index === 0}
                            className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 hover:bg-gray-100 rounded"
                            title="Move up"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => moveBanner(index, 'down')}
                            disabled={index === banners.length - 1}
                            className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 hover:bg-gray-100 rounded"
                            title="Move down"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleEditBanner(banner)}
                            className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedBanner(banner);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="pt-2">
                        <p className="text-sm">
                          <span className="font-medium">CTA:</span> {banner.cta || 'Shop Now'} → {banner.link || 'No link'}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Banner"
          message={`Are you sure you want to delete "${selectedBanner?.title}"? This action cannot be undone and will also delete associated media files.`}
          onConfirm={handleDeleteBanner}
          isLoading={status === 'loading'}
        />

        <EditBannerModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingBanner(null);
          }}
          banner={editingBanner}
        />
      </motion.div>
    </>
  );
};

export default HeroManager;
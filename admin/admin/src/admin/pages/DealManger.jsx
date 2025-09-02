import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { useSelector, useDispatch } from 'react-redux';
import { 
  fetchCurrentDeal, 
  createDeal, 
  updateDealStatus, 
  deleteDeal,
} from '../../store/slices/dealSlice';
import { fetchProducts } from '../../store/slices/productsSlice';
import { ImageUrl } from '../services/url';

const DealManager = () => {
  const dispatch = useDispatch();
  const { products } = useSelector((state) => state.products);
  const {
    currentDeal,
    deals,
    loading: dealLoading,
  } = useSelector((state) => state.deal);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [dealForm, setDealForm] = useState({
    productId: '',
    discount: '',
    discountedPrice: '',
    endDate: '',
    enabled: false,
  });

  useEffect(() => {
    dispatch(fetchProducts());
    dispatch(fetchCurrentDeal());
  }, [dispatch]);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateDeal = async () => {
    if (!dealForm.productId || !dealForm.discount || !dealForm.endDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setIsLoading(true);
                
    try {
      const selectedProduct = products.find(p => p._id === (dealForm.productId));
      if (!selectedProduct) {
        toast.error('Selected product not found');
        return;
      }

      const discountAmount = (selectedProduct.additionalInfo.price * (dealForm.discount)) / 100;
      const discountedPrice = selectedProduct.additionalInfo.price - discountAmount;

      const newDeal = {
        productId: dealForm.productId,
        discount: dealForm.discount,
        discountedPrice: discountedPrice,
        endDate: dealForm.endDate,
        enabled: dealForm.enabled
      };

      await dispatch(createDeal(newDeal));
      
      setDealForm({ 
        productId: '',
        discount: '',
        discountedPrice: '',
        endDate: '',
        enabled: false, 
      });
      setShowCreateForm(false);
      toast.success('Deal created successfully');
    } catch (error) {
      toast.error('Failed to create deal');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleToggleDeal = async (dealId, currentStatus) => {
    try {
      dispatch(updateDealStatus({ 
        dealId, 
        enabled: !currentStatus 
      }));
      toast.success(`Deal ${!currentStatus ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      toast.error('Failed to toggle deal');
    }
  };

  const handleDeleteDeal = async (dealId) => {
    try {
      dispatch(deleteDeal(dealId));
      toast.success('Deal deleted successfully');
    } catch (error) {
      toast.error('Failed to delete deal');
    }
  };

  const getRemainingTime = (endDate) => {
    if (!endDate) return null;
    
    const now = new Date().getTime();
    const endTime = new Date(endDate).getTime();
    const timeLeft = endTime - now;

    if (timeLeft <= 0) return 'Expired';

    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

    return `${days}d ${hours}h ${minutes}m`;
  };

  const getProductDetails = (productId) => {
    return products.find(p => p._id === productId) || {};
  };

  const ImageWithFallback = ({ src, alt, className }) => {
    const [imageSrc, setImageSrc] = useState(src);
    const [imageError, setImageError] = useState(false);

    const handleImageError = () => {
      setImageError(true);
      setImageSrc('/api/placeholder/150/150'); // Fallback image
    };

    return (
      <div className={`${className} bg-gray-100 flex items-center justify-center overflow-hidden`}>
        {imageError ? (
          <div className="flex flex-col items-center justify-center text-gray-400 p-2">
            <svg className="w-8 h-8 mb-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
            <span className="text-xs">No Image</span>
          </div>
        ) : (
          <img
            src={imageSrc}
            alt={alt}
            className="w-full h-full object-cover"
            onError={handleImageError}
            loading="lazy"
          />
        )}
      </div>
    );
  };

  return (
    <>
      <Helmet>
        <title>Deal Management - UAE Fashion Admin</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8"
        >
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Deal Management</h1>
                <p className="text-gray-600 mt-1">Create and manage promotional deals</p>
              </div>
              {!showCreateForm && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowCreateForm(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create New Deal
                </motion.button>
              )}
            </div>
          </div>

          {/* Current Active Deal */}
          <AnimatePresence>
            {currentDeal && currentDeal.enabled && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-xl shadow-lg overflow-hidden"
              >
                <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                    <h2 className="text-xl font-bold">Active Deal</h2>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-2">
                      <div className="flex items-start gap-4">
                        <ImageWithFallback
                          src={`${ImageUrl}${getProductDetails(currentDeal.product._id)?.images?.[0]?.url || ''}`}
                          alt={getProductDetails(currentDeal.product._id)?.name}
                          className="w-24 h-24 rounded-lg shadow-md flex-shrink-0"
                        />
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {getProductDetails(currentDeal.product._id)?.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-2xl font-bold text-green-600">
                              ${currentDeal.discountedPrice?.toFixed(2)}
                            </span>
                            <span className="text-lg text-gray-500 line-through">
                              ${getProductDetails(currentDeal.productId)?.additionalInfo?.price}
                            </span>
                            <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-md">
                              {currentDeal.discount}% OFF
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">End Date</h4>
                        <p className="text-lg font-bold text-gray-900">
                          {new Date(currentDeal.endDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Time Remaining</h4>
                        <p className={`text-lg font-bold ${getRemainingTime(currentDeal.endDate) === 'Expired' ? 'text-red-600' : 'text-green-600'}`}>
                          {getRemainingTime(currentDeal.endDate)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleToggleDeal(currentDeal._id, currentDeal.enabled)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 font-semibold"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14L5 9m0 0l5-5m-5 5h14" />
                        </svg>
                        Disable Deal
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleDeleteDeal(currentDeal._id)}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 font-semibold"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Deal
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* All Deals Table */}
          {deals.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-xl font-bold text-gray-900">All Deals</h2>
                <p className="text-gray-600 text-sm">Manage all your promotional deals</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Pricing</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Discount</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">End Date</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {deals.map((deal) => (
                      <motion.tr 
                        key={deal._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50 transition-colors duration-200"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-4">
                            <ImageWithFallback
                              src={`${ImageUrl}${getProductDetails(deal.product._id)?.images?.[0]?.url || ''}`}
                              alt={getProductDetails(deal.product._id)?.name}
                              className="w-16 h-16 rounded-lg shadow-sm flex-shrink-0"
                            />
                            <div>
                              <div className="text-sm font-semibold text-gray-900 max-w-xs truncate">
                                {getProductDetails(deal.product._id)?.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                ID: {deal.product._id.slice(-8)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="text-sm font-bold text-green-600">
                              ${deal.discountedPrice?.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500 line-through">
                              ${getProductDetails(deal.product._id)?.additionalInfo?.price}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                            {deal.discount}% OFF
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(deal.endDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            deal.enabled 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            <div className={`w-2 h-2 rounded-full mr-2 ${
                              deal.enabled ? 'bg-green-400' : 'bg-yellow-400'
                            }`}></div>
                            {deal.enabled ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleToggleDeal(deal._id, deal.enabled)}
                              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all duration-200 ${
                                deal.enabled 
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}
                            >
                              {deal.enabled ? 'Disable' : 'Enable'}
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleDeleteDeal(deal._id)}
                              className="px-3 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md text-xs font-semibold transition-all duration-200"
                            >
                              Delete
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Create Deal Form */}
          <AnimatePresence>
            {showCreateForm && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
              >
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-bold">Create New Deal</h2>
                      <p className="text-blue-100 text-sm">Set up a promotional deal for your products</p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowCreateForm(false)}
                      className="text-white hover:text-gray-200 p-2 rounded-full hover:bg-white/10 transition-all duration-200"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </motion.button>
                  </div>
                </div>

                

                <div className="p-6 space-y-6">

                  {/* Deal Form */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Discount Percentage
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="90"
                          value={dealForm.discount}
                          onChange={(e) => {
                            const discount = e.target.value;
                            const selectedProduct = products.find(p => p._id === dealForm.productId);
                            let discountedPrice = '';
                            
                            if (selectedProduct && discount) {
                              discountedPrice = (selectedProduct.additionalInfo.price * (1 - discount / 100)).toFixed(2);
                            }
                            
                            setDealForm(prev => ({ 
                              ...prev, 
                              discount: discount,
                              discountedPrice: discountedPrice
                            }));
                          }}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          placeholder="30"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 text-sm">%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        End Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={dealForm.endDate}
                        onChange={(e) => setDealForm(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                    
                    <div className="flex items-end">
                      <label className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200 w-full cursor-pointer hover:bg-gray-100 transition-all duration-200">
                        <input
                          type="checkbox"
                          checked={dealForm.enabled}
                          onChange={(e) => setDealForm(prev => ({ ...prev, enabled: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-5 h-5"
                        />
                        <span className="text-sm font-semibold text-gray-700">Enable immediately</span>
                      </label>
                    </div>
                  </div>
                  
                  {/* Preview */}
                  <AnimatePresence>
                    {dealForm.productId && dealForm.discount && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <h4 className="font-semibold text-blue-800">Deal Preview</h4>
                        </div>
                        <p className="text-blue-800">
                          <span className="font-semibold">{products.find(p => p._id === dealForm.productId)?.name}</span> will be 
                          <span className="font-bold text-green-600"> ${(products.find(p => p._id === dealForm.productId)?.additionalInfo.price * (1 - dealForm.discount / 100)).toFixed(2)} </span>
                          <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-bold ml-2">
                            {dealForm.discount}% OFF
                          </span>
                        </p>
                        <p className="text-blue-800 mt-1">
                          Original price: 
                          <span className="line-through text-gray-600 ml-1">
                            ${products.find(p => p._id === dealForm.productId)?.additionalInfo.price}
                          </span>
                        </p>
                        {dealForm.endDate && (
                          <p className="text-blue-800 mt-1">
                            Deal ends: 
                            <span className="font-semibold ml-1">
                              {new Date(dealForm.endDate).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Form Actions */}
                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowCreateForm(false)}
                      className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 font-semibold"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCreateDeal}
                      disabled={isLoading || !dealForm.productId || !dealForm.discount || !dealForm.endDate}
                      className={`px-6 py-3 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 font-semibold ${
                        isLoading || !dealForm.productId || !dealForm.discount || !dealForm.endDate
                          ? 'bg-blue-400 text-white cursor-not-allowed'
                          : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Creating...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Create Deal
                        </>
                      )}
                    </motion.button>
                  </div>

                  {/* Search Products */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Search Products</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Search products by name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                  </div>
                  
                  {/* Product Grid */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Select Product ({filteredProducts.length} available)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-96  overflow-y-auto">
                      {filteredProducts.map(product => (
                        <motion.div
                          key={product._id}
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          className={`border-2 m-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                            dealForm.productId === product._id 
                              ? 'ring-2 ring-blue-200 border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300 hover:shadow-lg bg-white'
                          }`}
                          onClick={() => setDealForm(prev => ({ 
                            ...prev, 
                            productId: product._id,
                            discountedPrice: prev.discount ? (product.additionalInfo.price * (1 - (parseInt(prev.discount || 0) / 100))).toFixed(2) : ''
                          }))}
                        >
                          <ImageWithFallback
                            src={`${ImageUrl}${product.images[0]?.url}`}
                            alt={product.name}
                            className="w-full h-32 rounded-lg mb-3 shadow-sm"
                          />
                          <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">{product.name}</h3>
                          <p className="text-green-600 font-bold text-lg">${product.additionalInfo.price}</p>
                          {dealForm.productId === product._id && (
                            <div className="mt-2 flex items-center gap-2">
                              <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                              <span className="text-blue-600 text-xs font-semibold">Selected</span>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty State */}
          {deals.length === 0 && !showCreateForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center"
            >
              <div className="mx-auto max-w-md">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">No deals created yet</h3>
                <p className="mt-2 text-gray-500">
                  Get started by creating a new promotional deal for your products.
                </p>
                <div className="mt-6">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowCreateForm(true)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl inline-flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Your First Deal
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </>
  );
};

export default DealManager;
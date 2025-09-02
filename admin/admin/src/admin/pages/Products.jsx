import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, Edit, Trash2, Eye, Star, ChevronDown, ChevronUp, X } from 'lucide-react';
import { fetchProducts, deleteProduct, setCurrentProduct, clearCurrentProduct } from '../../store/slices/productsSlice';
import toast from 'react-hot-toast';
import AddProductModal from '../components/Product/AddProductModal';
import ViewProductModal from '../components/Product/ViewProductModal';
import EditProductModal from '../components/Product/EditProductModal';
import { ImageUrl } from '../services/url';

const Products = () => {
  const dispatch = useDispatch();
  const { products: allProductsFromStore, isLoading, error } = useSelector((state) => state.products);
  const currentProduct = useSelector((state) => state.products.currentProduct);
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [expandedFilters, setExpandedFilters] = useState(false);
  const itemsPerPage = 12;

  const [productToDelete, setProductToDelete] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);



  // Debounce search term
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm]);

  // Fetch products
  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  // Get filter options
  const { categories, subCategories, brands, statusOptions } = useMemo(() => {
    if (!allProductsFromStore) return { categories: [], subCategories: [], brands: [], statusOptions: [] };
    return {
      categories: [...new Set(allProductsFromStore.map(p => p.category))].filter(Boolean).sort(),
      subCategories: [...new Set(allProductsFromStore.map(p => p.subCategory))].filter(Boolean).sort(),
      brands: [...new Set(allProductsFromStore.map(p => p.brand))].filter(Boolean).sort(),
      statusOptions: ['Featured', 'Low Stock', 'Out of Stock']
    };
  }, [allProductsFromStore]);

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!allProductsFromStore) return [];
    
    return allProductsFromStore.filter(product => {
      // Search filter
      const matchesSearch = debouncedSearchTerm === '' || 
        product.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        (product.additionalInfo?.sku && product.additionalInfo.sku.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
      
      // Category filter
      const matchesCategory = selectedCategory === '' || product.category === selectedCategory;

      // Sub-Category filter
      const matchesSubCategory = selectedSubcategory === '' || product.subCategory === selectedSubcategory;

      // Brand filter
      const matchesBrand = selectedBrand === '' || product.brand === selectedBrand;

      
      // Status filter
      let matchesStatus = true;
      if (selectedStatus === 'Featured') {
        matchesStatus = product.isFeatured;
      } else if (selectedStatus === 'Low Stock') {
        matchesStatus = (product.additionalInfo?.stock || 0) < 10 && (product.additionalInfo?.stock || 0) > 0;
      } else if (selectedStatus === 'Out of Stock') {
        matchesStatus = (product.additionalInfo?.stock || 0) <= 0;
      }
      
      return matchesSearch && matchesCategory && matchesSubCategory && matchesBrand && matchesStatus;
    });
  }, [allProductsFromStore, debouncedSearchTerm, selectedCategory, selectedSubcategory, selectedBrand, selectedStatus]);

  // Pagination
  const { totalPages, totalItems } = useMemo(() => ({
    totalPages: Math.ceil(filteredProducts.length / itemsPerPage),
    totalItems: filteredProducts.length
  }), [filteredProducts, itemsPerPage]);

  const displayedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedCategory, selectedSubcategory, selectedBrand, selectedStatus]);

  // Helper functions
  const getProductDisplayData = (product) => {
    const sizes = Array.isArray(product.additionalInfo?.size) 
      ? product.additionalInfo.size
      : product.additionalInfo?.size 
        ? [product.additionalInfo.size] 
        : [];
    
    const colors = Array.isArray(product.additionalInfo?.color)
      ? product.additionalInfo.color
      : product.additionalInfo?.color
        ? [product.additionalInfo.color]
        : [];

    return {
      stock: product.additionalInfo?.stock || 0,
      price: product.additionalInfo?.price || product.basePrice || 0,
      image: product.images?.[0]?.url 
        ? product.images[0].url.startsWith('http') 
          ? product.images[0].url 
          : `${ImageUrl}${product.images[0].url}`
        : null,
      colors,
      sizes,
      sku: product.additionalInfo?.sku || 'N/A',
      materials: product.materials?.join(', ') || 'N/A',
      isFeatured: product.isFeatured
    };
  };

  const formatArrayDisplay = (arr, limit = 2) => {
    if (!arr || arr.length === 0) return 'N/A';
    if (arr.length <= limit) return arr.join(', ');
    return `${arr.slice(0, limit).join(', ')} +${arr.length - limit}`;
  };

  const getStockStatus = (stock) => {
    if (stock <= 0) return { text: 'Out of Stock', color: 'red' };
    if (stock < 10) return { text: 'Low Stock', color: 'orange' };
    return { text: 'In Stock', color: 'green' };
  };

  // Handlers
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleViewProduct = (product) => {
    dispatch(setCurrentProduct(product));
    setViewModalOpen(true);
  };

  const handleEditProduct = (product) => {
    dispatch(setCurrentProduct(product));
    setEditModalOpen(true);
  };

  const handleDeleteProduct = (product) => {
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (productToDelete) {
      try {
        await dispatch(deleteProduct(productToDelete._id)).unwrap();
        toast.success("Product deleted successfully");
        setShowDeleteModal(false);
        setProductToDelete(null);
      } catch (error) {
        toast.error(error.message || "Failed to delete product");
      }
    }
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    dispatch(clearCurrentProduct());
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    dispatch(clearCurrentProduct());
    dispatch(fetchProducts());
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedBrand('');
    setSelectedStatus('');
    setCurrentPage(1);
  };

  // Render functions
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 || 
        i === totalPages || 
        (i >= currentPage - 2 && i <= currentPage + 2)
      ) {
        pageNumbers.push(i);
      } else if (i === currentPage - 3 || i === currentPage + 3) {
        pageNumbers.push('...');
      }
    }

    return (
      <div className="flex justify-center mt-8">
        <nav className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-md border border-gray-300 disabled:opacity-50"
          >
            Previous
          </button>
          
          {pageNumbers.map((page, index) => (
            <button
              key={index}
              onClick={() => typeof page === 'number' ? handlePageChange(page) : null}
              disabled={page === '...'}
              className={`w-10 h-10 rounded-md ${
                currentPage === page ? 'bg-purple-600 text-white' : 
                page === '...' ? 'pointer-events-none' : 'border border-gray-300'
              }`}
            >
              {page}
            </button>
          ))}
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-md border border-gray-300 disabled:opacity-50"
          >
            Next
          </button>
        </nav>
      </div>
    );
  };

  const renderProductCard = (product) => {
    const { stock, price, image, colors, sizes, sku, materials, isFeatured } = getProductDisplayData(product);
    const stockStatus = getStockStatus(stock);

    return (
      <motion.div
        key={product._id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="bg-white  shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col"
      >
        {/* Product Image */}
        <div className="relative h-48 bg-gray-100">
          {image ? (
            <img
              src={image}
              alt={product.images[0]?.altText || product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = '/placeholder-product.jpg';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
              No Image
            </div>
          )}
          
          {/* Badges */}
          <div className="absolute top-3 right-3 space-y-2">
            {isFeatured && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 flex items-center">
                <Star className="w-3 h-3 mr-1" />
                Featured
              </span>
            )}
            <span className={`px-2 py-1 text-xs font-medium rounded-full bg-${stockStatus.color}-100 text-${stockStatus.color}-800`}>
              {stockStatus.text}
            </span>
          </div>
        </div>

        {/* Product Info */}
        <div className="p-4 flex flex-col flex-grow">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
              {sku}
            </span>
          </div>
          
          <div className="space-y-2 mb-4 flex-grow">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Brand:</span>
              <span className="font-medium">{product.brand || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Category:</span>
              <span className="font-medium">{product.category || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Materials:</span>
              <span className="font-medium">{materials}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Sizes:</span>
              <span className="font-medium">{formatArrayDisplay(sizes)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Colors:</span>
              <span className="font-medium">{formatArrayDisplay(colors)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Price:</span>
              <span className="font-semibold text-green-600">AED {price?.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Stock:</span>
              <span className={`font-medium text-${stockStatus.color}-600`}>
                {stock} units
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2 mt-auto">
            <button 
              onClick={() => handleViewProduct(product)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center space-x-1"
            >
              <Eye className="w-4 h-4" />
              <span>View</span>
            </button>

            <button 
              onClick={() => handleEditProduct(product)}
              className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center space-x-1"
            >
              <Edit className="w-4 h-4" />
              <span>Edit</span>
            </button>

            <button 
              onClick={() => handleDeleteProduct(product)}
              className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
          <p className="text-gray-600">Manage your product catalog and inventory</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setAddModalOpen(true)}
          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center space-x-2 hover:shadow-lg transition-all duration-300"
        >
          <Plus className="w-5 h-5" />
          <span>Add Product</span>
        </motion.button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Expand Filters Button (Mobile) */}
          <button
            onClick={() => setExpandedFilters(!expandedFilters)}
            className="md:hidden flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg"
          >
            <Filter className="w-5 h-5 mr-2" />
            <span>Filters</span>
            {expandedFilters ? (
              <ChevronUp className="w-5 h-5 ml-2" />
            ) : (
              <ChevronDown className="w-5 h-5 ml-2" />
            )}
          </button>
        </div>

        {/* Expanded Filters */}
        <div className={`${expandedFilters ? 'block' : 'hidden'} md:block mt-4`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
              
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sub Category</label>
              <select
                value={selectedSubcategory}
                onChange={(e) => setSelectedSubcategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">All SubCategories</option>
                {subCategories.map((subCategory) => (
                  <option key={subCategory} value={subCategory}>{subCategory}</option>
                ))}
              </select>
            </div>


            {/* Brand Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">All Brands</option>
                {brands.map((brand) => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">All Statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filters */}
          {(selectedCategory || selectedSubcategory || selectedBrand || selectedStatus) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedCategory && (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-sm">
                  Category: {selectedCategory}
                  <button
                    onClick={() => setSelectedCategory('')}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedSubcategory && (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-sm">
                  SubCategory: {selectedSubcategory}
                  <button
                    onClick={() => setSelectedSubcategory('')}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedBrand && (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-sm">
                  Brand: {selectedBrand}
                  <button
                    onClick={() => setSelectedBrand('')}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedStatus && (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-sm">
                  Status: {selectedStatus}
                  <button
                    onClick={() => setSelectedStatus('')}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={resetFilters}
                className="text-sm text-purple-600 hover:text-purple-800"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Product Count */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing {displayedProducts.length} of {totalItems} products
        </div>
        <div className="text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </div>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading products</p>
          <p className="text-sm mt-1">{error.message || 'Unknown error occurred'}</p>
          <button 
            onClick={() => dispatch(fetchProducts())}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
          >
            Retry
          </button>
        </div>
      ) : displayedProducts.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-600 mb-4">Try adjusting your search or filters</p>
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {displayedProducts.map(renderProductCard)}
            </AnimatePresence>
          </div>

          {renderPagination()}
        </>
      )}

      {/* Modals */}
      <AddProductModal 
        isOpen={addModalOpen} 
        onClose={() => {
          setAddModalOpen(false);
          dispatch(fetchProducts());
        }} 
      />
      
      <ViewProductModal 
        isOpen={viewModalOpen} 
        onClose={closeViewModal}
        product={currentProduct}
      />
      
      <EditProductModal 
        isOpen={editModalOpen} 
        onClose={closeEditModal}
        product={currentProduct}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && productToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-md w-full"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Confirm Delete</h3>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <span className="font-medium">"{productToDelete.name}"</span>? This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Products;
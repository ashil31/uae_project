import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star } from 'lucide-react';
import { ImageUrl } from '../../services/url';

const ViewProductModal = ({ isOpen, onClose, product }) => {
  if (!product) return null;

  // Get display data from product
  const getDisplayData = () => {
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
      flatDiscount: product.flatDiscount || 0,
      percentDiscount: product.percentDiscount || 0,
      sizes,
      colors,
      sku: product.additionalInfo?.sku || 'N/A',
      weight: product.additionalInfo?.weight,
      dimensions: product.additionalInfo?.dimensions
    };
  };

  const { stock, price, flatDiscount, percentDiscount ,sizes, colors, sku, weight, dimensions } = getDisplayData();

  const stockStatus = useMemo(() => {
    if (stock <= 0) return { text: 'Out of Stock', color: 'red' };
    if (stock < 10) return { text: 'Low Stock', color: 'orange' };
    return { text: 'In Stock', color: 'green' };
  }, [stock]);

  if (!product) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6 max-w-md w-full text-center">
          <p>No product data available</p>
          <button 
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            role='dialog'
            aria-modal='true'
            aria-labelledby="modal-title"
            className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center z-10">
              <h2 id="modal-title" className="text-2xl font-bold text-gray-900">Product Details</h2>
              <button 
                onClick={onClose} 
                className="text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Image Gallery */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Images</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {product.images?.length > 0 ? (
                      product.images.map((image, index) => {
                        const imageSrc = image.url 
                          ? `${ImageUrl}${image.url}`
                            : `${image.url}`
                        return (
                          <div key={index} className="aspect-square overflow-hidden rounded-lg bg-gray-100 relative">
                            <img
                              src={imageSrc}
                              alt={image.altText || product.name}
                              className="w-full h-full object-cover"
                              loading='lazy'
                              onError={(e) => {
                                e.target.src = '/placeholder-product.jpg';
                                e.target.onerror = null;
                              }}
                            />
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-span-2 aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                        No images available
                      </div>
                    )}
                  </div>
                </div>

                {/* Video */}
                {product.video && (
                  <div className="space-y-4">
                    {console.log(product.video)}
                    <h3 className="text-lg font-semibold text-gray-900">Product Video</h3>
                    <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                      <video
                        src={product.video.url 
                          ? `${ImageUrl}${product.video.url}`
                          : `${ImageUrl}${product.video.url}`}
                        controls
                        className="w-full h-full object-cover"
                        preload="metadata"
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p><strong>Original Name:</strong> {product.video.originalName}</p>
                      <p><strong>Format:</strong> {product.video.format?.toUpperCase() || 'MP4'}</p>
                      {product.video.size && (
                        <p><strong>Size:</strong> {(product.video.size / (1024 * 1024)).toFixed(2)} MB</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Product Details */}
                <div className="space-y-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
                    {console.log(product)}
                    <div className="flex items-center gap-2 mt-2">
                      {console.log(product)}
                      {product.isFeatured && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                          <Star className="w-3 h-3 mr-1" />
                          Featured
                        </span>
                      )}
                      {product.isOnSale && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          <Star className="w-3 h-3 mr-1" />
                          On Sale
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-gray-600">{product.description}</p>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Base Price:</span>
                      <span className="font-medium">AED {product.basePrice?.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-500">Selling Price:</span>
                      <span className="font-semibold text-green-600">
                        AED {price?.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-500">Flat Discount:</span>
                      <span className="font-semibold text-green-600">
                        AED {product.flatDiscount?.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-500">Percent Discount:</span>
                      <span className="font-semibold text-green-600">
                        AED {product.percentDiscount?.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-500">Stock:</span>
                      <span className={`font-medium text-${stockStatus.color}-600`}>
                        {stock} units
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-500">SKU:</span>
                      <span className="font-mono text-sm">{sku}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-500">Category:</span>
                      <span>
                        {product.category}
                        {product.subCategory && ` / ${product.subCategory}`}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-500">Brand:</span>
                      <span className="font-medium">{product.brand}</span>
                    </div>
                  </div>

                  {/* Sizes and Colors */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-medium">Sizes</h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {sizes.length > 0 ? (
                            sizes.map((size, index) => (
                              <span key={index} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                                {size}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400">No sizes specified</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-medium">Colors</h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {colors.length > 0 ? (
                            colors.map((color, index) => (
                              <span key={index} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                                {color}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400">No colors specified</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Information Sections */}
              {product.materials?.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="font-medium">Materials</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {product.materials.map((material, index) => (
                      <span key={index} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                        {material}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {product.careInstructions && (
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="font-medium">Care Instructions</h3>
                  <p className="mt-2 text-gray-600 whitespace-pre-line">{product.careInstructions}</p>
                </div>
              )}

              {(weight || dimensions) && (
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="font-medium">Specifications</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                    {weight && (
                      <div>
                        <span className="text-sm text-gray-500">Weight</span>
                        <p className="font-medium">{weight}g</p>
                      </div>
                    )}
                    {dimensions && (
                      <div>
                        <span className="text-sm text-gray-500">Dimensions</span>
                        <p className="font-medium">{dimensions}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {product.tags?.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="font-medium">Tags</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {product.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ViewProductModal;
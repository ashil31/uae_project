import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, ChevronUp, Upload, Trash2 } from 'lucide-react';
import { updateProduct } from '../../../store/slices/productsSlice';
import { ImageUrl } from '../../services/url';
import toast from 'react-hot-toast';

const EditProductModal = ({ isOpen, onClose, product }) => {
    const dispatch = useDispatch();
    const [validationErrors, setValidationErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const categories = ["All", 'Men', 'Women', 'Shoes', 'Accessories'];
    const subCategories = {
        'All': ['Shirt', 'Pants', 'Jeans', 'T-Shirt', 'Suit', 'Jacket', 'Trousers', 'Hoodies', 'Night Wear', 'Active Wear'],
        'Men': ['Shirt', 'Pants', 'Jeans', 'T-Shirt', 'Suit', 'Jacket', 'Trousers', 'Hoodies', 'Night Wear', 'Active Wear'],
        'Women': ['Dress', 'Suit', 'Kurta', 'Top', 'Skirt', 'Pant', 'Jeans', 'Jacket', 'Night Wear', 'Active Wear'],
        'Shoes': ['Casual', 'Formal', 'Sneakers', 'Other'],
        'Accessories': ['Jewelry', 'Bag', 'Perfume', 'Watch', 'Shoes', 'Belt', 'Sunglasses', 'Tie', 'HandBag']
    };
    const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'One Size'];
    const materialsOptions = ['Cotton', 'Silk', 'Chiffon', 'Linen', 'Polyester', 'Wool', 'Crepe', 'Rayon', 'Leather', 'Nylon', 'Acrylic', 'Velvet', 'Velour', 'Denim', 'Synthetic', 'Other'];
    
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        basePrice: '',
        flatDiscount: '',
        percentDiscount: '',
        category: '',
        subCategory: '',
        brand: '',
        materials: [],
        careInstructions: '',
        tags: [],
        isFeatured: false,
        isOnSale: false,
        additionalInfo: {
            weight: '',
            dimensions: '',
            size: [],
            color: [],
            sku: '',
            stock: '0',
            price: ''
        },
        images: [],
        video: null
    });

    const [currentMaterial, setCurrentMaterial] = useState('');
    const [currentSize, setCurrentSize] = useState('');
    const [currentColor, setCurrentColor] = useState('');
    const [activeAccordion, setActiveAccordion] = useState(null);
    const [imageUploading, setImageUploading] = useState(false);

    // Initialize form data when product changes
    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name || '',
                description: product.description || '',
                basePrice: product.basePrice?.toString() || '',
                flatDiscount: product.flatDiscount?.toString() || 0,
                percentDiscount: product.percentDiscount?.toString() || 0,
                category: product.category || '',
                subCategory: product.subCategory || '',
                brand: product.brand || '',
                materials: product.materials || [],
                careInstructions: product.careInstructions || '',
                tags: product.tags || [],
                isFeatured: product.isFeatured || false,
                isOnSale: product.isOnSale || false,
                additionalInfo: {
                    weight: product.additionalInfo?.weight?.toString() || '',
                    dimensions: product.additionalInfo?.dimensions || '',
                    size: product.additionalInfo?.size || [],
                    color: product.additionalInfo?.color || [],
                    sku: product.additionalInfo?.sku || '',
                    stock: product.additionalInfo?.stock?.toString() || '0',
                    price: product.additionalInfo?.price?.toString() || ''
                },
                images: product.images ? product.images.map(img => ({
                    ...img,
                    url: img.url,
                    altText: img.altText || '',
                    _id: img._id || Math.random().toString(36).substring(2, 9),
                    isExisting: true
                })) : [],
                video: product.video ? {
                    ...product.video,
                    isExisting: true
                } : null
            });
        }
    }, [product]);

    useEffect(() => {
        const hasFlatDiscount = parseFloat(formData.flatDiscount) > 0;
        const hasPercentDiscount = parseFloat(formData.percentDiscount) > 0;
        
        if (hasFlatDiscount || hasPercentDiscount) {
          setFormData(prev => ({
            ...prev,
            isOnSale: true
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            isOnSale: false
          }));
        }
    }, [formData.flatDiscount, formData.percentDiscount]);
    // Clean up image previews when component unmounts
    useEffect(() => {
        return () => {
            formData.images.forEach(image => {
                if (image.preview) URL.revokeObjectURL(image.preview);
            });
            if (formData.video && formData.video.preview) {
                URL.revokeObjectURL(formData.video.preview);
            }
        };
    }, [formData.images, formData.video]);

    const handleImageChange = useCallback((files) => {
        setImageUploading(true);
        const validImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];
        const validFiles = Array.from(files).filter(file => 
            validImageTypes.includes(file.type)  // && file.size <= 10 * 1024 * 1024
        );

        if (validFiles.length !== files.length) {
            toast.error('Only image files (JPEG, JPG, PNG, WEBP, GIF) under 10MB are allowed');
            setImageUploading(false);
            return;
        }

        const imagePreviews = validFiles.map(file => ({
            file,
            preview: URL.createObjectURL(file),
            altText: file.name.split('.')[0].substring(0, 100),
            isNew: true,
            _id: Math.random().toString(36).substring(2, 9)
        }));

        setFormData(prev => ({
            ...prev,
            images: [
                ...prev.images.filter(img => !img.isNew && !img.toDelete),
                ...imagePreviews
            ]
        }));
        setImageUploading(false);
    }, []);

    const handleImageAltTextChange = useCallback((imageIndex, value) => {
        setFormData(prev => {
            const updatedImages = [...prev.images];
            updatedImages[imageIndex] = {
                ...updatedImages[imageIndex],
                altText: value
            };
            return {
                ...prev,
                images: updatedImages
            };
        });
    }, []);

    const removeImage = useCallback((imageIndex) => {
        setFormData(prev => {
            const images = [...prev.images];
            
            // Check if this is the last image
            const isLastImage = images.filter(img => !img.toDelete).length <= 1;
            
            if (isLastImage) {
                toast.error('At least one image must remain');
                return prev;
            }
            
            const imageToRemove = images[imageIndex];
            
            // Clean up memory if it's a new image
            if (imageToRemove.preview) {
                URL.revokeObjectURL(imageToRemove.preview);
            }
            
            // If it's an existing image, mark for deletion
            if (imageToRemove.isExisting) {
                images[imageIndex] = {
                    ...imageToRemove,
                    toDelete: true
                };
            } else {
                // If it's a new image, just remove it
                images.splice(imageIndex, 1);
            }
            
            return {
                ...prev,
                images
            };
        });
    }, []);

    // Video handling functions
    const isVideoFile = (file) => {
        return file.type.startsWith('video/');
    };

    const handleVideoChange = useCallback((e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!isVideoFile(file)) {
            toast.error('Please select a valid video file (MP4, MOV, AVI, WebM, etc.)');
            e.target.value = '';
            return;
        }

        // Validate file size (50MB limit)
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
            toast.error('Video file size must be less than 50MB');
            e.target.value = '';
            return;
        }

        try {
            // Clean up previous video preview if exists
            if (formData.video && formData.video.preview) {
                URL.revokeObjectURL(formData.video.preview);
            }
            
            const videoPreview = {
                file,
                preview: URL.createObjectURL(file),
                name: file.name,
                size: file.size,
                type: file.type,
                isNew: true
            };
            
            setFormData(prev => ({
                ...prev,
                video: videoPreview
            }));

            toast.success('Video uploaded successfully');
        } catch (error) {
            console.error('Error handling video upload:', error);
            toast.error('Failed to process video file');
            e.target.value = '';
        }
    }, []);

    const removeVideo = useCallback(() => {
        try {
            if (formData.video && formData.video.preview) {
                URL.revokeObjectURL(formData.video.preview);
            }
            setFormData(prev => ({
                ...prev,
                video: null
            }));
            toast.success('Video removed');
        } catch (error) {
            console.error('Error removing video:', error);
            toast.error('Failed to remove video');
        }
    }, []);

    const validateForm = useCallback(() => {
        const errors = {};
        
        // Basic field validation
        if (!formData.name.trim()) errors.name = 'Product name is required';
        if (!formData.description.trim()) errors.description = 'Description is required';
        if (!formData.basePrice || isNaN(formData.basePrice)) errors.basePrice = 'Valid base price is required';
        if (!formData.category) errors.category = 'Category is required';
        if (!formData.brand.trim()) errors.brand = 'Brand is required';
        if (formData.materials.length === 0) errors.materials = 'At least one material is required';
        
        // Additional info validation
        if (formData.additionalInfo.size.length === 0) errors.size = 'At least one size is required';
        if (formData.additionalInfo.color.length === 0) errors.color = 'At least one color is required';
        if (!formData.additionalInfo.sku.trim()) errors.sku = 'SKU is required';
        if (!formData.additionalInfo.price || isNaN(formData.additionalInfo.price)) errors.price = 'Valid price is required';
        if (formData.additionalInfo.stock === '' || isNaN(formData.additionalInfo.stock)) errors.stock = 'Valid stock quantity is required';
        
        // Image validation
        const activeImages = formData.images.filter(img => !img.toDelete);
        if (activeImages.length === 0) {
            errors.images = 'At least one image is required';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    }, [formData]);

    const handleChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        
        if (name.includes('additionalInfo.')) {
            const field = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                additionalInfo: {
                    ...prev.additionalInfo,
                    [field]: type === 'number' ? parseFloat(value) || '' : value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        }
    }, []);

    const handleAddMaterial = useCallback(() => {
        if (currentMaterial && !formData.materials.includes(currentMaterial)) {
            setFormData(prev => ({
                ...prev,
                materials: [...prev.materials, currentMaterial]
            }));
            setCurrentMaterial('');
        }
    }, [currentMaterial, formData.materials]);

    const handleRemoveMaterial = useCallback((index) => {
        setFormData(prev => ({
            ...prev,
            materials: prev.materials.filter((_, i) => i !== index)
        }));
    }, []);

    const handleAddSize = useCallback(() => {
        if (currentSize && !formData.additionalInfo.size.includes(currentSize)) {
            setFormData(prev => ({
                ...prev,
                additionalInfo: {
                    ...prev.additionalInfo,
                    size: [...prev.additionalInfo.size, currentSize]
                }
            }));
            setCurrentSize('');
        }
    }, [currentSize, formData.additionalInfo.size]);

    const handleRemoveSize = useCallback((index) => {
        setFormData(prev => ({
            ...prev,
            additionalInfo: {
                ...prev.additionalInfo,
                size: prev.additionalInfo.size.filter((_, i) => i !== index)
            }
        }));
    }, []);

    const handleAddColor = useCallback(() => {
        if (currentColor && !formData.additionalInfo.color.includes(currentColor)) {
            setFormData(prev => ({
                ...prev,
                additionalInfo: {
                    ...prev.additionalInfo,
                    color: [...prev.additionalInfo.color, currentColor]
                }
            }));
            setCurrentColor('');
        }
    }, [currentColor, formData.additionalInfo.color]);

    const handleRemoveColor = useCallback((index) => {
        setFormData(prev => ({
            ...prev,
            additionalInfo: {
                ...prev.additionalInfo,
                color: prev.additionalInfo.color.filter((_, i) => i !== index)
            }
        }));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        if (!validateForm()) {
            setIsSubmitting(false);
            return;
        }

        try {
            const formDataToSend = new FormData();

            // Add all required fields
            formDataToSend.append('name', formData.name.trim());
            formDataToSend.append('description', formData.description.trim());
            formDataToSend.append('basePrice', formData.basePrice);
            formDataToSend.append('flatDiscount', formData.flatDiscount);
            formDataToSend.append('percentDiscount', formData.percentDiscount);
            formDataToSend.append('category', formData.category);
            formDataToSend.append('subCategory', formData.subCategory || '');
            formDataToSend.append('brand', formData.brand.trim());
            formDataToSend.append('careInstructions', formData.careInstructions.trim() || '');
            formDataToSend.append('isFeatured', formData.isFeatured);
            formDataToSend.append('isOnSale', formData.isOnSale);
            // Add arrays as JSON strings
            formDataToSend.append('materials', JSON.stringify(formData.materials));
            formDataToSend.append('tags', JSON.stringify(formData.tags));
            
            // Add additionalInfo as a JSON string
            formDataToSend.append('additionalInfo', JSON.stringify({
                weight: formData.additionalInfo.weight || undefined,
                dimensions: formData.additionalInfo.dimensions || '',
                size: formData.additionalInfo.size,
                color: formData.additionalInfo.color,
                sku: formData.additionalInfo.sku,
                stock: formData.additionalInfo.stock,
                price: formData.additionalInfo.price
            }));

            // Handle existing images
            const existingImages = formData.images
                .filter(img => img.isExisting && !img.toDelete)
                .map(img => ({
                    _id: img._id,
                    url: img.url,
                    altText: img.altText
                }));
            
            formDataToSend.append('existingImages', JSON.stringify(existingImages));

            // Add new images
            formData.images
                .filter(img => !img.isExisting && !img.toDelete && img.file)
                .forEach((img, imgIndex) => {
                    formDataToSend.append('images', img.file);
                    formDataToSend.append(`altTexts[${imgIndex}]`, img.altText);
                });

            // Handle video
            if (formData.video) {
                if (formData.video.isNew && formData.video.file) {
                    // New video file
                    formDataToSend.append('video', formData.video.file);
                    formDataToSend.append('videoName', formData.video.name);
                } else if (formData.video.isExisting) {
                    // Keep existing video
                    formDataToSend.append('existingVideo', JSON.stringify({
                        url: formData.video.url,
                        originalName: formData.video.originalName,
                        size: formData.video.size,
                        format: formData.video.format
                    }));
                }
            } else if (product.video) {
                // Video was removed (product had video but formData.video is null)
                formDataToSend.append('removeVideo', 'true');
            }

            await dispatch(updateProduct({
                id: product._id,
                productData: formDataToSend
            })).unwrap();
            
            toast.success("Product updated successfully");
            onClose();
        } catch (error) {
            console.error('Error updating product:', error);
            
            // Handle specific validation errors from backend
            if (error.payload?.data?.errors) {
                const backendErrors = error.payload.data.errors;
                setValidationErrors(prev => ({
                    ...prev,
                    ...backendErrors
                }));
                toast.error('Please fix the validation errors');
            } else {
                toast.error(error.message || 'Failed to update product');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!product) return null;

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
                        className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                    >
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center z-10">
                            <h2 className="text-2xl font-bold text-gray-900">Edit Product</h2>
                            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {validationErrors.submitError && (
                                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                                    {validationErrors.submitError}
                                </div>
                            )}
                            
                            {/* Basic Information Section */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            required
                                        />
                                        {validationErrors.name && (
                                            <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>
                                        )}
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Brand *</label>
                                        <input
                                            type="text"
                                            name="brand"
                                            value={formData.brand}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            required
                                        />
                                        {validationErrors.brand && (
                                            <p className="text-red-500 text-xs mt-1">{validationErrors.brand}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                                        <select
                                            name="category"
                                            value={formData.category}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            required
                                        >
                                            <option value="">Select Category</option>
                                            {categories.map(category => (
                                                <option key={category} value={category}>{category}</option>
                                            ))}
                                        </select>
                                        {validationErrors.category && (
                                            <p className="text-red-500 text-xs mt-1">{validationErrors.category}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory</label>
                                        <select
                                            name="subCategory"
                                            value={formData.subCategory}
                                            onChange={handleChange}
                                            disabled={!formData.category}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                                        >
                                            <option value="">Select Subcategory</option>
                                            {formData.category && subCategories[formData.category]?.map(subCat => (
                                                <option key={subCat} value={subCat}>{subCat}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Base Price (AED) *</label>
                                        <input
                                            type="number"
                                            name="basePrice"
                                            value={formData.basePrice}
                                            onChange={handleChange}
                                            min="0"
                                            step="0.01"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            required
                                        />
                                        {validationErrors.basePrice && (
                                            <p className="text-red-500 text-xs mt-1">{validationErrors.basePrice}</p>
                                        )}
                                    </div>

                                  

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
                                        <input
                                            type="text"
                                            name="additionalInfo.sku"
                                            value={formData.additionalInfo.sku}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            required
                                        />
                                        {validationErrors.sku && (
                                            <p className="text-red-500 text-xs mt-1">{validationErrors.sku}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Price (AED) *</label>
                                        <input
                                            type="number"
                                            name="additionalInfo.price"
                                            value={formData.additionalInfo.price}
                                            onChange={handleChange}
                                            min="0"
                                            step="0.01"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            required
                                        />
                                        {validationErrors.price && (
                                            <p className="text-red-500 text-xs mt-1">{validationErrors.price}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Flat Discount (AED) *</label>
                                        <input
                                            type="number"
                                            name="flatDiscount"
                                            value={formData.flatDiscount}
                                            onChange={handleChange}
                                            min="0"
                                            step="0.01"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        />
                                        {validationErrors.flatDiscount && (
                                            <p className="text-red-500 text-xs mt-1">{validationErrors.flatDiscount}</p>
                                        )}
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Percentage Discount (%) *</label>
                                        <input
                                            type="number"
                                            name="percentDiscount"
                                            value={formData.percentDiscount}
                                            onChange={handleChange}
                                            min="0"
                                            step="0.01"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        />
                                        {validationErrors.percentDiscount && (
                                            <p className="text-red-500 text-xs mt-1">{validationErrors.percentDiscount}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Stock *</label>
                                        <input
                                            type="number"
                                            name="additionalInfo.stock"
                                            value={formData.additionalInfo.stock}
                                            onChange={handleChange}
                                            min="0"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            required
                                        />
                                        {validationErrors.stock && (
                                            <p className="text-red-500 text-xs mt-1">{validationErrors.stock}</p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        rows="3"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        required
                                    />
                                    {validationErrors.description && (
                                        <p className="text-red-500 text-xs mt-1">{validationErrors.description}</p>
                                    )}
                                </div>

                                {/* Sizes */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Sizes *</label>
                                    <div className="flex">
                                        <select
                                            value={currentSize}
                                            onChange={(e) => setCurrentSize(e.target.value)}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md"
                                        >
                                            <option value="">Select size</option>
                                            {sizes.filter(size => !formData.additionalInfo.size.includes(size)).map(size => (
                                                <option key={size} value={size}>{size}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={handleAddSize}
                                            disabled={!currentSize}
                                            className="px-4 py-2 bg-purple-600 text-white rounded-r-md disabled:bg-gray-300"
                                        >
                                            Add
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {formData.additionalInfo.size.map((size, index) => (
                                            <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                {size}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveSize(index)}
                                                    className="ml-1.5 inline-flex text-gray-400 hover:text-gray-500"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    {validationErrors.size && (
                                        <p className="text-red-500 text-xs mt-1">{validationErrors.size}</p>
                                    )}
                                </div>

                                {/* Colors */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Colors *</label>
                                    <div className="flex">
                                        <input
                                            type="text"
                                            value={currentColor}
                                            onChange={(e) => setCurrentColor(e.target.value)}
                                            placeholder="Enter a color (e.g., Red, Blue)"
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddColor}
                                            disabled={!currentColor}
                                            className="px-4 py-2 bg-purple-600 text-white rounded-r-md disabled:bg-gray-300"
                                        >
                                            Add
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {formData.additionalInfo.color.map((color, index) => (
                                            <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                {color}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveColor(index)}
                                                    className="ml-1.5 inline-flex text-gray-400 hover:text-gray-500"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    {validationErrors.color && (
                                        <p className="text-red-500 text-xs mt-1">{validationErrors.color}</p>
                                    )}
                                </div>

                                {/* Materials */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Materials *</label>
                                    <div className="flex">
                                        <select
                                            value={currentMaterial}
                                            onChange={(e) => setCurrentMaterial(e.target.value)}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md"
                                        >
                                            <option value="">Select material</option>
                                            {materialsOptions.filter(mat => !formData.materials.includes(mat)).map(mat => (
                                                <option key={mat} value={mat}>{mat}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={handleAddMaterial}
                                            disabled={!currentMaterial}
                                            className="px-4 py-2 bg-purple-600 text-white rounded-r-md disabled:bg-gray-300"
                                        >
                                            Add
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {formData.materials.map((material, index) => (
                                            <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                {material}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveMaterial(index)}
                                                    className="ml-1.5 inline-flex text-gray-400 hover:text-gray-500"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    {validationErrors.materials && (
                                        <p className="text-red-500 text-xs mt-1">{validationErrors.materials}</p>
                                    )}
                                </div>

                                {/* Product Images */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Images *
                                    </label>
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                                        <label className="cursor-pointer">
                                            <Upload className="w-8 h-8 mx-auto text-gray-400" />
                                            <p className="mt-2 text-sm text-gray-600">
                                                <span className="font-medium text-purple-600 hover:text-purple-500">
                                                    Click to upload
                                                </span>{' '}
                                                or drag and drop
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                PNG, JPG, GIF, WEBP up to 10MB
                                            </p>
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                onChange={(e) => handleImageChange(Array.from(e.target.files))}
                                                className="hidden"
                                                disabled={isSubmitting || imageUploading}
                                            />
                                        </label>
                                    </div>
                                    {validationErrors.images && (
                                        <p className="text-red-500 text-xs mt-1">{validationErrors.images}</p>
                                    )}

                                    {/* Image Previews */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                                        {formData.images.map((image, imgIndex) => (
                                            <div key={imgIndex} className="relative group border rounded-lg overflow-hidden">
                                                {/* Show overlay if marked for deletion */}
                                                {image.toDelete && (
                                                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                                                        <span className="text-white font-bold">Marked for deletion</span>
                                                    </div>
                                                )}
                                                <img
                                                    src={image.preview || `${ImageUrl}${image.url}`}
                                                    alt={image.altText}
                                                    className="w-full h-40 object-cover"
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = '/placeholder-product.jpg';
                                                    }}
                                                />
                                                <div className="p-2">
                                                    <input
                                                        type="text"
                                                        value={image.altText}
                                                        onChange={(e) => handleImageAltTextChange(imgIndex, e.target.value)}
                                                        placeholder="Image description"
                                                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                                        disabled={image.toDelete}
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeImage(imgIndex);
                                                    }}
                                                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Product Video */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900">Product Video</h3>
                                <p className="text-sm text-gray-500">Upload a product video (optional). All formats supported, will be converted to MP4.</p>
                                
                                {!formData.video ? (
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                        <label className="cursor-pointer">
                                            <Upload className="w-8 h-8 mx-auto text-gray-400" />
                                            <p className="mt-2 text-sm text-gray-600">
                                                <span className="font-medium text-purple-600 hover:text-purple-500">
                                                    Click to upload video
                                                </span>{' '}
                                                or drag and drop
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                MP4, MOV, AVI, WebM, MKV and other video formats
                                            </p>
                                            <input
                                                type="file"
                                                accept="video/*"
                                                onChange={handleVideoChange}
                                                className="hidden"
                                                disabled={isSubmitting}
                                            />
                                        </label>
                                    </div>
                                ) : (
                                    <div className="border rounded-lg p-4 bg-gray-50">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-medium text-gray-900">Video Preview</h4>
                                            <button
                                                type="button"
                                                onClick={removeVideo}
                                                className="text-red-600 hover:text-red-800 flex items-center text-sm"
                                            >
                                                <X className="w-4 h-4 mr-1" />
                                                Remove
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            {(() => {
                                                const videoSrc = formData.video.preview || 
                                                    (formData.video.url 
                                                        ? (formData.video.url.startsWith('http') 
                                                            ? formData.video.url 
                                                            : `${ImageUrl}${formData.video.url}`)
                                                        : '');
                                                console.log('Video source:', videoSrc);
                                                console.log('Video data:', formData.video);
                                                return (
                                                    <video
                                                        src={videoSrc}
                                                        controls
                                                        className="w-full max-w-md h-48 object-cover rounded-lg"
                                                        preload="metadata"
                                                        onError={(e) => {
                                                            console.error('Video preview error:', e);
                                                            console.error('Failed video src:', videoSrc);
                                                            toast.error('Error loading video preview');
                                                        }}
                                                        onLoadStart={() => {
                                                            console.log('Video loading started');
                                                        }}
                                                        onCanPlay={() => {
                                                            console.log('Video can play');
                                                        }}
                                                    >
                                                        Your browser does not support the video tag.
                                                    </video>
                                                );
                                            })()}
                                            <div className="text-sm text-gray-600">
                                                <p><strong>File:</strong> {formData.video.name || formData.video.originalName}</p>
                                                {formData.video.size && (
                                                    <p><strong>Size:</strong> {(formData.video.size / (1024 * 1024)).toFixed(2)} MB</p>
                                                )}
                                                <p><strong>Type:</strong> {formData.video.type || formData.video.format}</p>
                                                {formData.video.isNew && (
                                                    <p className="text-xs text-purple-600 mt-1">
                                                        * Video will be converted to MP4 format when saved
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Additional Information */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900">Additional Information</h3>
                                    <button
                                        type="button"
                                        onClick={() => setActiveAccordion(activeAccordion === 'additional' ? null : 'additional')}
                                        className="text-sm text-purple-600 hover:text-purple-800 flex items-center"
                                    >
                                        {activeAccordion === 'additional' ? (
                                            <>
                                                <span>Collapse</span>
                                                <ChevronUp className="w-4 h-4 ml-1" />
                                            </>
                                        ) : (
                                            <>
                                                <span>Expand</span>
                                                <ChevronDown className="w-4 h-4 ml-1" />
                                            </>
                                        )}
                                    </button>
                                </div>

                                {activeAccordion === 'additional' && (
                                    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Weight (grams)
                                                </label>
                                                <input
                                                    type="number"
                                                    name="additionalInfo.weight"
                                                    value={formData.additionalInfo.weight}
                                                    onChange={handleChange}
                                                    min="0"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Dimensions
                                                </label>
                                                <input
                                                    type="text"
                                                    name="additionalInfo.dimensions"
                                                    value={formData.additionalInfo.dimensions}
                                                    onChange={handleChange}
                                                    placeholder="L x W x H cm"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Care Instructions
                                            </label>
                                            <textarea
                                                name="careInstructions"
                                                value={formData.careInstructions}
                                                onChange={handleChange}
                                                rows="3"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                placeholder="Provide care instructions for the product..."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Tags
                                            </label>
                                            <input
                                                type="text"
                                                name="tags"
                                                value={formData.tags.join(', ')}
                                                onChange={(e) => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                                                    }));
                                                }}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                placeholder="Comma-separated tags (e.g., summer, new, sale)"
                                            />
                                        </div>

                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="isFeatured"
                                                name="isFeatured"
                                                checked={formData.isFeatured}
                                                onChange={handleChange}
                                                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                            />
                                            <label htmlFor="isFeatured" className="ml-2 block text-sm text-gray-700">
                                                Feature this product on homepage
                                            </label>
                                        </div>

                                          <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="isOnSale"
                                                name="isOnSale"
                                                checked={formData.isOnSale}
                                                onChange={handleChange}
                                                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                                            />
                                            <label htmlFor="isOnSale" className="ml-2 block text-sm text-gray-700">
                                               Add this product on sale
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Form Actions */}
                            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || imageUploading}
                                    className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'Updating...' : 'Update Product'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default EditProductModal;
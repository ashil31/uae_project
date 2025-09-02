import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, ChevronDown, ChevronUp, Upload } from "lucide-react";
import { createProduct } from "../../../store/slices/productsSlice";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import toast from "react-hot-toast";

const AddProductModal = ({ isOpen, onClose }) => {
  // Form state
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    basePrice: "",
    flatDiscount: "",
    percentDiscount: "",
    category: "",
    subCategory: "",
    brand: "",
    materials: [],
    careInstructions: "",
    tags: [],
    isFeatured: false,
    isOnSale: false,
    additionalInfo: {
      weight: "",
      dimensions: "",
      size: [],
      color: [],
      sku: "",
      stock: "",
      price: "",
    },
    images: [], // Now stores file objects with previews
    video: null, // Stores single video file with preview
  });
  // console.log(formData);
  const [currentMaterial, setCurrentMaterial] = useState("");
  const [currentColor, setCurrentColor] = useState("");
  const [activeAccordion, setActiveAccordion] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Product options
  const categories = ["All", "Men", "Women","Kids", "Shoes", "Accessories"];
  const subCategories = {
    All: [
      "Shirt",
      "Pants",
      "Jeans",
      "T-Shirt",
      "Suit",
      "Jacket",
      "Trousers",
      "Hoodies",
      "Night Wear",
      "Active Wear",
    ],
    Men: [
      "Shirt",
      "Pants",
      "Jeans",
      "T-Shirt",
      "Suit",
      "Jacket",
      "Trousers",
      "Hoodies",
      "Night Wear",
      "Active Wear",
    ],
    Women: [
      "Dress",
      "Suit",
      "Kurta",
      "Top",
      "Skirt",
      "Pant",
      "Jeans",
      "Jacket",
      "Night Wear",
      "Active Wear",
    ],
    Shoes: ["Casual", "Formal", "Sneakers", "Other"],
    Accessories: [
      "Jewelry",
      "Bag",
      "Perfume",
      "Watch",
      "Shoes",
      "Belt",
      "Sunglasses",
      "Tie",
      "HandBag",
    ],
  };
  const sizes = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "One Size"];
  const materialsOptions = [
    "Cotton",
    "Silk",
    "Chiffon",
    "Linen",
    "Polyester",
    "Wool",
    "Crepe",
    "Rayon",
    "Leather",
    "Nylon",
    "Acrylic",
    "Velvet",
    "Velour",
    "Denim",
    "Synthetic",
    "Other",
  ];

  // Utility functions for file type checking
  const isImageFile = (file) => {
    return file.type.startsWith("image/");
  };

  const isVideoFile = (file) => {
    return file.type.startsWith("video/");
  };

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

  useEffect(() => {
    return () => {
      // Clean up image previews when component unmounts
      formData.images.forEach((image) => URL.revokeObjectURL(image.preview));
      // Clean up video preview when component unmounts
      if (formData.video) {
        URL.revokeObjectURL(formData.video.preview);
      }
    };
  }, [formData.images, formData.video]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.includes("additionalInfo.")) {
      const field = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        additionalInfo: {
          ...prev.additionalInfo,
          [field]: type === "number" ? parseFloat(value) || "" : value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  // Handle material addition
  const handleAddMaterial = () => {
    if (currentMaterial && !formData.materials.includes(currentMaterial)) {
      setFormData((prev) => ({
        ...prev,
        materials: [...prev.materials, currentMaterial],
      }));
      setCurrentMaterial("");
    }
  };

  //handle color addition
  const handleAddColor = () => {
    if (currentColor && !formData.additionalInfo.color.includes(currentColor)) {
      setFormData((prev) => ({
        ...prev,
        additionalInfo: {
          ...prev.additionalInfo,
          color: [...prev.additionalInfo.color, currentColor],
        },
      }));
      setCurrentColor("");
    }
  };

  // handle color removal
  const handleRemoveColor = (color) => {
    setFormData((prev) => ({
      ...prev,
      additionalInfo: {
        ...prev.additionalInfo,
        color: prev.additionalInfo.color.filter((c) => c !== color),
      },
    }));
  };

  // Handle material removal
  const handleRemoveMaterial = (material) => {
    setFormData((prev) => ({
      ...prev,
      materials: prev.materials.filter((m) => m !== material),
    }));
  };

  // Handle file changes for images
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);

    const imagePreviews = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      altText: file.name.split(".")[0], // Default alt text from filename
    }));

    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, ...imagePreviews],
    }));
  };

  // Handle video file change
  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!isVideoFile(file)) {
      toast.error(
        "Please select a valid video file (MP4, MOV, AVI, WebM, etc.)"
      );
      e.target.value = ""; // Clear the input
      return;
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast.error("Video file size must be less than 50MB");
      e.target.value = ""; // Clear the input
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
      };

      setFormData((prev) => ({
        ...prev,
        video: videoPreview,
      }));

      toast.success("Video uploaded successfully");
    } catch (error) {
      console.error("Error handling video upload:", error);
      toast.error("Failed to process video file");
      e.target.value = ""; // Clear the input
    }
  };

  // Remove video
  const removeVideo = () => {
    try {
      if (formData.video && formData.video.preview) {
        URL.revokeObjectURL(formData.video.preview);
      }
      setFormData((prev) => ({
        ...prev,
        video: null,
      }));
      toast.success("Video removed");
    } catch (error) {
      console.error("Error removing video:", error);
      toast.error("Failed to remove video");
    }
  };

  // Update alt text for an image
  const handleAltTextChange = (index, value) => {
    setFormData((prev) => {
      const updatedImages = [...prev.images];
      updatedImages[index] = {
        ...updatedImages[index],
        altText: value,
      };
      return {
        ...prev,
        images: updatedImages,
      };
    });
  };

  // Remove an image
  const removeImage = (index) => {
    setFormData((prev) => {
      const updatedImages = [...prev.images];
      URL.revokeObjectURL(updatedImages[index].preview); // Clean up memory
      updatedImages.splice(index, 1);
      return {
        ...prev,
        images: updatedImages,
      };
    });
  };

  // Toggle accordion
  const toggleAccordion = (section) => {
    setActiveAccordion(activeAccordion === section ? null : section);
  };

  // Validate form
  const validateForm = () => {
    const errors = [];

    if (!formData.name.trim()) errors.push("Product name is required");
    if (!formData.description.trim()) errors.push("Description is required");
    if (!formData.basePrice || formData.basePrice <= 0)
      errors.push("Valid base price is required");
    if (!formData.category) errors.push("Category is required");
    if (!formData.brand.trim()) errors.push("Brand is required");
    if (formData.additionalInfo.size.length === 0)
      errors.push("At least one size is required");
    if (formData.additionalInfo.color.length === 0)
      errors.push("At least one color is required");
    if (!formData.additionalInfo.sku.trim()) errors.push("SKU is required");
    if (!formData.additionalInfo.stock || formData.additionalInfo.stock < 0)
      errors.push("Valid stock quantity is required");
    if (!formData.additionalInfo.price || formData.additionalInfo.price <= 0)
      errors.push("Valid price is required");
    if (formData.images.length === 0)
      errors.push("At least one product image is required");

    if (formData.images.length === 0) {
      errors.push("At least one product image is required");
    } else if (formData.images.length > 10) {
      errors.push("Maximum 10 images allowed");
    }

    // Check if any image is too large
    // const oversizedImage = formData.images.find(image => image.file.size > 10 * 1024 * 1024);
    // if (oversizedImage) {
    //   errors.push('One or more images exceed the 10MB size limit');
    // }

    return errors;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm();

    if (validationErrors.length > 0) {
      toast.error(
        <div>
          <strong>Please fix the following errors:</strong>
          <ul className="mt-1 list-disc list-inside">
            {validationErrors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();

      // Append all product data except images
      const productData = {
        ...formData,
        // Convert tags from string to array if needed
        tags:
          typeof formData.tags === "string"
            ? formData.tags
                .split(",")
                .map((t) => t.trim())
                .filter((t) => t)
            : formData.tags,
        additionalInfo: {
          ...formData.additionalInfo,
          // Ensure size is an array (might be string in old data)
          size: Array.isArray(formData.additionalInfo.size)
            ? formData.additionalInfo.size
            : [formData.additionalInfo.size].filter(Boolean),
          // Convert color from string to array if needed
          color:
            typeof formData.additionalInfo.color === "string"
              ? formData.additionalInfo.color
                  .split(",")
                  .map((c) => c.trim())
                  .filter((c) => c)
              : formData.additionalInfo.color,
          // Convert number fields to proper types
          weight: formData.additionalInfo.weight
            ? parseFloat(formData.additionalInfo.weight)
            : undefined,
          stock: parseInt(formData.additionalInfo.stock) || 0,
          price: parseFloat(formData.additionalInfo.price),
        },
      };

      // Append all product data except images
      Object.keys(productData).forEach((key) => {
        if (key !== "images") {
          if (
            key === "additionalInfo" ||
            key === "materials" ||
            key === "tags"
          ) {
            formDataToSend.append(key, JSON.stringify(productData[key]));
          } else {
            formDataToSend.append(key, productData[key]);
          }
        }
      });

      // Append each image file and alt text
      formData.images.forEach((image, index) => {
        formDataToSend.append("images", image.file);
        formDataToSend.append(`altTexts[${index}]`, image.altText);
      });

      // Append video file if exists
      if (formData.video && formData.video.file) {
        try {
          formDataToSend.append("video", formData.video.file);
          formDataToSend.append("videoName", formData.video.name);
          console.log(
            "Video file appended:",
            formData.video.name,
            "Size:",
            formData.video.size
          );
        } catch (error) {
          console.error("Error appending video file:", error);
          toast.error("Error processing video file");
        }
      }

      // Send to backend
      const response = await dispatch(createProduct(formDataToSend));

      // Check if the action was rejected
      if (createProduct.fulfilled.match(response)) {
        toast.success("Product created successfully!");

        // Reset form and clean up
        formData.images.forEach((image) => URL.revokeObjectURL(image.preview));
        if (formData.video) {
          URL.revokeObjectURL(formData.video.preview);
        }
        setFormData({
          name: "",
          description: "",
          basePrice: "",
          flatDiscount: "",
          percentDiscount: "",
          category: "",
          subCategory: "",
          brand: "",
          materials: [],
          careInstructions: "",
          tags: "",
          isFeatured: false,
          isOnSale: false,
          additionalInfo: {
            weight: "",
            dimensions: "",
            size: "",
            color: [],
            sku: "",
            stock: "",
            price: "",
          },
          images: [],
          video: null,
        });
        onClose();
      } else if (createProduct.rejected.match(response)) {
        throw new Error(response.error.message || "Failed to create product");
      }
    } catch (error) {
      console.error("Error creating product:", error);
      toast.error("Failed to create product. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center z-10">
              <h2 className="text-2xl font-bold text-gray-900">
                Add New Product
              </h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Product Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter product name"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="brand"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Brand *
                    </label>
                    <input
                      type="text"
                      id="brand"
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      placeholder="Enter brand name"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="category"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Category *
                    </label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Select a category</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="subCategory"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Sub-Category
                    </label>
                    <select
                      id="subCategory"
                      name="subCategory"
                      value={formData.subCategory}
                      onChange={handleChange}
                      disabled={!formData.category}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
                    >
                      <option value="">Select a sub-category</option>
                      {formData.category &&
                        subCategories[formData.category]?.map((subCat) => (
                          <option key={subCat} value={subCat}>
                            {subCat}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Description *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe your product"
                    required
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Pricing & Inventory */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Pricing & Inventory
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label
                      htmlFor="basePrice"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Base Price (AED) *
                    </label>
                    <input
                      type="number"
                      id="basePrice"
                      name="basePrice"
                      value={formData.basePrice}
                      onChange={handleChange}
                      placeholder="eg. 100"
                      min="0"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="additionalInfo.price"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Selling Price (AED) *
                    </label>
                    <input
                      type="number"
                      id="additionalInfo.price"
                      name="additionalInfo.price"
                      value={formData.additionalInfo.price}
                      onChange={handleChange}
                      placeholder="eg. 120"
                      min="0"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Flat Discount (AED) *
                    </label>
                    <input
                      type="number"
                      name="flatDiscount"
                      value={formData.flatDiscount}
                      onChange={handleChange}
                      placeholder="eg. 10"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount Percentage (%) *
                    </label>
                    <input
                      type="number"
                      name="percentDiscount"
                      value={formData.percentDiscount}
                      onChange={handleChange}
                      placeholder="eg. 10"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="additionalInfo.sku"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      SKU *
                    </label>
                    <input
                      type="text"
                      id="additionalInfo.sku"
                      name="additionalInfo.sku"
                      value={formData.additionalInfo.sku}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="eg. AB-001"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="additionalInfo.stock"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Stock Quantity *
                    </label>
                    <input
                      type="number"
                      id="additionalInfo.stock"
                      name="additionalInfo.stock"
                      value={formData.additionalInfo.stock}
                      onChange={handleChange}
                      min="0"
                      placeholder="eg. 10"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Product Attributes */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Product Attributes
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label
                      htmlFor="additionalInfo.size"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Sizes *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {sizes.map((size) => (
                        <div key={size} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`size-${size}`}
                            checked={formData.additionalInfo.size.includes(
                              size
                            )}
                            onChange={(e) => {
                              const newSizes = e.target.checked
                                ? [...formData.additionalInfo.size, size]
                                : formData.additionalInfo.size.filter(
                                    (s) => s !== size
                                  );
                              setFormData((prev) => ({
                                ...prev,
                                additionalInfo: {
                                  ...prev.additionalInfo,
                                  size: newSizes,
                                },
                              }));
                            }}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                          <label
                            htmlFor={`size-${size}`}
                            className="ml-2 text-sm text-gray-700"
                          >
                            {size}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="additionalInfo.weight"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Weight (grams)
                    </label>
                    <input
                      type="number"
                      id="additionalInfo.weight"
                      name="additionalInfo.weight"
                      value={formData.additionalInfo.weight}
                      onChange={handleChange}
                      placeholder="eg. 100"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="additionalInfo.dimensions"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Dimensions
                    </label>
                    <input
                      type="text"
                      id="additionalInfo.dimensions"
                      name="additionalInfo.dimensions"
                      value={formData.additionalInfo.dimensions}
                      onChange={handleChange}
                      placeholder="L x W x H cm"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Colors */}
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.additionalInfo.color.map((color) => (
                    <span
                      key={color}
                      className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-sm"
                      style={{
                        color: color,
                      }}
                    >
                      {color}
                      <button
                        type="button"
                        onClick={() => handleRemoveColor(color)}
                        className="ml-2 text-purple-600 hover:text-purple-800"
                      >
                        <X className="w-3 h-3" style={{ color: color }} />
                      </button>
                    </span>
                  ))}
                </div>
                <div>
                  <label
                    htmlFor="colorInput"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Add Color *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="colorInput"
                      value={currentColor}
                      onChange={(e) => setCurrentColor(e.target.value)}
                      placeholder="Enter a color (e.g., Red, Blue)"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={handleAddColor}
                      disabled={!currentColor}
                      className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-md transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Materials */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Materials
                </h3>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.materials.map((material) => (
                    <span
                      key={material}
                      className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-sm"
                    >
                      {material}
                      <button
                        type="button"
                        onClick={() => handleRemoveMaterial(material)}
                        className="ml-2 text-purple-600 hover:text-purple-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <select
                    value={currentMaterial}
                    onChange={(e) => setCurrentMaterial(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select material</option>
                    {materialsOptions
                      .filter((mat) => !formData.materials.includes(mat))
                      .map((mat) => (
                        <option key={mat} value={mat}>
                          {mat}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddMaterial}
                    disabled={!currentMaterial}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-md transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Images */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Product Images *
                </h3>
                <p className="text-sm text-gray-500">
                  Upload high-quality images of your product (max 3 images).
                </p>

                {/* File upload area */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <label className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      <span className="font-medium text-purple-600 hover:text-purple-500">
                        Click to upload
                      </span>{" "}
                      or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, GIF, WEBP, JPEG
                    </p>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={isSubmitting}
                    />
                  </label>
                </div>

                {/* Image previews */}
                {formData.images.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                    {formData.images.map((image, index) => (
                      <div
                        key={index}
                        className="relative group border rounded-lg overflow-hidden"
                      >
                        <img
                          src={image.preview}
                          alt={image.altText}
                          className="w-full h-48 object-cover"
                        />
                        <div className="p-3">
                          <input
                            type="text"
                            value={image.altText}
                            onChange={(e) =>
                              handleAltTextChange(index, e.target.value)
                            }
                            placeholder="Image description"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Video */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Product Video
                </h3>
                <p className="text-sm text-gray-500">
                  Upload a product video (optional). All formats supported, will
                  be converted to MP4.
                </p>

                {!formData.video ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <label className="cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">
                        <span className="font-medium text-purple-600 hover:text-purple-500">
                          Click to upload video
                        </span>{" "}
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
                      <h4 className="font-medium text-gray-900">
                        Video Preview
                      </h4>
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
                      <video
                        src={formData.video.preview}
                        controls
                        className="w-full max-w-md h-48 object-cover rounded-lg"
                        preload="metadata"
                        onError={(e) => {
                          console.error("Video preview error:", e);
                          toast.error("Error loading video preview");
                        }}
                      >
                        Your browser does not support the video tag.
                      </video>
                      <div className="text-sm text-gray-600">
                        <p>
                          <strong>File:</strong> {formData.video.name}
                        </p>
                        <p>
                          <strong>Size:</strong>{" "}
                          {(formData.video.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                        <p>
                          <strong>Type:</strong> {formData.video.type}
                        </p>
                        <p className="text-xs text-purple-600 mt-1">
                          * Video will be converted to MP4 format when saved
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Additional Information
                  </h3>
                  <button
                    type="button"
                    onClick={() => toggleAccordion("additional")}
                    className="text-sm text-purple-600 hover:text-purple-800 flex items-center"
                  >
                    {activeAccordion === "additional" ? (
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

                {activeAccordion === "additional" && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label
                        htmlFor="careInstructions"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Care Instructions
                      </label>
                      <textarea
                        id="careInstructions"
                        name="careInstructions"
                        value={formData.careInstructions}
                        onChange={handleChange}
                        rows={3}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Provide care instructions for the product..."
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="tags"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Tags
                      </label>
                      <input
                        type="text"
                        id="tags"
                        name="tags"
                        value={formData.tags.join(",")}
                        onChange={(e) => {
                          const tags = e.target.value
                            .split(",")
                            .map((t) => t.trim())
                            .filter((t) => t);
                          setFormData((prev) => ({
                            ...prev,
                            tags,
                          }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                      <label
                        htmlFor="isFeatured"
                        className="ml-2 block text-sm text-gray-700"
                      >
                        Feature this product on homepage
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
                  className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Creating Product..." : "Create Product"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddProductModal;

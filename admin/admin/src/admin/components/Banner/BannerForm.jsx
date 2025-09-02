import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import ProgressBar from '../ProgressBar';
import MediaPreview from './MediaPreview';

const BannerForm = ({ 
  banner = null, 
  onSubmit, 
  onCancel, 
  isLoading = false, 
  uploadProgress = 0,
  title = "Add New Banner",
  resetTrigger = 0
}) => {
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    title: banner?.title || '',
    subtitle: banner?.subtitle || '',
    cta: banner?.cta || 'Shop Now',
    link: banner?.link || '',
    textPosition: banner?.textPosition || 'left',
    altText: banner?.media?.altText || banner?.image?.altText || '',
    media: null,
    removeMedia: false
  });

  useEffect(() => {
    if (!banner) {
      setFormData({
        title: '',
        subtitle: '',
        cta: 'Shop Now',
        link: '',
        textPosition: 'left',
        altText: '',
        media: null,
        removeMedia: false
      });

      // Clear file input manually
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [resetTrigger, banner]);

  // Validation constants
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
  const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'];
  const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleMediaUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File size should be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      return;
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Only JPG, PNG, WEBP, SVG images and MP4, WEBM, OGG videos are allowed');
      return;
    }

    // Additional validation for videos
    if (ALLOWED_VIDEO_TYPES.includes(file.type)) {
      if (file.size > 50 * 1024 * 1024) { // 50MB for videos
        toast.error('Video files should be less than 50MB');
        return;
      }
    } else {
      if (file.size > 10 * 1024 * 1024) { // 10MB for images
        toast.error('Image files should be less than 10MB');
        return;
      }
    }

    setFormData(prev => ({
      ...prev,
      media: file,
      removeMedia: false
    }));
  };

  const handleRemoveMedia = () => {
    setFormData(prev => ({
      ...prev,
      media: null,
      removeMedia: true
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.title?.trim()) {
      toast.error('Title is required');
      return;
    }

    // Validate media requirement for new banners
    if (!banner && !formData.media) {
      toast.error('Media file (image or video) is required');
      return;
    }

    // Validate link format if provided
    if (formData.link && !formData.link.startsWith('/')) {
      toast.error('Link should start with "/" (e.g., /shop/collection)');
      return;
    }

    // Create form data for submission
    const submitData = new FormData();
    submitData.append('title', formData.title.trim());
    submitData.append('subtitle', formData.subtitle.trim());
    submitData.append('cta', formData.cta.trim());
    submitData.append('link', formData.link.trim());
    submitData.append('textPosition', formData.textPosition);
    submitData.append('altText', formData.altText.trim());

    if (formData.media) {
      submitData.append('media', formData.media);
    }

    if (formData.removeMedia) {
      submitData.append('removeMedia', 'true');
    }

    onSubmit(submitData);
  };

  const getMediaType = (file) => {
    if (!file) return null;
    return ALLOWED_VIDEO_TYPES.includes(file.type) ? 'video' : 'image';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h2 className="text-lg font-medium text-gray-900 mb-4">{title}</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Banner title"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subtitle
            </label>
            <input
              type="text"
              value={formData.subtitle}
              onChange={(e) => handleInputChange('subtitle', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Banner subtitle"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CTA Text
            </label>
            <input
              type="text"
              value={formData.cta}
              onChange={(e) => handleInputChange('cta', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Call to action text"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Link URL
            </label>
            <input
              type="text"
              value={formData.link}
              onChange={(e) => handleInputChange('link', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="/shop/collection"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Text Position
            </label>
            <select
              value={formData.textPosition}
              onChange={(e) => handleInputChange('textPosition', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alt Text
            </label>
            <input
              type="text"
              value={formData.altText}
              onChange={(e) => handleInputChange('altText', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe the media content"
            />
          </div>
        </div>

        {/* Media Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Banner Media {!banner && '*'} (Images: max 10MB, Videos: max 50MB)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleMediaUpload}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          {/* Upload Progress */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <ProgressBar progress={uploadProgress} className="mt-2" />
          )}
          
          {/* File Info */}
          {formData.media && (
            <div className="mt-2 p-2 bg-blue-50 rounded-md">
              <div className="flex items-center justify-between">
                <div className="text-sm text-blue-700">
                  <span className="font-medium">{formData.media.name}</span>
                  <span className="ml-2">({formatFileSize(formData.media.size)})</span>
                  <span className="ml-2 px-2 py-1 bg-blue-100 rounded text-xs">
                    {getMediaType(formData.media)?.toUpperCase()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveMedia}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Media Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Current Media (for editing) */}
          {banner && !formData.removeMedia && !formData.media && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Media
              </label>
              <div className="relative">
                <MediaPreview
                  media={banner.media}
                  image={banner.image}
                  title={banner.title}
                  className="w-full h-48"
                  showControls={true}
                />
                <button
                  type="button"
                  onClick={handleRemoveMedia}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                  title="Remove current media"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          
          {/* New Media Preview */}
          {formData.media && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Media Preview
              </label>
              <div className="w-full h-48 bg-gray-100 rounded-md overflow-hidden">
                {getMediaType(formData.media) === 'video' ? (
                  <video
                    src={URL.createObjectURL(formData.media)}
                    className="w-full h-full object-cover"
                    controls
                    muted
                  />
                ) : (
                  <img
                    src={URL.createObjectURL(formData.media)}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3 pt-4">
          <button
            type="submit"
            disabled={isLoading || !formData.title.trim() || (!banner && !formData.media)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (banner ? 'Updating...' : 'Adding...') : (banner ? 'Update Banner' : 'Add Banner')}
          </button>
          
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default BannerForm;
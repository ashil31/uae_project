import React from 'react';
import { ImageUrl } from '../../services/url';

const MediaPreview = ({ 
  media, 
  image, // For backward compatibility
  title, 
  className = "",
  showControls = false,
  autoPlay = false,
  muted = true,
  loop = false 
}) => {
  // Determine media type and URL
  const getMediaInfo = () => {
    // New media field takes precedence
    if (media) {
      return {
        type: media.type,
        url: media.url.startsWith('http') ? media.url : `${ImageUrl}${media.url}`,
        altText: media.altText || title || 'Banner media',
        duration: media.formattedDuration || media.duration,
        size: media.formattedSize || media.size,
        dimensions: media.width && media.height ? `${media.width}x${media.height}` : null
      };
    }
    
    // Fallback to legacy image field
    if (image) {
      const url = typeof image === 'string' ? image : image.url;
      return {
        type: 'image',
        url: url.startsWith('http') ? url : `${ImageUrl}${url}`,
        altText: image.altText || title || 'Banner image',
        duration: null,
        size: null,
        dimensions: null
      };
    }
    
    return null;
  };

  const mediaInfo = getMediaInfo();
  
  if (!mediaInfo) {
    return (
      <div className={`bg-gray-100 rounded-md flex items-center justify-center ${className}`}>
        <div className="text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm">No media</p>
        </div>
      </div>
    );
  }

  const handleMediaError = (e) => {
    console.error('Media load error:', e);
    e.target.style.display = 'none';
    const errorDiv = e.target.parentNode.querySelector('.error-placeholder');
    if (errorDiv) {
      errorDiv.style.display = 'flex';
    }
  };

  if (mediaInfo.type === 'video') {
    return (
      <div className={`relative ${className}`}>
        <video
          src={mediaInfo.url}
          className="w-full h-full object-cover rounded-md"
          controls={showControls}
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          onError={handleMediaError}
          preload="metadata"
        >
          Your browser does not support the video tag.
        </video>
        
        {/* Video overlay info */}
        <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs">
          <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
          VIDEO
        </div>
        
        {/* Duration badge */}
        {mediaInfo.duration && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs">
            {mediaInfo.duration}
          </div>
        )}
        
        {/* Error placeholder */}
        <div className="error-placeholder absolute inset-0 bg-gray-100 rounded-md flex items-center justify-center" style={{ display: 'none' }}>
          <div className="text-center text-gray-500">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs">Video load failed</p>
          </div>
        </div>
      </div>
    );
  }

  // Image media
  return (
    <div className={`relative ${className}`}>
      <img
        src={mediaInfo.url}
        alt={mediaInfo.altText}
        className="w-full h-full object-cover rounded-md"
        onError={handleMediaError}
      />
      
      {/* Image overlay info */}
      <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs">
        <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
        IMAGE
      </div>
      
      {/* Error placeholder */}
      <div className="error-placeholder absolute inset-0 bg-gray-100 rounded-md flex items-center justify-center" style={{ display: 'none' }}>
        <div className="text-center text-gray-500">
          <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs">Image load failed</p>
        </div>
      </div>
    </div>
  );
};

export default MediaPreview;

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';

const SettingsEditor = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({
    siteTitle: '',
    tagline: '',
    contactEmail: '',
    supportPhone: '',
    heroHeading: '',
    heroSubtext: '',
    footerText: '',
    socialLinks: {
      instagram: '',
      facebook: '',
      twitter: ''
    }
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      // Mock data
      const mockSettings = {
        siteTitle: 'UAE Fashion Store',
        tagline: 'Authentic Middle Eastern Fashion',
        contactEmail: 'info@uaefashion.com',
        supportPhone: '+971 50 123 4567',
        heroHeading: 'Discover Elegant Middle Eastern Fashion',
        heroSubtext: 'Premium quality abayas, kaftans, and hijabs for the modern woman',
        footerText: '© 2024 UAE Fashion Store. All rights reserved.',
        socialLinks: {
          instagram: 'https://instagram.com/uaefashion',
          facebook: 'https://facebook.com/uaefashion',
          twitter: 'https://twitter.com/uaefashion'
        }
      };
      setSettings(mockSettings);
    } catch (error) {
      toast.error('Failed to fetch settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Settings updated successfully');
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setSettings(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setSettings(prev => ({ ...prev, [field]: value }));
    }
  };

  if (isLoading && !settings.siteTitle) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <HelmetProvider>
      <Helmet>
        <title>Settings - UAE Fashion Admin</title>
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Site Settings</h1>
          <button
            onClick={handleSaveSettings}
            disabled={isLoading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Site Title
                </label>
                <input
                  type="text"
                  value={settings.siteTitle}
                  onChange={(e) => handleInputChange('siteTitle', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tagline
                </label>
                <input
                  type="text"
                  value={settings.tagline}
                  onChange={(e) => handleInputChange('tagline', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={settings.contactEmail}
                  onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Support Phone
                </label>
                <input
                  type="tel"
                  value={settings.supportPhone}
                  onChange={(e) => handleInputChange('supportPhone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Hero Section */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Hero Section</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hero Heading
                </label>
                <input
                  type="text"
                  value={settings.heroHeading}
                  onChange={(e) => handleInputChange('heroHeading', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hero Subtext
                </label>
                <textarea
                  value={settings.heroSubtext}
                  onChange={(e) => handleInputChange('heroSubtext', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Footer Text
                </label>
                <input
                  type="text"
                  value={settings.footerText}
                  onChange={(e) => handleInputChange('footerText', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="bg-white rounded-lg shadow-sm border p-6 lg:col-span-2">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Social Media Links</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instagram URL
                </label>
                <input
                  type="url"
                  value={settings.socialLinks.instagram}
                  onChange={(e) => handleInputChange('socialLinks.instagram', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://instagram.com/yourpage"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Facebook URL
                </label>
                <input
                  type="url"
                  value={settings.socialLinks.facebook}
                  onChange={(e) => handleInputChange('socialLinks.facebook', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://facebook.com/yourpage"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Twitter URL
                </label>
                <input
                  type="url"
                  value={settings.socialLinks.twitter}
                  onChange={(e) => handleInputChange('socialLinks.twitter', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://twitter.com/yourpage"
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </HelmetProvider>
  );
};

export default SettingsEditor;

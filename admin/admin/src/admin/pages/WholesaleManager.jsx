
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import AdminTable from '../components/AdminTable';
import EditModal from '../components/EditModal';

const WholesaleManager = () => {
  const [discountTiers, setDiscountTiers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [formData, setFormData] = useState({
    product: '',
    quantity: '',
    discount: ''
  });

  useEffect(() => {
    fetchDiscountTiers();
  }, []);

  const fetchDiscountTiers = async () => {
    setIsLoading(true);
    try {
      // Mock data
      const mockTiers = [
        {
          id: 1,
          product: 'Designer Abaya',
          quantity: 10,
          discount: 15,
          status: 'active'
        },
        {
          id: 2,
          product: 'Traditional Kaftan',
          quantity: 25,
          discount: 20,
          status: 'active'
        },
        {
          id: 3,
          product: 'Modern Hijab Set',
          quantity: 50,
          discount: 30,
          status: 'inactive'
        }
      ];
      setDiscountTiers(mockTiers);
    } catch (error) {
      toast.error('Failed to fetch discount tiers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTier = async () => {
    try {
      if (selectedTier) {
        // Update existing tier
        setDiscountTiers(prev => prev.map(tier => 
          tier.id === selectedTier.id 
            ? { ...tier, ...formData }
            : tier
        ));
        toast.success('Discount tier updated successfully');
      } else {
        // Add new tier
        const newTier = {
          id: Date.now(),
          ...formData,
          status: 'active'
        };
        setDiscountTiers(prev => [...prev, newTier]);
        toast.success('Discount tier added successfully');
      }
      
      setIsEditModalOpen(false);
      setSelectedTier(null);
      setFormData({ product: '', quantity: '', discount: '' });
    } catch (error) {
      toast.error('Failed to save discount tier');
    }
  };

  const handleEditTier = (tier) => {
    setSelectedTier(tier);
    setFormData({
      product: tier.product,
      quantity: tier.quantity.toString(),
      discount: tier.discount.toString()
    });
    setIsEditModalOpen(true);
  };

  const handleToggleStatus = async (tierId) => {
    try {
      setDiscountTiers(prev => prev.map(tier => 
        tier.id === tierId 
          ? { ...tier, status: tier.status === 'active' ? 'inactive' : 'active' }
          : tier
      ));
      toast.success('Tier status updated');
    } catch (error) {
      toast.error('Failed to update tier status');
    }
  };

  const headers = ['Product', 'Min Quantity', 'Discount %', 'Status'];

  const tableData = discountTiers.map(tier => ({
    id: tier.id,
    product: tier.product,
    quantity: `${tier.quantity}+ units`,
    discount: `${tier.discount}%`,
    status: (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        tier.status === 'active' 
          ? 'bg-green-100 text-green-800' 
          : 'bg-gray-100 text-gray-800'
      }`}>
        {tier.status}
      </span>
    )
  }));

  const renderActions = (row) => [
    <button
      key="edit"
      onClick={() => handleEditTier(discountTiers.find(t => t.id === row.id))}
      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
    >
      Edit
    </button>,
    <button
      key="toggle"
      onClick={() => handleToggleStatus(row.id)}
      className="text-purple-600 hover:text-purple-800 text-sm font-medium"
    >
      Toggle Status
    </button>
  ];

  return (
    <HelmetProvider>
      <Helmet>
        <title>Wholesale Management - UAE Fashion Admin</title>
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Wholesale Management</h1>
          <button
            onClick={() => {
              setSelectedTier(null);
              setFormData({ product: '', quantity: '', discount: '' });
              setIsEditModalOpen(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Discount Tier
          </button>
        </div>

        {/* Discount Tiers Table */}
        <AdminTable
          headers={headers}
          data={tableData}
          actions={renderActions}
          isLoading={isLoading}
        />

        <EditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={selectedTier ? 'Edit Discount Tier' : 'Add Discount Tier'}
          onSave={handleSaveTier}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name
              </label>
              <input
                type="text"
                value={formData.product}
                onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter product name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Quantity
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter minimum quantity"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount Percentage
              </label>
              <input
                type="number"
                value={formData.discount}
                onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter discount percentage"
                min="0"
                max="100"
              />
            </div>
          </div>
        </EditModal>
      </motion.div>
    </HelmetProvider>
  );
};

export default WholesaleManager;

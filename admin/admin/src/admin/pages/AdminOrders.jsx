
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import AdminTable from '../components/AdminTable';
import StatusBadge from '../components/StatusBadge';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import EditModal from '../components/EditModal';
import { fetchOrders, updateOrderStatus, fetchOrderStatistics } from '../../store/slices/ordersSlice';
import { ImageUrl } from '../services/url';

const AdminOrders = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { orders, isLoading, error, statistics, isLoadingStats } = useSelector((state) => state.orders);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    dispatch(fetchOrders({ search: searchTerm, status: statusFilter }));
    dispatch(fetchOrderStatistics());
  }, [dispatch, searchTerm, statusFilter]);

  const handleRefresh = () => {
    dispatch(fetchOrders({ search: searchTerm, status: statusFilter }));
  };

  const handleStatusUpdate = async () => {
    if (!selectedOrder || !newStatus) {
      toast.error('Please select a valid status');
      return;
    }

    setIsUpdating(true);
    try {
      await dispatch(updateOrderStatus({ 
        id: selectedOrder.id, 
        status: newStatus 
      })).unwrap();
      toast.success('Order status updated successfully');
      setIsEditModalOpen(false);
      setSelectedOrder(null);
      setNewStatus('');
    } catch (error) {
      toast.error(error || 'Failed to update order status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder) {
      toast.error('No order selected');
      return;
    }

    setIsUpdating(true);
    try {
      await dispatch(updateOrderStatus({ 
        id: selectedOrder.id, 
        status: 'cancelled' 
      })).unwrap();
      toast.success('Order cancelled successfully');
      setIsDeleteModalOpen(false);
      setSelectedOrder(null);
    } catch (error) {
      toast.error(error || 'Failed to cancel order');
    } finally {
      setIsUpdating(false);
    }
  };

 // img thumbnail
  const relativeImagePath = selectedOrder?.products?.[0]?.productId?.images?.[0]?.url;


  const filteredOrders = (orders || []).filter(order => {
    const matchesSearch = !searchTerm || 
      (order.customer && order.customer.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.id && order.id.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = !statusFilter || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const headers = ['Order ID', 'Customer', 'Items', 'Total', 'Status', 'Date'];

  const tableData = filteredOrders.map(order => ({
    id: order.id,
    customer: order.customer,
    items: order.items,
    total: `$${order.total}`,
    status: <StatusBadge status={order.status} type="order" />,
    date: order.date,
    originalOrder: order
  }));

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  const handleGenerateInvoice = (order) => {
    // Navigate to the invoice page for this order
    navigate(`/admin/invoice/${order.id}`);
  };

  const actions = (row) => [
    <button
      key="details"
      onClick={() => handleViewDetails(row.originalOrder)}
      className="text-indigo-600 hover:text-indigo-900 font-medium"
      title="View Details"
    >
      Details
    </button>,
    // <button
    //   key="edit"
    //   onClick={() => {
    //     setSelectedOrder(row.originalOrder);
    //     setNewStatus(row.originalOrder.status);
    //     setIsEditModalOpen(true);
    //   }}
    //   className="text-blue-600 hover:text-blue-900 font-medium"
    //   title="Edit Status"
    // >
    //   Edit Status
    // </button>,
    <button
      key="invoice"
      onClick={() => handleGenerateInvoice(row.originalOrder)}
      className="text-green-600 hover:text-green-900 font-medium"
      title="Generate Invoice"
    >
      Invoice
    </button>,
    <button
      key="cancel"
      onClick={() => {
        setSelectedOrder(row.originalOrder);
        setIsDeleteModalOpen(true);
      }}
      className="text-red-600 hover:text-red-900 font-medium"
      title="Cancel Order"
      disabled={row.originalOrder.status === 'cancelled' || row.originalOrder.status === 'delivered'}
    >
      Cancel
    </button>
  ];

  return (
    <>
      <Helmet>
        <title>Order Management - UAE Fashion Admin</title>
      </Helmet>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              </>
            ) : (
              <>
                <svg className="-ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </>
            )}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Order Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-lg shadow-sm border p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Total Orders</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoadingStats ? '...' : statistics.totalOrders}
                </p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-lg shadow-sm border p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
                <p className="text-2xl font-bold text-gray-900">
                  ${isLoadingStats ? '...' : statistics.totalRevenue?.toLocaleString()}
                </p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-lg shadow-sm border p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Delivered Orders</h3>
                <p className="text-2xl font-bold text-green-600">
                  {isLoadingStats ? '...' : statistics.deliveredOrders}
                </p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Detailed Statistics */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Order Status Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {/* <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{isLoadingStats ? '...' : statistics.pendingOrders}</p>
              <p className="text-xs text-gray-500">Pending</p>
            </div> */}
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{isLoadingStats ? '...' : statistics.confirmedOrders}</p>
              <p className="text-xs text-gray-500">Confirmed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{isLoadingStats ? '...' : statistics.packedOrders}</p>
              <p className="text-xs text-gray-500">Packed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-indigo-600">{isLoadingStats ? '...' : statistics.shippedOrders}</p>
              <p className="text-xs text-gray-500">Shipped</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{isLoadingStats ? '...' : statistics.outForDeliveryOrders}</p>
              <p className="text-xs text-gray-500">Out for Delivery</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{isLoadingStats ? '...' : statistics.deliveredOrders}</p>
              <p className="text-xs text-gray-500">Delivered</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{isLoadingStats ? '...' : statistics.cancelledOrders}</p>
              <p className="text-xs text-gray-500">Cancelled</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{isLoadingStats ? '...' : statistics.totalOrders}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Orders
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by customer or order ID..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                {/* <option value="pending">Pending</option> */}
                <option value="confirmed">Confirmed</option>
                <option value="packed">Packed</option>
                <option value="shipped">Shipped</option>
                <option value="out-for-delivery">Out for Delivery</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <AdminTable
          headers={headers}
          data={tableData}
          actions={actions}
          isLoading={isLoading}
        />

        {/* Order Details Modal */}
        <EditModal
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedOrder(null);
          }}
          title={`Order Details - ${selectedOrder?.id}`}
         thumbnailUrl={relativeImagePath ? `${ImageUrl}${relativeImagePath}` : null}
         
          onSave={() => setIsDetailsModalOpen(false)}
        >
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Order ID</label>
                  <p className="text-sm text-gray-900">{selectedOrder.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <StatusBadge status={selectedOrder.status} type="order" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer</label>
                  <p className="text-sm text-gray-900">{selectedOrder.customer}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="text-sm text-gray-900">{selectedOrder.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Order Date</label>
                  <p className="text-sm text-gray-900">{selectedOrder.date}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                  <p className="text-sm text-gray-900 font-semibold">${selectedOrder.total}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Items</label>
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm text-gray-900">{selectedOrder.items} item(s)</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Products</label>
                <div className='overflow-x-auto'>
                  <table className='w-full'>
                    <thead className='bg-gray-50'>
                      <tr>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Product Name
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Color
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Size
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Quantity
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Price
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {/* {console.log(selectedOrder)} */}
                      {
                        (selectedOrder.products).map((row,index) => (
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {row.productId.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {row.color}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {row.size}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {row.quantity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {row.price}
                            </td>
                          </tr>
                        ))
                      }
                      
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </EditModal>

        {/* Edit Status Modal */}
        {/* <EditModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedOrder(null);
            setNewStatus('');
          }}
          title="Update Order Status"
          onSave={handleStatusUpdate}
          isLoading={isUpdating}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order ID: {selectedOrder?.id}
              </label>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer: {selectedOrder?.customer}
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Status: <StatusBadge status={selectedOrder?.status} type="order" />
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isUpdating}
              >
                <option value="">Select Status</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </EditModal> */}

        {/* Cancel Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedOrder(null);
          }}
          title="Cancel Order"
          message={`Are you sure you want to cancel order ${selectedOrder?.id}? This action cannot be undone.`}
          onConfirm={handleCancelOrder}
          isLoading={isUpdating}
        />
      </motion.div>
    </>
  );
};

export default AdminOrders;

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import AdminTable from '../components/AdminTable';
import StatusBadge from '../components/StatusBadge';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import adminApi from '../services/adminApi';

const ReviewManager = () => {
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalReviews: 0,
    limit: 10
  });
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });

  useEffect(() => {
    fetchReviews();
  }, [filter, pagination.currentPage]);

  const fetchReviews = async (page = pagination.currentPage) => {
    setIsLoading(true);
    try {
      const params = {
        page,
        limit: pagination.limit,
        status: filter === 'all' ? '' : filter,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      const response = await adminApi.getAllReviews(params);
      
      if (response.success) {
        setReviews(response.reviews);
        setPagination(response.pagination);
        setStats(response.stats);
      } else {
        throw new Error(response.message || 'Failed to fetch reviews');
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error(error.message || 'Failed to fetch reviews');
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveReview = async (reviewId) => {
    try {
      const response = await adminApi.updateReviewStatus(reviewId, 'approved');
      
      if (response.success) {
        setReviews(prev => prev.map(review => 
          review._id === reviewId 
            ? { ...review, status: 'approved' }
            : review
        ));
        toast.success('Review approved successfully');
      } else {
        throw new Error(response.message || 'Failed to approve review');
      }
    } catch (error) {
      console.error('Error approving review:', error);
      toast.error(error.message || 'Failed to approve review');
    }
  };

  const handleRejectReview = async (reviewId) => {
    try {
      const response = await adminApi.updateReviewStatus(reviewId, 'rejected');
      
      if (response.success) {
        setReviews(prev => prev.map(review => 
          review._id === reviewId 
            ? { ...review, status: 'rejected' }
            : review
        ));
        toast.success('Review rejected successfully');
      } else {
        throw new Error(response.message || 'Failed to reject review');
      }
    } catch (error) {
      console.error('Error rejecting review:', error);
      toast.error(error.message || 'Failed to reject review');
    }
  };

  const handleDeleteReview = async () => {
    try {
      const response = await adminApi.deleteReview(selectedReview._id);
      
      if (response.success) {
        setReviews(prev => prev.filter(review => review._id !== selectedReview._id));
        toast.success('Review deleted successfully');
        setIsDeleteModalOpen(false);
        setSelectedReview(null);
        // Refresh the list to update pagination
        fetchReviews();
      } else {
        throw new Error(response.message || 'Failed to delete review');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error(error.message || 'Failed to delete review');
    }
  };

  const headers = ['Product', 'Customer', 'Rating', 'Comment', 'Status', 'Date'];

  const tableData = reviews.map(review => ({
    id: review._id,
    product: review.product?.name || 'Unknown Product',
    customer: review.user?.name || review.name || 'Unknown Customer',
    rating: (
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="ml-1 text-sm text-gray-600">({review.rating})</span>
      </div>
    ),
    comment: (
      <div className="max-w-xs">
        <p className="text-sm text-gray-900 truncate" title={review.review}>
          {review.review}
        </p>
      </div>
    ),
    status: <StatusBadge status={review.status} type="review" />,
    date: new Date(review.createdAt).toLocaleDateString()
  }));

  const renderActions = (row) => [
    <button
      key="approve"
      onClick={() => handleApproveReview(row.id)}
      className="text-green-600 hover:text-green-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={reviews.find(r => r._id === row.id)?.status === 'approved'}
    >
      Approve
    </button>,
    <button
      key="reject"
      onClick={() => handleRejectReview(row.id)}
      className="text-yellow-600 hover:text-yellow-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={reviews.find(r => r._id === row.id)?.status === 'rejected'}
    >
      Reject
    </button>,
    <button
      key="delete"
      onClick={() => {
        setSelectedReview(reviews.find(r => r._id === row.id));
        setIsDeleteModalOpen(true);
      }}
      className="text-red-600 hover:text-red-800 text-sm font-medium"
    >
      Delete
    </button>
  ];

  return (
    <HelmetProvider>
      <Helmet>
        <title>Review Management - UAE Fashion Admin</title>
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Review Management</h1>
          <div className="flex space-x-4 text-sm">
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
              Total: {stats.total}
            </div>
            <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
              Pending: {stats.pending}
            </div>
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
              Approved: {stats.approved}
            </div>
            <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full">
              Rejected: {stats.rejected}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex space-x-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Reviews</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="flagged">Flagged</option>
            </select>
          </div>
        </div>

        {/* Reviews Table */}
        <AdminTable
          headers={headers}
          data={tableData}
          actions={renderActions}
          isLoading={isLoading}
        />

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow-sm">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => fetchReviews(pagination.currentPage - 1)}
                disabled={!pagination.hasPrevPage}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => fetchReviews(pagination.currentPage + 1)}
                disabled={!pagination.hasNextPage}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">
                    {(pagination.currentPage - 1) * pagination.limit + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.currentPage * pagination.limit, pagination.totalReviews)}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">{pagination.totalReviews}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => fetchReviews(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrevPage}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {[...Array(pagination.totalPages)].map((_, index) => {
                    const page = index + 1;
                    const isCurrentPage = page === pagination.currentPage;
                    return (
                      <button
                        key={page}
                        onClick={() => fetchReviews(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          isCurrentPage
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => fetchReviews(pagination.currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Review"
          message={`Are you sure you want to permanently delete this review? This action cannot be undone.`}
          onConfirm={handleDeleteReview}
        />
      </motion.div>
    </HelmetProvider>
  );
};

export default ReviewManager;

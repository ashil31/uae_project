
import axios from 'axios';
import { serverUrl } from './url.js';

// Real API base URL
const API_BASE_URL = serverUrl;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true, // Include cookies for authentication
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear tokens and redirect to login
      localStorage.removeItem('adminToken');
      sessionStorage.removeItem('adminToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const getAuthHeaders = () => {
  const token = localStorage.getItem('adminToken');
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
};

// Real API responses
const adminApi = {
  getOrders: async ({ page = 1, status = '', search = '' }) => {
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', '10');
      if (status) params.append('status', status);
      if (search) params.append('search', search);
      
      const response = await axios.get(`${serverUrl}/admin-orders?${params.toString()}`,getAuthHeaders());
      return response;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch orders');
    }
  },

  getOrderById: async (id) => {
    try {
      const response = await axios.get(`${serverUrl}/admin-orders/${id}`,getAuthHeaders());
      return response;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch order');
    }
  },

  updateOrderStatus: async (id, status, reason = '') => {
    try {
      const response = await axios.put(`${serverUrl}/admin-orders/${id}/status`, {
        status,
        reason,
        trackingMessage: reason
      }, getAuthHeaders());
      return response;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update order status');
    }
  },

  deleteOrder: async (id) => {
    try {
      const response = await axios.delete(`${serverUrl}/admin-orders/${id}`,getAuthHeaders());
      return response;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete order');
    }
  },

  getOrderStatistics: async () => {
    try {
      const response = await axios.get(`${serverUrl}/admin-orders/statistics`,getAuthHeaders());
      return response;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch order statistics');
    }
  },

  // Contact Management APIs
  getAllContacts: async (params = {}) => {
    try {
      const response = await api.get('/contact', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch contacts');
    }
  },

  getContactById: async (id) => {
    try {
      const response = await api.get(`/contact/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch contact');
    }
  },

  updateContact: async (id, updateData) => {
    try {
      const response = await api.put(`/contact/${id}`, updateData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update contact');
    }
  },

  deleteContact: async (id) => {
    try {
      const response = await api.delete(`/contact/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete contact');
    }
  },

  getContactStats: async () => {
    try {
      const response = await api.get('/contact/stats');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch contact statistics');
    }
  },

  // Review Management APIs
  getAllReviews: async (params = {}) => {
    try {
      const response = await api.get('/admin-reviews', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch reviews');
    }
  },

  getReviewById: async (reviewId) => {
    try {
      const response = await api.get(`/admin-reviews/${reviewId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch review');
    }
  },

  updateReviewStatus: async (reviewId, status, adminNote = '') => {
    try {
      const response = await api.put(`/admin-reviews/${reviewId}/status`, {
        status,
        adminNote
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update review status');
    }
  },

  deleteReview: async (reviewId) => {
    try {
      const response = await api.delete(`/admin-reviews/${reviewId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete review');
    }
  },

  bulkUpdateReviewStatus: async (reviewIds, status, adminNote = '') => {
    try {
      const response = await api.put('/admin-reviews/bulk/status', {
        reviewIds,
        status,
        adminNote
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to bulk update reviews');
    }
  },

  // Invoice Management APIs
  getAllInvoices: async (params = {}) => {
    try {
      const response = await api.get('/invoices', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch invoices');
    }
  },

  getInvoiceByOrderId: async (orderId) => {
    try {
      const response = await api.get(`/invoices/${orderId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch invoice');
    }
  },

  getInvoiceStatistics: async () => {
    try {
      const response = await api.get('/invoices/statistics');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch invoice statistics');
    }
  }
};

export default adminApi;


import apiClient from './apiClient'; // Assuming your file is named apiClient.js

// --- Order Management ---
export const loginTailor = (credentials) => 
  apiClient.post('/auth/tailor-login', credentials);

export const signupTailor = (userData) => 
  apiClient.post('/auth/tailor-register', userData); 

export const getUnassignedOrders = () => apiClient.get('/tailors/unassigned');

export const getAssignedWork = () => apiClient.get('/orders/my-work');

export const assignOrderToTailor = ({ orderId, tailorId }) => 
  apiClient.patch(`/orders/${orderId}/assign`, { tailorId });

export const updateOrderStatus = ({ orderId, status }) => 
  apiClient.patch(`/orders/${orderId}/status`, { status });

export const markOrderFinished = (orderId) => 
  apiClient.patch(`/orders/${orderId}/finish`);

// --- Production & Inventory ---

export const logProduction = ({ orderId, units, fabricUsed }) => 
  apiClient.post('/production/log', { orderId, units, fabricUsed });

export const getInventory = () => apiClient.get('/inventory');

export const updateInventoryItem = ({ itemId, quantity }) => 
  apiClient.patch(`/inventory/${itemId}`, { quantity });

// --- User Management ---



export const getTailors = () => apiClient.get('/users/tailors');
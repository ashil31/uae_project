import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { serverUrl } from '../../admin/services/url';
import { buildQueryString } from '../../utils/query';

const getAuthHeaders = () => {
  const token = localStorage.getItem('adminToken');
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

const handleApiError = (error, rejectWithValue) => {
  const details = {
    message: error.message,
    status: error.response?.status,
    data: error.response?.data
  };
  console.error('API Error:', details);
  return rejectWithValue({ message: error.response?.data?.message || error.message, details });
};

export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (params = {}, { rejectWithValue }) => {
    try {
      const qs = buildQueryString(params);
      const url = `${serverUrl}/products${qs}`;
      const response = await axios.get(url, getAuthHeaders());
      console.log(response.data);      
      // backend returns { success: true, data: { products, pagination, filters }, ... }
      return response.data;
    } catch (error) {
      return handleApiError(error, rejectWithValue);
    }
  }
);

export const createProduct = createAsyncThunk(
  'products/createProduct',
  async (productData, { dispatch, rejectWithValue }) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.post(
        `${serverUrl}/products/addProduct`,
        productData,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            dispatch(setUploadProgress(progress));
          }
        }
      );
      return response.data;
    } catch (error) {
      return handleApiError(error, rejectWithValue);
    }
  }
);

export const updateProduct = createAsyncThunk(
  'products/updateProduct',
  async ({ id, productData }, { dispatch, rejectWithValue }) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.put(
        `${serverUrl}/products/${id}`,
        productData,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            dispatch(setUploadProgress(progress));
          }
        }
      );
      return response.data;
    } catch (error) {
      return handleApiError(error, rejectWithValue);
    }
  }
);

export const deleteProduct = createAsyncThunk(
  'products/deleteProduct',
  async (id, { rejectWithValue }) => {
    try {
      if (!id || typeof id !== 'string') throw new Error('Invalid product id');
      const response = await axios.delete(`${serverUrl}/products/${id}`, getAuthHeaders());
      return response.data;
    } catch (error) {
      return handleApiError(error, rejectWithValue);
    }
  }
);

const initialState = {
  products: [],
  currentProduct: null,
  isLoading: false,
  error: null,
  lastAction: null,
  uploadProgress: 0,
  warnings: [],
  pagination: {
    page: 1,
    itemsPerPage: 12,
    totalItems: 0
  },
  filters: {
    search: '',
    category: '',
    status: 'active'
  }
};

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null; },
    setCurrentProduct: (state, action) => { state.currentProduct = action.payload; },
    clearCurrentProduct: (state) => { state.currentProduct = null; },
    resetProductsState: () => initialState,
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1;
    },
    setPage: (state, action) => { state.pagination.page = action.payload; },
    setUploadProgress: (state, action) => { state.uploadProgress = action.payload; },
    setWarnings: (state, action) => { state.warnings = action.payload; },
    clearWarnings: (state) => { state.warnings = []; }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.isLoading = true; state.error = null; state.lastAction = 'fetch';
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        const payload = action.payload || {};
        const data = payload.data || payload;

        state.products = data.products || [];

        const pagination = data.pagination || {};
        state.pagination = {
          page: pagination.currentPage || pagination.page || state.pagination.page,
          itemsPerPage: pagination.limit || state.pagination.itemsPerPage,
          totalItems: pagination.totalProducts || pagination.totalItems || state.pagination.totalItems
        };

        state.filters = data.filters?.applied ? { ...state.filters, ...data.filters.applied } : state.filters;
        state.error = null;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.isLoading = false; state.error = action.payload || { message: 'Failed to fetch' };
      })

      // create
      .addCase(createProduct.pending, (state) => { state.isLoading = true; state.error = null; state.lastAction = 'create'; state.uploadProgress = 0; state.warnings = []; })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.isLoading = false; state.uploadProgress = 0; state.warnings = action.payload.warnings || [];
        if (action.payload.product) {
          // If current page is full, mark refetch needed
          if (state.products.length >= state.pagination.itemsPerPage) {
            state.lastAction = 'created-refetch-needed';
          } else {
            state.products.unshift(action.payload.product);
            state.pagination.totalItems += 1;
          }
        }
      })
      .addCase(createProduct.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; state.uploadProgress = 0; })

      // update
      .addCase(updateProduct.pending, (state) => { state.isLoading = true; state.error = null; state.lastAction = 'update'; state.uploadProgress = 0; state.warnings = []; })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.isLoading = false; state.uploadProgress = 0; state.warnings = action.payload.warnings || [];
        const updatedProduct = action.payload.product || action.payload;
        if (updatedProduct) {
          const idx = state.products.findIndex(p => p._id === updatedProduct._id);
          if (idx !== -1) state.products[idx] = { ...state.products[idx], ...updatedProduct };
          if (state.currentProduct?._id === updatedProduct._id) state.currentProduct = { ...state.currentProduct, ...updatedProduct };
        }
      })
      .addCase(updateProduct.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; state.uploadProgress = 0; })

      // delete
      .addCase(deleteProduct.pending, (state) => { state.isLoading = true; state.error = null; state.lastAction = 'delete'; })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.isLoading = false;
        const deletedId = action.payload._id || action.payload;
        state.products = state.products.filter(p => p._id !== deletedId);
        state.pagination.totalItems = Math.max(0, state.pagination.totalItems - 1);
        if (state.currentProduct?._id === deletedId) state.currentProduct = null;
        // adjust page if necessary
        const itemsOnPage = Math.min(state.pagination.itemsPerPage, state.pagination.totalItems - (state.pagination.page - 1) * state.pagination.itemsPerPage);
        if (itemsOnPage <= 0 && state.pagination.page > 1) state.pagination.page = Math.max(1, state.pagination.page - 1);
      })
      .addCase(deleteProduct.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; });
  }
});

export const { clearError, setCurrentProduct, clearCurrentProduct, resetProductsState, setFilters, setPage, setUploadProgress, setWarnings, clearWarnings } = productsSlice.actions;
export default productsSlice.reducer;


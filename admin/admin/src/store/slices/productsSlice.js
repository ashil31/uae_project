import { createSlice, createAsyncThunk, isRejectedWithValue } from '@reduxjs/toolkit';
import axios from 'axios';
import { serverUrl } from '../../admin/services/url'; 


// Enhanced error handling utility
const handleApiError = (error, rejectWithValue) => {
  const errorDetails = {
    message: error.message,
    status: error.response?.status,
    data: error.response?.data,
    config: {
      url: error.config?.url,
      method: error.config?.method,
      data: error.config?.data
    }
  };

  console.error('API Error Details:', errorDetails);

  return rejectWithValue({
    message: error.response?.data?.message || error.message,
    details: errorDetails,
    timestamp: new Date().toISOString()
  });
};

// Consistent auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('adminToken');
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
};

// Multipart headers for file uploads
const getMultipartHeaders = () => {
  const token = localStorage.getItem('adminToken');
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    }
  };
};


// Thunks
export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${serverUrl}/products`);
      return response.data
    } catch (error) {
      return handleApiError(error, rejectWithValue);
    }
  }
);

export const createProduct = createAsyncThunk(
  'products/createProduct',
  async (productData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axios.post(`${serverUrl}/products/addProduct`,
        productData,
        {
          ...getMultipartHeaders(),
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
      const response = await axios.put(`${serverUrl}/products/${id}`,
        productData,
        {
          ...getMultipartHeaders(),
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
      // Validate ID
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid product ID format');
      }
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
      clearError: (state) => {
        state.error = null;
      },
      setCurrentProduct: (state, action) => {
        state.currentProduct = action.payload;
      },
      clearCurrentProduct: (state) => {
        state.currentProduct = null;
      },
      resetProductsState: () => initialState,
      setFilters: (state, action) => {
        state.filters = {
          ...state.filters,
          ...action.payload
        };
        state.pagination.page = 1;
      },
      setPage: (state, action) => {
        state.pagination.page = action.payload;
      },
      setUploadProgress: (state, action) => {
        state.uploadProgress = action.payload;
      },
      setWarnings: (state, action) => {
        state.warnings = action.payload;
      },
      clearWarnings: (state) => {
        state.warnings = [];
      }
    },
    extraReducers: (builder) => {
      builder
        // Fetch Products
        .addCase(fetchProducts.pending, (state) => {
          state.isLoading = true;
          state.error = null;
          state.lastAction = 'fetch';
        })
        .addCase(fetchProducts.fulfilled, (state, action) => {
          state.isLoading = false;
          state.products = action.payload.products || [];
          state.pagination.totalItems = action.payload.totalItems || action.payload.products?.length || 0;
          state.error = null
        })
        .addCase(fetchProducts.rejected, (state, action) => {
          state.isLoading = false;
          state.error = action.payload;
        })

        // Create Product
        .addCase(createProduct.pending, (state) => {
          state.isLoading = true;
          state.error = null;
          state.lastAction = "create";
          state.uploadProgress = 0;
          state.warnings = [];
        })
        .addCase(createProduct.fulfilled, (state, action) => {
          state.isLoading = false;
          state.uploadProgress = 0;
          state.warnings = action.payload.warnings || [];
          
          if (action.payload.product) {
            // If paginated, we might want to refetch instead
            if (state.products.length >= state.pagination.itemsPerPage) {
              state.lastAction = 'created-refetch-needed';
            } else {
              state.products.unshift(action.payload.product);
              state.pagination.totalItems += 1;
            }
          }
        })
        .addCase(createProduct.rejected, (state, action) => {
          state.isLoading = false;
          state.error = action.payload;
          state.uploadProgress = 0;
        })

        // Update Product
        .addCase(updateProduct.pending, (state) => {
          state.isLoading = true;
          state.error = null;
          state.lastAction = 'update';
          state.uploadProgress = 0;
          state.warnings = [];
        })
        .addCase(updateProduct.fulfilled, (state, action) => {
          state.isLoading = false;
          state.uploadProgress = 0;
          state.warnings = action.payload.warnings || [];
          
          const updatedProduct = action.payload.product || action.payload;
          if (updatedProduct) {
            const index = state.products.findIndex(p => p._id === updatedProduct._id);
            if (index !== -1) {
              state.products[index] = {
                ...state.products[index],
                ...updatedProduct,
                // Preserve any local-only fields
                variants: updatedProduct.variants || state.products[index].variants
              };
            }
            if (state.currentProduct?._id === updatedProduct._id) {
              state.currentProduct = {
                ...state.currentProduct,
                ...updatedProduct,
                variants: updatedProduct.variants || state.currentProduct.variants
              };
            }
          }
        })
        .addCase(updateProduct.rejected, (state, action) => {
          state.isLoading = false;
          state.error = action.payload;
          state.uploadProgress = 0;
        })

        // Delete Product
        .addCase(deleteProduct.pending, (state) => {
          state.isLoading = true;
          state.error = null;
          state.lastAction = 'delete';
        })
        .addCase(deleteProduct.fulfilled, (state, action) => {
          state.isLoading = false;
          const deletedId = action.payload._id || action.payload;
          state.products = state.products.filter(p => p._id !== deletedId);
          state.pagination.totalItems = Math.max(0, state.pagination.totalItems - 1);
          
          if (state.currentProduct?._id === deletedId) {
            state.currentProduct = null;
          }
          
          // Adjust page if current page is empty
          const itemsOnPage = Math.min(
            state.pagination.itemsPerPage,
            state.pagination.totalItems - (state.pagination.page - 1) * state.pagination.itemsPerPage
          );

          if (itemsOnPage <= 0 && state.pagination.page > 1) {
            state.pagination.page = Math.max(1, state.pagination.page - 1);
          }
        })
        .addCase(deleteProduct.rejected, (state, action) => {
          state.isLoading = false;
          state.error = action.payload;
        });
    }
  });

  export const { 
    clearError, 
    setCurrentProduct, 
    clearCurrentProduct,
    resetProductsState,
    setFilters,
    setPage,
    setUploadProgress,
    setWarnings,
    clearWarnings
  } = productsSlice.actions;

  export default productsSlice.reducer;
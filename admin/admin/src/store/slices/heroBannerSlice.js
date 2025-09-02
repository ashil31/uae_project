import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { serverUrl } from '../../admin/services/url';

// Validation constants
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB for videos
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
const RECOMMENDED_DIMENSIONS = { width: 1920, height: 1080 };

// Helper functions for headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('adminToken');
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
};

const getMultipartHeaders = () => {
  const token = localStorage.getItem('adminToken');
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    }
  };
};

// Async Thunks
export const fetchBanners = createAsyncThunk(
  'heroBanners/fetchBanners',
  async (includeInactive = false, { rejectWithValue }) => {
    try {
      const url = `${serverUrl}/home/banners${includeInactive ? '?includeInactive=true' : ''}`;
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const addBanner = createAsyncThunk(
  'heroBanners/addBanner',
  async (formData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axios.post(`${serverUrl}/home/addBanner`, formData, {
        ...getMultipartHeaders(),
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          dispatch(setUploadProgress(progress));
        }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const deleteBanner = createAsyncThunk(
  'heroBanners/deleteBanner',
  async (bannerId, { rejectWithValue }) => {
    try {
      const response = await axios.delete(`${serverUrl}/home/${bannerId}`, getAuthHeaders());
      return { bannerId, response: response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const updateBannerOrder = createAsyncThunk(
  'heroBanners/updateBannerOrder',
  async (updatedBanners, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${serverUrl}/home/bannerOrder`, 
        { banners: updatedBanners }, 
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// New thunk for updating individual banner
export const updateBanner = createAsyncThunk(
  'heroBanners/updateBanner',
  async ({ bannerId, formData }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axios.put(`${serverUrl}/home/${bannerId}`, formData, {
        ...getMultipartHeaders(),
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          dispatch(setUploadProgress(progress));
        }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// New thunk for fetching single banner
export const fetchBannerById = createAsyncThunk(
  'heroBanners/fetchBannerById',
  async (bannerId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${serverUrl}/home/${bannerId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

const heroBannerSlice = createSlice({
  name: 'heroBanners',
  initialState: {
    banners: [],
    currentBanner: null,
    status: 'idle', // 'idle' | 'loading' | 'uploading' | 'succeeded' | 'failed'
    isLoading: false,
    error: null,
    uploadProgress: 0,
    warnings: []
  },
  reducers: {
    resetBannerState: (state) => {
      state.status = 'idle';
      state.error = null;
      state.uploadProgress = 0;
      state.warnings = [];
    },
    setUploadProgress: (state, action) => {
      state.uploadProgress = action.payload;
    },
    clearCurrentBanner: (state) => {
      state.currentBanner = null;
    },
    setWarnings: (state, action) => {
      state.warnings = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Banners
      .addCase(fetchBanners.pending, (state) => {
        state.status = 'loading';
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBanners.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (Array.isArray(action.payload)) {
          state.banners = action.payload.sort((a, b) => a.order - b.order);
        } else if (action.payload.banners && Array.isArray(action.payload.banners)) {
          // If payload is an object with a banners array
          state.banners = action.payload.banners.sort((a, b) => a.order - b.order);
        } else {
          // Fallback - maintain current state if payload format is unexpected
          console.error('Unexpected payload format:', action.payload);
        }
        state.isLoading = false;
      })
      .addCase(fetchBanners.rejected, (state, action) => {
        state.status = 'failed';
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Add Banner
      .addCase(addBanner.pending, (state) => {
        state.status = 'uploading';
        state.isLoading = true;
        state.error = null;
        state.uploadProgress = 0;
      })
      .addCase(addBanner.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const newBanner = action.payload.banner || action.payload;
        state.banners.push(newBanner);
        state.banners.sort((a, b) => a.order - b.order);
        state.isLoading = false;
        state.uploadProgress = 0;
        state.warnings = action.payload.warnings || [];
      })
      .addCase(addBanner.rejected, (state, action) => {
        state.status = 'failed';
        state.isLoading = false;
        state.error = action.payload;
        state.uploadProgress = 0;
      })
      
      // Delete Banner
      .addCase(deleteBanner.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteBanner.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.banners = state.banners.filter(banner => banner._id !== action.payload.bannerId);
        state.isLoading = false;
      })
      .addCase(deleteBanner.rejected, (state, action) => {
        state.status = 'failed';
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Update Banner Order
      .addCase(updateBannerOrder.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateBannerOrder.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.banners = action.payload.sort((a, b) => a.order - b.order);
        state.isLoading = false;
      })
      .addCase(updateBannerOrder.rejected, (state, action) => {
        state.status = 'failed';
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Update Banner
      .addCase(updateBanner.pending, (state) => {
        state.status = 'uploading';
        state.isLoading = true;
        state.error = null;
        state.uploadProgress = 0;
      })
      .addCase(updateBanner.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const updatedBanner = action.payload.banner || action.payload;
        const index = state.banners.findIndex(banner => banner._id === updatedBanner._id);
        if (index !== -1) {
          state.banners[index] = updatedBanner;
        }
        state.banners.sort((a, b) => a.order - b.order);
        state.isLoading = false;
        state.uploadProgress = 0;
        state.warnings = action.payload.warnings || [];
      })
      .addCase(updateBanner.rejected, (state, action) => {
        state.status = 'failed';
        state.isLoading = false;
        state.error = action.payload;
        state.uploadProgress = 0;
      })
      
      // Fetch Banner by ID
      .addCase(fetchBannerById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBannerById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentBanner = action.payload.banner || action.payload;
        state.isLoading = false;
      })
      .addCase(fetchBannerById.rejected, (state, action) => {
        state.status = 'failed';
        state.isLoading = false;
        state.error = action.payload;
      });
  }
});

export const { resetBannerState, setUploadProgress, clearCurrentBanner, setWarnings } = heroBannerSlice.actions;
export default heroBannerSlice.reducer;
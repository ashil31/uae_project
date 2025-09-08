// src/store/slices/clothRollSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { serverUrl } from '../../admin/services/url';

const getAuthHeaders = () => {
  const token = localStorage.getItem('adminToken');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
};

/**
 * Helpers
 */
const normalizeArrayResponse = (resData) => {
  // Accept many shapes:
  // - raw array
  // - { data: [...] }
  // - { clothRolls: [...] }
  // - anything -> fallback []
  if (Array.isArray(resData)) return resData;
  if (resData == null) return [];
  if (Array.isArray(resData.data)) return resData.data;
  if (Array.isArray(resData.clothRolls)) return resData.clothRolls;
  return [];
};

const extractSingleRoll = (payload) => {
  // Accept many shapes:
  // - { newClothRoll: {...} }
  // - { data: {...} }
  // - {...} (bare)
  if (!payload) return null;
  if (payload.newClothRoll && typeof payload.newClothRoll === 'object') return payload.newClothRoll;
  if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) return payload.data;
  return typeof payload === 'object' && !Array.isArray(payload) ? payload : null;
};

/**
 * Thunks
 */
export const getClothRolls = createAsyncThunk(
  'clothRolls/getClothRolls',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${serverUrl}/tailors/cloth-rolls`, getAuthHeaders());
      // keep console for temporary debugging (optional)
      console.log('getClothRolls response.data:', response.data);
      const arr = normalizeArrayResponse(response.data);
      return arr;
    } catch (err) {
      // prefer server message if available
      const payload = err.response?.data ?? { message: err.message };
      return rejectWithValue(payload);
    }
  }
);

export const addClothRoll = createAsyncThunk(
  'clothRolls/addClothRoll',
  async (data, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${serverUrl}/tailors/create-cloth-roll`, data, getAuthHeaders());
      // response.data might be the new roll or { newClothRoll: {...} } etc.
      return response.data;
    } catch (err) {
      const payload = err.response?.data ?? { message: err.message };
      return rejectWithValue(payload);
    }
  }
);

export const updateClothRoll = createAsyncThunk(
  'clothRolls/updateClothRoll',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${serverUrl}/tailors/${id}/edit-cloth-roll`, data, getAuthHeaders());
      return response.data;
    } catch (err) {
      const payload = err.response?.data ?? { message: err.message };
      return rejectWithValue(payload);
    }
  }
);

export const deleteClothRoll = createAsyncThunk(
  'clothRolls/deleteClothRoll',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${serverUrl}/tailors/${id}/delete-cloth-roll`, getAuthHeaders());
      // return id so reducer can remove it locally
      return id;
    } catch (err) {
      const payload = err.response?.data ?? { message: err.message };
      return rejectWithValue(payload);
    }
  }
);

/**
 * Slice
 */
const initialState = {
  clothRolls: [],
  loading: false,
  error: null,
};

const clothRollSlice = createSlice({
  name: 'clothRolls',
  initialState,
  reducers: {
    // optional local setter if you want to set from UI
    setClothRolls(state, action) {
      state.clothRolls = Array.isArray(action.payload) ? action.payload.filter(Boolean) : [];
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // GET
      .addCase(getClothRolls.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getClothRolls.fulfilled, (state, action) => {
        state.loading = false;
        state.clothRolls = Array.isArray(action.payload) ? action.payload.filter(Boolean) : [];
        state.error = null;
      })
      .addCase(getClothRolls.rejected, (state, action) => {
        state.loading = false;
        state.clothRolls = [];
        state.error = (action.payload && action.payload.message) || action.error?.message || 'Failed to fetch cloth rolls';
      })

      // ADD
      .addCase(addClothRoll.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addClothRoll.fulfilled, (state, action) => {
        state.loading = false;
        const newRoll = extractSingleRoll(action.payload);
        if (newRoll) state.clothRolls.unshift(newRoll); // add to top
        state.error = null;
      })
      .addCase(addClothRoll.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload && action.payload.message) || action.error?.message || 'Failed to add cloth roll';
      })

      // UPDATE
      .addCase(updateClothRoll.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateClothRoll.fulfilled, (state, action) => {
        state.loading = false;
        const updated = extractSingleRoll(action.payload) || action.payload;
        if (updated && updated._id) {
          const idx = state.clothRolls.findIndex((r) => String(r?._id) === String(updated._id));
          if (idx !== -1) {
            state.clothRolls[idx] = updated;
          }
        }
        state.error = null;
      })
      .addCase(updateClothRoll.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload && action.payload.message) || action.error?.message || 'Failed to update cloth roll';
      })

      // DELETE
      .addCase(deleteClothRoll.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteClothRoll.fulfilled, (state, action) => {
        state.loading = false;
        const id = action.payload;
        state.clothRolls = state.clothRolls.filter((r) => String(r?._id) !== String(id));
        state.error = null;
      })
      .addCase(deleteClothRoll.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload && action.payload.message) || action.error?.message || 'Failed to delete cloth roll';
      });
  },
});

export const { setClothRolls, clearError } = clothRollSlice.actions;
export default clothRollSlice.reducer;

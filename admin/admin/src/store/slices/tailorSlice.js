import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { serverUrl } from '../../admin/services/url';

const getAuthHeaders = () => {
  const token = localStorage.getItem('adminToken');
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
};

// Async thunks
export const getTailors = createAsyncThunk(
  'tailors/getTailors', async () => {
    const response = await axios.get(`${serverUrl}/tailors/`, getAuthHeaders());
    return response.data;
});

export const addTailor = createAsyncThunk(
  'tailors/addTailor', async (data) => {
    const response = await axios.post(`${serverUrl}/tailors/newtailor`, data, getAuthHeaders());
    return response.data;
});

export const updateTailor = createAsyncThunk(
  'tailors/updateTailor', async ({ id, data }) => {
    const response = await axios.put(`${serverUrl}/tailors/${id}/edit`, data, getAuthHeaders());
    return response.data;
});

export const deleteTailor = createAsyncThunk(
  'tailors/deleteTailor', async (id) => {
  await axios.delete(`${serverUrl}/tailors/${id}/delete`, getAuthHeaders());
  return id;
});

const tailorSlice = createSlice({
  name: 'tailors',
  initialState: {
    tailors: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getTailors.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getTailors.fulfilled, (state, action) => {
        state.loading = false;
        state.tailors = action.payload;
      })
      .addCase(getTailors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      .addCase(addTailor.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addTailor.fulfilled, (state, action) => {  
        state.tailors.push(action.payload.tailor);
        state.loading = false;
      })
      .addCase(addTailor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      .addCase(updateTailor.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTailor.fulfilled, (state, action) => {
        const updatedTailor = action.payload.tailor;
        const index = state.tailors.findIndex(t => t._id === updatedTailor._id);
        if (index !== -1) {
          state.tailors[index] = updatedTailor;
        }
        state.loading = false;
      })
      .addCase(updateTailor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      .addCase(deleteTailor.fulfilled, (state, action) => {
        state.tailors = state.tailors.filter(t => t._id !== action.payload);
      });
  },
});

export default tailorSlice.reducer;

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

export const getClothRolls = createAsyncThunk(
  'clothRolls/getClothRolls', async () => {
    const response = await axios.get(`${serverUrl}/tailors/cloth-rolls`, getAuthHeaders());
    return response.data;
});

export const addClothRoll = createAsyncThunk(
  'clothRolls/addClothRoll', async (data) => {
    const response = await axios.post(`${serverUrl}/tailors/create-cloth-roll`, data, getAuthHeaders());
    return response.data;
});

export const updateClothRoll = createAsyncThunk(
  'clothRolls/updateClothRoll', async ({ id, data }) => {
    const response = await axios.put(`${serverUrl}/tailors/${id}/edit-cloth-roll`, data, getAuthHeaders());
    return response.data;
});

export const deleteClothRoll = createAsyncThunk(
  'clothRolls/deleteClothRoll', async (id) => {
    await axios.delete(`${serverUrl}/tailors/${id}/delete-cloth-roll`, getAuthHeaders());
    return id;
});

const clothRollSlice = createSlice({
  name: 'clothRolls',
  initialState: {
    clothRolls: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getClothRolls.pending, (state) => {
        state.loading = true;
      })
      .addCase(getClothRolls.fulfilled, (state, action) => {
        state.loading = false;
        state.clothRolls = action.payload;
      })
      .addCase(getClothRolls.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      .addCase(addClothRoll.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addClothRoll.fulfilled, (state, action) => {
        state.clothRolls.push(action.payload.newClothRoll);
      })
      .addCase(addClothRoll.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      .addCase(updateClothRoll.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateClothRoll.fulfilled, (state, action) => {
        const index = state.clothRolls.findIndex(r => r._id === action.payload._id);
        if (index !== -1) {
          state.clothRolls[index] = action.payload;
        }
      })
      .addCase(updateClothRoll.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      .addCase(deleteClothRoll.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteClothRoll.fulfilled, (state, action) => {
        state.clothRolls = state.clothRolls.filter(r => r._id !== action.payload);
      })
      .addCase(deleteClothRoll.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })  
  },
});

export default clothRollSlice.reducer;

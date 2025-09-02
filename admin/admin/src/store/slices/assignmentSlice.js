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

export const getAssignments = createAsyncThunk(
  'assignments/getAssignments', async () => {
    const response = await axios.get(`${serverUrl}/tailors/assigned-cloth-rolls`, getAuthHeaders());
    return response.data;
});

export const assignClothRoll = createAsyncThunk(
  'assignments/assignClothRoll', async (data) => {
  const response = await axios.post(`${serverUrl}/tailors/assign-cloth-roll`, data, getAuthHeaders());
  return response.data;
});

export const logClothRollUsage = createAsyncThunk(
  'assignments/logUsage', async ({ id, data }) => {
    console.log("Data for log usage",data)
    const response = await axios.patch(`${serverUrl}/tailors/assign-cloth-roll/${id}/log`, data, getAuthHeaders());
    return response.data;
});

const assignmentSlice = createSlice({
  name: 'assignments',
  initialState: {
    assignments: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getAssignments.pending, (state) => {
        state.loading = true;
      })
      .addCase(getAssignments.fulfilled, (state, action) => {
        state.loading = false;
        state.assignments = action.payload.assignments;
      })
      .addCase(getAssignments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(assignClothRoll.fulfilled, (state, action) => {
        state.assignments.push(action.payload.assignment);
      })
      .addCase(logClothRollUsage.fulfilled, (state, action) => {
        const index = state.assignments.findIndex(a => a._id === action.payload.assignment._id);
        if (index !== -1) {
          state.assignments[index] = action.payload.assignment;
        }
      });
  },
});

export default assignmentSlice.reducer;

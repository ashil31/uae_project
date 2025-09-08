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

export const getAssignments = createAsyncThunk(
  'assignments/getAssignments',
  async () => {
    const resp = await axios.get(`${serverUrl}/tailors/assigned-cloth-rolls`, getAuthHeaders());
    return resp.data;
  }
);

export const assignClothRoll = createAsyncThunk(
  'assignments/assignClothRoll',
  async (data) => {
    const resp = await axios.post(`${serverUrl}/tailors/assign-cloth-roll`, data, getAuthHeaders());
    return resp.data;
  }
);

export const logClothRollUsage = createAsyncThunk(
  'assignments/logUsage',
  async ({ id, data }) => {
    const resp = await axios.patch(`${serverUrl}/tailors/assign-cloth-roll/${id}/log`, data, getAuthHeaders());
    return resp.data;
  }
);

const initialState = {
  assignments: [],
  loading: false,
  error: null,
};

const assignmentSlice = createSlice({
  name: 'assignments',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getAssignments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAssignments.fulfilled, (state, action) => {
        state.loading = false;
        // Support multiple response shapes:
        // 1) plain array: [...]
        // 2) wrapper: { assignments: [...] }
        // 3) wrapper: { data: [...] }
        const payload = action.payload;
        if (Array.isArray(payload)) {
          state.assignments = payload;
        } else if (payload && Array.isArray(payload.assignments)) {
          state.assignments = payload.assignments;
        } else if (payload && Array.isArray(payload.data)) {
          state.assignments = payload.data;
        } else {
          // fallback: try to coerce or keep previous
          state.assignments = Array.isArray(payload) ? payload : state.assignments;
        }
      })
      .addCase(getAssignments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || 'Failed to load assignments';
      })
      .addCase(assignClothRoll.fulfilled, (state, action) => {
        const created = action.payload?.assignment || action.payload;
        if (created) state.assignments.unshift(created);
      })
      .addCase(logClothRollUsage.fulfilled, (state, action) => {
        const updated = action.payload?.assignment || action.payload;
        if (!updated) return;
        const idx = state.assignments.findIndex((a) => a._id === updated._id || a.id === updated._id);
        if (idx !== -1) state.assignments[idx] = updated;
      });
  },
});

export default assignmentSlice.reducer;

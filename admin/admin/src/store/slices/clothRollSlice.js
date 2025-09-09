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

/* ---------- helper functions kept as-is (normalizeArrayResponse, extractSingleRoll, wrapRawRollAsServerEntry) ---------- */
/* copy your existing helper functions here (unchanged) */
const normalizeArrayResponse = (resData) => {
  if (Array.isArray(resData)) return resData;
  if (resData == null) return [];
  if (Array.isArray(resData.data)) return resData.data;
  if (Array.isArray(resData.clothRolls)) return resData.clothRolls;
  return [];
};

const extractSingleRoll = (payload) => {
  if (!payload) return null;
  if (payload.newClothRoll && typeof payload.newClothRoll === 'object') return payload.newClothRoll;
  if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) return payload.data;
  return typeof payload === 'object' && !Array.isArray(payload) ? payload : null;
};

const wrapRawRollAsServerEntry = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  const rollId = raw._id ? String(raw._id) : null;
  if (!rollId) return null;
  return {
    type: 'roll',
    rollId,
    totalAssigned: raw.amount != null ? Number(raw.amount) : 0,
    rollCount: 1,
    sampleRolls: [
      {
        _id: String(raw._id),
        rollNo: raw.rollNo,
        amount: raw.amount,
        fabricType: raw.fabricType,
        itemType: raw.itemType,
        unitType: raw.unitType,
        status: raw.status,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
    ],
  };
};

export const getClothRolls = createAsyncThunk(
  'clothRolls/getClothRolls',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${serverUrl}/tailors/cloth-rolls`, getAuthHeaders());
      console.log('getClothRolls response.data:', response.data);
      const payload = response.data ?? {};
      let list = [];
      if (Array.isArray(payload.data)) list = payload.data;
      else if (Array.isArray(payload)) list = payload;
      else if (Array.isArray(payload.clothRolls)) list = payload.clothRolls;
      const overall = payload.overall ?? {};
      return { list, overall };
    } catch (err) {
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
      return id;
    } catch (err) {
      const payload = err.response?.data ?? { message: err.message };
      return rejectWithValue(payload);
    }
  }
);

/* initialState and slice setup — keep your existing code (unchanged) */
const initialState = {
  clothRolls: [],
  overall: { totalAssigned: 0, totalClothAmount: 0, totalAvailable: 0 },
  loading: false,
  error: null,
};

const clothRollSlice = createSlice({
  name: 'clothRolls',
  initialState,
  reducers: {
    setClothRolls(state, action) {
      state.clothRolls = Array.isArray(action.payload) ? action.payload.filter(Boolean) : [];
    },
    clearError(state) {
      state.error = null;
    },
    clearClothRolls(state) {
      state.clothRolls = [];
      state.overall = { totalAssigned: 0, totalClothAmount: 0, totalAvailable: 0 };
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(getClothRolls.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getClothRolls.fulfilled, (state, action) => {
        state.loading = false;
        // action.payload = { list, overall }
        state.clothRolls = Array.isArray(action.payload?.list) ? action.payload.list.filter(Boolean) : [];
        state.overall = action.payload?.overall ?? initialState.overall;
        state.error = null;
      })
      .addCase(getClothRolls.rejected, (state, action) => {
        state.loading = false;
        state.clothRolls = [];
        state.overall = initialState.overall;
        state.error = (action.payload && action.payload.message) || action.error?.message || 'Failed to fetch cloth rolls';
      })

      // ADD
      .addCase(addClothRoll.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addClothRoll.fulfilled, (state, action) => {
        state.loading = false;
        const raw = extractSingleRoll(action.payload);
        let entry = null;
        if (raw) {
          entry = wrapRawRollAsServerEntry(raw);
        } else {
          const maybeList = normalizeArrayResponse(action.payload);
          if (Array.isArray(maybeList) && maybeList.length > 0 && typeof maybeList[0] === 'object') {
            entry = maybeList[0];
          } else if (action.payload && typeof action.payload === 'object') {
            entry = action.payload;
          }
        }
        if (entry) {
          state.clothRolls.unshift(entry);
        }
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
        const raw = extractSingleRoll(action.payload);
        let updatedEntry = null;
        if (raw) {
          updatedEntry = wrapRawRollAsServerEntry(raw);
        } else if (action.payload && typeof action.payload === 'object') {
          updatedEntry = action.payload;
        }

        if (updatedEntry) {
          const matchIndex = state.clothRolls.findIndex((e) => {
            if (!e) return false;
            if (e.type === 'roll' && updatedEntry.type === 'roll') return String(e.rollId) === String(updatedEntry.rollId);
            if (e.type === 'group' && updatedEntry.type === 'group') return String(e.clothAmountId) === String(updatedEntry.clothAmountId);
            const existingId = e.rollId || e.clothAmountId || e.id || e._id;
            const updatedId = updatedEntry.rollId || updatedEntry.clothAmountId || updatedEntry.id || updatedEntry._id;
            return existingId && updatedId && String(existingId) === String(updatedId);
          });

          if (matchIndex !== -1) {
            state.clothRolls[matchIndex] = updatedEntry;
          } else {
            state.clothRolls.unshift(updatedEntry);
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
        state.clothRolls = state.clothRolls.filter((e) => {
          if (!e) return false;
          if (e.type === 'roll') return String(e.rollId) !== String(id);
          if (Array.isArray(e.sampleRolls) && e.sampleRolls.some((r) => String(r._id) === String(id))) return false;
          const existingId = e.rollId || e.clothAmountId || e.id || e._id;
          if (existingId && String(existingId) === String(id)) return false;
          return true;
        });
        state.error = null;
      })
      .addCase(deleteClothRoll.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload && action.payload.message) || action.error?.message || 'Failed to delete cloth roll';
      });
  },
});

export const { setClothRolls, clearError, clearClothRolls } = clothRollSlice.actions;
export default clothRollSlice.reducer;

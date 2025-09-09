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

/**
 * Convert a raw ClothRoll document (as returned by create/edit endpoints)
 * into the unified server entry shape that our UI expects:
 * { type: 'roll', rollId, sampleRolls: [...], totalAssigned, rollCount }
 */
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

/**
 * Slice
 */
const initialState = {
  clothRolls: [], // array of server entries (type: 'group' or 'roll')
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
      // GET
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
        // payload might be raw new roll or wrapper
        const raw = extractSingleRoll(action.payload);
        let entry = null;
        if (raw) {
          entry = wrapRawRollAsServerEntry(raw);
        } else {
          // if server returned an already-formed entry (type/group/roll), use it
          const maybeList = normalizeArrayResponse(action.payload);
          if (Array.isArray(maybeList) && maybeList.length > 0 && typeof maybeList[0] === 'object') {
            entry = maybeList[0];
          } else if (action.payload && typeof action.payload === 'object') {
            entry = action.payload;
          }
        }
        if (entry) {
          // add to top
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
          // server returned a raw ClothRoll doc -> wrap to server entry
          updatedEntry = wrapRawRollAsServerEntry(raw);
        } else if (action.payload && typeof action.payload === 'object') {
          // maybe already server-entry
          updatedEntry = action.payload;
        }

        if (updatedEntry) {
          // Try to find matching entry in state.clothRolls
          const matchIndex = state.clothRolls.findIndex((e) => {
            // match by rollId for roll entries, or clothAmountId for group entries, or _id
            if (!e) return false;
            if (e.type === 'roll' && updatedEntry.type === 'roll') return String(e.rollId) === String(updatedEntry.rollId);
            if (e.type === 'group' && updatedEntry.type === 'group') return String(e.clothAmountId) === String(updatedEntry.clothAmountId);
            // fallback: compare sampleRolls[0]._id or rollId or id fields
            const existingId = e.rollId || e.clothAmountId || e.id || e._id;
            const updatedId = updatedEntry.rollId || updatedEntry.clothAmountId || updatedEntry.id || updatedEntry._id;
            return existingId && updatedId && String(existingId) === String(updatedId);
          });

          if (matchIndex !== -1) {
            state.clothRolls[matchIndex] = updatedEntry;
          } else {
            // if not found, add to top
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
        // remove any entries that reference this id (roll entries or group entries referencing roll._id)
        state.clothRolls = state.clothRolls.filter((e) => {
          if (!e) return false;
          if (e.type === 'roll') return String(e.rollId) !== String(id);
          // for group entries, sampleRolls may contain the roll
          if (Array.isArray(e.sampleRolls) && e.sampleRolls.some((r) => String(r._id) === String(id))) return false;
          // fallback compare some id fields
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

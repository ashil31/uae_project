// dealSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { serverUrl } from '../../admin/services/url';

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


export const fetchCurrentDeal = createAsyncThunk(
  'deal/fetchCurrentDeal',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${serverUrl}/deals/getDeals`);
      return response.data;
    } catch (error) {
      // Don't show error if there's no current deal (404)
      if (error.response?.status !== 404) {
        toast.error('Failed to fetch current deal');
      }
      return rejectWithValue(error.response?.data);
    }
  }
);

export const createDeal = createAsyncThunk(
  'deal/createDeal',
  async (dealData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${serverUrl}/deals/addDeal`, dealData, getAuthHeaders());
      return response.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create deal');
      return rejectWithValue(error.response?.data);
    }
  }
);

export const updateDealStatus = createAsyncThunk(
  'deal/updateDealStatus',
  async ({ dealId, enabled }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`${serverUrl}/deals/${dealId}`, { enabled },getAuthHeaders());
      return response.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update deal status');
      return rejectWithValue(error.response?.data);
    }
  }
);

export const deleteDeal = createAsyncThunk(
  'deal/deleteDeal',
  async (dealId, { rejectWithValue }) => {
    try {
      const response = await axios.delete(`${serverUrl}/deals/${dealId}`, getAuthHeaders())
      return response.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete deal');
      return rejectWithValue(error.response?.data);
    }
  }
);

const initialState = {
  deals: [],
  currentDeal: null,
  loading: false,
  error: null,
};

const dealSlice = createSlice({
  name: 'deal',
  initialState,
  reducers: {

  },
  extraReducers: (builder) => {
    builder
      
      // Fetch Current Deal
      .addCase(fetchCurrentDeal.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCurrentDeal.fulfilled, (state, action) => {
        state.loading = false;

        const allDeals = action.payload.deals || [];
        const activeDeal = allDeals.find(deal => deal.enabled);

        if(activeDeal){
          state.currentDeal = activeDeal;
          state.deals = allDeals.filter(deal => deal._id !== activeDeal._id);
        }else{
          state.currentDeal = null;
          state.deals = allDeals;
        }
        state.error = null;
      })
      .addCase(fetchCurrentDeal.rejected, (state, action) => {
        state.loading = false;
        // Only set error if it's not a 404 (not found)
        if (action.payload?.status !== 404) {
          state.error = action.payload;
        }
      })
      
      // Create Deal
      .addCase(createDeal.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createDeal.fulfilled, (state, action) => {
        state.loading = false;
        if(action.payload.deal.enabled){
          state.currentDeal = action.payload.deal
        }else{
          state.deals.push(action.payload.deal)
        }
        state.error = null;
      })
      .addCase(createDeal.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update Deal Status
      .addCase(updateDealStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateDealStatus.fulfilled, (state, action) => {
        state.loading = false;
        const updateDeal = action.payload.deal;
        if(updateDeal.enabled){
          state.currentDeal = updateDeal;
          state.deals = state.deals.filter(d => d._id !== updateDeal._id)
        }else{
          if (state.currentDeal?._id === updateDeal._id) {
            state.currentDeal = null;
            state.deals.push(updateDeal);
          } else {
            // Update in deals array
            state.deals = state.deals.map(d => 
              d._id === updateDeal._id ? updateDeal : d
            );
          }
        }
        state.error = null;
      })
      .addCase(updateDealStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Delete Deal
      .addCase(deleteDeal.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteDeal.fulfilled, (state,action) => {
        state.loading = false;
        const deletedId = action.payload.deal._id;
        if (state.currentDeal?._id === deletedId) {
          state.currentDeal = null;
        }
        state.deals = state.deals.filter(d => d._id !== deletedId);
        state.error = null
      })
      .addCase(deleteDeal.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { } = dealSlice.actions;

export default dealSlice.reducer;

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

export const fetchDashboardData = createAsyncThunk(
  'admin/fetchDashboardStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${serverUrl}/dashboard`, getAuthHeaders());
      console.log(response.data)
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);


const adminSlice = createSlice({
  name: 'admin',
  initialState: {
    dashboardData: {
      totalRevenue: 0,
      totalSales: 0,
      totalProducts: 0,
      totalUsers: 0,
    },
    dailySalesData: [],
    topProducts: [],
    isLoading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardData.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.dashboardData.totalUsers = action.payload.analyticsData.totalUsers;
        state.dashboardData.totalSales = action.payload.analyticsData.totalSales;
        state.dashboardData.totalProducts = action.payload.analyticsData.totalProducts;
        state.dashboardData.totalRevenue = action.payload.analyticsData.totalRevenue;
        state.dailySalesData = action.payload.dailySalesData;
        state.topProducts = action.payload.topProducts;
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
  },
});

export const { clearError } = adminSlice.actions;
export default adminSlice.reducer;
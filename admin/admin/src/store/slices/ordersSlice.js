
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import adminApi from '../../admin/services/adminApi';



export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async ({ page = 1, status = '', search = '' }, { rejectWithValue }) => {
    try {
      const response = await adminApi.getOrders({ page, status, search });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateOrderStatus = createAsyncThunk(
  'orders/updateOrderStatus',
  async ({ id, status, reason = '' }, { rejectWithValue }) => {
    try {
      const response = await adminApi.updateOrderStatus(id, status, reason);
      return response.data.order;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteOrder = createAsyncThunk(
  'orders/deleteOrder',
  async (id, { rejectWithValue }) => {
    try {
      await adminApi.deleteOrder(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const getOrderById = createAsyncThunk(
  'orders/getOrderById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await adminApi.getOrderById(id);
      return response.data.order;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchOrderStatistics = createAsyncThunk(
  'orders/fetchOrderStatistics',
  async (_, { rejectWithValue }) => {
    try {
      const response = await adminApi.getOrderStatistics();
      return response.data.statistics;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// ordersSlice.js
const ordersSlice = createSlice({
  name: 'orders',
  initialState: {
    orders: [],
    currentOrder: null,
    statistics: {
      totalOrders: 0,
      pendingOrders: 0,
      confirmedOrders: 0,
      packedOrders: 0,
      shippedOrders: 0,
      outForDeliveryOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0,
      totalRevenue: 0,
    },
    pagination: {
      page: 1,
      totalPages: 1,
      totalItems: 0,
    },
    isLoading: false,
    isLoadingStats: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentOrder: (state, action) => {
      state.currentOrder = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.isLoading = false;
        state.orders = action.payload.orders;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        const index = state.orders.findIndex(o => o.id === action.payload.id);
        if (index !== -1) {
          state.orders[index] = action.payload;
        }
      })
      .addCase(updateOrderStatus.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(deleteOrder.fulfilled, (state, action) => {
        state.orders = state.orders.filter(o => o.id !== action.payload);
      })
      .addCase(getOrderById.fulfilled, (state, action) => {
        state.currentOrder = action.payload;
      })
      .addCase(fetchOrderStatistics.pending, (state) => {
        state.isLoadingStats = true;
      })
      .addCase(fetchOrderStatistics.fulfilled, (state, action) => {
        state.isLoadingStats = false;
        state.statistics = action.payload;
      });
  }
});

export const { clearError, setCurrentOrder } = ordersSlice.actions;
export default ordersSlice.reducer;

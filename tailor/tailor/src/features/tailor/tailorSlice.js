import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../api/apiClient'; 
import toast from 'react-hot-toast';

// --------------------- Demo Data ---------------------
const demoTailors = [
    { _id: 'tailor_1', name: 'John Stitch' },
    { _id: 'tailor_2', name: 'Jane Seam' },
    { _id: 'tailor_3', name: 'Sam Weave' },
];

const demoUnassignedOrders = [
    { _id: 'order_unassigned_1', name: "Men's Heathered Linen-Blend Shirt", quantity: 5, customization: { name: 'JD', embroidery: 'Left Cuff' } },
    { _id: 'order_unassigned_2', name: "Men's Crinkle Gauze Long-Sleeve Shirt", quantity: 3, customization: { name: 'MW', embroidery: 'Pocket' } },
];

const demoAssignedOrders = [
    { _id: 'order_assigned_1', productName: "Men's Classic Linen Long-Sleeve Shirt", quantity: 2, status: 'In Progress', assignedTailor: demoTailors[0] },
];

// --------------------- Thunks ---------------------

export const getTailors = createAsyncThunk(
  'tailors/getTailors',
  async (_, { rejectWithValue }) => {
    try {
      // Use mock data temporarily
      // return demoTailors;

      // Real API call
      const response = await apiClient.get('/tailors', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      return response.data; // return the array of tailors
    } catch (error) {
      toast.error('Failed to fetch tailors.');
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const addTailor = createAsyncThunk('tailors/addTailor', async (tailorData, { rejectWithValue }) => {
    try {
        const response = await apiClient.post('/tailors', tailorData, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        toast.success('Tailor added successfully!');
        return response.data;
    } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to add tailor.');
        return rejectWithValue(error.response?.data || error.message);
    }
});

export const fetchUnassignedOrders = createAsyncThunk(
  'tailors/fetchUnassignedOrders',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('tailors/unassigned', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      console.log(response.data);
      return response.data.orders; // <-- return the array directly
    } catch (error) {
      toast.error('Failed to fetch unassigned orders.');
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);


export const fetchAssignedWork = createAsyncThunk(
  'tailors/fetchAssignedWork',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('tailors/assigned', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      console.log(response.data);
      return response.data.orders; // <-- return the array directly
    } catch (error) {
      toast.error('Failed to fetch assigned orders.');
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);


export const assignOrder = createAsyncThunk(
  'tailors/assignOrder',
  async ({ orderId, tailorId }, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiClient.put(
        `/tailors/${orderId}/assign/${tailorId}`,
        {}, // empty body since data is in URL
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      toast.success('Order assigned successfully!');

      // Refresh lists
      dispatch(fetchUnassignedOrders());
      dispatch(fetchAssignedWork());

      return response.data; // return API response
    } catch (error) {
      toast.error('Failed to assign order.');
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchOrderStatistics = createAsyncThunk('tailors/fetchOrderStatistics', async (_, { rejectWithValue }) => {
    try {
        const response = await apiClient.get('/orders/statistics', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return response.data;
    } catch (error) {
        toast.error('Failed to fetch order statistics.');
        return rejectWithValue(error.response?.data || error.message);
    }
});

// --------------------- Slice ---------------------
const initialState = {
    tailors: [],
    unassignedOrders: [],
    assignedWork: [],
    statistics: null,
    loading: false,
    isLoadingStats: false,
    error: null,
};

const tailorSlice = createSlice({
    name: 'tailor',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            // Tailors
            .addCase(getTailors.pending, state => { state.loading = true; state.error = null; })
            .addCase(getTailors.fulfilled, (state, action) => { state.loading = false; state.tailors = action.payload; })
            .addCase(getTailors.rejected, (state, action) => { state.loading = false; state.error = action.payload; })

            .addCase(addTailor.pending, state => { state.loading = true; state.error = null; })
            .addCase(addTailor.fulfilled, (state, action) => { state.loading = false; state.tailors.push(action.payload); })
            .addCase(addTailor.rejected, (state, action) => { state.loading = false; state.error = action.payload; })

            // Orders
            .addCase(fetchUnassignedOrders.pending, state => { state.loading = true; state.error = null; })
            .addCase(fetchUnassignedOrders.fulfilled, (state, action) => { state.loading = false; state.unassignedOrders = action.payload; })
            .addCase(fetchUnassignedOrders.rejected, (state, action) => { state.loading = false; state.error = action.payload; })

            .addCase(fetchAssignedWork.pending, state => { state.loading = true; state.error = null; })
            .addCase(fetchAssignedWork.fulfilled, (state, action) => { state.loading = false; state.assignedWork = action.payload; })
            .addCase(fetchAssignedWork.rejected, (state, action) => { state.loading = false; state.error = action.payload; })

            .addCase(assignOrder.pending, state => { state.loading = true; state.error = null; })
            .addCase(assignOrder.fulfilled, state => { state.loading = false; })
            .addCase(assignOrder.rejected, (state, action) => { state.loading = false; state.error = action.payload; })

            // Statistics
            .addCase(fetchOrderStatistics.pending, state => { state.isLoadingStats = true; })
            .addCase(fetchOrderStatistics.fulfilled, (state, action) => { state.isLoadingStats = false; state.statistics = action.payload; })
            .addCase(fetchOrderStatistics.rejected, (state, action) => { state.isLoadingStats = false; state.error = action.payload; });
    },
});

export default tailorSlice.reducer;

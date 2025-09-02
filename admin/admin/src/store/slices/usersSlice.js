
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios'
import { serverUrl } from '../../admin/services/url';
import adminApi from '../../admin/services/adminApi';

// Consistent auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('adminToken');
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
};

export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${serverUrl}/user/getAllUsers`, getAuthHeaders())
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const updateUserRole = createAsyncThunk(
  'users/updateUserRole',
  async ({ userId, newRole }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${serverUrl}/user/updateRole`, { userId, newRole }, getAuthHeaders());(userId, newRole);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const banUser = createAsyncThunk(
  'users/banUser',
  async ({ id, banned }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${serverUrl}/user/banUser`,{id:id,banStatus:banned}, getAuthHeaders());
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const usersSlice = createSlice({
  name: 'users',
  initialState: {
    users: [],
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
      .addCase(fetchUsers.pending, (state) => {
        state.isLoading = true;
        state.error = null
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.users = action.payload.users.map(user => ({
          ...user,
          status: user.isBanned ? 'banned' : 'active',
          joinDate: new Date(user.createdAt).toLocaleDateString()
        }));;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(updateUserRole.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUserRole.fulfilled, (state, action) => {
        state.isLoading = false;
        const updatedUser = action.payload.user;
        const index = state.users.findIndex(u => u._id === updatedUser._id);
        if (index !== -1) {
          state.users[index] = {
            ...updatedUser,
            status: updatedUser.status,
            joinDate: new Date(updatedUser.createdAt).toLocaleDateString()
          };
        }
      })
      .addCase(updateUserRole.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(banUser.fulfilled, (state, action) => {
        state.isLoading = false;
        const { _id, isBanned } = action.payload.user;
        const index = state.users.findIndex(u => u._id === _id);
        if(index !== -1 ){
          if (action.payload.user) {
            state.users[index] = {
              ...action.payload.user,
              status: action.payload.user?.isBanned ? 'banned' : 'active',
              joinDate: new Date(action.payload.user.createdAt).toLocaleDateString()
            };
          } else {
            state.users[index].isBanned = banned;
            state.users[index].status = banned ? 'banned' : 'active';
          }
        }
      });
  },
});

export const { clearError } = usersSlice.actions;
export default usersSlice.reducer;

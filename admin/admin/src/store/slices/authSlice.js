
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { serverUrl } from '../../admin/services/url';
import axios from 'axios'
// Mock user data for demo
const mockUsers = {
  'admin@uaefashion.com': { role: 'admin', name: 'Admin User' },
};

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      console.log(email,password)
      const response = await axios.post(`${serverUrl}/auth/loginAdmin`,{
        email,
        password,
        role: 'admin',
      })

      if (!response.data.success) {
        return rejectWithValue(response.data.message || 'Login failed');
      }

      // Store user and token in localStorage
      // const cleanToken = response.data.token.replace(/^"(.*)"$/, '$1');
      localStorage.setItem('adminUser', response.data.user);
      localStorage.setItem('adminToken', response.data.token);
      // console.log(response.data)

      return response.data
      
    } catch (error) {
      if (error.response && error.response.data.message) {
        return rejectWithValue(error.response.data.message);
      }
      return rejectWithValue(error.message || 'Something went wrong');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      // Clear both user and token
      localStorage.removeItem('adminUser');
      localStorage.removeItem('adminToken');
      return null;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: (localStorage.getItem('adminUser')) ?  JSON.parse(localStorage.getItem('adminUser')) : null,
    token: (localStorage.getItem('adminToken')) || null,
    isLoading: false,
    error: null,
    isAuthenticated: !!localStorage.getItem('adminToken'),
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;

        // Persist to localStorage
        localStorage.setItem('adminUser', JSON.stringify(action.payload.user));
        localStorage.setItem('adminToken', action.payload.token);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.user = null;
        state.isAuthenticated = false;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
      });
  },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;

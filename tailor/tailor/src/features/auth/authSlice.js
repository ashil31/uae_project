import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { jwtDecode } from 'jwt-decode';
import toast from 'react-hot-toast';

// Import all named exports from tailorApi into a single object
import * as tailorApi from '../../api/tailorApi';

// --- Async Thunks ---
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await tailorApi.loginTailor(credentials); // Assuming a loginTailor function in your api file
      const { token } = response.data;
      localStorage.setItem('token', token);
      toast.success('Login successful!');
      return token;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed. Please check your credentials.';
      toast.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

export const signupUser = createAsyncThunk(
  'auth/signupUser',
  async (userData, { rejectWithValue }) => {
    try {
      // Assuming a signupTailor function exists in your API file
      const response = await tailorApi.signupTailor(userData); 
      toast.success('Signup successful! Please log in.');
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Signup failed.';
      toast.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

// --- Initial State ---
const initialState = {
  isAuthenticated: false,
  token: null,
  user: null,
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

// --- Auth Slice ---
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loadUserFromToken: (state) => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const decodedUser = jwtDecode(token);
          // Check if the token is expired
          if (decodedUser.exp * 1000 > Date.now()) {
            state.token = token;
            state.isAuthenticated = true;
            state.user = decodedUser;
          } else {
            // Token is expired, remove it
            localStorage.removeItem('token');
          }
        } catch (error) {
          console.error("Invalid token found in localStorage", error);
          localStorage.removeItem('token');
        }
      }
    },
    logout: (state) => {
      localStorage.removeItem('token');
      state.isAuthenticated = false;
      state.token = null;
      state.user = null;
      state.status = 'idle';
      state.error = null;
      toast.success('Logged out successfully.');
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.token = action.payload;
        try {
          // Safely decode the token
          const decodedUser = jwtDecode(action.payload);
          state.user = decodedUser;
          state.isAuthenticated = true;
          state.status = 'succeeded';
        } catch (error) {
          // Handle cases where the server might return a malformed token
          console.error("Failed to decode token on login:", error);
          state.status = 'failed';
          state.error = 'Received an invalid token from the server.';
          state.isAuthenticated = false;
          state.token = null;
          state.user = null;
        }
      })
      // Signup Cases (NEW)
      .addCase(signupUser.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(signupUser.fulfilled, (state) => {
        state.status = 'succeeded';
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
        state.isAuthenticated = false;
        state.token = null;
        state.user = null;
      });
  },
});

// --- Exports ---

export const { logout, loadUserFromToken } = authSlice.actions;

// Selectors for easy access to state in components
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthStatus = (state) => state.auth.status;
export const selectAuthError = (state) => state.auth.error;
export const selectCurrentUser = (state) => state.auth.user;
export const selectUserRole = (state) => state.auth.user?.role;

// Export the reducer as the default export
export default authSlice.reducer;

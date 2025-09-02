import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import tailorReducer from '../features/tailor/tailorSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tailor: tailorReducer,
  },
});
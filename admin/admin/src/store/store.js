
import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import adminSlice from './slices/adminSlice';
import productsSlice from './slices/productsSlice';
import ordersSlice from './slices/ordersSlice';
import usersSlice from './slices/usersSlice';
import heroBannerSlice from './slices/heroBannerSlice.js'
import dealSlice from './slices/dealSlice.js'
import tailorSlice from './slices/tailorSlice';
import clothRollSlice from './slices/clothRollSlice';
import assignmentSlice from './slices/assignmentSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    admin: adminSlice,
    products: productsSlice,
    orders: ordersSlice,
    users: usersSlice,
    heroBanner: heroBannerSlice,
    deal: dealSlice,
    tailors: tailorSlice,
    clothRolls: clothRollSlice,
    assignments: assignmentSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

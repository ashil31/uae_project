
import React, { createContext, useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setUser } from '../store/slices/authSlice';

const AuthContext = createContext({});

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();
  const { user, isAuthenticated, isLoading } = useSelector((state) => state.auth);

  useEffect(() => {
    // Check for persisted auth state
    const savedUser = localStorage.getItem('adminUser');
    if (savedUser) {
      dispatch(setUser(JSON.parse(savedUser)));
    }
  }, [dispatch]);

  const value = {
    user,
    isAuthenticated,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { logoutUser, setUser } from '../store/slices/authSlice';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const dispatch = useDispatch();
  const { isAuthenticated, token, user } = useSelector((state) => state.auth);

  // Sync localStorage with Redux on initial load
  useEffect(() => {
    const localUser = localStorage.getItem('adminUser');
    const localToken = localStorage.getItem('adminToken');
    
    if (localUser && localToken) {
      try {
        const parsedUser = JSON.parse(localUser);
        dispatch(setUser(parsedUser));
      } catch (error) {
        console.error('Failed to parse user data:', error);
        dispatch(logoutUser());
      }
    }
  }, [dispatch]);

  const isTokenValid = () => {
    if (!token) return false;
    try {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      
      if (decoded.exp < currentTime) {
        toast.error('Your session has expired. Please log in again.');
        dispatch(logoutUser());
        return false;
      }
      return true;
    } catch (error) {
      toast.error('Invalid session. Please log in again.');
      dispatch(logoutUser());
      return false;
    }
  };

  // Check authentication and token validity
  if (!isAuthenticated || !isTokenValid()) {
    return <Navigate to="/login" replace />;
  }

  // Check admin role if required
  if (requireAdmin && user?.role !== 'admin') {
    console.log('Failed admin check - User:', user); // Debug log
    toast.error('You do not have permission to access this page');
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
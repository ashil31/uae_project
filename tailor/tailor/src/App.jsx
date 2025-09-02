import React, { useEffect } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';

// Slices and Selectors
import { selectIsAuthenticated, selectUserRole, loadUserFromToken } from './features/auth/authSlice';

// Layout Components
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TailorsPage from './pages/TailorsPage';
import AssignWorkPage from './pages/AssignWorkPage';
import ClothInventoryPage from './pages/ClothInventoryPage';
import DailyProductionPage from './pages/DailyProductionPage';
import TailorSignupPage from './pages/TailorSignupPage';
import OrdersPage from './pages/OrdersPage'; // <-- Import the new Orders page
import ViewAssignedWorkPageTailor from './pages/ViewAssignedWorkPageTailor';
import AssignedRollsPage from './pages/AssignedRollsPage';
import SpecialNotesPage from './pages/SpecialNotesPage';

const DashboardLayout = () => (
    <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-y-auto">
            <Header />
            <main>
                <Outlet /> 
            </main>
        </div>
    </div>
);

const ProtectedRoute = ({ allowedRoles }) => {
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const userRole = useSelector(selectUserRole);
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(userRole)) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};

const App = () => {
    const dispatch = useDispatch();
    
    useEffect(() => {
        dispatch(loadUserFromToken());
    }, [dispatch]);

    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<TailorSignupPage />} /> 

            {/* Protected Routes with Main Layout */}
            <Route element={<DashboardLayout />}>
                {/* Routes for all authenticated users */}
                <Route element={<ProtectedRoute />}>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/production" element={<DailyProductionPage />} />
                </Route>
                
                {/* MasterTailor specific routes */}
                <Route element={<ProtectedRoute allowedRoles={['MasterTailor']} />}>
                    <Route path="/orders" element={<OrdersPage />} /> 
                    <Route path="/tailors" element={<TailorsPage />} />
                    <Route path="/assign-work" element={<AssignWorkPage />} />
                    <Route path="/inventory" element={<AssignedRollsPage />} />
                </Route>

                {/* Tailor specific routes */}
                <Route element={<ProtectedRoute allowedRoles={['Tailor']} />}>
                    <Route path="/assigned-work" element={<ViewAssignedWorkPageTailor />} />
                    {/* <Route path="/inventory" element={<AssignedRollsPage />} /> */}
                    <Route path="/special-notes" element={<SpecialNotesPage />} />
                    <Route path="/assigned-rolls" element={<AssignedRollsPage />} />
                </Route>
            </Route>

            {/* Fallback for any other route */}
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
};

export default App;

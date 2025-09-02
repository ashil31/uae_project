import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectCurrentUser, logout } from '../../features/auth/authSlice';
import { LogOut } from 'lucide-react';

const Header = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const user = useSelector(selectCurrentUser);

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    return (
        <header className="flex items-center justify-between p-4 bg-white border-b">
            <div>
                {/* Search bar can go here */}
            </div>
            <div className="flex items-center space-x-4">
                {/* FIX: Changed user?.name to user?.username to match the data from the backend */}
                <span className="font-medium text-gray-900">Welcome, {user?.username || 'Guest'}</span>
                <button 
                    onClick={handleLogout}
                    className="p-2 text-gray-500 rounded-full hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    aria-label="Logout"
                >
                    <LogOut size={20}/>
                </button>
            </div>
        </header>
    );
};

export default Header;

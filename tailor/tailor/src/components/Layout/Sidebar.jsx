import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUserRole } from '../../features/auth/authSlice';
import { 
    Home, 
    Users, 
    Scissors, 
    Package, 
    BookOpen, 
    Shirt, 
    ClipboardPlus, 
    Factory,
    ChevronDown,
    ChevronRight,
    StickyNote 
} from 'lucide-react';


const masterTailorLinks = [
    { to: '/dashboard', icon: <Home size={20}/>, text: 'Dashboard' },
    { to: '/orders', icon: <Shirt size={20}/>, text: 'Orders' },
    { to: '/assign-work', icon: <ClipboardPlus size={20}/>, text: 'Assign Work' },
    { to: '/inventory', icon: <Scissors size={20}/>, text: 'Roll Assignment' },
    { to: '/production', icon: <Factory size={20}/>, text: 'Production' },
    { to: '/tailors', icon: <Users size={20}/>, text: 'Manage Tailors' },
];


const tailorLinks = [
    { to: '/dashboard', icon: <Home size={20}/>, text: 'Dashboard' },
    { to: '/assigned-work', icon: <Scissors size={20}/>, text: 'Update Work Status' }, // Renamed for clarity
    { to: '/special-notes', icon: <StickyNote size={20}/>, text: 'Special Notes' }, // New Link
    { to: '/assigned-rolls', icon: <Package size={20}/>, text: 'Assigned Rolls' }, // New Link
    { to: '/production', icon: <BookOpen size={20}/>, text: 'My Production Logs' },
];

const Sidebar = () => {
    const role = useSelector(selectUserRole);
    const navLinks = role === 'MasterTailor' ? masterTailorLinks : tailorLinks;
    
    const [ordersOpen, setOrdersOpen] = useState(false);

    const linkStyle = "flex items-center p-4 m-2 text-gray-700 rounded-lg hover:bg-gray-300 hover:text-white transition-colors duration-200";
    const activeLinkStyle = "text-white bg-gradient-to-r from-purple-600 to-blue-600";
    
    // ... rest of the component logic remains the same ...

    return (
        <aside className="flex flex-col w-64 h-screen px-4 py-8 bg-white border-r">
            <h2 className="text-3xl font-semibold text-center text-black border-b-2 border-gray-200 pb-4">NEW ERA</h2>
            <div className="flex flex-col justify-between flex-1 mt-6">
                <nav>
                    {navLinks.map((link) => (
                        <NavLink 
                            key={link.to} 
                            to={link.to} 
                            className={({ isActive }) => `${linkStyle} ${isActive ? activeLinkStyle : ''}`}
                        >
                            {link.icon}
                            <span className="mx-4 font-medium">{link.text}</span>
                        </NavLink>
                    ))}
                </nav>
            </div>
        </aside>
    );
};

export default Sidebar;

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Loader2, AlertTriangle, CheckCircle, XCircle, Flag } from 'lucide-react';

// Import the necessary thunks from your tailorSlice
import { fetchAssignedWork, updateOrderStatus } from '../../features/tailor/tailorSlice';

// A reusable StatusBadge component for consistent styling
const StatusBadge = ({ status }) => {
    const statusMap = {
        Assigned: 'bg-blue-100 text-blue-800',
        'In Progress': 'bg-yellow-100 text-yellow-800',
        Finished: 'bg-green-100 text-green-800',
        Rejected: 'bg-red-100 text-red-800',
    };
    return (
        <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${statusMap[status] || 'bg-gray-100 text-gray-800'}`}>
            {status}
        </span>
    );
};


const ViewAssignedWorkPage = () => {
    const dispatch = useDispatch();
    const { assignedWork, loading, error } = useSelector((state) => state.tailor);

    useEffect(() => {
        // Dispatch the thunk to fetch data when the component mounts
        dispatch(fetchAssignedWork());
    }, [dispatch]);

    const handleStatusUpdate = (orderId, newStatus) => {
        dispatch(updateOrderStatus({ orderId, status: newStatus }));
    };

    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex flex-col items-center justify-center h-64 bg-red-50 border border-red-200 rounded-lg p-4">
                    <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
                    <p className="text-red-700 font-semibold">Error: {error}</p>
                </div>
            );
        }

        if (assignedWork.length === 0) {
            return (
                <div className="text-center py-16">
                    <h3 className="text-lg font-semibold text-gray-800">No Work Assigned</h3>
                    <p className="text-gray-500 mt-1">You have no tasks at the moment. Great job!</p>
                </div>
            );
        }

        return (
            <div className="shadow-md rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Details</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {assignedWork.map((order) => (
                            <motion.tr 
                                key={order._id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3 }}
                            >
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">#{order.orderNumber} - {order.productName}</div>
                                    <div className="text-sm text-gray-500">{order.quantity} units</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                    {new Date(order.assignedAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <StatusBadge status={order.status} />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                    {order.status === 'Assigned' && (
                                        <div className="flex items-center justify-center space-x-2">
                                            <button onClick={() => handleStatusUpdate(order._id, 'In Progress')} className="text-green-600 hover:text-green-900 transition-colors duration-200 flex items-center"><CheckCircle size={18} className="mr-1"/> Accept</button>
                                            <button onClick={() => handleStatusUpdate(order._id, 'Rejected')} className="text-red-600 hover:text-red-900 transition-colors duration-200 flex items-center"><XCircle size={18} className="mr-1"/> Reject</button>
                                        </div>
                                    )}
                                    {order.status === 'In Progress' && (
                                        <button onClick={() => handleStatusUpdate(order._id, 'Finished')} className="text-indigo-600 hover:text-indigo-900 transition-colors duration-200 flex items-center mx-auto"><Flag size={18} className="mr-1"/> Mark Finished</button>
                                    )}
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="p-4 sm:p-6 bg-gray-50 min-h-screen"
        >
            <div className="max-w-6xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">My Assigned Work</h1>
                    <p className="text-sm text-gray-500 mt-1">Review your tasks and update their status as you progress.</p>
                </div>
                {renderContent()}
            </div>
        </motion.div>
    );
};

export default ViewAssignedWorkPage;

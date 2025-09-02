import React from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { CheckCircle, Clock } from 'lucide-react';

// Mock data for this example - in a real app, this would come from Redux
const mockMyAssignedWork = [
    { _id: 'order_assigned_1', productName: "Men's Classic Linen Long-Sleeve Shirt", status: 'In Progress' },
    { _id: 'order_assigned_2', productName: "Men's Emerald Green Linen-Blend Shirt", status: 'Assigned' },
    { _id: 'order_assigned_3', productName: "Men's Terry Cloth Zip-Neck Polo Shirt", status: 'In Progress' },
];

const ViewAssignedWorkPageTailor = () => {
    // In a real app, you would dispatch a Redux thunk here to update the backend
    const handleMarkAsDone = (orderId) => {
        console.log(`Marking order ${orderId} as Done.`);
        toast.success(`Order marked as done! (Demo)`);
        // Example of what a dispatch would look like:
        // dispatch(updateOrderStatus({ orderId, status: 'Done' }));
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-6 bg-gray-50 min-h-screen"
        >
            <div className="max-w-5xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Update Work Status</h1>
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Status</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {mockMyAssignedWork.map((order) => (
                                <tr key={order._id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.productName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${order.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                                            <Clock size={14} className="mr-1.5" />
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button 
                                            onClick={() => handleMarkAsDone(order._id)}
                                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                        >
                                            <CheckCircle size={16} className="mr-2" />
                                            Mark as Done
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </motion.div>
    );
};

export default ViewAssignedWorkPageTailor;

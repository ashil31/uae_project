import React from 'react';
import { motion } from 'framer-motion';
import { buildImageUrl } from '../../features/tailor/tailorSlice';

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

const AssignedOrdersList = ({ orders }) => {
    if (!orders || orders.length === 0) {
        return (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center p-10 bg-white rounded-lg shadow-md"
            >
                <h3 className="text-lg font-semibold text-gray-700">No Orders in Production</h3>
                <p className="text-gray-500 mt-1">Assign an order from the 'Unassigned' tab to get started.</p>
            </motion.div>
        );
    }

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white shadow-md rounded-lg overflow-x-auto"
        >
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Color</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map((order) => {
                        const product = order.products[0]; // Access first product
                        const productInfo = product.productId; // productId contains name & images
                        const imageUrl = buildImageUrl(productInfo?.images?.[0]?.url);
                        return (
                            <tr key={order._id}>
                                <td className="px-6 py-4">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-16 w-16">
                                            <img
                                                className="h-16 w-16 rounded-md object-cover"
                                                src={imageUrl}
                                                alt={productInfo?.name || 'Product'}
                                            />
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">{productInfo?.name || 'Product'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                                    {order.assignedTo?.username || 'Unknown Tailor'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                                    {product?.quantity || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                                    {product?.color || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                                    {product?.size || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <StatusBadge status={order.status} />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </motion.div>
    );
};

export default AssignedOrdersList;

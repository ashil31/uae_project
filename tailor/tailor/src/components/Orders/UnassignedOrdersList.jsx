import React from 'react';
import { motion } from 'framer-motion';

const UnassignedOrdersList = ({ orders, onAssignClick }) => {
  if (!orders || orders.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center p-10 bg-white rounded-lg shadow-md"
      >
        <h3 className="text-lg font-semibold text-gray-700">All Orders Assigned</h3>
        <p className="text-gray-500 mt-1">Great job! There are no pending orders to assign.</p>
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
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customization</th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {orders.map((order) =>
            order.products.map((product, index) => {
              const productInfo = product.productId; // Assuming you have fetched full product info including name & images
              return (
                <tr key={order._id + '_' + index}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-16 w-16">
                        <img
                          className="h-16 w-16 rounded-md object-cover"
                          src={productInfo?.images?.[1]?.url || '/placeholder.png'}
                          alt={productInfo?.name || 'Product'}
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{productInfo?.name || 'Product'}</div>
                        <div className="text-sm text-gray-500">
                          Color: {product.color}, Size: {product.size}, Qty: {product.quantity}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    <div>Name: <strong>{product.customization?.name || 'N/A'}</strong></div>
                    <div>Embroidery: <strong>{product.customization?.embroidery || 'N/A'}</strong></div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => onAssignClick(order)}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                    >
                      Assign
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </motion.div>
  );
};

export default UnassignedOrdersList;

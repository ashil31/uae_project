import React from 'react';
import { motion } from 'framer-motion'


const AdminTable = ({ headers, data, actions, isLoading = false, emptyMessage = "No data available" }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 border-t"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-12 text-center">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-500">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  const hasActions = actions && typeof actions === 'function';
  const tableHeaders = hasActions ? [...headers, 'Actions'] : headers;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-sm border overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {tableHeaders.map((header, index) => (
                <th
                  key={index}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, rowIndex) => (
              <React.Fragment key={row.id || row._id || rowIndex}>
                <motion.tr
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: rowIndex * 0.05 }}
                  className="hover:bg-gray-50"
                >
                  {headers.map((header, cellIndex) => {
                    // Find the corresponding value in the row
                    const headerKey = header.toLowerCase().replace(/\s+/g, '');
                    let value = row[headerKey] || row[header.toLowerCase()] || row[header];
                    
                    // Handle special cases for order data
                    if (header === 'Order ID') value = row.id;
                    if (header === 'Customer') value = row.customer;
                    if (header === 'Items') value = row.items;
                    if (header === 'Total') value = row.total;
                    if (header === 'Status') value = row.status;
                    if (header === 'Date') value = row.date;
                    
                    return (
                      <td 
                        key={cellIndex} 
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                      >
                        {value}
                      </td>
                    );
                  })}
                  {hasActions && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {actions(row).map((action, actionIndex) => (
                          <React.Fragment key={actionIndex}>
                            {action}
                          </React.Fragment>
                        ))}
                      </div>
                    </td>
                  )}
                </motion.tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default AdminTable
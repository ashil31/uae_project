
import React from 'react';

const StatusBadge = ({ status, type = 'default' }) => {
  const getStatusStyles = (status, type) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    
    if (type === 'order') {
      switch (status?.toLowerCase()) {
        case 'processing':
          return `${baseClasses} bg-yellow-100 text-yellow-800`;
        case 'shipped':
          return `${baseClasses} bg-blue-100 text-blue-800`;
        case 'delivered':
          return `${baseClasses} bg-green-100 text-green-800`;
        case 'cancelled':
          return `${baseClasses} bg-red-100 text-red-800`;
        default:
          return `${baseClasses} bg-gray-100 text-gray-800`;
      }
    }
    
    if (type === 'user') {
      switch (status?.toLowerCase()) {
        case 'active':
          return `${baseClasses} bg-green-100 text-green-800`;
        case 'banned':
          return `${baseClasses} bg-red-100 text-red-800`;
        case 'pending':
          return `${baseClasses} bg-yellow-100 text-yellow-800`;
        default:
          return `${baseClasses} bg-gray-100 text-gray-800`;
      }
    }
    
    if (type === 'role') {
      switch (status?.toLowerCase()) {
        case 'admin':
          return `${baseClasses} bg-purple-100 text-purple-800`;
        case 'wholesaler':
          return `${baseClasses} bg-blue-100 text-blue-800`;
        case 'customer':
          return `${baseClasses} bg-gray-100 text-gray-800`;
        default:
          return `${baseClasses} bg-gray-100 text-gray-800`;
      }
    }

    if (type === 'review') {
      switch (status?.toLowerCase()) {
        case 'approved':
          return `${baseClasses} bg-green-100 text-green-800`;
        case 'pending':
          return `${baseClasses} bg-yellow-100 text-yellow-800`;
        case 'rejected':
          return `${baseClasses} bg-red-100 text-red-800`;
        case 'flagged':
          return `${baseClasses} bg-orange-100 text-orange-800`;
        default:
          return `${baseClasses} bg-gray-100 text-gray-800`;
      }
    }
    
    return `${baseClasses} bg-gray-100 text-gray-800`;
  };

  return (
    <span className={getStatusStyles(status, type)}>
      {status}
    </span>
  );
};

export default StatusBadge;

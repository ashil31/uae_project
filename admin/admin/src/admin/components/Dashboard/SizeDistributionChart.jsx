import React from 'react';

const SizeDistributionChart = ({ assignments }) => {
  const sizeData = assignments.reduce((acc, assignment) => {
    assignment.logs.forEach(log => {
      if (log.garments) {
        Object.keys(log.garments).forEach(size => {
          acc[size] = (acc[size] || 0) + (log.garments[size] || 0);
        });
      }
    });
    return acc;
  }, {});

  const total = Object.values(sizeData).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-3">
      {Object.entries(sizeData).map(([size, count]) => {
        const percentage = total > 0 ? (count / total * 100).toFixed(1) : 0;
        return (
          <div key={size} className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Size {size}</span>
            <div className="flex items-center space-x-2">
              <div className="w-16 h-2 bg-gray-200 rounded">
                <div 
                  className="h-2 bg-purple-500 rounded" 
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-sm text-gray-600">{count}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SizeDistributionChart;

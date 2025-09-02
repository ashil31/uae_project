import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const WasteAnalysisChart = ({ assignments }) => {
  const data = assignments.reduce((acc, assignment) => {
    assignment.logs.forEach(log => {
      acc.used += log.used || 0;
      acc.waste += log.waste || 0;
      acc.returned += log.returned || 0;
    });
    return acc;
  }, { used: 0, waste: 0, returned: 0 });

  const chartData = [
    { name: 'Used', value: data.used, color: '#10b981' },
    { name: 'Waste', value: data.waste, color: '#ef4444' },
    { name: 'Returned', value: data.returned, color: '#f59e0b' },
  ];

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default WasteAnalysisChart;

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ProductivityChart = ({ assignments }) => {
  // Process data for chart
  const chartData = assignments
    .filter(a => a.logs.length > 0)
    .map(assignment => {
      const totalGarments = assignment.logs.reduce((sum, log) => {
        return sum + Object.values(log.garments || {}).reduce((garmentSum, count) => garmentSum + (count || 0), 0);
      }, 0);
      
      const totalCloth = assignment.logs.reduce((sum, log) => sum + (log.used || 0), 0);
      const productivity = totalCloth > 0 ? totalGarments / totalCloth : 0;
      
      return {
        tailor: assignment.tailorId?.name || 'Unknown',
        productivity: productivity.toFixed(2),
        garments: totalGarments,
        cloth: totalCloth,
      };
    })
    .sort((a, b) => b.productivity - a.productivity)
    .slice(0, 10);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="tailor" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="productivity" fill="#8b5cf6" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default ProductivityChart;

import React from 'react';
import { useSelector } from 'react-redux';
import { selectUserRole } from '../../features/auth/authSlice';

const DailyProductionTable = ({ logs }) => {
    const role = useSelector(selectUserRole);
  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <table className="min-w-full text-sm divide-y-2 divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 font-medium text-left text-gray-900 whitespace-nowrap">Date</th>
            {role === 'MasterTailor' && <th className="px-4 py-3 font-medium text-left text-gray-900 whitespace-nowrap">Tailor Name</th>}
            <th className="px-4 py-3 font-medium text-left text-gray-900 whitespace-nowrap">Items Made</th>
            <th className="px-4 py-3 font-medium text-left text-gray-900 whitespace-nowrap">Total Count</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {logs.map((log) => (
            <tr key={log._id}>
              <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{new Date(log.date).toLocaleDateString()}</td>
              {role === 'MasterTailor' && <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{log.tailorName}</td>}
              <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                {log.itemsMade.map(item => `${item.count} x ${item.name}`).join(', ')}
              </td>
              <td className="px-4 py-3 font-bold text-gray-800 whitespace-nowrap">
                {log.itemsMade.reduce((acc, item) => acc + item.count, 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DailyProductionTable;
import React from 'react';
import { motion } from 'framer-motion';

const TailorList = ({ tailors }) => {
  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <table className="min-w-full text-sm divide-y-2 divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 font-medium text-left text-gray-900 whitespace-nowrap">Name</th>
            <th className="px-4 py-3 font-medium text-left text-gray-900 whitespace-nowrap">Email</th>
            <th className="px-4 py-3 font-medium text-left text-gray-900 whitespace-nowrap">Phone</th>
            <th className="px-4 py-3 font-medium text-left text-gray-900 whitespace-nowrap">Status</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {tailors.map((tailor, index) => (
            <motion.tr 
                key={tailor._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
            >
              <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{tailor.name}</td>
              <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{tailor.email}</td>
              <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{tailor.phone}</td>
              <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    tailor.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {tailor.status}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                <button className="text-indigo-600 hover:text-indigo-900">Edit</button>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TailorList;
import React from 'react';

const ClothInventoryTable = ({ inventory }) => {
  return (
     <div className="overflow-x-auto bg-white rounded-lg shadow">
      <table className="min-w-full text-sm divide-y-2 divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 font-medium text-left text-gray-900 whitespace-nowrap">Cloth Type</th>
            <th className="px-4 py-3 font-medium text-left text-gray-900 whitespace-nowrap">Color</th>
            <th className="px-4 py-3 font-medium text-left text-gray-900 whitespace-nowrap">Quantity</th>
            <th className="px-4 py-3 font-medium text-left text-gray-900 whitespace-nowrap">Supplier</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {inventory.map((item) => (
            <tr key={item._id}>
              <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{item.clothType}</td>
              <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{item.color}</td>
              <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{item.quantity} {item.unit}</td>
              <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{item.supplier}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ClothInventoryTable;
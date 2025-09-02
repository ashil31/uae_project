import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { assignOrder } from '../../features/tailor/tailorSlice';

const AssignWorkForm = ({ orders = [], tailors = [] }) => {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.tailor);

  const { register, handleSubmit, formState: { errors }, reset } = useForm();

  const onSubmit = (data) => {
    dispatch(assignOrder({ orderId: data.orderId, tailorId: data.tailorId }))
      .then((result) => {
        if (assignOrder.fulfilled.match(result)) reset();
      });
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-10 px-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800">No Unassigned Orders</h3>
        <p className="text-gray-500 mt-1">All orders are currently assigned. Check back later!</p>
      </div>
    );
  }

  return (
    <motion.form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div>
        <label htmlFor="orderId" className="block text-sm font-medium text-gray-700 mb-1">
          Select Unassigned Order
        </label>
        <select
          id="orderId"
          {...register('orderId', { required: 'Please select an order' })}
          className={`w-full px-3 py-2 bg-white border ${errors.orderId ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500`}
          defaultValue=""
        >
          <option value="" disabled>-- Choose an order --</option>
          {orders.map(order => (
            <option key={order._id} value={order._id}>
              {/* Use first product for name and quantity */}
              Order #{order._id.slice(-6)} - {order.products[0]?.productName || 'Unnamed Product'} ({order.products[0]?.quantity || 1} units)
            </option>
          ))}
        </select>
        {errors.orderId && <p className="mt-1 text-sm text-red-600">{errors.orderId.message}</p>}
      </div>

      <div>
        <label htmlFor="tailorId" className="block text-sm font-medium text-gray-700 mb-1">
          Assign to Tailor
        </label>
        <select
          id="tailorId"
          {...register('tailorId', { required: 'Please select a tailor' })}
          className={`w-full px-3 py-2 bg-white border ${errors.tailorId ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500`}
          defaultValue=""
        >
          <option value="" disabled>-- Choose a tailor --</option>
          {tailors.map(tailor => (
            <option key={tailor._id} value={tailor._id}>{tailor.name}</option>
          ))}
        </select>
        {errors.tailorId && <p className="mt-1 text-sm text-red-600">{errors.tailorId.message}</p>}
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center px-6 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Assigning...
            </>
          ) : 'Assign Task'}
        </button>
      </div>
    </motion.form>
  );
};

export default AssignWorkForm;

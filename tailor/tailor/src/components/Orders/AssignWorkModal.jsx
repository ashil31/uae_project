import React from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { assignOrder } from '../../features/tailor/tailorSlice';

const AssignWorkModal = ({ isOpen, onClose, order, tailors = [] }) => {
    const dispatch = useDispatch();
    const { loading } = useSelector((state) => state.tailor);
    const { register, handleSubmit, formState: { errors }, reset } = useForm();

    const onSubmit = (data) => {
        dispatch(assignOrder({ orderId: order._id, tailorId: data.tailorId }))
            .then((result) => {
                if (assignOrder.fulfilled.match(result)) {
                    reset();
                    onClose();
                }
            });
    };

    if (!order) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-white rounded-lg shadow-xl w-full max-w-md"
                    >
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-semibold text-gray-800">Assign Order</h3>
                                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="mb-4 p-4 bg-gray-50 rounded-md">
                                <p className="font-bold text-gray-700">{order.name}</p>
                                <p className="text-sm text-gray-500">Customization: {order.customization?.name || 'N/A'}</p>
                            </div>

                            <form onSubmit={handleSubmit(onSubmit)}>
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="tailorId" className="block text-sm font-medium text-gray-700">Select Tailor</label>
                                        <select
                                            id="tailorId"
                                            {...register('tailorId', { required: 'Please select a tailor' })}
                                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                            defaultValue=""
                                        >
                                            <option value="" disabled>-- Choose a tailor --</option>
                                            {tailors.map((tailor) => (
                                                <option key={tailor._id} value={tailor._id}>{tailor.name}</option>
                                            ))}
                                        </select>
                                        {errors.tailorId && <p className="mt-1 text-sm text-red-600">{errors.tailorId.message}</p>}
                                    </div>
                                    <div className="flex justify-end space-x-3 pt-2">
                                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">
                                            Cancel
                                        </button>
                                        <button type="submit" disabled={loading} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400">
                                            {loading ? <Loader2 className="animate-spin" /> : 'Confirm Assignment'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AssignWorkModal;

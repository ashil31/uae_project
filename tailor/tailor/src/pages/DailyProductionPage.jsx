import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { Factory, Book, PlusCircle, Loader2 } from 'lucide-react';

// Mock Data - In a real app, this would come from your Redux store
const mockMyAssignedWork = [
    { _id: 'order_assigned_1', productName: "Men's Classic Linen Long-Sleeve Shirt" },
    { _id: 'order_assigned_2', productName: "Men's Emerald Green Linen-Blend Shirt" },
];

const mockProductionLogs = [
    { _id: 'log_1', order: mockMyAssignedWork[0], unitsCompleted: 2, fabricUsed: 5.4, tailor: { name: 'John Stitch' }, date: new Date('2025-08-14T10:00:00Z') },
    { _id: 'log_2', order: mockMyAssignedWork[1], unitsCompleted: 1, fabricUsed: 2.7, tailor: { name: 'Jane Seam' }, date: new Date('2025-08-14T11:30:00Z') },
    { _id: 'log_3', order: { productName: "Men's Terry Cloth Zip-Neck Polo Shirt" }, unitsCompleted: 4, fabricUsed: 6.0, tailor: { name: 'John Stitch' }, date: new Date('2025-08-13T15:00:00Z') },
];


const DailyProductionPage = () => {
    const dispatch = useDispatch();
    // In a real app, you'd use selectors:
    // const { assignedWork, productionLogs, loading } = useSelector((state) => state.tailor);
    // const user = useSelector(selectCurrentUser);
    const { register, handleSubmit, formState: { errors }, reset } = useForm();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleLogProduction = (data) => {
        setIsSubmitting(true);
        console.log("Logging Production:", data);
        // In a real app, you would dispatch a thunk:
        // dispatch(logProduction(data)).then(() => { ... });
        setTimeout(() => {
            toast.success('Production logged successfully! (Demo)');
            setIsSubmitting(false);
            reset();
        }, 1000); // Simulate network delay
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-6 bg-gray-50 min-h-screen"
        >
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800 mb-8">Daily Production</h1>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* --- Section 1: Log Production Form --- */}
                    <div className="lg:col-span-2">
                        <div className="bg-white p-6 rounded-xl shadow-md">
                            <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-4">
                                <PlusCircle className="mr-2 text-indigo-600" /> Log Today's Production
                            </h2>
                            <form onSubmit={handleSubmit(handleLogProduction)} className="space-y-4">
                                <div>
                                    <label htmlFor="orderId" className="block text-sm font-medium text-gray-700">Order Worked On</label>
                                    <select 
                                        id="orderId"
                                        {...register('orderId', { required: 'Please select an order' })}
                                        className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"
                                    >
                                        <option value="">-- Choose an order --</option>
                                        {mockMyAssignedWork.map(order => <option key={order._id} value={order._id}>{order.productName}</option>)}
                                    </select>
                                    {errors.orderId && <p className="text-red-500 text-sm mt-1">{errors.orderId.message}</p>}
                                </div>
                                <div>
                                    <label htmlFor="unitsCompleted" className="block text-sm font-medium text-gray-700">Units Completed</label>
                                    <input 
                                        type="number"
                                        id="unitsCompleted"
                                        {...register('unitsCompleted', { required: 'This field is required', min: 1 })}
                                        min="1"
                                        className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"
                                    />
                                    {errors.unitsCompleted && <p className="text-red-500 text-sm mt-1">{errors.unitsCompleted.message}</p>}
                                </div>
                                <div>
                                    <label htmlFor="fabricUsed" className="block text-sm font-medium text-gray-700">Fabric Used (meters)</label>
                                    <input 
                                        type="number"
                                        id="fabricUsed"
                                        step="0.1"
                                        {...register('fabricUsed', { required: 'This field is required', min: 0.1 })}
                                        min="0.1"
                                        className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"
                                    />
                                    {errors.fabricUsed && <p className="text-red-500 text-sm mt-1">{errors.fabricUsed.message}</p>}
                                </div>
                                <div className="text-right pt-2">
                                    <button type="submit" disabled={isSubmitting} className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 disabled:bg-indigo-400">
                                        {isSubmitting ? <Loader2 className="animate-spin" /> : 'Submit Log'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* --- Section 2: Production Log Table --- */}
                    <div className="lg:col-span-3">
                         <div className="bg-white p-6 rounded-xl shadow-md">
                            <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-4">
                                <Book className="mr-2 text-purple-600" /> Daily Production Log
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tailor</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Units</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {mockProductionLogs.map(log => (
                                            <tr key={log._id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.order.productName}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{log.tailor.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">{log.unitsCompleted}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.date.toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default DailyProductionPage;

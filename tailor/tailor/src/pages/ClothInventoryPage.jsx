
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { Scissors, Ruler, UserCheck, Package, Loader2 } from 'lucide-react';

// Mock Data - In a real app, this would come from Redux/API
const mockClothRolls = [
    { _id: 'roll_001', name: 'Blue Cotton', remainingMeters: 100 },
    { _id: 'roll_002', name: 'Red Silk', remainingMeters: 50 },
    { _id: 'roll_003', name: 'White Linen', remainingMeters: 75 },
];

const mockProducts = [
    { _id: 'prod_1', name: "Men's Heathered Linen-Blend Shirt", fabricPerUnit: 2.5 }, // meters
    { _id: 'prod_2', name: "Men's Classic Linen Long-Sleeve Shirt", fabricPerUnit: 2.7 },
    { _id: 'prod_3', name: "Men's Linen Shirt & Trouser Set", fabricPerUnit: 4.5 },
];

const mockAssignedRolls = [
    { _id: 'assign_1', roll: mockClothRolls[0], tailor: { name: 'John Stitch' }, assignedDate: new Date() },
];

const ClothInventoryPage = () => {
    const dispatch = useDispatch();
    // In a real app, you'd fetch this data from your slice
    // const { tailors, inventory } = useSelector((state) => state.tailor);
    const tailors = [{ _id: 'tailor_1', name: 'John Stitch' }, { _id: 'tailor_2', name: 'Jane Seam' }];
    
    // State for the fabric calculator
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [calculatedFabric, setCalculatedFabric] = useState(0);

    const { register, handleSubmit, formState: { errors }, reset } = useForm();

    // --- Handlers ---
    const handleAssignRoll = (data) => {
        console.log("Assigning Roll:", data);
        toast.success(`Roll assigned to tailor successfully! (Demo)`);
        reset();
    };

    const handleProductSelect = (e) => {
        const productId = e.target.value;
        const product = mockProducts.find(p => p._id === productId);
        setSelectedProduct(product);
        calculateFabric(product, quantity);
    };

    const handleQuantityChange = (e) => {
        const newQuantity = parseInt(e.target.value, 10) || 0;
        setQuantity(newQuantity);
        calculateFabric(selectedProduct, newQuantity);
    };


    const calculateFabric = (product, qty) => {
        if (product && qty > 0) {
            const total = product.fabricPerUnit * qty;
            setCalculatedFabric(total.toFixed(2));
        } else {
            setCalculatedFabric(0);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-6 bg-gray-50 min-h-screen"
        >
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800 mb-8">Roll Assignment & Tracking</h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* --- Section 1: Assign Roll & Calculator --- */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Assign Roll Form */}
                        <div className="bg-white p-6 rounded-xl shadow-md">
                            <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-4">
                                <UserCheck className="mr-2 text-indigo-600" /> Assign Roll to Tailor
                            </h2>
                            <form onSubmit={handleSubmit(handleAssignRoll)} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Select Cloth Roll</label>
                                    <select {...register('rollId', { required: true })} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm">
                                        {mockClothRolls.map(roll => <option key={roll._id} value={roll._id}>{roll.name} ({roll.remainingMeters}m left)</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Assign to Tailor</label>
                                    <select {...register('tailorId', { required: true })} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm">
                                        {tailors.map(tailor => <option key={tailor._id} value={tailor._id}>{tailor.name}</option>)}
                                    </select>
                                </div>
                                <div className="text-right">
                                    <button type="submit" className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700">Assign</button>
                                </div>
                            </form>
                        </div>

                        {/* Fabric Calculator */}
                        <div className="bg-white p-6 rounded-xl shadow-md">
                            <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-4">
                                <Ruler className="mr-2 text-green-600" /> Fabric Requirement Calculator
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Select Product</label>
                                    <select onChange={handleProductSelect} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm">
                                        <option value="">-- Choose a product --</option>
                                        {mockProducts.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Quantity</label>
                                    <input type="number" value={quantity} onChange={handleQuantityChange} min="1" className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" />
                                </div>
                            </div>
                            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md text-center">
                                <p className="text-sm font-medium text-green-800">Total Fabric Required</p>
                                <p className="text-3xl font-bold text-green-600">{calculatedFabric} meters</p>
                            </div>
                        </div>
                    </div>

                    {/* --- Section 2: Track Assigned Rolls --- */}
                    <div className="bg-white p-6 rounded-xl shadow-md">
                        <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-4">
                            <Package className="mr-2 text-purple-600" /> Track Assigned Rolls
                        </h2>
                        <div className="space-y-4">
                            {mockAssignedRolls.map(item => (
                                <div key={item._id} className="p-4 border rounded-md">
                                    <p className="font-bold text-gray-800">{item.roll.name}</p>
                                    <p className="text-sm text-gray-600">Assigned to: <span className="font-medium">{item.tailor.name}</span></p>
                                    <p className="text-sm text-gray-500">Date: {item.assignedDate.toLocaleDateString()}</p>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                                        <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: `${item.roll.remainingMeters}%` }}></div>
                                    </div>
                                    <p className="text-xs text-right mt-1">{item.roll.remainingMeters}m Remaining</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default ClothInventoryPage;

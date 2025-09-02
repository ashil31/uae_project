import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { Scissors, Ruler, UserCheck, Package, Hash } from 'lucide-react';


const productRecipes = {
    bomber_jacket: {
        name: 'Bomber Jacket',
        materials: {
            'Exterior WT': 2.3, // meters
            'Interior WT': 2.3, // meters
            'Cotton (if inside)': 2, // meters
            'Reversible Zipper': 1, // pieces
            'Elastic Band': 1, // meters
            'Fisting': 0.3, // meters
            'Bomber Tag': 1, // pieces
            'Paper Tag Set': 1, // sets
        },
        // Logic for size variations
        sizeModifier: (size, materials) => {
            if (['3XL', '4XL', '5XL'].includes(size)) {
                materials['Exterior WT'] = 2.4;
            }
            return materials;
        }
    },
    traveller_jacket: {
        name: 'Traveller Jacket',
        materials: {
            'Exterior Waterproof': 3.3,
            'Interior Cotton': 2,
            'Neck Fur': 0.5 / 3, // 0.5m makes 3 necks
            'Normal Zipper': 1,
            'Pocket Zipper': 1,
            'Nylon Zipper': 1,
            'Buttons Tuck': 17,
            'Normal Buttons': 2,
            'Fisting': 0.5,
            'Buckle': 2,
            'Eyelids': 2,
            'Rope': 1,
            'Main Tag Traveller': 1,
            'Side Tag Traveller': 1,
            'Wash Tag': 1,
            'Paper Tag Set': 1,
        },
        sizeModifier: (size, materials) => {
            if (['3XL', '4XL', '5XL'].includes(size)) {
                materials['Exterior Waterproof'] = 3.5;
            }
            return materials;
        }
    },
    
};

const mockClothRolls = [
    { _id: 'roll_001', name: 'Waterproof Fabric (WT)', remainingMeters: 100 },
    { _id: 'roll_002', name: 'Cotton Fabric', remainingMeters: 50 },
    { _id: 'roll_003', name: 'Suede Fabric', remainingMeters: 75 },
];

const mockTailors = [{ _id: 'tailor_1', name: 'John Stitch' }, { _id: 'tailor_2', name: 'Jane Seam' }];
const MaterialCalculator = () => {
    const [selectedProductId, setSelectedProductId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [size, setSize] = useState('M');
    const [requiredMaterials, setRequiredMaterials] = useState({});

    useEffect(() => {
        if (selectedProductId && quantity > 0) {
            const product = productRecipes[selectedProductId];
            let materials = { ...product.materials };

            // Apply size modifier if it exists
            if (product.sizeModifier) {
                materials = product.sizeModifier(size, materials);
            }

            // Calculate total quantity
            const calculated = Object.entries(materials).reduce((acc, [key, value]) => {
                acc[key] = (value * quantity).toFixed(2);
                return acc;
            }, {});
            setRequiredMaterials(calculated);
        } else {
            setRequiredMaterials({});
        }
    }, [selectedProductId, quantity, size]);

    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-4">
                <Ruler className="mr-2 text-green-600" /> Material Requirement Calculator
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Select Product</label>
                    <select onChange={(e) => setSelectedProductId(e.target.value)} value={selectedProductId} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm">
                        <option value="">-- Choose a product --</option>
                        {Object.entries(productRecipes).map(([id, { name }]) => (
                            <option key={id} value={id}>{name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Size</label>
                    <select onChange={(e) => setSize(e.target.value)} value={size} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm">
                        <option>M</option><option>L</option><option>XL</option><option>3XL</option><option>5XL</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Quantity</label>
                    <input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10)))} min="1" className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" />
                </div>
            </div>

            {Object.keys(requiredMaterials).length > 0 && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
                    <h3 className="text-lg font-bold text-green-800 mb-2">Calculated Materials:</h3>
                    <ul className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm text-green-900">
                        {Object.entries(requiredMaterials).map(([material, amount]) => (
                            <li key={material}><strong>{material}:</strong> {amount}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

const AssignRollsPage = () => {
    const { register, handleSubmit, reset } = useForm();

    const handleAssignRoll = (data) => {
        console.log("Assigning Roll:", data);
        toast.success(`Roll assigned successfully! (Demo)`);
        reset();
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-6 bg-gray-50 min-h-screen"
        >
            <div className="max-w-7xl mx-auto space-y-8">
                <h1 className="text-3xl font-bold text-gray-800">Roll Assignment & Material Planning</h1>
                
                {/* --- Section 1: Material Calculator --- */}
                <MaterialCalculator />

                {/* --- Section 2: Assign Roll Form --- */}
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-4">
                        <UserCheck className="mr-2 text-indigo-600" /> Assign Roll to Tailor
                    </h2>
                    <form onSubmit={handleSubmit(handleAssignRoll)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Select Cloth Roll</label>
                                <select {...register('rollId', { required: true })} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm">
                                    {mockClothRolls.map(roll => <option key={roll._id} value={roll._id}>{roll.name} ({roll.remainingMeters}m left)</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Assign to Tailor</label>
                                <select {...register('tailorId', { required: true })} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm">
                                    {mockTailors.map(tailor => <option key={tailor._id} value={tailor._id}>{tailor.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="text-right pt-2">
                            <button type="submit" className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700">Assign Roll</button>
                        </div>
                    </form>
                </div>
            </div>
        </motion.div>
    );
};

export default AssignRollsPage;

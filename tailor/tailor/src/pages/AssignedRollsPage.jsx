import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { Ruler, UserCheck, CheckCircle2 } from 'lucide-react';
import apiClient from '../api/apiClient';

const productRecipes = {
  bomber_jacket: {
    name: 'Bomber Jacket',
    materials: {
      'Exterior WT': 2.3,
      'Interior WT': 2.3,
      'Cotton (if inside)': 2,
      'Reversible Zipper': 1,
      'Elastic Band': 1,
      'Fisting': 0.3,
      'Bomber Tag': 1,
      'Paper Tag Set': 1,
    },
    sizeModifier: (size, materials) => {
      if (['3XL', '4XL', '5XL'].includes(size)) {
        materials['Exterior WT'] = 2.4;
      }
      return materials;
    },
  },
  traveller_jacket: {
    name: 'Traveller Jacket',
    materials: {
      'Exterior Waterproof': 3.3,
      'Interior Cotton': 2,
      'Neck Fur': 0.5 / 3,
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
    },
  },
};

const MaterialCalculator = () => {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState('M');
  const [requiredMaterials, setRequiredMaterials] = useState({});

  useEffect(() => {
    if (selectedProductId && quantity > 0) {
      const product = productRecipes[selectedProductId];
      let materials = { ...product.materials };

      if (product.sizeModifier) {
        materials = product.sizeModifier(size, materials);
      }

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
          <select
            onChange={(e) => setSelectedProductId(e.target.value)}
            value={selectedProductId}
            className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"
          >
            <option value="">-- Choose a product --</option>
            {Object.entries(productRecipes).map(([id, { name }]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Size</label>
          <select
            onChange={(e) => setSize(e.target.value)}
            value={size}
            className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"
          >
            <option>M</option>
            <option>L</option>
            <option>XL</option>
            <option>3XL</option>
            <option>5XL</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Quantity</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10)))}
            min="1"
            className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"
          />
        </div>
      </div>

      {Object.keys(requiredMaterials).length > 0 && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <h3 className="text-lg font-bold text-green-800 mb-2">Calculated Materials:</h3>
          <ul className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm text-green-900">
            {Object.entries(requiredMaterials).map(([material, amount]) => (
              <li key={material}>
                <strong>{material}:</strong> {amount}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const AssignRollsPage = () => {
  const { register, handleSubmit, reset } = useForm();
  const [clothRolls, setClothRolls] = useState([]);
  const [tailors, setTailors] = useState([]);
  const [successData, setSuccessData] = useState(null); // ✅ For modal popup

  // ✅ Fetch cloth rolls
  useEffect(() => {
    const fetchClothRolls = async () => {
      try {
        const response = await apiClient.get('/tailors/cloth-rolls');
        setClothRolls(response.data);
      } catch (error) {
        toast.error('Failed to fetch cloth rolls');
      }
    };
    fetchClothRolls();
  }, []);

  // ✅ Fetch tailors
  useEffect(() => {
    const fetchTailors = async () => {
      try {
        const response = await apiClient.get('/tailors');
        setTailors(response.data);
      } catch (error) {
        toast.error('Failed to fetch tailors');
      }
    };
    fetchTailors();
  }, []);

  // ✅ Assign roll
  const handleAssignRoll = async (data) => {
    try {
      const response = await apiClient.post('/tailors/assign-cloth-roll', {
        rollId: data.rollId,
        tailorId: data.tailorId,
      });

      // 🎉 Success modal data
      const assignedRoll = clothRolls.find((roll) => roll._id === data.rollId);
      const assignedTailor = tailors.find((t) => t._id === data.tailorId);

      setSuccessData({
        message: response.data.message,
        roll: assignedRoll,
        tailor: assignedTailor,
      });

      // Remove from dropdown instantly
      setClothRolls((prev) => prev.filter((roll) => roll._id !== data.rollId));

      reset();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign roll');
    }
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
                <select
                  {...register('rollId', { required: true })}
                  className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"
                >
                  {clothRolls.length > 0 ? (
                    clothRolls
                      .filter((roll) => roll.status === 'Available')
                      .map((roll) => (
                        <option key={roll._id} value={roll._id}>
                          {roll.fabricType && roll.fabricType.trim() !== ''
                            ? roll.fabricType
                            : roll.itemType}{' '}
                          - {roll.amount} {roll.unitType}
                        </option>
                      ))
                  ) : (
                    <option disabled>No rolls available</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Assign to Tailor</label>
                <select
                  {...register('tailorId', { required: true })}
                  className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"
                >
                  {tailors.length > 0 ? (
                    tailors.map((tailor) => (
                      <option key={tailor._id} value={tailor._id}>
                        {tailor.name}
                      </option>
                    ))
                  ) : (
                    <option disabled>Loading tailors...</option>
                  )}
                </select>
              </div>
            </div>
            <div className="text-right pt-2">
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700"
              >
                Assign Roll
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ✅ Success Modal */}
      {successData && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full text-center"
          >
            <CheckCircle2 className="mx-auto text-green-600 w-12 h-12 mb-3" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">{successData.message}</h3>
            <p className="text-gray-600 mb-1">
              <strong>Roll:</strong>{' '}
              {successData.roll?.fabricType && successData.roll.fabricType.trim() !== ''
                ? successData.roll.fabricType
                : successData.roll?.itemType}{' '}
              - {successData.roll?.amount} {successData.roll?.unitType}
            </p>
            <p className="text-gray-600 mb-4">
              <strong>Tailor:</strong> {successData.tailor?.name}
            </p>
            <button
              onClick={() => setSuccessData(null)}
              className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Close
            </button>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default AssignRollsPage;

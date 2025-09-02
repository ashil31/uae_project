import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown } from "lucide-react";
import {
  addClothRoll,
  updateClothRoll,
} from "../../../store/slices/clothRollSlice";
import toast from "react-hot-toast";

const ClothRollFormModal = ({ isOpen, onClose, roll }) => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    rollNo: "",
    amount: "",
    fabricType: "",
    unitType: "meters", // default
    itemType: "",
  });
  const [loading, setLoading] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false); // track select open state

  useEffect(() => {
    if (roll) {
      setFormData({
        rollNo: roll.rollNo || "",
        amount: roll.amount || "",
        fabricType: roll.fabricType || "",
        unitType: roll.unitType || "meters",
        itemType: roll.itemType || "",
      });
    } else {
      setFormData({
        rollNo: "",
        amount: "",
        fabricType: "",
        unitType: "meters",
        itemType: "",
      });
    }
  }, [roll]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        ...formData,
        length: Number(formData.length),
      };

      if (roll) {
        await dispatch(updateClothRoll({ id: roll._id, data })).unwrap();
        toast.success("Cloth roll updated successfully");
      } else {
        await dispatch(addClothRoll(data)).unwrap();
        toast.success("Cloth roll added successfully");
      }
      onClose();
    } catch (error) {
      toast.error(error.message || "Failed to save cloth roll");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {roll ? "Edit Cloth Roll" : "Add New Cloth Roll"}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Roll Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Roll Number
                </label>
                <input
                  type="text"
                  required
                  value={formData.rollNo}
                  onChange={(e) =>
                    setFormData({ ...formData, rollNo: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., ROLL1001"
                />
              </div>

              {/* Fabric */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fabric
                </label>
                <input
                  type="text"
                  value={formData.fabricType}
                  onChange={(e) =>
                    setFormData({ ...formData, fabricType: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., Cotton"
                />
              </div>

              {/* Amount + Unit Type (side by side) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., 50"
                  />
                </div>

                {/* Custom Unit Type Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Type
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setUnitOpen(!unitOpen)}
                      className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent hover:border-purple-400 cursor-pointer transition"
                    >
                      <span className="text-gray-700">{formData.unitType}</span>
                      <motion.div
                        animate={{ rotate: unitOpen ? 180 : 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="text-gray-500"
                      >
                        <ChevronDown className="w-5 h-5" />
                      </motion.div>
                    </button>

                    {/* Dropdown menu */}
                    <AnimatePresence>
                      {unitOpen && (
                        <motion.ul
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                          className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg"
                        >
                          {["meters", "kilos"].map((option) => (
                            <li
                              key={option}
                              onClick={() => {
                                setFormData({ ...formData, unitType: option });
                                setUnitOpen(false);
                              }}
                              className={`px-4 py-2 cursor-pointer transition-colors duration-150 ${
                                formData.unitType === option
                                  ? "font-medium text-purple-700"
                                  : "text-gray-700"
                              } hover:bg-purple-50 hover:text-purple-600`}
                            >
                              {option.charAt(0).toUpperCase() + option.slice(1)}
                            </li>
                          ))}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Item Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Type
                </label>
                <input
                  type="text"
                  value={formData.itemType}
                  onChange={(e) =>
                    setFormData({ ...formData, itemType: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., Shirt"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "Saving..." : roll ? "Update" : "Add"} Roll
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ClothRollFormModal;

// components/admin/TailorFormModal.jsx
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { useDispatch } from "react-redux";
import { addTailor } from "../../../store/slices/tailorSlice"; // adjust path
import toast from "react-hot-toast";

const skillOptions = ["Beginner", "Intermediate", "Advanced", "Expert"];
const roleOptions = ["MasterTailor", "Tailor"];

const TailorFormModal = ({ isOpen, onClose, tailor }) => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    skillLevel: "Beginner",
    role: "", // new field
  });
  const [loading, setLoading] = useState(false);

  // local UI dropdown states
  const [isOpenSkill, setIsOpenSkill] = useState(false);
  const [isOpenRole, setIsOpenRole] = useState(false);

  const [selectedSkill, setSelectedSkill] = useState({
    value: formData.skillLevel,
    label: formData.skillLevel,
  });
  const [selectedRole, setSelectedRole] = useState({
    value: formData.role,
    label: formData.role || "Select role",
  });

  const rootRef = useRef(null);

  useEffect(() => {
    if (tailor) {
      setFormData({
        name: tailor.name || "",
        email: tailor.email || "",
        phone: tailor.phone || "",
        skillLevel: tailor.skillLevel || "Beginner",
        role: tailor.role || "",
      });
      setSelectedSkill({
        value: tailor.skillLevel || "Beginner",
        label: tailor.skillLevel || "Beginner",
      });
      setSelectedRole({
        value: tailor.role || "",
        label: tailor.role || "Select role",
      });
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        skillLevel: "Beginner",
        role: "",
      });
      setSelectedSkill({ value: "Beginner", label: "Beginner" });
      setSelectedRole({ value: "", label: "Select role" });
    }
  }, [tailor]);

  // close on outside click
  useEffect(() => {
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setIsOpenSkill(false);
        setIsOpenRole(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Escape to close dropdowns
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        setIsOpenSkill(false);
        setIsOpenRole(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // ensure formData keeps sync with selected UI values
  useEffect(() => {
    setFormData((prev) => ({ ...prev, skillLevel: selectedSkill.value }));
  }, [selectedSkill]);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, role: selectedRole.value }));
  }, [selectedRole]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // basic client validation
    if (
      !formData.name ||
      !formData.email ||
      !formData.phone ||
      !formData.skillLevel
    ) {
      toast.error("All fields are required");
      setLoading(false);
      return;
    }

    try {
      if (tailor) {
        // adapt to update action if exists
        await dispatch(addTailor({ id: tailor._id, data: formData })).unwrap();
        toast.success("Tailor updated successfully");
      } else {
        await dispatch(addTailor(formData)).unwrap();
        toast.success("Tailor added and credentials emailed");
      }
      onClose();
    } catch (error) {
      toast.error(error?.message || "Failed to save tailor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={onClose}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {tailor ? "Edit Tailor" : "Add New Tailor"}
                </h3>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="p-6 space-y-4"
                ref={rootRef}
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    placeholder="e.g. John Doe"
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    placeholder="example@gmail.com"
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-transparent"
                  />
                </div>

                {/* Skill Level custom dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Skill Level
                  </label>

                  <div className="relative">
                    <button
                      type="button"
                      aria-haspopup="listbox"
                      aria-expanded={isOpenSkill}
                      onClick={() => {
                        setIsOpenSkill((s) => !s);
                        setIsOpenRole(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border rounded-lg shadow-sm transition focus:outline-none ${
                        isOpenSkill
                          ? "border-purple-500"
                          : "border-gray-300 focus:ring-2 focus:ring-purple-500"
                      }`}
                    >
                      <span
                        className={`truncate ${
                          selectedSkill.value
                            ? "text-gray-900"
                            : "text-purple-500"
                        }`}
                      >
                        {selectedSkill.label}
                      </span>
                      <span>
                        {isOpenSkill ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </span>
                    </button>

                    <div
                      role="listbox"
                      tabIndex={-1}
                      className={`absolute left-0 right-0 mt-2 z-40 max-h-48 overflow-auto rounded-lg border bg-white dark:bg-gray-800 shadow-lg py-1 transition-all transform origin-top ${
                        isOpenSkill
                          ? "opacity-100 translate-y-0 scale-100"
                          : "opacity-0 pointer-events-none -translate-y-1 scale-95"
                      }`}
                    >
                      {skillOptions.map((opt) => {
                        const isSelected = selectedSkill.value === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              setSelectedSkill({ value: opt, label: opt });
                              setIsOpenSkill(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between ${
                              isSelected
                                ? "bg-indigo-50 font-medium text-purple-700"
                                : "text-gray-700 dark:text-gray-200"
                            } hover:bg-indigo-50 dark:hover:bg-gray-700`}
                          >
                            <span>{opt}</span>
                            {isSelected && (
                              <span className="text-purple-600 text-sm">
                                Selected
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Role custom dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>

                  <div className="relative">
                    <button
                      type="button"
                      aria-haspopup="listbox"
                      aria-expanded={isOpenRole}
                      onClick={() => {
                        setIsOpenRole((s) => !s);
                        setIsOpenSkill(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border rounded-lg shadow-sm transition focus:outline-none ${
                        isOpenRole
                          ? "border-purple-500"
                          : "border-gray-300 focus:ring-2 focus:ring-purple-500"
                      }`}
                    >
                      <span
                        className={`truncate ${
                          selectedRole.value ? "text-gray-900" : "text-gray-500"
                        }`}
                      >
                        {selectedRole.label}
                      </span>
                      <span>
                        {isOpenRole ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </span>
                    </button>

                    <div
                      role="listbox"
                      tabIndex={-1}
                      className={`absolute left-0 right-0 mt-2 z-40 max-h-40 overflow-auto rounded-lg border bg-white dark:bg-gray-800 shadow-lg py-1 transition-all transform origin-top ${
                        isOpenRole
                          ? "opacity-100 translate-y-0 scale-100"
                          : "opacity-0 pointer-events-none -translate-y-1 scale-95"
                      }`}
                    >
                      {/* placeholder option (clear) */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRole({ value: "", label: "Select role" });
                          setIsOpenRole(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                          selectedRole.value === ""
                            ? "bg-purple-50 font-medium text-purple-700"
                            : "text-purple-700 dark:text-gray-200"
                        } hover:bg-purple-50 dark:hover:bg-gray-700`}
                      >
                        Select role
                      </button>

                      {roleOptions.map((opt) => {
                        const isSelected = selectedRole.value === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              setSelectedRole({ value: opt, label: opt });
                              setIsOpenRole(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between ${
                              isSelected
                                ? "bg-indigo-50 font-medium text-purple-700"
                                : "text-gray-700 dark:text-purple-200"
                            } hover:bg-indigo-50 dark:hover:bg-gray-700`}
                          >
                            <span>{opt}</span>
                            {isSelected && (
                              <span className="text-purple-600 text-sm">
                                Selected
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

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
                    {loading
                      ? "Saving..."
                      : tailor
                      ? "Update Tailor"
                      : "Add Tailor"}
                  </button>
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  A random secure password will be generated and{" "}
                  <strong>emailed</strong> to the tailor's address. Ask them to
                  change it after first login.
                </p>
              </form>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default TailorFormModal;

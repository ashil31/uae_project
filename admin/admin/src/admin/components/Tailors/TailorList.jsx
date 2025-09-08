import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { Plus, Edit2, Trash2, Search, Filter } from "lucide-react";
import { getTailors, deleteTailor } from "../../../store/slices/tailorSlice";
import TailorFormModal from "./TailorFormModal";
import toast from "react-hot-toast";
import DeleteConfirmModal from "../DeleteConfirmModal";

const TailorList = () => {
  const dispatch = useDispatch();
  const { tailors, loading } = useSelector((state) => state.tailors);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingTailor, setEditingTailor] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedTailorId, setSelectedTailorId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    dispatch(getTailors());
  }, [dispatch]);

  const confirmDelete = (id) => {
    setSelectedTailorId(id);
    setConfirmModalOpen(true);
  };
  const skillBgColors = {
    beginner: "bg-green-100 text-green-800",
    intermediate: "bg-blue-100 text-blue-800",
    advanced: "bg-orange-100 text-orange-800",
    expert: "bg-purple-100 text-purple-800",
  };
  const handleDelete = async () => {
    if (!selectedTailorId) return;
    setIsDeleting(true);
    try {
      await dispatch(deleteTailor(selectedTailorId)).unwrap();
      toast.success("Tailor deleted successfully");
    } catch (error) {
      toast.error("Failed to delete tailor");
    } finally {
      setIsDeleting(false);
      setConfirmModalOpen(false);
      setSelectedTailorId(null);
    }
  };

  const filteredTailors = Array.isArray(tailors)
    ? tailors.filter(
        (tailor) =>
          tailor &&
          typeof tailor.username === "string" &&
          tailor.username.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">All Tailors</h2>
          <p className="text-sm text-gray-600">Manage your tailor workforce</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Tailor</span>
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search tailors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Skill Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTailors.map((tailor) => (
                <motion.tr
                  key={tailor._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">
                      {tailor.username.charAt(0).toUpperCase() +
                        tailor.username.slice(1).toLowerCase()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {tailor.role}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        skillBgColors[
                          (tailor.skillLevel || "")
                            .toString()
                            .trim()
                            .toLowerCase()
                        ] || "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {(tailor.skillLevel || "")
                        .toString()
                        .charAt(0)
                        .toUpperCase() +
                        (tailor.skillLevel || "").toString().slice(1)}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setEditingTailor(tailor);
                          setShowModal(true);
                        }}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => confirmDelete(tailor._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <TailorFormModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingTailor(null);
        }}
        tailor={editingTailor}
      />

      <DeleteConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => {
          setConfirmModalOpen(false);
          setSelectedTailorId(null);
        }}
        title="Delete Tailor"
        message="Are you sure you want to permanently delete this tailor? This action cannot be undone."
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default TailorList;

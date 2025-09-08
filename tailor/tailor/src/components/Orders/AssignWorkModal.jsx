// top imports (keep existing)
import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, ChevronDown, ChevronUp } from "lucide-react"; // keep icons you want
import { assignOrder } from "../../features/tailor/tailorSlice";

const AssignWorkModal = ({ isOpen, onClose, order, tailors = [] }) => {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.tailor);

  // destructure setValue from useForm so we can update RHF programmatically
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
  } = useForm();

  const onSubmit = (data) => {
    // data.tailorId will now be correct
    dispatch(assignOrder({ orderId: order._id, tailorId: data.tailorId })).then(
      (result) => {
        if (assignOrder.fulfilled.match(result)) {
          reset();
          // also clear our local selection
          setSelectedTailor({ id: "", label: "-- Choose a tailor --" });
          onClose();
        }
      }
    );
  };

  const rootRef = useRef(null);
  const [isOpenSelect, setIsOpenSelect] = useState(false);
  const [selectedTailor, setSelectedTailor] = useState({
    id: "",
    label: "-- Choose a tailor --",
  });

  // outside click -> close
  useEffect(() => {
    function handleDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setIsOpenSelect(false);
      }
    }
    document.addEventListener("mousedown", handleDocClick);
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, []);

  // Escape key -> close
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setIsOpenSelect(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // IMPORTANT: sync selectedTailor into RHF using setValue
  useEffect(() => {
    // keep RHF form state in sync
    setValue("tailorId", selectedTailor.id, { shouldValidate: true, shouldDirty: true });
  }, [selectedTailor, setValue]);

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
                <p className="text-sm text-gray-500">Customization: {order.customization?.name || "N/A"}</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="space-y-4">
                  <div ref={rootRef} className="relative w-full">
                    <label htmlFor="tailorId" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Select Tailor
                    </label>

                    <div className="mt-1">
                      {/* Trigger button (styled like your CustomSelect) */}
                      <button
                        type="button"
                        aria-haspopup="listbox"
                        aria-expanded={isOpenSelect}
                        onClick={() => setIsOpenSelect((s) => !s)}
                        className={`w-full flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border rounded-lg shadow-sm transition focus:outline-none${
                          isOpenSelect ? " border-indigo-500 ring-2 ring-indigo-200" : " border-gray-300 focus:ring-2 focus:ring-indigo-500"
                        }`}
                      >
                        <span className={`truncate text-left ${selectedTailor.id ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"}`}>
                          {selectedTailor.label}
                        </span>

                        <span className="flex items-center ml-3">
                          {isOpenSelect ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                        </span>
                      </button>

                      {/* Options panel */}
                      <div
                        role="listbox"
                        tabIndex={-1}
                        className={`absolute left-0 right-0 mt-2 z-50 max-h-56 overflow-auto rounded-lg border bg-white dark:bg-gray-800 shadow-lg py-1 transition-all transform origin-top${
                          isOpenSelect ? " opacity-100 translate-y-0 scale-100" : " opacity-0 pointer-events-none -translate-y-1 scale-95"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTailor({ id: "", label: "-- Choose a tailor --" });
                            setIsOpenSelect(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors ${selectedTailor.id === "" ? "bg-indigo-50 dark:bg-gray-700 font-medium" : "text-gray-700 dark:text-gray-200"} hover:bg-indigo-50 dark:hover:bg-gray-700`}
                        >
                          -- Choose a tailor --
                        </button>

                        {tailors && tailors.length > 0 ? (
                          tailors.map((tailor) => {
                            const isSelected = selectedTailor.id === tailor._id;
                            return (
                              <button
                                key={tailor._id}
                                type="button"
                                onClick={() => {
                                  setSelectedTailor({ id: tailor._id, label: tailor.username });
                                  setIsOpenSelect(false);
                                }}
                                className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 transition-colors${isSelected ? " bg-indigo-50 dark:bg-gray-700 font-medium" : " text-gray-700 dark:text-gray-200"} hover:bg-indigo-50 dark:hover:bg-gray-700`}
                              >
                                <div className="flex-none w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-700 dark:text-gray-200">
                                  {tailor.username?.charAt(0)?.toUpperCase() ?? "T"}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="truncate">{tailor.username}</div>
                                  {tailor.designation && <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{tailor.designation}</div>}
                                </div>

                                {isSelected && <div className="flex-none text-indigo-600 dark:text-indigo-300 text-sm font-semibold">Selected</div>}
                              </button>
                            );
                          })
                        ) : (
                          <div className="px-4 py-2 text-sm text-gray-500">No tailors</div>
                        )}
                      </div>
                    </div>

                    {/* Hidden input registered with react-hook-form.
                        We keep the value prop for UI readback, but setValue handles RHF state syncing. */}
                    <input id="tailorId-hidden" type="hidden" {...register("tailorId", { required: "Please select a tailor" })} value={selectedTailor.id} readOnly />

                    {/* Error message */}
                    {errors?.tailorId && <p className="mt-1 text-sm text-red-600">{errors.tailorId.message}</p>}
                  </div>

                  <div className="flex justify-end space-x-3 pt-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">
                      Cancel
                    </button>
                    <button type="submit" disabled={loading} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400">
                      {loading ? <Loader2 className="animate-spin" /> : "Confirm Assignment"}
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

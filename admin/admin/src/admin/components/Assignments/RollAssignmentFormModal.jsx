import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Package, Plus, Minus } from "lucide-react";
import { assignClothRoll } from "../../../store/slices/assignmentSlice";
import { getTailors } from "../../../store/slices/tailorSlice";
import { getClothRolls } from "../../../store/slices/clothRollSlice";
import toast from "react-hot-toast";

const emptyConsumption = (overrides = {}) => ({
  clothAmountId: "",
  fabricType: "",
  itemType: "",
  unitType: "meters",
  amount: "",
  ...overrides,
});

const RollAssignmentFormModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { tailors } = useSelector((state) => state.tailors || {});
  const { clothRolls } = useSelector((state) => state.clothRolls || {});
  const [formData, setFormData] = useState({
    tailorId: "",
    assignedDate: new Date().toISOString().split("T")[0],
    consumptions: [emptyConsumption()],
  });

  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (isOpen) {
      dispatch(getTailors());
      dispatch(getClothRolls());
      setLocalError("");
      setFormData({
        tailorId: "",
        assignedDate: new Date().toISOString().split("T")[0],
        consumptions: [emptyConsumption()],
      });
    }
  }, [isOpen, dispatch]);

  const clothAmounts = Array.isArray(clothRolls) ? clothRolls : [];

  const getAmountAvailable = (ca) => {
    if (!ca) return 0;
    if (typeof ca.amount === "number") return ca.amount;
    if (typeof ca.totalAmount === "number") return ca.totalAmount;
    if (typeof ca.available === "number") return ca.available;
    return 0;
  };

  const amountAvailableMap = useMemo(() => {
    const map = {};
    clothAmounts.forEach((c) => { map[String(c._id)] = getAmountAvailable(c); });
    return map;
  }, [clothAmounts]);

  const requestedPerClothAmount = useMemo(() => {
    const map = {};
    formData.consumptions.forEach((c) => {
      const id = String(c.clothAmountId || "");
      const amt = Number(c.amount || 0);
      if (!id) return;
      map[id] = (map[id] || 0) + (isNaN(amt) ? 0 : amt);
    });
    return map;
  }, [formData.consumptions]);

  useEffect(() => {
    setLocalError("");
    if (!formData.tailorId) return;

    for (let i = 0; i < formData.consumptions.length; i++) {
      const c = formData.consumptions[i];
      if (!c.clothAmountId) {
        setLocalError(`Row ${i + 1}: please select a cloth item.`);
        return;
      }

      const hasFabric = String(c.fabricType || "").trim().length > 0;
      const hasItem = String(c.itemType || "").trim().length > 0;
      if (!hasFabric && !hasItem) {
        setLocalError(`Row ${i + 1}: please provide fabric or item (at least one).`);
        return;
      }

      const num = Number(c.amount);
      if (!c.amount || isNaN(num) || num <= 0) {
        setLocalError(`Row ${i + 1}: enter a valid amount (> 0).`);
        return;
      }

      const available = amountAvailableMap[String(c.clothAmountId)] || 0;
      if (num > available) {
        setLocalError(`Row ${i + 1}: requested amount (${num}) exceeds available (${available}).`);
        return;
      }
    }

    for (const [id, totalReq] of Object.entries(requestedPerClothAmount)) {
      const available = amountAvailableMap[id] || 0;
      if (totalReq > available) {
        setLocalError(`Total requested for selected cloth (${id}) is ${totalReq} which exceeds its available ${available}.`);
        return;
      }
    }
  }, [formData.tailorId, formData.consumptions, amountAvailableMap, requestedPerClothAmount]);

  const handleAddRow = () => setFormData((s) => ({ ...s, consumptions: [...s.consumptions, emptyConsumption()] }));
  const handleRemoveRow = (idx) => setFormData((s) => ({ ...s, consumptions: s.consumptions.filter((_, i) => i !== idx) }));
  const handleRowChange = (idx, key, value) => setFormData((s) => {
    const consumptions = s.consumptions.map((r, i) => i === idx ? { ...r, [key]: value } : r);
    return { ...s, consumptions };
  });

  const onRowClothAmountSelect = (idx, clothAmountId) => {
    const found = clothAmounts.find((c) => String(c._id) === String(clothAmountId)) || {};
    const fabric = found.fabricType ?? found.fabric ?? found.fabric_type ?? "";
    const item = found.itemType ?? found.item ?? found.item_type ?? "";
    const unit = found.unit ?? found.unitType ?? "meters";

    setFormData((prev) => {
      const consumptions = prev.consumptions.slice();
      consumptions[idx] = {
        ...consumptions[idx],
        clothAmountId,
        fabricType: consumptions[idx].fabricType ? consumptions[idx].fabricType : fabric,
        itemType: consumptions[idx].itemType ? consumptions[idx].itemType : item,
        unitType: consumptions[idx].unitType ? consumptions[idx].unitType : unit,
      };
      return { ...prev, consumptions };
    });
  };

  const pretty = (v) => v || v === 0 ? String(v).charAt(0).toUpperCase() + String(v).slice(1) : "";

  const clothTitle = (c) => {
    if (!c) return 'Unknown';
    const fabric = c.fabricType ?? c.fabric ?? c.fabric_type ?? "";
    const item = c.itemType ?? c.item ?? c.item_type ?? "";
    const available = getAmountAvailable(c);
    const unit = c.unit ?? c.unitType ?? "";
    const titlePart = [pretty(fabric), pretty(item)].filter(Boolean).join(" / ") || (c._id ?? "Unknown");
    return `${titlePart} — ${available} ${unit || ""}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (localError) {
      toast.error(localError);
      return;
    }
    setLoading(true);

    const payload = {
      tailorId: formData.tailorId,
      assignedDate: formData.assignedDate,
      clothConsumptions: formData.consumptions.map((c) => {
        const row = {
          clothAmountId: c.clothAmountId,
          unitType: c.unitType,
          amount: Number(c.amount),
        };
        if (String(c.fabricType || "").trim()) row.fabricType = c.fabricType.trim();
        if (String(c.itemType || "").trim()) row.itemType = c.itemType.trim();
        return row;
      }),
    };

    try {
      await dispatch(assignClothRoll(payload)).unwrap();
      toast.success("Assignments created successfully");
      onClose();
      setFormData({
        tailorId: "",
        assignedDate: new Date().toISOString().split("T")[0],
        consumptions: [emptyConsumption()],
      });
    } catch (err) {
      toast.error(err?.message || err?.payload?.message || "Failed to create assignments");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
          <div className="flex min-h-screen items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-gray-200 rounded-t-lg z-10">
                <h3 className="text-lg font-semibold text-gray-900">Assign Cloth (Aggregate)</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2"><User className="inline w-4 h-4 mr-1" /> Select Tailor</label>
                  <select required value={formData.tailorId} onChange={(e) => setFormData({ ...formData, tailorId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                    <option value="">Choose a tailor...</option>
                    {(tailors || []).map(t => <option key={t._id} value={t._id}>{t.username ? (t.username.charAt(0).toUpperCase() + t.username.slice(1).toLowerCase()) : t.name} {t.skillLevel ? `(${t.skillLevel})` : ''}</option>)}
                  </select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">Consumptions (select aggregate item)</h4>
                    <button type="button" onClick={handleAddRow} className="flex items-center gap-1 text-sm text-purple-600"><Plus className="w-4 h-4" /> Add row</button>
                  </div>

                  {formData.consumptions.map((row, idx) => (
                    <div key={idx} className="border p-3 rounded-md bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">Row {idx + 1}</div>
                        {formData.consumptions.length > 1 && (
                          <button type="button" onClick={() => handleRemoveRow(idx)} className="text-red-500 flex items-center gap-1"><Minus className="w-4 h-4" /> Remove</button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        <select required value={row.clothAmountId} onChange={(e) => onRowClothAmountSelect(idx, e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                          <option value="">Select cloth (aggregate item) for this row...</option>
                          {clothAmounts.map(ca => {
                            const avail = getAmountAvailable(ca);
                            if (avail <= 0) return null;
                            return <option key={ca._id} value={ca._id}>{clothTitle(ca)}</option>;
                          })}
                        </select>

                        <input type="text" value={row.fabricType} onChange={(e) => handleRowChange(idx, "fabricType", e.target.value)} placeholder="Fabric Type (optional if Item provided)" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                        <input type="text" value={row.itemType} onChange={(e) => handleRowChange(idx, "itemType", e.target.value)} placeholder="Item Type (optional if Fabric provided)" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />

                        <div className="flex gap-2 items-center">
                          <select value={row.unitType} onChange={(e) => handleRowChange(idx, "unitType", e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg">
                            <option value="meters">Meters</option>
                            <option value="kilos">Kilos</option>
                            <option value="unit">Units</option>
                          </select>

                          <input type="number" min="0" step="0.01" required value={row.amount} onChange={(e) => handleRowChange(idx, "amount", e.target.value)} placeholder="Amount" className="w-36 px-3 py-2 border border-gray-300 rounded-lg" />
                        </div>

                        {row.clothAmountId && (
                          <div className="text-xs text-gray-600 mt-1">
                            Available: <strong>{amountAvailableMap[row.clothAmountId] ?? 0} {clothAmounts.find(c=>String(c._id)===String(row.clothAmountId))?.unit ?? ''}</strong> — Requested for this item: <strong>{requestedPerClothAmount[String(row.clothAmountId)] ?? 0}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Date</label>
                  <input type="date" required value={formData.assignedDate} onChange={(e) => setFormData({ ...formData, assignedDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Items Summary</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    {Object.keys(requestedPerClothAmount).length === 0 && <p>No items selected yet.</p>}
                    {Object.entries(requestedPerClothAmount).map(([id, req]) => {
                      const c = clothAmounts.find(x => String(x._id) === String(id));
                      const avail = amountAvailableMap[id] ?? 0;
                      const rem = Math.max(0, avail - req);
                      const fabric = c?.fabricType ?? c?.fabric ?? c?.fabric_type ?? '';
                      const item = c?.itemType ?? c?.item ?? c?.item_type ?? '';
                      const titleParts = [fabric, item].map(s => s ? pretty(s) : null).filter(Boolean);
                      const title = titleParts.length > 0 ? titleParts.join(' / ') : (c?.name ?? 'Unknown');
                      const unit = c?.unit ?? c?.unitType ?? '';
                      return <p key={id}><strong>{title}:</strong> Available {avail} {unit} — Requested {req} — Remaining {rem} {unit}</p>;
                    })}
                  </div>
                </div>

                {localError && <p className="text-sm text-red-600">{localError}</p>}

                <div className="sticky bottom-0 bg-white flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200" disabled={loading}>Cancel</button>
                  <button type="submit" disabled={loading || !!localError || !formData.tailorId} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">{loading ? 'Assigning...' : 'Assign Items'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default RollAssignmentFormModal;

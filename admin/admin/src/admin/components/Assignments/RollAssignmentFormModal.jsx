// src/components/assignments/RollAssignmentFormModal.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Plus, Minus } from "lucide-react";
import { assignClothRoll } from "../../../store/slices/assignmentSlice";
import { getTailors } from "../../../store/slices/tailorSlice";
import { getClothRolls } from "../../../store/slices/clothRollSlice";
import toast from "react-hot-toast";

const emptyConsumption = (overrides = {}) => ({
  clothKey: "", // clothAmountId or composite key
  fabricType: "",
  itemType: "",
  unitType: "meters",
  amount: "",
  ...overrides,
});

const RollAssignmentFormModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const tailors = useSelector((state) => state.tailors?.tailors ?? []);
  const overallFromStore = useSelector((state) => state.clothRolls?.overall ?? null);

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
      setFormData({ tailorId: "", assignedDate: new Date().toISOString().split("T")[0], consumptions: [emptyConsumption()] });
    }
  }, [isOpen, dispatch]);

  // Build serverAggregates from overall.breakdownByFabricItem
  const serverAggregates = useMemo(() => {
    const arr = overallFromStore?.breakdownByFabricItem;
    if (!Array.isArray(arr)) return [];
    return arr.map((it) => {
      // it has: key (fabric||item||unit), clothAmountId, fabric, item, unit, totalAssigned, totalClothAmount, available
      const fabric = (it.fabric ?? "").trim();
      const item = (it.item ?? "").trim();
      const key = it.clothAmountId ? String(it.clothAmountId) : String(it.key ?? "");
      const totalAssigned = Number(it.totalAssigned ?? 0);
      const totalClothAmount = typeof it.totalClothAmount === "number" ? it.totalClothAmount : null;
      const available = typeof it.available === "number" ? it.available : (totalClothAmount !== null ? totalClothAmount - totalAssigned : null);
      return {
        key, // clothAmountId or composite key
        clothAmountId: it.clothAmountId || null,
        fabric,
        item,
        unit: it.unit || "",
        totalAssigned,
        totalClothAmount,
        available
      };
    }).sort((a,b) => {
      const fa = (a.fabric || "").toLowerCase();
      const fb = (b.fabric || "").toLowerCase();
      if (fa === fb) return (a.item || "").localeCompare(b.item || "");
      return fa.localeCompare(fb);
    });
  }, [overallFromStore]);

  // map for lookups
  const serverAggregateMap = useMemo(() => {
    const m = {};
    serverAggregates.forEach((a) => { m[a.key] = a; });
    return m;
  }, [serverAggregates]);

  const requestedPerAggregate = useMemo(() => {
    const map = {};
    formData.consumptions.forEach((c) => {
      const key = String(c.clothKey || "");
      if (!key) return;
      const amt = Number(c.amount || 0);
      map[key] = (map[key] || 0) + (isNaN(amt) ? 0 : amt);
    });
    return map;
  }, [formData.consumptions]);

  // validation
  useEffect(() => {
    let computedError = "";

    if (!formData.tailorId) {
      computedError = "";
    } else {
      for (let i = 0; i < formData.consumptions.length; i++) {
        const c = formData.consumptions[i];
        if (!c.clothKey) { computedError = `Row ${i+1}: select cloth.`; break; }
        const hasFabric = String(c.fabricType || "").trim().length > 0;
        const hasItem = String(c.itemType || "").trim().length > 0;
        if (!hasFabric && !hasItem) { computedError = `Row ${i+1}: provide fabric or item.`; break; }
        const num = Number(c.amount);
        if (!c.amount || isNaN(num) || num <= 0) { computedError = `Row ${i+1}: enter valid amount (>0).`; break; }

        const agg = serverAggregateMap[String(c.clothKey)];
        let avail = null;
        if (agg) {
          if (typeof agg.available === "number") avail = agg.available;
          else if (typeof agg.totalClothAmount === "number") avail = agg.totalClothAmount - Number(agg.totalAssigned || 0);
        }
        if (typeof avail === "number" && num > avail) { computedError = `Row ${i+1}: requested ${num} exceeds available ${avail}.`; break; }
      }

      if (!computedError) {
        for (const [key, totalReq] of Object.entries(requestedPerAggregate)) {
          const agg = serverAggregateMap[key];
          let avail = null;
          if (agg) {
            if (typeof agg.available === "number") avail = agg.available;
            else if (typeof agg.totalClothAmount === "number") avail = agg.totalClothAmount - Number(agg.totalAssigned || 0);
          }
          if (typeof avail === "number" && totalReq > avail) { computedError = `Total requested for ${key} is ${totalReq} which exceeds available ${avail}.`; break; }
        }
      }
    }

    setLocalError((prev) => (prev === computedError ? prev : computedError));
  }, [formData, serverAggregateMap, requestedPerAggregate]);

  const handleAddRow = () => setFormData((s) => ({ ...s, consumptions: [...s.consumptions, emptyConsumption()] }));
  const handleRemoveRow = (idx) => setFormData((s) => ({ ...s, consumptions: s.consumptions.filter((_,i) => i !== idx) }));
  const handleRowChange = (idx, key, value) => setFormData((s) => {
    const consumptions = s.consumptions.map((r,i) => i===idx ? { ...r, [key]: value } : r);
    return { ...s, consumptions };
  });

  const onRowAggregateSelect = (idx, key) => {
    const agg = serverAggregateMap[key];
    const fabric = agg?.fabric ?? "";
    const item = agg?.item ?? "";
    const unit = agg?.unit ?? "meters";
    setFormData((prev) => {
      const consumptions = prev.consumptions.slice();
      consumptions[idx] = {
        ...consumptions[idx],
        clothKey: key,
        fabricType: consumptions[idx].fabricType || fabric,
        itemType: consumptions[idx].itemType || item,
        unitType: consumptions[idx].unitType || unit
      };
      return { ...prev, consumptions };
    });
  };

  const pretty = (v) => (v || v === 0 ? String(v).charAt(0).toUpperCase() + String(v).slice(1) : "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (localError) { toast.error(localError); return; }
    setLoading(true);

    // payload: send fabricType + itemType + amount (server will decide how to allocate)
    const clothConsumptions = formData.consumptions.map((c) => ({
      fabricType: (c.fabricType || "").trim(),
      itemType: (c.itemType || "").trim(),
      unitType: c.unitType,
      amount: Number(c.amount)
    }));

    const payload = { tailorId: formData.tailorId, assignedDate: formData.assignedDate, clothConsumptions };

    try {
      await dispatch(assignClothRoll(payload)).unwrap();
      toast.success("Assignments created successfully");
      onClose();
      setFormData({ tailorId: "", assignedDate: new Date().toISOString().split("T")[0], consumptions: [emptyConsumption()] });
      dispatch(getClothRolls());
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
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
          <div className="flex min-h-screen items-center justify-center p-4">
            <motion.div initial={{opacity:0, scale:0.96}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.96}} className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-gray-200 z-10">
                <h3 className="text-lg font-semibold">Assign Cloth (Aggregate)</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2"><User className="inline w-4 h-4 mr-1" /> Select Tailor</label>
                  <select required value={formData.tailorId} onChange={(e) => setFormData({ ...formData, tailorId: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Choose a tailor...</option>
                    {(tailors || []).map(t => <option key={t._id} value={t._id}>{t.username ? (t.username.charAt(0).toUpperCase()+t.username.slice(1).toLowerCase()) : t.name} {t.skillLevel ? `(${t.skillLevel})` : ''}</option>)}
                  </select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Consumptions (choose aggregate item)</h4>
                    <button type="button" onClick={() => setFormData(s => ({ ...s, consumptions: [...s.consumptions, emptyConsumption()] }))} className="text-sm text-purple-600 flex items-center gap-1"><Plus className="w-4 h-4" /> Add row</button>
                  </div>

                  {formData.consumptions.map((row, idx) => (
                    <div key={idx} className="border p-3 rounded-md bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">Row {idx+1}</div>
                        {formData.consumptions.length>1 && (<button type="button" onClick={() => setFormData(s => ({ ...s, consumptions: s.consumptions.filter((_,i) => i !== idx) }))} className="text-red-500 flex items-center gap-1"><Minus className="w-4 h-4" /> Remove</button>)}
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        <select required value={row.clothKey} onChange={(e) => onRowAggregateSelect(idx, e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                          <option value="">Select aggregated cloth (fabric / item)...</option>
                          {serverAggregates.map(opt => {
                            const label = `${pretty(opt.fabric)}${opt.item ? `${pretty(opt.item)}` : ""}`;
                            return <option key={opt.key} value={opt.key}>{`${label} — Available: ${typeof opt.available === "number" ? opt.available : 0}`}</option>;
                          })}
                        </select>

                        <input type="text" value={row.fabricType} onChange={(e) => handleRowChange(idx, "fabricType", e.target.value)} placeholder="Fabric Type (auto-filled)" className="w-full px-3 py-2 border rounded-lg" />
                        <input type="text" value={row.itemType} onChange={(e) => handleRowChange(idx, "itemType", e.target.value)} placeholder="Item Type (auto-filled)" className="w-full px-3 py-2 border rounded-lg" />

                        <div className="flex gap-2 items-center">
                          <select value={row.unitType} onChange={(e) => handleRowChange(idx, "unitType", e.target.value)} className="flex-1 px-3 py-2 border rounded-lg">
                            <option value="meters">Meters</option>
                            <option value="kilos">Kilos</option>
                            <option value="unit">Units</option>
                          </select>
                          <input type="number" min="0" step="0.01" required value={row.amount} onChange={(e) => handleRowChange(idx, "amount", e.target.value)} placeholder="Amount" className="w-36 px-3 py-2 border rounded-lg" />
                        </div>

                        {row.clothKey && (() => {
                          const agg = serverAggregateMap[row.clothKey];
                          const available = (agg && typeof agg.available === "number") ? agg.available : (agg && typeof agg.totalClothAmount === "number" ? agg.totalClothAmount - agg.totalAssigned : 0);
                          return <div className="text-xs text-gray-600 mt-1">Available: <strong>{available}</strong> — Requested: <strong>{requestedPerAggregate[row.clothKey] ?? 0}</strong></div>;
                        })()}
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Date</label>
                  <input type="date" required value={formData.assignedDate} onChange={(e) => setFormData({ ...formData, assignedDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Items Summary (Server aggregates)</h4>

                  {serverAggregates.length === 0 ? <p className="text-sm text-gray-600">No aggregate data available.</p> : (
                    <div className="space-y-2">
                      {serverAggregates.map(a => {
                        const requested = requestedPerAggregate[a.key] ?? 0;
                        const available = (typeof a.available === "number") ? a.available : (typeof a.totalClothAmount === "number" ? a.totalClothAmount - a.totalAssigned : 0);
                        const remaining = Math.max(0, available - requested);
                        const label = `${pretty(a.fabric)}${a.item ? `${pretty(a.item)}` : ""}`;
                        return (
                          <div key={a.key} className="flex items-center justify-between bg-white p-2 rounded border">
                            <div className="text-sm font-medium">{label}</div>
                            <div className="text-xs text-gray-600">Available: <strong>{available}</strong> — Requested: <strong>{requested}</strong> — Remaining: <strong>{remaining}</strong></div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {localError && <p className="text-sm text-red-600">{localError}</p>}

                <div className="sticky bottom-0 bg-white flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg" disabled={loading}>Cancel</button>
                  <button type="submit" disabled={loading || !!localError || !formData.tailorId} className="px-4 py-2 bg-purple-600 text-white rounded-lg">{loading ? 'Assigning...' : 'Assign Items'}</button>
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

import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Plus, Minus } from "lucide-react";
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
  const tailors = useSelector((state) => state.tailors?.tailors ?? []);
  const clothRollsFromStore = useSelector((state) => state.clothRolls?.clothRolls ?? []);
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
      setFormData({
        tailorId: "",
        assignedDate: new Date().toISOString().split("T")[0],
        consumptions: [emptyConsumption()],
      });
    }
  }, [isOpen, dispatch]);

  // Normalize backend `clothRolls` -> UI-friendly `clothAmounts`
  const clothAmounts = useMemo(() => {
    if (!Array.isArray(clothRollsFromStore)) return [];

    return clothRollsFromStore
      .map((g) => {
        if (!g || typeof g !== "object") return null;

        // group type or clothAmount present
        if (g.type === "group" || g.clothAmountId || g.clothAmount) {
          const ref = g.clothAmount ?? {};
          const id = g.clothAmountId ?? ref._id ?? null;
          if (!id) return null;
          const fabricType = ref.fabricType ?? g.fabricType ?? "";
          const itemType = ref.itemType ?? g.itemType ?? "";
          const unit = ref.unitType ?? g.unit ?? "meters";
          const amount = typeof ref.amount === "number" ? ref.amount : null;
          const totalAssigned = Number(g.totalAssigned || 0);
          const available = typeof g.available === "number"
            ? g.available
            : (amount !== null ? (amount - totalAssigned) : null);

          return {
            _id: String(id),
            labelType: "group",
            clothAmountId: id,
            fabricType,
            itemType,
            unit,
            amount,
            available,
            totalAssigned,
            rollCount: Number(g.rollCount || 0),
            __rawGroup: g,
          };
        }

        // roll entry
        const rollId = g.rollId ?? g.id ?? (g._id ? String(g._id) : null);
        if (rollId) {
          const sample = (g.sampleRolls && g.sampleRolls[0]) || {};
          const id = `roll_${String(rollId)}`; // prefix to avoid collision
          const fabricType = sample.fabricType ?? g.fabricType ?? "";
          const itemType = sample.itemType ?? g.itemType ?? "";
          const unit = sample.unitType ?? g.unit ?? g.unitType ?? "meters";
          const amount = typeof sample.amount === "number" ? sample.amount : (typeof g.amount === "number" ? g.amount : null);

          return {
            _id: id,
            labelType: "roll",
            rollId: String(rollId),
            fabricType,
            itemType,
            unit,
            amount,
            available: null,
            totalAssigned: g.totalAssigned ?? (amount ?? 0),
            rollCount: 1,
            __rawGroup: g,
          };
        }

        return null;
      })
      .filter(Boolean);
  }, [clothRollsFromStore]);

  const getAmountAvailable = (ca) => {
    if (!ca) return null;
    if (typeof ca.available === "number") return ca.available;
    if (typeof ca.amount === "number") return ca.amount;
    if (typeof ca.totalAssigned === "number") return ca.totalAssigned;
    return null;
  };

  // Build a server-side breakdown map from overallFromStore (if provided)
  const serverBreakdownMap = useMemo(() => {
    const map = {};
    const arr = overallFromStore?.breakdownByFabricItem;
    if (Array.isArray(arr)) {
      arr.forEach((it) => {
        const fabric = it.fabric ?? it.fabricType ?? "Unknown";
        const item = it.item ?? it.itemType ?? "Unknown";
        const key = `${String(fabric).trim()}||${String(item).trim()}`;
        map[key] = { ...it };
      });
    }
    return map;
  }, [overallFromStore]);

  const amountAvailableMap = useMemo(() => {
    const map = {};
    clothAmounts.forEach((c) => {
      if (!c || !c._id) return;
      map[String(c._id)] = getAmountAvailable(c);
    });
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

  // CLIENT-SIDE: compute breakdown grouped by fabric + item (for UI)
  const breakdownByFabricItemClient = useMemo(() => {
    const map = {};

    // accumulate requested amounts (from requestedPerClothAmount)
    Object.entries(requestedPerClothAmount).forEach(([id, req]) => {
      const c = clothAmounts.find(x => String(x._id) === String(id));
      const fabric = (c && c.fabricType) ? String(c.fabricType).trim() : "Unknown";
      const item = (c && c.itemType) ? String(c.itemType).trim() : "Unknown";
      const key = `${fabric}||${item}`;

      if (!map[key]) {
        map[key] = {
          fabric,
          item,
          requested: 0,
          available: (c && typeof c.available === "number") ? c.available : null
        };
      }
      map[key].requested += Number(req || 0);

      // ensure available is populated if possible
      if (map[key].available === null && c && typeof c.available === "number") {
        map[key].available = c.available;
      }
    });

    // include clothAmounts that have 0 requested (so availability is visible)
    clothAmounts.forEach((c) => {
      const fabric = (c && c.fabricType) ? String(c.fabricType).trim() : "Unknown";
      const item = (c && c.itemType) ? String(c.itemType).trim() : "Unknown";
      const key = `${fabric}||${item}`;
      if (!map[key]) {
        map[key] = {
          fabric,
          item,
          requested: 0,
          available: (c && typeof c.available === "number") ? c.available : null
        };
      } else {
        if (map[key].available === null && c && typeof c.available === "number") {
          map[key].available = c.available;
        }
      }
    });

    return Object.values(map);
  }, [requestedPerClothAmount, clothAmounts]);

  // Validation effect
  useEffect(() => {
    let computedError = "";

    if (!formData.tailorId) {
      computedError = "";
    } else {
      for (let i = 0; i < formData.consumptions.length; i++) {
        const c = formData.consumptions[i];
        if (!c.clothAmountId) {
          computedError = `Row ${i + 1}: please select a cloth item.`;
          break;
        }

        const hasFabric = String(c.fabricType || "").trim().length > 0;
        const hasItem = String(c.itemType || "").trim().length > 0;
        if (!hasFabric && !hasItem) {
          computedError = `Row ${i + 1}: please provide fabric or item (at least one).`;
          break;
        }

        const num = Number(c.amount);
        if (!c.amount || isNaN(num) || num <= 0) {
          computedError = `Row ${i + 1}: enter a valid amount (> 0).`;
          break;
        }

        const available = amountAvailableMap[String(c.clothAmountId)];
        if (typeof available === "number" && num > available) {
          computedError = `Row ${i + 1}: requested amount (${num}) exceeds available (${available}).`;
          break;
        }
      }

      if (!computedError) {
        for (const [id, totalReq] of Object.entries(requestedPerClothAmount)) {
          const available = amountAvailableMap[id];
          if (typeof available === "number" && totalReq > available) {
            computedError = `Total requested for selected cloth (${id}) is ${totalReq} which exceeds its available ${available}.`;
            break;
          }
        }
      }
    }

    setLocalError((prev) => (prev === computedError ? prev : computedError));
  }, [formData.tailorId, formData.consumptions, amountAvailableMap, requestedPerClothAmount]);

  const handleAddRow = () => setFormData((s) => ({ ...s, consumptions: [...s.consumptions, emptyConsumption()] }));
  const handleRemoveRow = (idx) => setFormData((s) => ({ ...s, consumptions: s.consumptions.filter((_, i) => i !== idx) }));
  const handleRowChange = (idx, key, value) =>
    setFormData((s) => {
      const consumptions = s.consumptions.map((r, i) => (i === idx ? { ...r, [key]: value } : r));
      return { ...s, consumptions };
    });

  const onRowClothAmountSelect = (idx, clothAmountId) => {
    const found = clothAmounts.find((c) => String(c._id) === String(clothAmountId)) || {};
    const fabric = found.fabricType ?? "";
    const item = found.itemType ?? "";
    const unit = found.unit ?? "meters";

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

  const pretty = (v) => (v || v === 0 ? String(v).charAt(0).toUpperCase() + String(v).slice(1) : "");

  const clothTitle = (c) => {
    if (!c) return "Unknown";
    const fabric = c.fabricType ?? "";
    const item = c.itemType ?? "";
    const available = getAmountAvailable(c);
    const unit = c.unit ?? "";
    const titlePart = [pretty(fabric), pretty(item)].filter(Boolean).join(" / ") || (c._id ?? "Unknown");
    const availText = (available === null) ? "Unknown" : `${available} ${unit || ""}`;
    const prefix = c.labelType === "roll" ? "(Roll) " : "";
    return `${prefix}${titlePart} — ${availText}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (localError) {
      toast.error(localError);
      return;
    }
    setLoading(true);

    const clothConsumptions = formData.consumptions.map((c) => {
      const selectedId = String(c.clothAmountId || "");
      const isRoll = selectedId.startsWith("roll_");
      const row = {
        unitType: c.unitType,
        amount: Number(c.amount),
      };
      if (isRoll) {
        row.rollId = selectedId.replace(/^roll_/, "");
      } else {
        row.clothAmountId = selectedId || null;
      }
      if (String(c.fabricType || "").trim()) row.fabricType = c.fabricType.trim();
      if (String(c.itemType || "").trim()) row.itemType = c.itemType.trim();
      return row;
    });

    const payload = {
      tailorId: formData.tailorId,
      assignedDate: formData.assignedDate,
      clothConsumptions,
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
      // refresh cloth rolls to get latest availability
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
                            if (avail !== null && avail <= 0) return null;
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
                            Available: <strong>{(amountAvailableMap[row.clothAmountId] === null) ? 'Unknown' : amountAvailableMap[row.clothAmountId]} {clothAmounts.find(c=>String(c._id)===String(row.clothAmountId))?.unit ?? ''}</strong> — Requested for this item: <strong>{requestedPerClothAmount[String(row.clothAmountId)] ?? 0}</strong>
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

                {/* Items Summary: showing only Fabric + Item grouped rows */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Items Summary</h4>

                  {/* optional server-provided overall */}
                  {overallFromStore ? (
                    <div className="text-sm text-gray-700 mb-3">
                      <div><strong>Total Assigned:</strong> {overallFromStore.totalAssigned ?? 0}</div>
                      <div><strong>Total Available:</strong> {overallFromStore.totalAvailable ?? 'Unknown'}</div>
                    </div>
                  ) : null}

                  <div className="text-sm text-gray-600 space-y-2">
                    {((!breakdownByFabricItemClient || breakdownByFabricItemClient.length === 0) && Object.keys(serverBreakdownMap).length === 0) && <p>No items selected yet.</p>}

                    {/* merge client breakdown keys and server breakdown keys to display authoritative numbers when available */}
                    {(() => {
                      const merged = {};

                      // start with client-side view (requested amounts)
                      breakdownByFabricItemClient.forEach((r) => {
                        const key = `${r.fabric}||${r.item}`;
                        merged[key] = { ...r };
                      });

                      // now ensure server entries exist in merged (server may have items with 0 requested in client)
                      Object.entries(serverBreakdownMap).forEach(([key, serverVal]) => {
                        if (!merged[key]) merged[key] = { fabric: serverVal.fabric ?? 'Unknown', item: serverVal.item ?? 'Unknown', requested: 0, available: null };
                        // attach server data for display
                        merged[key].__server = serverVal;
                      });

                      return Object.values(merged).map((row) => {
                        const titleParts = [];
                        if (row.fabric && row.fabric !== "Unknown") titleParts.push(pretty(row.fabric));
                        if (row.item && row.item !== "Unknown") titleParts.push(pretty(row.item));
                        const title = titleParts.length ? titleParts.join(" / ") : "Unknown";

                        // prefer client known available -> otherwise server provided available/totalAvailable
                        const serverEntry = row.__server;
                        const availNum = (typeof row.available === 'number') ? row.available : (serverEntry && (typeof serverEntry.available === 'number' ? serverEntry.available : (typeof serverEntry.totalAvailable === 'number' ? serverEntry.totalAvailable : null)));

                        const rem = (availNum === null) ? "Unknown" : Math.max(0, availNum - (Number(row.requested) || 0));

                        // server additional info
                        const serverAssigned = serverEntry ? (serverEntry.totalAssigned ?? serverEntry.assigned ?? null) : null;
                        const serverAvailable = serverEntry ? (serverEntry.totalAvailable ?? serverEntry.available ?? null) : null;

                        return (
                          <div key={`${row.fabric}||${row.item}`} className="flex items-center justify-between bg-white p-2 rounded border">
                            <div className="text-sm font-medium">{title}</div>
                            <div className="text-xs text-gray-600">
                              Available: <strong>{availNum === null ? "Unknown" : availNum}</strong> — Requested: <strong>{row.requested}</strong> — Remaining: <strong>{rem}</strong>
                              {serverAssigned !== null && (
                                <span className="ml-2">| Server assigned: <strong>{serverAssigned}</strong></span>
                              )}
                              {serverAvailable !== null && (
                                <span className="ml-2">| Server available: <strong>{serverAvailable}</strong></span>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
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

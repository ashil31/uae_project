// components/assignedRolls/RollAssignmentFormModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, Search, ChevronDown, ChevronUp, User } from "lucide-react";
import { assignClothRoll } from "../../../store/slices/assignmentSlice";
import { getTailors } from "../../../store/slices/tailorSlice";
import { getClothRolls } from "../../../store/slices/clothRollSlice";
import toast from "react-hot-toast";

const emptyConsumption = (overrides = {}) => ({
  clothKey: "", // aggregate key (masterClothAmountId || clothAmountId || composite key)
  clothAmountId: null, // concrete clothAmountId when resolved
  fabricType: "",
  itemType: "",
  unitType: "meters",
  amount: "",
  autoFilled: null, // "fabric" | "item" | null
  ...overrides,
});

const UNIT_OPTIONS = [
  { value: "meters", label: "Meters" },
  { value: "kilos", label: "Kilos" },
  { value: "unit", label: "Units" },
];

const RollAssignmentFormModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const tailors = useSelector((s) => s.tailors?.tailors ?? []);
  const overallFromStore = useSelector((s) => s.clothRolls?.overall ?? null);

  const [formData, setFormData] = useState({
    assignedDate: new Date().toISOString().split("T")[0],
    consumptions: [emptyConsumption()],
    assignToMaster: true,
    masterTailorId: "",
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
        assignToMaster: true,
        masterTailorId: "",
      });
    }
  }, [isOpen, dispatch]);

  // build aggregates
  const serverAggregates = useMemo(() => {
    const arr = overallFromStore?.breakdownByFabricItem;
    if (!Array.isArray(arr)) return [];
    return arr
      .map((it) => {
        const fabric = (it.fabric ?? "").trim();
        const item = (it.item ?? "").trim();
        const key = it.masterClothAmountId ? String(it.masterClothAmountId) : it.clothAmountId ? String(it.clothAmountId) : String(it.key ?? "");
        const totalAssigned = Number(it.totalAssigned ?? 0);
        const totalClothAmount = typeof it.totalClothAmount === "number" ? it.totalClothAmount : null;
        const available =
          it.masterBalance !== undefined && it.masterBalance !== null
            ? Number(it.masterBalance)
            : typeof it.available === "number"
            ? Number(it.available)
            : totalClothAmount !== null
            ? totalClothAmount - totalAssigned
            : null;
        return {
          key,
          clothAmountId: it.clothAmountId || null,
          masterClothAmountId: it.masterClothAmountId || null,
          fabric,
          item,
          unit: it.unit || "meters",
          totalAssigned,
          totalClothAmount,
          available: available !== null ? available : null,
          raw: it,
        };
      })
      .sort((a, b) => {
        const fa = (a.fabric || "").toLowerCase();
        const fb = (b.fabric || "").toLowerCase();
        if (fa === fb) return (a.item || "").localeCompare(b.item || "");
        return fa.localeCompare(fb);
      });
  }, [overallFromStore]);

  const serverAggregateMap = useMemo(() => {
    const m = {};
    serverAggregates.forEach((a) => (m[a.key] = a));
    return m;
  }, [serverAggregates]);

  // requested per aggregate
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

  // masters list
  const masters = useMemo(() => {
    if (!Array.isArray(tailors)) return [];
    return tailors.filter((t) => {
      const role = String(t.role || "").toLowerCase();
      return role === "mastertailor" || role === "master";
    });
  }, [tailors]);

  // validation
  useEffect(() => {
    let computedError = "";

    if (!formData.masterTailorId) {
      computedError = "";
    } else {
      for (let i = 0; i < formData.consumptions.length; i++) {
        const c = formData.consumptions[i];
        if (!c.clothKey) {
          computedError = `Row ${i + 1}: select cloth.`;
          break;
        }
        const hasFabric = String(c.fabricType || "").trim().length > 0;
        const hasItem = String(c.itemType || "").trim().length > 0;
        if (!hasFabric && !hasItem) {
          computedError = `Row ${i + 1}: provide fabric or item.`;
          break;
        }
        const num = Number(c.amount);
        if (!c.amount || isNaN(num) || num <= 0) {
          computedError = `Row ${i + 1}: enter valid amount (>0).`;
          break;
        }

        const agg = serverAggregateMap[String(c.clothKey)];
        let avail = null;
        if (agg) {
          if (typeof agg.available === "number") avail = agg.available;
          else if (typeof agg.totalClothAmount === "number") avail = agg.totalClothAmount - Number(agg.totalAssigned || 0);
        }
        if (typeof avail === "number" && num > avail) {
          computedError = `Row ${i + 1}: requested ${num} exceeds available ${avail}.`;
          break;
        }
      }

      if (!computedError) {
        for (const [key, totalReq] of Object.entries(requestedPerAggregate)) {
          const agg = serverAggregateMap[key];
          let avail = null;
          if (agg) {
            if (typeof agg.available === "number") avail = agg.available;
            else if (typeof agg.totalClothAmount === "number") avail = agg.totalClothAmount - Number(agg.totalAssigned || 0);
          }
          if (typeof avail === "number" && totalReq > avail) {
            computedError = `Total requested for ${key} is ${totalReq} which exceeds available ${avail}.`;
            break;
          }
        }
      }

      if (!computedError && formData.assignToMaster) {
        if (!formData.masterTailorId || String(formData.masterTailorId).trim() === "") {
          computedError = "Select a Master Tailor to credit the pool.";
        }
      }
    }

    setLocalError((prev) => (prev === computedError ? prev : computedError));
  }, [formData, serverAggregateMap, requestedPerAggregate]);

  // UI dropdown state(s)
  const [openRowDropdown, setOpenRowDropdown] = useState(null); // index of open aggregate dropdown
  const [rowSearch, setRowSearch] = useState({}); // { idx: "query" }
  const listRef = useRef(null);

  // master dropdown UI state
  const [masterDropdownOpen, setMasterDropdownOpen] = useState(false);
  const [masterSearch, setMasterSearch] = useState("");

  // per-row unit dropdown open state map: { idx: boolean }
  const [unitOpenMap, setUnitOpenMap] = useState({});

  // helpers
  const pretty = (v) => (v || v === 0 ? String(v).charAt(0).toUpperCase() + String(v).slice(1) : "");

  const handleAddRow = () => setFormData((s) => ({ ...s, consumptions: [...s.consumptions, emptyConsumption()] }));
  const handleRemoveRow = (idx) => setFormData((s) => ({ ...s, consumptions: s.consumptions.filter((_, i) => i !== idx) }));
  const handleRowChange = (idx, key, value) =>
    setFormData((s) => {
      const consumptions = s.consumptions.map((r, i) => (i === idx ? { ...r, [key]: value } : r));
      return { ...s, consumptions };
    });

  // when aggregate selected: fill fabric/item/unit + resolved clothAmountId
  const onRowAggregateSelect = (idx, key) => {
    const agg = serverAggregateMap[key];
    if (!agg) return;
    const fabricRaw = agg?.fabric ?? "";
    const itemRaw = agg?.item ?? "";
    const fabric = String(fabricRaw).trim();
    const item = String(itemRaw).trim();
    const unit = agg?.unit ?? "meters";
    const resolvedClothAmountId = agg?.clothAmountId || null;

    // normalize checks
    const fabricLower = fabric.toLowerCase();
    const itemLower = item.toLowerCase();
    const isFabricMeaningful = fabric.length > 0 && fabricLower !== "unknown" && fabricLower !== itemLower && fabricLower !== "n/a" && fabricLower !== "-";
    const isItemMeaningful = item.length > 0 && itemLower !== "unknown" && itemLower !== "n/a" && itemLower !== "-";

    setFormData((prev) => {
      const consumptions = prev.consumptions.slice();

      // Prefer item if item is meaningful — ensures selecting an "item" aggregate fills itemType
      if (isItemMeaningful) {
        consumptions[idx] = {
          ...consumptions[idx],
          clothKey: key,
          clothAmountId: resolvedClothAmountId,
          fabricType: "", // clear other
          itemType: item,
          unitType: consumptions[idx].unitType || unit,
          autoFilled: "item",
        };
      } else if (isFabricMeaningful) {
        consumptions[idx] = {
          ...consumptions[idx],
          clothKey: key,
          clothAmountId: resolvedClothAmountId,
          fabricType: fabric,
          itemType: "", // clear other
          unitType: consumptions[idx].unitType || unit,
          autoFilled: "fabric",
        };
      } else {
        // fallback: don't clobber typed values
        consumptions[idx] = {
          ...consumptions[idx],
          clothKey: key,
          clothAmountId: resolvedClothAmountId,
          unitType: consumptions[idx].unitType || unit,
          autoFilled: null,
        };
      }

      return { ...prev, consumptions };
    });

    setOpenRowDropdown(null);
    setRowSearch((r) => ({ ...r, [idx]: "" }));
  };

  // master selection helper
  const handleMasterSelect = (masterId) => {
    setFormData((s) => ({ ...s, masterTailorId: masterId }));
    setMasterDropdownOpen(false);
    setMasterSearch("");
  };

  // per-row unit selection helper
  const handleUnitSelect = (idx, value) => {
    handleRowChange(idx, "unitType", value);
    setUnitOpenMap((m) => ({ ...m, [idx]: false }));
  };

  // submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (localError) {
      toast.error(localError);
      return;
    }
    setLoading(true);

    const clothConsumptions = formData.consumptions.map((c) => {
      const base = {
        fabricType: (c.fabricType || "").trim(),
        itemType: (c.itemType || "").trim(),
        unitType: c.unitType || "meters",
        amount: Number(c.amount || 0),
      };
      if (c.clothAmountId) base.clothAmountId = c.clothAmountId;
      return base;
    });

    const payload = {
      assignedDate: formData.assignedDate,
      clothConsumptions,
      assignToMaster: !!formData.assignToMaster,
      masterTailorId: formData.assignToMaster ? (formData.masterTailorId || undefined) : undefined,
    };

    try {
      await dispatch(assignClothRoll(payload)).unwrap();
      toast.success("Assignments created successfully");
      onClose();
      setFormData({
        assignedDate: new Date().toISOString().split("T")[0],
        consumptions: [emptyConsumption()],
        assignToMaster: true,
        masterTailorId: "",
      });
      dispatch(getClothRolls());
    } catch (err) {
      toast.error(err?.message || err?.payload?.message || "Failed to create assignments");
    } finally {
      setLoading(false);
    }
  };

  // filter helper for row dropdown
  const filteredAggregates = (idx) => {
    const q = (rowSearch[idx] || "").trim().toLowerCase();
    if (!q) return serverAggregates;
    return serverAggregates.filter((a) => {
      const label = `${a.fabric} ${a.item}`.toLowerCase();
      const key = String(a.key || "");
      return label.includes(q) || key.includes(q);
    });
  };

  // helper to filter masters for search
  const filteredMasters = () => {
    const q = String(masterSearch || "").trim().toLowerCase();
    if (!q) return masters;
    return masters.filter((m) => {
      const name = (m.username || `${m.firstName || ""} ${m.lastName || ""}`).toLowerCase();
      return name.includes(q) || String(m._id || "").includes(q);
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
          <div className="flex min-h-screen items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-gray-200 z-10">
                <h3 className="text-lg font-semibold">Assign Cloth (Aggregate)</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">

                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={formData.assignToMaster} onChange={(e) => setFormData((s) => ({ ...s, assignToMaster: e.target.checked }))} />
                    <span className="text-sm text-gray-700">Credit Master Pool (assignToMaster)</span>
                  </label>
                </div>

                {formData.assignToMaster && (
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Master Tailor to credit</label>

                    {/* Custom searchable dropdown for masters */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setMasterDropdownOpen((o) => !o)}
                        className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg bg-white ${masterDropdownOpen ? "border-purple-500" : "border-gray-300"}`}
                        aria-expanded={masterDropdownOpen}
                      >
                        <div className="truncate text-sm">
                          {formData.masterTailorId
                            ? (() => {
                                const sel = masters.find((m) => String(m._id) === String(formData.masterTailorId));
                                return sel ? (sel.username ? `${sel.username.charAt(0).toUpperCase()}${sel.username.slice(1).toLowerCase()}` : `${sel.firstName || ""} ${sel.lastName || ""}`) : "Selected master";
                              })()
                            : "Choose master tailor..."}
                        </div>
                        <div>{masterDropdownOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</div>
                      </button>

                      <div className={`absolute left-0 right-0 mt-2 z-40 max-h-60 overflow-auto rounded-lg border bg-white shadow-lg py-2 transition-transform ${masterDropdownOpen ? "opacity-100 translate-y-0 scale-100" : "opacity-0 pointer-events-none -translate-y-1 scale-95"}`}>
                        <div className="px-3 pb-2">
                          <div className="flex items-center gap-2">
                            <Search className="w-4 h-4 text-gray-400" />
                            <input autoFocus={masterDropdownOpen} value={masterSearch} onChange={(e) => setMasterSearch(e.target.value)} placeholder="Search master..." className="w-full px-2 py-2 text-sm border rounded focus:outline-none" />
                          </div>
                          <div className="text-xs text-gray-500 mt-2">Type to filter masters.</div>
                        </div>

                        <div className="divide-y">
                          {filteredMasters().length === 0 && <div className="px-3 py-2 text-sm text-gray-500">No masters found.</div>}
                          {filteredMasters().map((m) => (
                            <button
                              key={m._id}
                              type="button"
                              onClick={() => handleMasterSelect(m._id)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                            >
                              <User className="w-4 h-4 text-gray-500" />
                              <div className="truncate">
                                {m.username ? `${m.username.charAt(0).toUpperCase()}${m.username.slice(1).toLowerCase()}` : `${m.firstName || ""} ${m.lastName || ""}`}
                              </div>
                              <div className="ml-auto text-xs text-gray-400">{String(m._id).slice(0, 6)}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 mt-1">Select which master should receive the credited pool.</p>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Consumptions (choose aggregate item)</h4>
                    <button type="button" onClick={handleAddRow} className="text-sm text-purple-600 flex items-center gap-1"><Plus className="w-4 h-4" /> Add row</button>
                  </div>

                  {formData.consumptions.map((row, idx) => {
                    const agg = row.clothKey ? serverAggregateMap[row.clothKey] : null;
                    const available = agg && typeof agg.available === "number" ? agg.available : agg && typeof agg.totalClothAmount === "number" ? agg.totalClothAmount - agg.totalAssigned : 0;
                    return (
                      <div key={idx} className="border p-3 rounded-md bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-medium">Row {idx + 1}</div>
                          <div className="flex items-center gap-2">
                            {formData.consumptions.length > 1 && (<button type="button" onClick={() => handleRemoveRow(idx)} className="text-red-500 flex items-center gap-1"><Minus className="w-4 h-4" /> Remove</button>)}
                            <button type="button" onClick={() => { handleAddRow(); setTimeout(() => setOpenRowDropdown(formData.consumptions.length), 50); }} className="text-sm text-gray-600">+ New</button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2 relative">
                          {/* Custom searchable dropdown for aggregates */}
                          <div className="relative">
                            <button type="button" onClick={() => setOpenRowDropdown((o) => (o === idx ? null : idx))} className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg bg-white ${openRowDropdown === idx ? "border-purple-500" : "border-gray-300"}`} aria-expanded={openRowDropdown === idx}>
                              <div className="truncate text-sm">
                                {row.clothKey && serverAggregateMap[row.clothKey]
                                  ? `${pretty(serverAggregateMap[row.clothKey].fabric)}${serverAggregateMap[row.clothKey].item ? `${pretty(serverAggregateMap[row.clothKey].item)}` : ""} — Avail: ${available}`
                                  : "Select aggregated cloth (fabric / item)..."}
                              </div>
                              <div>{openRowDropdown === idx ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</div>
                            </button>

                            <div className={`absolute left-0 right-0 mt-2 z-40 max-h-60 overflow-auto rounded-lg border bg-white shadow-lg py-2 transition-transform ${openRowDropdown === idx ? "opacity-100 translate-y-0 scale-100" : "opacity-0 pointer-events-none -translate-y-1 scale-95"}`}>
                              <div className="px-3 pb-2">
                                <div className="flex items-center gap-2">
                                  <Search className="w-4 h-4 text-gray-400" />
                                  <input autoFocus={openRowDropdown === idx} value={rowSearch[idx] || ""} onChange={(e) => setRowSearch((r) => ({ ...r, [idx]: e.target.value }))} placeholder="Search fabric or item..." className="w-full px-2 py-2 text-sm border rounded focus:outline-none" />
                                </div>
                                <div className="text-xs text-gray-500 mt-2">Available shows master or aggregate availability.</div>
                              </div>

                              <div ref={listRef} className="divide-y">
                                {filteredAggregates(idx).length === 0 && <div className="px-3 py-2 text-sm text-gray-500">No aggregates found.</div>}
                                {filteredAggregates(idx).map((opt) => {
                                  const label = `${pretty(opt.fabric)}${opt.item ? `${pretty(opt.item)}` : ""}`;
                                  const availText = typeof opt.available === "number" ? opt.available : 0;
                                  return (
                                    <button key={opt.key} type="button" onClick={() => onRowAggregateSelect(idx, opt.key)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between">
                                      <div className="truncate">{label}</div>
                                      <div className="text-xs text-gray-500">Avail: {availText}</div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Fabric / Item inputs: auto-filled field becomes readOnly */}
                          <div className="grid md:grid-cols-2 gap-2">
                            <div className="relative">
                              <input type="text" value={row.fabricType || ""} onChange={(e) => handleRowChange(idx, "fabricType", e.target.value)} placeholder="Fabric Type" className={`w-full px-3 py-2 border rounded-lg ${row.autoFilled === "fabric" ? "bg-gray-100 cursor-not-allowed" : ""}`} readOnly={row.autoFilled === "fabric"} />
                              {row.autoFilled === "fabric" && (
                                <button type="button" onClick={() => { handleRowChange(idx, "fabricType", ""); handleRowChange(idx, "autoFilled", null); }} className="absolute right-2 top-2 text-xs text-gray-500" title="Clear fabric">Clear</button>
                              )}
                            </div>

                            <div className="relative">
                              <input type="text" value={row.itemType || ""} onChange={(e) => handleRowChange(idx, "itemType", e.target.value)} placeholder="Item Type" className={`w-full px-3 py-2 border rounded-lg ${row.autoFilled === "item" ? "bg-gray-100 cursor-not-allowed" : ""}`} readOnly={row.autoFilled === "item"} />
                              {row.autoFilled === "item" && (
                                <button type="button" onClick={() => { handleRowChange(idx, "itemType", ""); handleRowChange(idx, "autoFilled", null); }} className="absolute right-2 top-2 text-xs text-gray-500" title="Clear item">Clear</button>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 items-center">
                            {/* Custom unit dropdown (per row) */}
                            <div className="relative">
                              <button type="button" onClick={() => setUnitOpenMap((m) => ({ ...m, [idx]: !m[idx] }))} className={`px-3 py-2 border rounded-lg min-w-[110px] flex items-center justify-between bg-white ${unitOpenMap[idx] ? "border-purple-500" : "border-gray-300"}`}>
                                <div className="text-sm">{(UNIT_OPTIONS.find((u) => u.value === row.unitType) || { label: row.unitType }).label}</div>
                                <div>{unitOpenMap[idx] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</div>
                              </button>

                              <div className={`absolute left-0 mt-2 z-40 w-max rounded-lg border bg-white shadow-lg py-1 transition-transform ${unitOpenMap[idx] ? "opacity-100 translate-y-0 scale-100" : "opacity-0 pointer-events-none -translate-y-1 scale-95"}`}>
                                {UNIT_OPTIONS.map((opt) => (
                                  <button key={opt.value} type="button" onClick={() => handleUnitSelect(idx, opt.value)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <input type="number" min="0" step="0.01" required value={row.amount} onChange={(e) => handleRowChange(idx, "amount", e.target.value)} placeholder="Amount" className="w-36 px-3 py-2 border rounded-lg" />
                          </div>

                          {row.clothKey && (() => {
                            const a = serverAggregateMap[row.clothKey];
                            const av = (a && typeof a.available === "number") ? a.available : (a && typeof a.totalClothAmount === "number" ? a.totalClothAmount - a.totalAssigned : 0);
                            return <div className="text-xs text-gray-600 mt-1">Available: <strong>{av}</strong> — Requested: <strong>{requestedPerAggregate[row.clothKey] ?? 0}</strong></div>;
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Date</label>
                  <input type="date" required value={formData.assignedDate} onChange={(e) => setFormData({ ...formData, assignedDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Items Summary (Server aggregates)</h4>
                  {serverAggregates.length === 0 ? <p className="text-sm text-gray-600">No aggregate data available.</p> : (
                    <div className="space-y-2">
                      {serverAggregates.map((a) => {
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
                  <button type="submit" disabled={loading || !!localError || !formData.masterTailorId} className="px-4 py-2 bg-purple-600 text-white rounded-lg">{loading ? "Assigning..." : "Assign Items"}</button>
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

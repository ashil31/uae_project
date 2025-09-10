import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { UserCheck, User, CheckCircle2 } from "lucide-react";
import apiClient from "../api/apiClient";
import MaterialCalculator from "../components/Tailors/MaterialCalculator";
import ConsumptionRow from "../components/Tailors/ConsumptionRow";
import {
  capitalize,
  emptyConsumption,
  resolveClothAmountRealId,
  looksLikeObjectId,
  toNumberSafe,
} from "../utils/clothUtils";

export default function AssignRollsPage() {
  const [clothRolls, setClothRolls] = useState([]);
  const [tailors, setTailors] = useState([]);
  const [serverMasterTotals, setServerMasterTotals] = useState([]);
  const [loadingRolls, setLoadingRolls] = useState(true);
  const [loadingTailors, setLoadingTailors] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const [formData, setFormData] = useState({
    tailorId: "",
    assignedDate: new Date().toISOString().split("T")[0],
    consumptions: [emptyConsumption()],
  });

  const [localError, setLocalError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // fetch master totals / cloth rolls
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingRolls(true);
        const res = await apiClient.get("/tailors/master/assignments");
        const payload = res?.data ?? {};

        if (Array.isArray(payload.masterTotals) && payload.masterTotals.length) {
          setServerMasterTotals(payload.masterTotals);

          const arr = payload.masterTotals.map((mt) => {
            const chosenId =
              mt.masterClothAmountId ??
              ((Array.isArray(mt.clothAmountIds) && mt.clothAmountIds.length
                ? String(mt.clothAmountIds[0])
                : null) ||
                (mt.clothDoc && mt.clothDoc._id ? String(mt.clothDoc._id) : null) ||
                (mt._id ? String(mt._id) : null));

            const rawAvailable =
              mt.masterBalance !== undefined && mt.masterBalance !== null
                ? mt.masterBalance
                : mt.available ?? mt.totalAssigned ?? mt.clothDoc?.amount ?? 0;

            const remaining = toNumberSafe(rawAvailable, 0);

            return {
              _id:
                chosenId ?? `${mt.fabricType}_${mt.itemType ?? ""}_${mt.unit}`,
              fabricType: mt.fabricType ?? mt.clothDoc?.fabricType ?? "",
              itemType: mt.itemType ?? mt.clothDoc?.itemType ?? "",
              remainingMeters: remaining,
              unitType: mt.unit ?? mt.clothDoc?.unit ?? "m",
              serialNumber: mt.clothDoc?.serialNumber ?? mt.serialNumber ?? null,
              raw: mt,
              __resolvedObjectId: chosenId,
              __displayKey: `${mt.fabricType}_${mt.itemType ?? ""}_${mt.unit}`,
            };
          });

          if (mounted) setClothRolls(arr);
          return;
        }

        // fallback
        const fallbackList = Array.isArray(payload.data)
          ? payload.data
          : Array.isArray(payload.clothAmounts)
          ? payload.clothAmounts
          : Array.isArray(payload.items)
          ? payload.items
          : Array.isArray(payload)
          ? payload
          : [];
        const arr = fallbackList.map((r) => {
          const rawAvailable =
            r.available ??
            r.remainingMeters ??
            r.totalAssigned ??
            r.amount ??
            r.lengthMeters ??
            0;
          const remaining = toNumberSafe(rawAvailable, 0);
          return {
            _id: r._id ?? r.id,
            fabricType: r.fabricType ?? r.itemType ?? "",
            itemType: r.itemType ?? "",
            remainingMeters: remaining,
            unitType: r.unit ?? "m",
            serialNumber: r.serialNumber ?? r.rollNo,
            raw: r,
          };
        });
        if (mounted) setClothRolls(arr);
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch cloth rolls");
      } finally {
        if (mounted) setLoadingRolls(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  // fetch tailors
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingTailors(true);
        const res = await apiClient.get("/tailors/assigned-all-tailor");
        const data = res?.data ?? {};
        const items = Array.isArray(data.tailors)
          ? data.tailors
          : Array.isArray(data)
          ? data
          : Array.isArray(data.data)
          ? data.data
          : [];
        if (mounted) setTailors(items);
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch tailors");
      } finally {
        if (mounted) setLoadingTailors(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  const clothAmounts = Array.isArray(clothRolls) ? clothRolls : [];

  const getAmountAvailable = (ca) => {
    if (!ca) return 0;
    if (ca.remainingMeters !== undefined && ca.remainingMeters !== null)
      return toNumberSafe(ca.remainingMeters, 0);
    if (ca.raw && ca.raw.masterBalance !== undefined && ca.raw.masterBalance !== null)
      return toNumberSafe(ca.raw.masterBalance, 0);
    if (ca.available !== undefined && ca.available !== null) return toNumberSafe(ca.available, 0);
    if (ca.amount !== undefined && ca.amount !== null) return toNumberSafe(ca.amount, 0);
    if (ca.totalAmount !== undefined && ca.totalAmount !== null) return toNumberSafe(ca.totalAmount, 0);
    if (ca.totalAssigned !== undefined && ca.totalAssigned !== null) return toNumberSafe(ca.totalAssigned, 0);
    if (ca.raw && ca.raw.clothDoc && ca.raw.clothDoc.amount !== undefined) return toNumberSafe(ca.raw.clothDoc.amount, 0);
    return 0;
  };

  const amountAvailableMap = useMemo(() => {
    const map = {};
    clothAmounts.forEach((c) => {
      map[String(c._id)] = getAmountAvailable(c);
      if (c.__resolvedObjectId) map[String(c.__resolvedObjectId)] = getAmountAvailable(c);
    });
    return map;
  }, [clothAmounts]);

  const requestedPerClothAmount = useMemo(() => {
    const map = {};
    formData.consumptions.forEach((c) => {
      const id = String(c.clothAmountId || "");
      const amt = toNumberSafe(c.amount || 0, 0);
      if (!id) return;
      map[id] = (map[id] || 0) + (isNaN(amt) ? 0 : amt);
    });
    return map;
  }, [formData.consumptions]);

  // validate rows
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
      const num = toNumberSafe(c.amount || 0, NaN);
      if (!c.amount || isNaN(num) || num <= 0) {
        setLocalError(`Row ${i + 1}: enter a valid amount (> 0).`);
        return;
      }
      const available = amountAvailableMap[String(c.clothAmountId)] ?? 0;
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

  // form helpers...
  const handleAddRow = () => setFormData((s) => ({ ...s, consumptions: [...s.consumptions, emptyConsumption()] }));
  const handleRemoveRow = (idx) => setFormData((s) => ({ ...s, consumptions: s.consumptions.filter((_, i) => i !== idx) }));
  const handleRowChange = (idx, key, value) =>
    setFormData((s) => {
      const consumptions = s.consumptions.map((r, i) => (i === idx ? { ...r, [key]: value } : r));
      return { ...s, consumptions };
    });

  const onRowClothAmountSelect = (idx, clothAmountId) => {
    const found =
      clothAmounts.find(
        (c) =>
          String(c._id) === String(clothAmountId) ||
          String(c.__resolvedObjectId || "") === String(clothAmountId)
      ) || {};
    const fabric = found.fabricType ?? found.fabric ?? found.raw?.fabricType ?? "";
    const item = found.itemType ?? found.item ?? found.raw?.item ?? "";
    const unit = found.unitType ?? found.unit ?? "meters";

    const realId = found.__resolvedObjectId || found._id || null;

    setFormData((prev) => {
      const consumptions = prev.consumptions.slice();
      consumptions[idx] = {
        ...consumptions[idx],
        clothAmountId: realId ? String(realId) : String(clothAmountId),
        fabricType: consumptions[idx].fabricType ? consumptions[idx].fabricType : fabric,
        itemType: consumptions[idx].itemType ? consumptions[idx].itemType : item,
        unitType: consumptions[idx].unitType ? consumptions[idx].unitType : unit,
      };
      return { ...prev, consumptions };
    });
  };

  /**
   * submitAssignments
   * - For each consumption: parent allocation -> master pool allocation -> fall back to batch endpoint
   * - Returns either an axios response (when falling back to batch) or { data: ... } when allocations done per-row
   */
  const submitAssignments = async (payload) => {
    const consumptions = Array.isArray(payload.clothConsumptions) ? payload.clothConsumptions : [];

    if (consumptions.length > 0) {
      const results = [];

      for (const c of consumptions) {
        // 1) If this row has parent ids -> call allocation using parent path
        if (c.parentAssignmentId && c.parentConsumptionId) {
          const body = {
            parentAssignmentId: c.parentAssignmentId,
            parentConsumptionId: c.parentConsumptionId,
            targetTailorId: payload.tailorId,
            amount: c.amount,
            unitType: c.unitType || c.unit || "meters",
          };
          try {
            const res = await apiClient.post("/tailors/master/allocate-to-tailor", body);
            results.push(res.data);
            toast.success(res.data?.message || "Allocated to tailor (parent)");
            if (res.data?.updatedMasterStock) {
              const upd = res.data.updatedMasterStock;
              setClothRolls((prev) =>
                prev.map((r) =>
                  String(r._id) === String(upd._id) || String(r.__resolvedObjectId) === String(upd._id)
                    ? { ...r, remainingMeters: typeof upd.amount === "number" ? upd.amount : r.remainingMeters, raw: upd, __resolvedObjectId: String(upd._id) }
                    : r
                )
              );
            }
            continue;
          } catch (err) {
            console.error("Allocation (parent) error:", err?.response?.data ?? err);
            const msg = err?.response?.data?.message || err?.message || "Allocation failed";
            results.push({ error: msg });
            toast.error(`Allocation failed: ${msg}`);
            continue;
          }
        }

        // 2) Try direct master pool allocation (no parent ids)
        const found =
          clothAmounts.find(
            (x) =>
              String(x._id) === String(c.clothAmountId) ||
              String(x.__resolvedObjectId || "") === String(c.clothAmountId)
          ) || null;

        const masterIdCandidate =
          c.masterClothAmountId ||
          (found && (found.__resolvedObjectId || (found.raw && found.raw._id))) ||
          null;

        const looksLikeMasterPool =
          !!masterIdCandidate ||
          (found && found.raw && (found.raw.masterBalance !== undefined || found.raw.masterClothAmountId || found.raw.masterTailorId));

        if (looksLikeMasterPool && masterIdCandidate) {
          const body = {
            masterClothAmountId: String(masterIdCandidate),
            targetTailorId: payload.tailorId,
            amount: c.amount,
            unitType: c.unitType || c.unit || "meters",
          };
          try {
            const res = await apiClient.post("/tailors/master/allocate-to-tailor", body);
            results.push(res.data);
            toast.success(res.data?.message || "Allocated to tailor (master pool)");
            if (res.data?.updatedMasterStock) {
              const upd = res.data.updatedMasterStock;
              setClothRolls((prev) =>
                prev.map((r) =>
                  String(r._id) === String(upd._id) || String(r.__resolvedObjectId) === String(upd._id)
                    ? { ...r, remainingMeters: typeof upd.amount === "number" ? upd.amount : r.remainingMeters, raw: upd, __resolvedObjectId: String(upd._id) }
                    : r
                )
              );
            } else if (res.data?.masterTotals) {
              setServerMasterTotals(res.data.masterTotals);
            }
            continue;
          } catch (err) {
            console.error("Allocation (master pool) error:", err?.response?.data ?? err);
            const msg = err?.response?.data?.message || err?.message || "Allocation failed";
            results.push({ error: msg });
            toast.error(`Allocation failed: ${msg}`);
            continue;
          }
        }
      } // end loop

      // processed all rows individually, return aggregate results shape
      return { data: { allocations: results, message: "Allocated per consumption (frontend-per-row)" } };
    }
  };

  const handleSubmitInline = async (e) => {
    e.preventDefault();
    if (localError) {
      toast.error(localError);
      return;
    }
    if (!formData.tailorId) {
      toast.error("Please select a tailor.");
      return;
    }
    setSubmitting(true);

    const processedConsumptions = [];
    let abortBecauseMissingId = false;
    const missingIdRows = [];

    formData.consumptions.forEach((c, idx) => {
      const base = {
        unitType: c.unitType,
        amount: toNumberSafe(c.amount, 0),
      };
      if (String(c.fabricType || "").trim()) base.fabricType = c.fabricType.trim();
      if (String(c.itemType || "").trim()) base.itemType = c.itemType.trim();

      const selId = String(c.clothAmountId || "");
      const found =
        clothAmounts.find(
          (x) => String(x._id) === selId || String(x.__resolvedObjectId || "") === selId
        ) || null;

      const resolved = resolveClothAmountRealId(found);

      if (resolved) {
        base.clothAmountId = resolved;
      } else {
        const maybeRollId = (found && (found.rollId || found.raw?.rollId || found.raw?.clothDoc?.rollId)) || null;
        if (maybeRollId && looksLikeObjectId(String(maybeRollId))) {
          base.rollId = String(maybeRollId);
        } else {
          abortBecauseMissingId = true;
          missingIdRows.push({ row: idx + 1, candidate: selId || found?._id || null });
        }
      }

      if (c.parentAssignmentId) base.parentAssignmentId = c.parentAssignmentId;
      if (c.parentConsumptionId) base.parentConsumptionId = c.parentConsumptionId;

      // If user selected a master pool item, try to keep any masterClothAmountId info
      if (found && (found.raw?.masterClothAmountId || found.__resolvedObjectId)) {
        base.masterClothAmountId = found.raw?.masterClothAmountId || found.__resolvedObjectId;
      }

      processedConsumptions.push(base);
    });

    if (abortBecauseMissingId) {
      const rowsText = missingIdRows.map((r) => `Row ${r.row} (${r.candidate || "unknown"})`).join(", ");
      toast.error(`Cannot assign — the following rows are not mapped to a DB id: ${rowsText}. Please re-select valid cloth items / rolls.`);
      setSubmitting(false);
      return;
    }

    // normalize clothAmountId values that are display keys to real ids if possible
    for (let i = 0; i < processedConsumptions.length; i++) {
      const pc = processedConsumptions[i];
      if (pc.clothAmountId) {
        if (!looksLikeObjectId(String(pc.clothAmountId))) {
          const found = clothAmounts.find(
            (c) =>
              String(c._id) === String(pc.clothAmountId) ||
              String(c.__resolvedObjectId || "") === String(pc.clothAmountId) ||
              String(c.__displayKey || "") === String(pc.clothAmountId) ||
              (Array.isArray(c.raw?.clothAmountIds) && c.raw.clothAmountIds.includes(pc.clothAmountId))
          );
          const real = found?.__resolvedObjectId || found?._id || null;
          if (real && looksLikeObjectId(String(real))) {
            pc.clothAmountId = String(real);
          } else {
            toast.error(`Row ${i + 1}: selected item has no DB id (choose a concrete item/roll).`);
            setSubmitting(false);
            return;
          }
        }
      }
    }

    const payload = {
      tailorId: formData.tailorId,
      assignedDate: formData.assignedDate,
      clothConsumptions: processedConsumptions,
    };

    try {
      const res = await submitAssignments(payload);
      const data = res?.data ?? res;

      // update UI depending on returned data
      if (Array.isArray(data.masterTotals) && data.masterTotals.length) {
        setServerMasterTotals(data.masterTotals);
        const arr = data.masterTotals.map((mt) => {
          const rawAvailable = mt.masterBalance !== undefined && mt.masterBalance !== null ? mt.masterBalance : mt.available ?? mt.totalAssigned ?? mt.clothDoc?.amount ?? 0;
          const remaining = toNumberSafe(rawAvailable, 0);
          return {
            _id: mt.masterClothAmountId ?? mt.clothAmountId ?? mt._id,
            fabricType: mt.fabricType ?? mt.clothDoc?.fabricType ?? "",
            itemType: mt.itemType ?? mt.clothDoc?.itemType ?? "",
            remainingMeters: remaining,
            unitType: mt.unit ?? mt.clothDoc?.unit ?? "m",
            serialNumber: mt.clothDoc?.serialNumber,
            raw: mt,
          };
        });
        setClothRolls(arr);
      } else if (Array.isArray(data.updatedClothAmounts) && data.updatedClothAmounts.length) {
        const arr = data.updatedClothAmounts.map((r) => ({
          _id: r._id,
          fabricType: r.fabricType ?? r.fabric ?? r.fabric_type ?? "",
          itemType: r.itemType ?? r.item ?? r.item_type ?? "",
          remainingMeters: toNumberSafe(r.amount, 0),
          unitType: r.unit ?? r.unitType ?? "m",
          serialNumber: r.serialNumber ?? r.rollNo,
          raw: r,
        }));
        setClothRolls((prev) => {
          const map = {};
          prev.forEach((p) => (map[String(p._id)] = p));
          arr.forEach((u) => (map[String(u._id)] = u));
          return Object.values(map);
        });
      } else if (data && data.updatedMasterStock) {
        const upd = data.updatedMasterStock;
        setClothRolls((prev) =>
          prev.map((r) =>
            String(r._id) === String(upd._id) || String(r.__resolvedObjectId) === String(upd._id)
              ? { ...r, remainingMeters: typeof upd.amount === "number" ? upd.amount : r.remainingMeters, raw: upd, __resolvedObjectId: String(upd._id) }
              : r
          )
        );
      }

      setSuccessData({
        message: data.message || data?.allocations?.[0]?.message || "Assignments created",
        payload: data,
      });
      toast.success(data.message || "Assignments created");

      setFormData({
        tailorId: "",
        assignedDate: new Date().toISOString().split("T")[0],
        consumptions: [emptyConsumption()],
      });
    } catch (err) {
      console.error("Assignment error response:", err?.response?.data ?? err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to create assignments");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRolls = useMemo(() => {
    const q = (searchQuery || "").trim().toLowerCase();
    return (clothRolls || []).filter((roll) => {
      if (!q) return true;
      const fabric = String(roll.fabricType || roll.itemType || "").toLowerCase();
      const serial = String(roll.serialNumber || roll.rollNo || roll._id || "").toLowerCase();
      return fabric.includes(q) || serial.includes(q);
    });
  }, [clothRolls, searchQuery]);

  const availableRolls = useMemo(
    () =>
      filteredRolls.filter((r) => (r.status ?? "Available").toString().toLowerCase() === "available"),
    [filteredRolls]
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-gray-800">Roll Assignment & Material Planning</h1>

        <MaterialCalculator products={[]} clothRolls={clothRolls} />

        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-4">
            <UserCheck className="mr-2 text-indigo-600" /> Assign Roll to Tailor (Aggregate)
          </h2>

          <form onSubmit={handleSubmitInline} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="inline w-4 h-4 mr-1" /> Select Tailor
                </label>
                <select
                  required
                  value={formData.tailorId}
                  onChange={(e) => setFormData({ ...formData, tailorId: e.target.value })}
                  className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"
                  disabled={loadingTailors}
                >
                  <option value="">{loadingTailors ? "Loading tailors..." : "-- Choose a tailor --"}</option>
                  {(tailors || [])
                    .filter((t) => (typeof t.role === "string" ? t.role.trim().toLowerCase() === "tailor" : true))
                    .map((t) => (
                      <option key={t._id} value={t._id}>
                        {capitalize(t.username || t.name || "Unnamed")}
                        {t.skillLevel ? ` (${t.skillLevel})` : ""}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Date</label>
                <input type="date" required value={formData.assignedDate} onChange={(e) => setFormData({ ...formData, assignedDate: e.target.value })} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">Consumptions (select aggregate item)</h3>
                <button type="button" onClick={handleAddRow} className="inline-flex items-center gap-1 text-sm text-indigo-600">
                  Add row
                </button>
              </div>

              {formData.consumptions.map((row, idx) => (
                <ConsumptionRow
                  key={idx}
                  idx={idx}
                  row={row}
                  clothAmounts={clothAmounts}
                  onChange={handleRowChange}
                  onSelectCloth={onRowClothAmountSelect}
                  onRemove={handleRemoveRow}
                  amountAvailableMap={amountAvailableMap}
                  requestedPerClothAmount={requestedPerClothAmount}
                />
              ))}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Items Summary</h4>
              <div className="text-sm text-gray-600 space-y-1">
                {Object.keys(requestedPerClothAmount).length === 0 && <p>No items selected yet.</p>}
                {Object.entries(requestedPerClothAmount).map(([id, req]) => {
                  const c = clothAmounts.find((x) => String(x._id) === String(id) || String(x.__resolvedObjectId || "") === String(id));
                  const avail = amountAvailableMap[id] ?? 0;
                  const rem = Math.max(0, avail - req);
                  const fabric = c?.fabricType ?? c?.fabric ?? c?.fabric_type ?? "";
                  const item = c?.itemType ?? c?.item ?? c?.item_type ?? "";
                  const titleParts = [fabric, item]
                    .map((s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : null))
                    .filter(Boolean);
                  const title = titleParts.length > 0 ? titleParts.join(" / ") : c?.name ?? "Unknown";
                  const unit = c?.unitType ?? c?.unit ?? "";
                  return (
                    <p key={id}>
                      <strong>{title}:</strong> Available {avail} {unit} — Requested {req} — Remaining {rem} {unit}
                    </p>
                  );
                })}
              </div>
            </div>

            {localError && <p className="text-sm text-red-600">{localError}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setFormData({ tailorId: "", assignedDate: new Date().toISOString().split("T")[0], consumptions: [emptyConsumption()] });
                  setLocalError("");
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                disabled={submitting}
              >
                Reset
              </button>
              <button type="submit" disabled={submitting || !!localError || !formData.tailorId} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {submitting ? "Assigning..." : "Assign Items"}
              </button>
            </div>
          </form>
        </div>

        {successData && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.25 }} className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full text-center">
              <CheckCircle2 className="mx-auto text-green-600 w-12 h-12 mb-3" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">{successData.message || "Success"}</h3>
              <button onClick={() => setSuccessData(null)} className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                Close
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

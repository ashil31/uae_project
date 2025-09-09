import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import {
  Ruler,
  UserCheck,
  CheckCircle2,
  Search,
  Plus,
  Minus,
  User,
} from "lucide-react";
import apiClient from "../api/apiClient";

/* ----------------- helpers ----------------- */
function capitalize(str) {
  if (str === null || str === undefined) return "";
  const s = String(str);
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

const emptyConsumption = (overrides = {}) => ({
  clothAmountId: "",
  fabricType: "",
  itemType: "",
  unitType: "meters",
  amount: "",
  ...overrides,
});

/* small frontend validator for Mongo ObjectId */
const looksLikeObjectId = (id) => {
  if (!id || typeof id !== "string") return false;
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Try many common places for a real DB id.
 * Returns a string ObjectId if found, otherwise null.
 */
const resolveClothAmountRealId = (clothAmountItem) => {
  if (!clothAmountItem) return null;

  // prefer explicit resolved id stored previously
  if (
    clothAmountItem.__resolvedObjectId &&
    looksLikeObjectId(String(clothAmountItem.__resolvedObjectId))
  ) {
    return String(clothAmountItem.__resolvedObjectId);
  }

  // top-level _id might already be a real ObjectId
  if (clothAmountItem._id && looksLikeObjectId(String(clothAmountItem._id))) {
    return String(clothAmountItem._id);
  }

  // some servers embed real ids under these shapes
  const raw = clothAmountItem.raw ?? {};
  const candidates = [
    raw._id,
    raw.clothAmountId,
    raw.clothAmountId && raw.clothAmountId._id,
    raw.clothDoc && raw.clothDoc._id,
    raw.rollId,
    raw.rollId && raw.rollId._id,
    clothAmountItem.rollId,
    clothAmountItem.clothAmountId,
    clothAmountItem.serialNumber, // not usually an ObjectId but check
  ];

  for (const cand of candidates) {
    if (!cand && cand !== 0) continue;
    try {
      const s = String(cand);
      if (looksLikeObjectId(s)) return s;
    } catch (e) {
      // ignore
    }
  }

  return null;
};

/* ----------------- MaterialCalculator (unchanged) ----------------- */
function MaterialCalculator({ products = [], clothRolls = [] }) {
  const [filters, setFilters] = useState({
    category: "",
    subcategory: "",
    brand: "",
  });
  const [selectedProductId, setSelectedProductId] = useState("");
  const [size, setSize] = useState("M");
  const [quantity, setQuantity] = useState(1);
  const [calculated, setCalculated] = useState(null);

  const normalizedProducts = useMemo(
    () =>
      (products || []).map((p) => ({
        _id: p._id ?? p.id ?? p.name,
        name: p.name ?? p.title ?? p.productName ?? "Unnamed product",
        category: p.category ?? p.Category ?? "",
        subcategory: p.subcategory ?? p.subCategory ?? "",
        brand: p.brand ?? p.Brand ?? "",
        baseFabricMetersPerUnit: Number(
          p.baseFabricMetersPerUnit ?? p.baseFabricMeters ?? p.baseMeters ?? 2.5
        ),
        materials: p.materials ?? p.materialList ?? p.components ?? {},
      })),
    [products]
  );

  const productMap = useMemo(() => {
    const map = {};
    normalizedProducts.forEach((p) => (map[p._id] = p));
    return map;
  }, [normalizedProducts]);

  useEffect(() => {
    setSelectedProductId("");
    setCalculated(null);
  }, [filters]);

  useEffect(() => {
    if (
      !selectedProductId ||
      !productMap[selectedProductId] ||
      Number(quantity) <= 0
    ) {
      setCalculated(null);
      return;
    }

    const prod = productMap[selectedProductId];
    const baseMeters = Number(prod.baseFabricMetersPerUnit || 2.5);
    const totalMeters = +(baseMeters * Number(quantity)).toFixed(2);

    const calculatedMaterials = Object.entries(prod.materials || {}).reduce(
      (acc, [k, v]) => {
        acc[k] = +(Number(v || 0) * Number(quantity)).toFixed(2);
        return acc;
      },
      {}
    );

    const firstRoll = (Array.isArray(clothRolls) ? clothRolls : []).find(
      (r) =>
        r &&
        (Number(r.remainingMeters) ||
          Number(r.amount) ||
          Number(r.lengthMeters))
    );
    const rollLength = firstRoll
      ? Number(
          firstRoll.remainingMeters ??
            firstRoll.amount ??
            firstRoll.lengthMeters ??
            50
        )
      : 50;
    const rollsNeeded = Math.ceil(totalMeters / Math.max(1, rollLength));

    setCalculated({
      product: prod,
      totalMeters,
      baseMeters,
      calculatedMaterials,
      rollsNeeded,
      rollLength,
    });
  }, [selectedProductId, quantity, size, productMap, clothRolls]);

  const categories = useMemo(
    () => [
      ...new Set(normalizedProducts.map((p) => p.category).filter(Boolean)),
    ],
    [normalizedProducts]
  );
  const subcategories = useMemo(() => {
    if (!filters.category) {
      return [
        ...new Set(
          normalizedProducts.map((p) => p.subcategory).filter(Boolean)
        ),
      ];
    }
    return [
      ...new Set(
        normalizedProducts
          .filter((p) => p.category === filters.category)
          .map((p) => p.subcategory)
          .filter(Boolean)
      ),
    ];
  }, [normalizedProducts, filters.category]);

  const brands = useMemo(() => {
    let list = normalizedProducts;
    if (filters.category)
      list = list.filter((p) => p.category === filters.category);
    if (filters.subcategory)
      list = list.filter((p) => p.subcategory === filters.subcategory);
    return [...new Set(list.map((p) => p.brand).filter(Boolean))];
  }, [normalizedProducts, filters]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-4">
        <Ruler className="mr-2 text-green-600" /> Material Requirement
        Calculator
      </h2>

      {/* Calculator UI (unchanged) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <label className="block">
          <div className="text-sm font-medium text-gray-700">Category</div>
          <select
            value={filters.category}
            onChange={(e) =>
              setFilters((s) => ({ ...s, category: e.target.value }))
            }
            className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <div className="text-sm font-medium text-gray-700">Subcategory</div>
          <select
            value={filters.subcategory}
            onChange={(e) =>
              setFilters((s) => ({ ...s, subcategory: e.target.value }))
            }
            className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"
          >
            <option value="">All subcategories</option>
            {subcategories.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <div className="text-sm font-medium text-gray-700">Brand</div>
          <select
            value={filters.brand}
            onChange={(e) =>
              setFilters((s) => ({ ...s, brand: e.target.value }))
            }
            className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"
          >
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <div className="text-sm font-medium text-gray-700">Product</div>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"
          >
            <option value="">-- Choose a product --</option>
            {normalizedProducts
              .filter((p) => {
                if (filters.category && p.category !== filters.category)
                  return false;
                if (
                  filters.subcategory &&
                  p.subcategory !== filters.subcategory
                )
                  return false;
                if (filters.brand && p.brand !== filters.brand) return false;
                return true;
              })
              .map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
          </select>
        </label>

        <label className="md:col-span-1 block">
          <div className="text-sm font-medium text-gray-700">Size</div>
          <select
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"
          >
            <option>M</option>
            <option>L</option>
            <option>XL</option>
            <option>3XL</option>
            <option>5XL</option>
          </select>
        </label>

        <label className="md:col-span-1 block">
          <div className="text-sm font-medium text-gray-700">Quantity</div>
          <input
            type="number"
            value={quantity}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "" || Number(val) >= 0) setQuantity(Number(val || 0));
            }}
            className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"
            min={0}
          />
        </label>
      </div>

      {calculated && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <h3 className="text-lg font-bold text-green-800 mb-2">
            Calculated Materials:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-green-900">
            <div>
              <div>
                <strong>Product:</strong> {calculated.product.name}
              </div>
              <div>
                <strong>Base meters/unit:</strong> {calculated.baseMeters} m
              </div>
              <div>
                <strong>Total fabric meters:</strong> {calculated.totalMeters} m
              </div>
              <div>
                <strong>Roll length used:</strong> {calculated.rollLength} m
              </div>
              <div>
                <strong>Rolls needed:</strong> {calculated.rollsNeeded}
              </div>
            </div>

            <div className="md:col-span-2">
              <strong>Materials breakdown:</strong>
              <ul className="mt-2 list-disc pl-5">
                {Object.entries(calculated.calculatedMaterials).map(
                  ([k, v]) => (
                    <li key={k}>
                      {k}: {v}
                    </li>
                  )
                )}
                {Object.keys(calculated.calculatedMaterials).length === 0 && (
                  <li>No material data</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------- AssignRollsPage (now with inline multi-row assign UI) ----------------- */
export default function AssignRollsPage() {
  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      assignMeters: "",
      itemType: "",
      fabricType: "",
      quantity: 1,
    },
  });

  const [clothRolls, setClothRolls] = useState([]); // normalized items used in rows
  const [tailors, setTailors] = useState([]);
  const [serverMasterTotals, setServerMasterTotals] = useState([]);

  const [loadingRolls, setLoadingRolls] = useState(true);
  const [loadingTailors, setLoadingTailors] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);

  // inline form data (multi-row) — mirrors your modal structure
  const [formData, setFormData] = useState({
    tailorId: "",
    assignedDate: new Date().toISOString().split("T")[0],
    consumptions: [emptyConsumption()],
  });

  const [localError, setLocalError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Helper: safe numeric coercion for availability
  const toNumberSafe = (v, fallback = 0) => {
    if (v === null || v === undefined) return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  // fetch masterTotals (preferred shape)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingRolls(true);
        const res = await apiClient.get("/tailors/master/assignments");
        console.log("master assignments:", res.data);
        const payload = res?.data ?? {};

        if (
          Array.isArray(payload.masterTotals) &&
          payload.masterTotals.length
        ) {
          setServerMasterTotals(payload.masterTotals);
          const arr = payload.masterTotals.map((mt) => {
            // try to resolve a real DB id from a few common fields
            const candidateIds = [
              mt.clothAmountId,
              mt.clothDoc && mt.clothDoc._id,
              mt.clothDoc && mt.clothDoc.clothAmountId,
              mt._id,
              mt.key,
              mt.rollId,
              mt.rollId && mt.rollId._id,
            ];

            // pick first candidate that looks like an ObjectId (24 hex chars)
            const looksLikeObjectId = (id) =>
              !!id && typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);

            let resolvedId = null;
            for (const cand of candidateIds) {
              if (looksLikeObjectId(String(cand))) {
                resolvedId = String(cand);
                break;
              }
            }

            // fallback: keep mt.clothAmountId || mt._id || synthetic key (existing behavior)
            const computedId =
              resolvedId ??
              mt.clothAmountId ??
              mt._id ??
              mt.key ??
              `${mt.fabricType}_${mt.itemType}_${mt.unit}`;

            const rawAvailable =
              mt.available ??
              mt.totalAssigned ??
              mt.clothDoc?.amount ??
              mt.totalAvailable ??
              0;
            const remaining = toNumberSafe(rawAvailable, 0);

            return {
              _id: computedId,
              fabricType: mt.fabricType ?? mt.clothDoc?.fabricType ?? "",
              itemType: mt.itemType ?? mt.clothDoc?.itemType ?? "",
              remainingMeters: remaining,
              unitType: mt.unit ?? mt.clothDoc?.unit ?? "m",
              serialNumber:
                mt.clothDoc?.serialNumber ?? mt.serialNumber ?? null,
              raw: mt,
              __resolvedObjectId: resolvedId, // helpful for debugging; optional
            };
          });
          if (mounted) setClothRolls(arr);
          return;
        }

        // fallback shapes (when server returns clothAmount docs or other arrays)
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
          // compute remaining robustly
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

  // fetch tailors — use assigned-all-tailor endpoint
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

  /* ---------- helpers for multi-row assignment ---------- */
  const clothAmounts = Array.isArray(clothRolls) ? clothRolls : [];

  // Robust availability extraction — always returns a Number
  const getAmountAvailable = (ca) => {
    if (!ca) return 0;
    // prefer remainingMeters (already coerced at load), else fallback to other fields
    if (ca.remainingMeters !== undefined && ca.remainingMeters !== null) {
      return toNumberSafe(ca.remainingMeters, 0);
    }
    if (ca.available !== undefined && ca.available !== null)
      return toNumberSafe(ca.available, 0);
    if (ca.amount !== undefined && ca.amount !== null)
      return toNumberSafe(ca.amount, 0);
    if (ca.totalAmount !== undefined && ca.totalAmount !== null)
      return toNumberSafe(ca.totalAmount, 0);
    if (ca.totalAssigned !== undefined && ca.totalAssigned !== null)
      return toNumberSafe(ca.totalAssigned, 0);
    // try nested clothDoc.amount if present
    if (ca.raw && ca.raw.clothDoc && ca.raw.clothDoc.amount !== undefined) {
      return toNumberSafe(ca.raw.clothDoc.amount, 0);
    }
    return 0;
  };

  const amountAvailableMap = useMemo(() => {
    const map = {};
    clothAmounts.forEach((c) => {
      map[String(c._id)] = getAmountAvailable(c);
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

  useEffect(() => {
    // validate rows whenever consumptions or tailorId change
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
        setLocalError(
          `Row ${i + 1}: please provide fabric or item (at least one).`
        );
        return;
      }
      const num = toNumberSafe(c.amount || 0, NaN);
      if (!c.amount || isNaN(num) || num <= 0) {
        setLocalError(`Row ${i + 1}: enter a valid amount (> 0).`);
        return;
      }
      const available = amountAvailableMap[String(c.clothAmountId)] ?? 0;
      if (num > available) {
        setLocalError(
          `Row ${
            i + 1
          }: requested amount (${num}) exceeds available (${available}).`
        );
        return;
      }
    }

    for (const [id, totalReq] of Object.entries(requestedPerClothAmount)) {
      const available = amountAvailableMap[id] || 0;
      if (totalReq > available) {
        setLocalError(
          `Total requested for selected cloth (${id}) is ${totalReq} which exceeds its available ${available}.`
        );
        return;
      }
    }
  }, [
    formData.tailorId,
    formData.consumptions,
    amountAvailableMap,
    requestedPerClothAmount,
  ]);

  /* ---------- form helpers ---------- */
  const handleAddRow = () =>
    setFormData((s) => ({
      ...s,
      consumptions: [...s.consumptions, emptyConsumption()],
    }));
  const handleRemoveRow = (idx) =>
    setFormData((s) => ({
      ...s,
      consumptions: s.consumptions.filter((_, i) => i !== idx),
    }));
  const handleRowChange = (idx, key, value) =>
    setFormData((s) => {
      const consumptions = s.consumptions.map((r, i) =>
        i === idx ? { ...r, [key]: value } : r
      );
      return { ...s, consumptions };
    });

  const onRowClothAmountSelect = (idx, clothAmountId) => {
    const found =
      clothAmounts.find((c) => String(c._id) === String(clothAmountId)) || {};
    const fabric = found.fabricType ?? found.fabric ?? found.fabric_type ?? "";
    const item = found.itemType ?? found.item ?? found.item_type ?? "";
    const unit = found.unitType ?? found.unit ?? "meters";

    setFormData((prev) => {
      const consumptions = prev.consumptions.slice();
      consumptions[idx] = {
        ...consumptions[idx],
        clothAmountId,
        fabricType: consumptions[idx].fabricType
          ? consumptions[idx].fabricType
          : fabric,
        itemType: consumptions[idx].itemType
          ? consumptions[idx].itemType
          : item,
        unitType: consumptions[idx].unitType
          ? consumptions[idx].unitType
          : unit,
      };
      return { ...prev, consumptions };
    });
  };

  const pretty = (v) =>
    v || v === 0 ? String(v).charAt(0).toUpperCase() + String(v).slice(1) : "";
  const clothTitle = (c) => {
    if (!c) return "Unknown";
    const fabric = c.fabricType ?? c.fabric ?? c.fabric_type ?? "";
    const item = c.itemType ?? c.item ?? c.item_type ?? "";
    const available = getAmountAvailable(c); // guaranteed Number now
    const unit = c.unitType ?? c.unit ?? "";
    const titlePart =
      [pretty(fabric), pretty(item)].filter(Boolean).join(" / ") ||
      (c._id ?? "Unknown");
    return `${titlePart} — ${available} ${unit || ""}`;
  };

  /* ---------- submission (batch or per-consumption master) ---------- */

  /**
   * submitAssignments:
   * - If each consumption row contains parentAssignmentId & parentConsumptionId, call master endpoint per row:
   *     POST /tailors/master/allocate-to-tailor
   *     body: { parentAssignmentId, parentConsumptionId, targetTailorId, amount, unitType }
   * - Otherwise fall back to batch endpoint:
   *     POST /tailors/assign-cloth-roll
   *
   * Returns the axios response like the server returns.
   */
  const submitAssignments = async (payload) => {
    // if every consumption row already contains parent IDs -> use master endpoint per consumption
    const consumptions = Array.isArray(payload.clothConsumptions)
      ? payload.clothConsumptions
      : [];

    const allHaveParentIds =
      consumptions.length > 0 &&
      consumptions.every((c) => c.parentAssignmentId && c.parentConsumptionId);

    if (allHaveParentIds) {
      // call per consumption sequentially so parent allocation constraints are respected
      const results = [];
      for (const c of consumptions) {
        const body = {
          parentAssignmentId: c.parentAssignmentId,
          parentConsumptionId: c.parentConsumptionId,
          targetTailorId: payload.tailorId,
          amount: c.amount,
          unitType: c.unitType || c.unit || "meters",
        };
        // server expects these exact fields; bubble up any error
        const res = await apiClient.post(
          "/tailors/master/allocate-to-tailor",
          body
        );
        results.push(res.data);
      }
      // normalize return shape so caller can handle it
      return {
        data: {
          allocations: results,
          message: "Allocated per consumption (master endpoint)",
        },
      };
    }

    // fallback: try the batch endpoint first (keeps existing aggregate UI working)
    try {
      return await apiClient.post("/tailors/assign-cloth-roll", payload);
    } catch (batchErr) {
      // if batch fails, try to surface the real server error for easier debugging
      console.warn(
        "Batch endpoint failed:",
        batchErr?.response?.data ?? batchErr?.message ?? batchErr
      );
      // Re-throw to be handled by caller
      throw batchErr;
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

    // Build clothConsumptions but resolve clothAmountId -> real ObjectId when possible
    const processedConsumptions = [];
    let hadNonObjectId = false;
    let abortBecauseMissingId = false;
    const missingIdRows = [];

    formData.consumptions.forEach((c, idx) => {
      const base = {
        unitType: c.unitType,
        amount: toNumberSafe(c.amount, 0),
      };
      if (String(c.fabricType || "").trim())
        base.fabricType = c.fabricType.trim();
      if (String(c.itemType || "").trim()) base.itemType = c.itemType.trim();

      const selId = String(c.clothAmountId || "");
      const found = clothAmounts.find((x) => String(x._id) === selId) || null;

      // Try to resolve a DB ObjectId for clothAmount
      const resolved = resolveClothAmountRealId(found);

      if (resolved) {
        // resolved is an ObjectId string — prefer sending clothAmountId
        base.clothAmountId = resolved;
      } else {
        // try to detect a real rollId on the selected item (server accepts rollId too)
        const maybeRollId =
          (found &&
            (found.rollId ||
              found.raw?.rollId ||
              found.raw?.clothDoc?.rollId)) ||
          null;
        if (maybeRollId && looksLikeObjectId(String(maybeRollId))) {
          base.rollId = String(maybeRollId);
        } else {
          // no actionable id found — mark as missing so we can block submission
          hadNonObjectId = true;
          abortBecauseMissingId = true;
          missingIdRows.push({
            row: idx + 1,
            candidate: selId || found?._id || null,
          });
          // don't add a clothIdentifier fallback — server rejects that shape
        }
      }

      // preserve parent ids if user somehow filled them
      if (c.parentAssignmentId) base.parentAssignmentId = c.parentAssignmentId;
      if (c.parentConsumptionId)
        base.parentConsumptionId = c.parentConsumptionId;

      processedConsumptions.push(base);
    });

    if (abortBecauseMissingId) {
      // stop submission and inform the user which rows are invalid — safer than sending clothIdentifier
      const rowsText = missingIdRows
        .map((r) => `Row ${r.row} (${r.candidate || "unknown"})`)
        .join(", ");
      toast.error(
        `Cannot assign — the following rows are not mapped to a DB id: ${rowsText}. Please re-select valid cloth items / rolls.`
      );
      setSubmitting(false);
      return;
    }

    // hadNonObjectId used only for a non-blocking notice if desired; we already blocked above, so this is optional
    if (hadNonObjectId) {
      // note: not necessary after abort; kept for compatibility if you change behaviour later
      // toast("Some selected cloth items were not mapped to DB ids — payload sent without clothAmountId for those rows. Check console for details.", { icon: "⚠️", duration: 6000 });
    }

    const payload = {
      tailorId: formData.tailorId,
      assignedDate: formData.assignedDate,
      clothConsumptions: processedConsumptions,
    };

    try {
      const res = await submitAssignments(payload);

      // The submitAssignments returns either axios response OR a normalized object for per-row master calls.
      const data = res?.data ?? res;

      // Keep your existing update/merge logic but when updating clothRolls ensure numeric coercion
      if (Array.isArray(data.masterTotals) && data.masterTotals.length) {
        setServerMasterTotals(data.masterTotals);
        const arr = data.masterTotals.map((mt) => {
          const rawAvailable =
            mt.available ?? mt.totalAssigned ?? mt.clothDoc?.amount ?? 0;
          const remaining = toNumberSafe(rawAvailable, 0);
          return {
            _id: mt.clothAmountId ?? mt._id,
            fabricType: mt.fabricType ?? mt.clothDoc?.fabricType ?? "",
            itemType: mt.itemType ?? mt.clothDoc?.itemType ?? "",
            remainingMeters: remaining,
            unitType: mt.unit ?? mt.clothDoc?.unit ?? "m",
            serialNumber: mt.clothDoc?.serialNumber,
            raw: mt,
          };
        });
        setClothRolls(arr);
      } else if (
        Array.isArray(data.updatedClothAmounts) &&
        data.updatedClothAmounts.length
      ) {
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
      } else if (data.allocations) {
        // response from per-consumption master calls (our normalized shape)
        // optionally we could merge parentAssignment updates if included; for now show success
      }

      setSuccessData({
        message:
          data.message ||
          data?.allocations?.[0]?.message ||
          "Assignments created",
        payload: data,
      });
      toast.success(data.message || "Assignments created");

      // reset form
      setFormData({
        tailorId: "",
        assignedDate: new Date().toISOString().split("T")[0],
        consumptions: [emptyConsumption()],
      });
    } catch (err) {
      // show server message if available
      console.error("Assignment error response:", err?.response?.data ?? err);
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to create assignments"
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- filtered / available display ---------- */
  const filteredRolls = useMemo(() => {
    const q = (searchQuery || "").trim().toLowerCase();
    return (clothRolls || []).filter((roll) => {
      if (!q) return true;
      const fabric = String(
        roll.fabricType || roll.itemType || ""
      ).toLowerCase();
      const serial = String(
        roll.serialNumber || roll.rollNo || roll._id || ""
      ).toLowerCase();
      return fabric.includes(q) || serial.includes(q);
    });
  }, [clothRolls, searchQuery]);

  const availableRolls = useMemo(
    () =>
      filteredRolls.filter(
        (r) =>
          (r.status ?? "Available").toString().toLowerCase() === "available"
      ),
    [filteredRolls]
  );

  /* ---------- render ---------- */
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="p-6 bg-gray-50 min-h-screen"
    >
      <div className="max-w-7xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Roll Assignment & Material Planning
        </h1>

        <MaterialCalculator products={[]} clothRolls={clothRolls} />

        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-4">
            <UserCheck className="mr-2 text-indigo-600" /> Assign Roll to Tailor
            (Aggregate)
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
                  onChange={(e) =>
                    setFormData({ ...formData, tailorId: e.target.value })
                  }
                  className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"
                  disabled={loadingTailors}
                >
                  <option value="">
                    {loadingTailors
                      ? "Loading tailors..."
                      : "-- Choose a tailor --"}
                  </option>
                  {(tailors || [])
                    .filter((t) =>
                      typeof t.role === "string"
                        ? t.role.trim().toLowerCase() === "tailor"
                        : true
                    )
                    .map((t) => (
                      <option key={t._id} value={t._id}>
                        {capitalize(t.username || t.name || "Unnamed")}{" "}
                        {t.skillLevel ? `(${t.skillLevel})` : ""}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assignment Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.assignedDate}
                  onChange={(e) =>
                    setFormData({ ...formData, assignedDate: e.target.value })
                  }
                  className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"
                />
              </div>
            </div>

            {/* Consumptions (rows) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">
                  Consumptions (select aggregate item)
                </h3>
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="inline-flex items-center gap-1 text-sm text-indigo-600"
                >
                  <Plus className="w-4 h-4" /> Add row
                </button>
              </div>

              {formData.consumptions.map((row, idx) => (
                <div key={idx} className="border p-3 rounded-md bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium">Row {idx + 1}</div>
                    {formData.consumptions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="text-red-500 inline-flex items-center gap-1"
                      >
                        <Minus className="w-4 h-4" /> Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <select
                      required
                      value={row.clothAmountId}
                      onChange={(e) =>
                        onRowClothAmountSelect(idx, e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">
                        Select cloth (aggregate item) for this row...
                      </option>
                      {clothAmounts.map((ca) => {
                        const avail = getAmountAvailable(ca);
                        if (avail <= 0) return null;
                        return (
                          <option key={ca._id} value={ca._id}>
                            {clothTitle(ca)}
                          </option>
                        );
                      })}
                    </select>

                    <input
                      type="text"
                      value={row.fabricType}
                      onChange={(e) =>
                        handleRowChange(idx, "fabricType", e.target.value)
                      }
                      placeholder="Fabric Type (optional if Item provided)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="text"
                      value={row.itemType}
                      onChange={(e) =>
                        handleRowChange(idx, "itemType", e.target.value)
                      }
                      placeholder="Item Type (optional if Fabric provided)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />

                    <div className="flex gap-2 items-center">
                      <select
                        value={row.unitType}
                        onChange={(e) =>
                          handleRowChange(idx, "unitType", e.target.value)
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="meters">Meters</option>
                        <option value="kilos">Kilos</option>
                        <option value="unit">Units</option>
                      </select>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={row.amount}
                        onChange={(e) =>
                          handleRowChange(idx, "amount", e.target.value)
                        }
                        placeholder="Amount"
                        className="w-36 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    {row.clothAmountId && (
                      <div className="text-xs text-gray-600 mt-1">
                        Available:{" "}
                        <strong>
                          {amountAvailableMap[row.clothAmountId] ?? 0}{" "}
                          {clothAmounts.find(
                            (c) => String(c._id) === String(row.clothAmountId)
                          )?.unitType ?? ""}
                        </strong>{" "}
                        — Requested for this item:{" "}
                        <strong>
                          {requestedPerClothAmount[String(row.clothAmountId)] ??
                            0}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Items summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Items Summary</h4>
              <div className="text-sm text-gray-600 space-y-1">
                {Object.keys(requestedPerClothAmount).length === 0 && (
                  <p>No items selected yet.</p>
                )}
                {Object.entries(requestedPerClothAmount).map(([id, req]) => {
                  const c = clothAmounts.find(
                    (x) => String(x._id) === String(id)
                  );
                  const avail = amountAvailableMap[id] ?? 0;
                  const rem = Math.max(0, avail - req);
                  const fabric =
                    c?.fabricType ?? c?.fabric ?? c?.fabric_type ?? "";
                  const item = c?.itemType ?? c?.item ?? c?.item_type ?? "";
                  const titleParts = [fabric, item]
                    .map((s) => (s ? pretty(s) : null))
                    .filter(Boolean);
                  const title =
                    titleParts.length > 0
                      ? titleParts.join(" / ")
                      : c?.name ?? "Unknown";
                  const unit = c?.unitType ?? c?.unit ?? "";
                  return (
                    <p key={id}>
                      <strong>{title}:</strong> Available {avail} {unit} —
                      Requested {req} — Remaining {rem} {unit}
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
                  // reset inline form
                  setFormData({
                    tailorId: "",
                    assignedDate: new Date().toISOString().split("T")[0],
                    consumptions: [emptyConsumption()],
                  });
                  setLocalError("");
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                disabled={submitting}
              >
                Reset
              </button>

              <button
                type="submit"
                disabled={submitting || !!localError || !formData.tailorId}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? "Assigning..." : "Assign Items"}
              </button>
            </div>
          </form>
        </div>

        {/* Success Modal (simple inline result) */}
        {successData && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full text-center"
            >
              <CheckCircle2 className="mx-auto text-green-600 w-12 h-12 mb-3" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                {successData.message || "Success"}
              </h3>
              <pre className="text-xs text-left max-h-48 overflow-auto bg-gray-50 p-2 rounded">
                {JSON.stringify(successData.payload ?? successData, null, 2)}
              </pre>
              <button
                onClick={() => setSuccessData(null)}
                className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

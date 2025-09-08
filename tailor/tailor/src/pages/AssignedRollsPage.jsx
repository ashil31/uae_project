import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { Ruler, UserCheck, CheckCircle2, Search } from "lucide-react";
import apiClient from "../api/apiClient";

// Minimal fallback product used when API fails
const productRecipesFallback = {
  bomber_jacket: {
    _id: "bomber_jacket",
    name: "Bomber Jacket",
    baseFabricMetersPerUnit: 2.5,
    materials: { fabric: 2.5 },
  },
};

function capitalize(str) {
  if (str === undefined || str === null) return "";
  const s = String(str);
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function MaterialCalculator({ products = [], clothRolls = [] }) {
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [size] = useState("M"); // reserved for future size adjustments
  const [calculated, setCalculated] = useState(null);

  const normalized = useMemo(
    () =>
      products.map((p) => ({
        _id: p._id ?? p.id ?? p.name,
        name: p.name ?? p.title ?? p.productName,
        baseFabricMetersPerUnit: p.baseFabricMetersPerUnit ?? p.baseFabricMeters ?? p.baseMeters,
        materials: p.materials ?? p.materialList ?? p.components ?? {},
      })),
    [products]
  );

  const productMap = useMemo(() => {
    const map = {};
    normalized.forEach((p) => (map[p._id] = p));
    Object.values(productRecipesFallback).forEach((p) => {
      if (!map[p._id]) map[p._id] = p;
    });
    return map;
  }, [normalized]);

  useEffect(() => {
    if (!selectedProductId || quantity <= 0) return setCalculated(null);
    const prod = productMap[selectedProductId];
    if (!prod) return setCalculated(null);

    const baseMeters = Number(prod.baseFabricMetersPerUnit ?? 2.5);
    const totalMeters = +(baseMeters * quantity).toFixed(2);

    const calculatedMaterials = Object.entries(prod.materials || {}).reduce(
      (acc, [k, v]) => {
        acc[k] = +(v * quantity).toFixed(2);
        return acc;
      },
      {}
    );

    const firstRoll = (Array.isArray(clothRolls) ? clothRolls : []).find(
      (r) => r && (r.remainingMeters || r.amount || r.lengthMeters)
    );
    const rollLength = firstRoll ? firstRoll.remainingMeters ?? firstRoll.amount ?? firstRoll.lengthMeters : 50;
    const rollsNeeded = Math.ceil(totalMeters / Math.max(1, rollLength));

    setCalculated({ product: prod, totalMeters, baseMeters, calculatedMaterials, rollsNeeded, rollLength });
  }, [selectedProductId, quantity, size, productMap, clothRolls]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-4">
        <Ruler className="mr-2 text-green-600" /> Material Requirement Calculator
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <label className="block">
          <div className="text-sm font-medium text-gray-700">Product</div>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"
          >
            <option value="">-- Choose a product --</option>
            {Object.values(productMap).map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <div className="text-sm font-medium text-gray-700">Size</div>
          <select value={size} disabled className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm">
            <option>M</option>
            <option>L</option>
            <option>XL</option>
          </select>
        </label>

        <label className="block">
          <div className="text-sm font-medium text-gray-700">Quantity</div>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value || 1)))}
            className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"
          />
        </label>

        <div className="flex items-center justify-end">
          <div className="text-sm text-gray-600">Estimation only</div>
        </div>
      </div>

      {calculated && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <h3 className="text-lg font-bold text-green-800 mb-2">Calculated Materials:</h3>
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
                <strong>Rolls needed (est.):</strong> {calculated.rollsNeeded} (roll length {calculated.rollLength} m)
              </div>
            </div>

            <div className="md:col-span-2">
              <strong>Materials:</strong>
              <ul className="mt-1 text-sm">
                {Object.entries(calculated.calculatedMaterials).map(([k, v]) => (
                  <li key={k}>
                    {k}: {v}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AssignRollsPage() {
  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: { assignMeters: "", itemType: "", fabricType: "", quantity: 1 },
  });

  const [clothRolls, setClothRolls] = useState([]);
  const [tailors, setTailors] = useState([]);
  const [products, setProducts] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [loadingRolls, setLoadingRolls] = useState(true);
  const [loadingTailors, setLoadingTailors] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const watchedRollId = watch("rollId");

  // Fetch cloth rolls (prefer masterTotals shape)
  useEffect(() => {
    let mounted = true;
    const fetchClothRolls = async () => {
      try {
        setLoadingRolls(true);
        const res = await apiClient.get("/tailors/master/assignments");
        const payload = res?.data ?? {};

        if (Array.isArray(payload.masterTotals) && payload.masterTotals.length) {
          const arr = payload.masterTotals.map((mt) => ({
            _id: mt.clothAmountId ?? mt._id,
            fabricType: mt.fabricType ?? mt.clothDoc?.fabricType ?? "",
            itemType: mt.itemType ?? mt.clothDoc?.itemType ?? "",
            remainingMeters: typeof mt.available === "number" ? mt.available : mt.clothDoc?.amount ?? 0,
            unitType: mt.unit ?? mt.clothDoc?.unit ?? "m",
            serialNumber: mt.clothDoc?.serialNumber,
            rawMasterTotal: mt,
          }));
          if (mounted) setClothRolls(arr);
          return;
        }

        const fallbackList = Array.isArray(payload.data)
          ? payload.data
          : Array.isArray(payload.clothAmounts)
          ? payload.clothAmounts
          : Array.isArray(payload.items)
          ? payload.items
          : Array.isArray(payload)
          ? payload
          : [];

        const arr = fallbackList.map((r) => ({
          ...r,
          remainingMeters: Number(r.remainingMeters ?? r.amount ?? r.lengthMeters ?? 0),
        }));
        if (mounted) setClothRolls(arr);
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch cloth rolls");
      } finally {
        if (mounted) setLoadingRolls(false);
      }
    };
    fetchClothRolls();
    return () => (mounted = false);
  }, []);

  // Fetch tailors (use API-provided `tailors` array when available)
  useEffect(() => {
    let mounted = true;
    const fetchTailors = async () => {
      try {
        setLoadingTailors(true);
        const res = await apiClient.get("/tailors/assinged-all-tailor");
        const payload = res?.data ?? {};
        const items =
          Array.isArray(payload.tailors)
            ? payload.tailors
            : Array.isArray(payload.data)
            ? payload.data
            : Array.isArray(payload.items)
            ? payload.items
            : Array.isArray(payload)
            ? payload
            : [];
        if (mounted) setTailors(items);
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch tailors");
      } finally {
        if (mounted) setLoadingTailors(false);
      }
    };
    fetchTailors();
    return () => (mounted = false);
  }, []);

  // Filter to only role === 'tailor' if role exists; otherwise accept all
  const tailorsFiltered = useMemo(
    () =>
      tailors.filter((t) => {
        if (!t) return false;
        if (!t.role) return true;
        return String(t.role).trim().toLowerCase() === "tailor";
      }),
    [tailors]
  );

  // Fetch products
  useEffect(() => {
    let mounted = true;
    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        const res = await apiClient.get("/products/all");
        const d = res?.data ?? {};
        let list = Array.isArray(d) ? d : Array.isArray(d.products) ? d.products : Array.isArray(d.data) ? d.data : Array.isArray(d.items) ? d.items : [];
        if (!list.length) list = Object.values(productRecipesFallback);
        const normalized = list.map((p) => ({ ...p, _id: p._id ?? p.id ?? p.name, name: p.name ?? p.title ?? p.productName }));
        if (mounted) setProducts(normalized);
      } catch (err) {
        console.error(err);
        setProducts(Object.values(productRecipesFallback));
        toast.error("Failed to fetch products, using fallback");
      } finally {
        if (mounted) setLoadingProducts(false);
      }
    };
    fetchProducts();
    return () => (mounted = false);
  }, []);

  // Fetch assignments (lightweight)
  useEffect(() => {
    let mounted = true;
    const fetchAssignments = async () => {
      try {
        setLoadingAssignments(true);
        const res = await apiClient.get("/assignments");
        const payload = res?.data ?? {};
        const arr = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.assignments)
          ? payload.assignments
          : Array.isArray(payload.data)
          ? payload.data
          : [];
        if (mounted) setAssignments(arr);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoadingAssignments(false);
      }
    };
    fetchAssignments();
    return () => (mounted = false);
  }, []);

  const filteredRolls = useMemo(() => {
    const q = (searchQuery || "").trim().toLowerCase();
    return clothRolls.filter((roll) => {
      if (!q) return true;
      const fabric = String(roll.fabricType || roll.itemType || "").toLowerCase();
      const serial = String(roll.serialNumber || roll.rollNo || roll._id || "").toLowerCase();
      return fabric.includes(q) || serial.includes(q);
    });
  }, [clothRolls, searchQuery]);

  const availableRolls = useMemo(
    () => filteredRolls.filter((r) => (r.status ?? "Available").toString().toLowerCase() === "available"),
    [filteredRolls]
  );

  const selectedRoll = clothRolls.find((r) => String(r._id) === String(watchedRollId)) || null;
  const selectedTailor = tailors.find((t) => String(t._id) === String(watch("tailorId"))) || null;
  const selectedProduct = products.find((p) => (p._id || p.id || p.name) === watch("productId")) || null;

  useEffect(() => {
    if (!selectedProduct) return;
    setValue("itemType", selectedProduct.itemType ?? selectedProduct.category ?? selectedProduct.name ?? "");
    setValue("fabricType", selectedProduct.fabricType ?? selectedProduct.materialType ?? "");
  }, [selectedProduct, setValue]);

  const onSubmit = (form) => {
    if (!form.rollId || !form.tailorId) return toast.error("Please select both a roll and a tailor.");
    const assignMeters = Number(form.assignMeters ?? 0);
    if (!assignMeters || assignMeters <= 0) return toast.error("Assigned meters must be a positive number.");

    // optional server masterTotals check (if rawMasterTotal exists on clothRolls)
    const opt = (clothRolls || []).find((r) => String(r._id) === String(form.rollId))?.rawMasterTotal;
    if (opt) {
      const remaining = (typeof opt.available === "number" ? opt.available : opt.clothDoc?.amount ?? 0) - (typeof opt.totalAssigned === "number" ? opt.totalAssigned : opt.assigned ?? 0);
      if (assignMeters > Math.max(0, remaining)) return toast.error(`Assigned meters exceed master remaining (${remaining})`);
    }

    if (selectedRoll && assignMeters > (selectedRoll.remainingMeters ?? 0)) return toast.error("Assigned meters exceed roll remaining meters.");

    setConfirmOpen(true);
  };

  const confirmAssign = async () => {
    const formValues = {
      rollId: watch("rollId"),
      tailorId: watch("tailorId"),
      assignMeters: Number(watch("assignMeters") ?? 0),
      productId: watch("productId") || null,
      itemType: watch("itemType") || "",
      fabricType: watch("fabricType") || "",
      quantity: Number(watch("quantity") || 1),
    };

    setConfirmOpen(false);
    setSubmitting(true);
    try {
      const res = await apiClient.patch("/tailors/cloth-amount-minus", {
        assignedMeters: formValues.assignMeters,
        tailorId: formValues.tailorId,
        productId: formValues.productId,
        itemType: formValues.itemType,
        fabricType: formValues.fabricType,
        quantity: formValues.quantity,
        clothAmountId: formValues.rollId,
      });

      const updatedRoll = res?.data?.roll;
      if (updatedRoll) {
        setClothRolls((prev) =>
          prev
            .map((r) =>
              r._id === updatedRoll._id
                ? { ...r, ...updatedRoll, remainingMeters: Number(updatedRoll.remainingMeters ?? updatedRoll.amount ?? 0) }
                : r
            )
            .filter((r) => (r.remainingMeters ?? 0) > 0)
        );
      }

      if (res?.data?.assignment) setAssignments((prev) => [res.data.assignment, ...prev]);

      setSuccessData({ message: res?.data?.message || "Assigned successfully", roll: updatedRoll, tailor: tailors.find((t) => t._id === formValues.tailorId) });
      toast.success(res?.data?.message || "Assigned successfully");
      reset();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to assign roll");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-gray-800">Roll Assignment & Material Planning</h1>

        <MaterialCalculator products={products} clothRolls={clothRolls} />

        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-4">
            <UserCheck className="mr-2 text-indigo-600" /> Assign Roll to Tailor
          </h2>

          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 text-gray-400" />
              <input
                type="search"
                placeholder="Search rolls by fabric or Item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-3 py-2 w-full border rounded-md"
                aria-label="Search cloth rolls"
              />
            </div>

            <div className="text-sm text-gray-600">
              {loadingRolls ? "Loading rolls..." : `${availableRolls.length} available`}
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Cloth Roll</label>
                <select {...register("rollId", { required: true })} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" disabled={loadingRolls} aria-label="Select cloth roll">
                  <option value="">{loadingRolls ? "Loading..." : "-- Choose a roll --"}</option>
                  {availableRolls.length ? (
                    availableRolls.map((r) => {
                      const fabric = (r.fabricType || "").trim();
                      const item = (r.itemType || "").trim();
                      const left = item && fabric ? `${item} / ${fabric}` : item || fabric || "Unnamed roll";
                      return (
                        <option key={r._id} value={r._id}>
                          {`${left} - ${r.remainingMeters ?? r.amount} ${r.unitType ?? "m"} ${r.serialNumber ? `(S: ${r.serialNumber})` : ""}`}
                        </option>
                      );
                    })
                  ) : (
                    <option disabled>No rolls available</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Assign to Tailor</label>
                <select {...register("tailorId", { required: true })} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" disabled={loadingTailors} aria-label="Select tailor">
                  <option value="">{loadingTailors ? "Loading tailors..." : "-- Choose a tailor --"}</option>
                  {tailorsFiltered.map((t) => (
                    <option key={t._id} value={t._id}>
                      {capitalize(t.username || t.name || t.email || "Unnamed")}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Product (optional)</label>
                <select {...register("productId")} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm">
                  <option value="">-- Choose product (optional) --</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Item Type</label>
                <input {...register("itemType")} placeholder="e.g. Bomber Jacket" className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Fabric Type</label>
                <input {...register("fabricType")} placeholder="e.g. Cotton" className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Assign Meters</label>
                <input type="number" step="0.01" {...register("assignMeters")} placeholder="Meters to assign" className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" />
                <p className="text-xs text-gray-500 mt-1">Make sure assigned meters ≤ selected roll remaining meters.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Quantity (for product)</label>
                <input {...register("quantity")} name="quantity" type="number" defaultValue={1} min={1} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" />
              </div>

              <div className="flex items-end justify-end">
                <button type="submit" disabled={submitting || loadingRolls || loadingTailors} className={`inline-flex items-center px-4 py-2 ${submitting ? "bg-gray-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"} text-white font-medium rounded-md`}>
                  {submitting ? "Assigning..." : "Assign Roll"}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Confirmation Modal */}
        {confirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.18 }} className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full" role="dialog" aria-modal="true">
              <h3 className="text-lg font-bold mb-2">Confirm Assignment</h3>
              <p className="text-sm text-gray-700 mb-4">You're about to assign:</p>

              <div className="mb-3 text-sm text-gray-800">
                <div>
                  <strong>Roll:</strong> {selectedRoll ? `${selectedRoll.fabricType || selectedRoll.itemType} - ${selectedRoll.remainingMeters ?? 0} ${selectedRoll.unitType ?? "m"}` : "—"}
                </div>
                <div>
                  <strong>Tailor:</strong> {selectedTailor ? capitalize(selectedTailor.username) || selectedTailor.name : "—"}
                </div>
                <div>
                  <strong>Assign Meters:</strong> {watch("assignMeters")}
                </div>
                <div>
                  <strong>Product:</strong> {selectedProduct ? selectedProduct.name : "—"}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => setConfirmOpen(false)} className="px-4 py-2 rounded-md border">Cancel</button>
                <button onClick={confirmAssign} className="px-4 py-2 bg-indigo-600 text-white rounded-md">Confirm & Assign</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Success Modal */}
        {successData && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.25 }} className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full text-center">
              <CheckCircle2 className="mx-auto text-green-600 w-12 h-12 mb-3" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">{successData.message}</h3>
              <p className="text-gray-600 mb-1">
                <strong>Roll:</strong> {successData.roll?.fabricType ?? successData.roll?.itemType} - {successData.roll?.remainingMeters ?? successData.roll?.amount} {successData.roll?.unitType}
              </p>
              <p className="text-gray-600 mb-4">
                <strong>Tailor:</strong> {capitalize(successData.tailor?.username) || successData.tailor?.name}
              </p>
              <button onClick={() => setSuccessData(null)} className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Close</button>
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

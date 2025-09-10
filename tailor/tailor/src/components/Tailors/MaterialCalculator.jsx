// src/components/MaterialCalculator.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Ruler } from "lucide-react";
import { toNumberSafe } from "../../utils/clothUtils";

/**
 * MaterialCalculator component - same logic as before but separated
 * props:
 *   products: []
 *   clothRolls: []
 */
export default function MaterialCalculator({ products = [], clothRolls = [] }) {
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
          firstRoll.remainingMeters ?? firstRoll.amount ?? firstRoll.lengthMeters ?? 50
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
    () => [...new Set(normalizedProducts.map((p) => p.category).filter(Boolean))],
    [normalizedProducts]
  );
  const subcategories = useMemo(() => {
    if (!filters.category) {
      return [
        ...new Set(normalizedProducts.map((p) => p.subcategory).filter(Boolean)),
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
    if (filters.category) list = list.filter((p) => p.category === filters.category);
    if (filters.subcategory) list = list.filter((p) => p.subcategory === filters.subcategory);
    return [...new Set(list.map((p) => p.brand).filter(Boolean))];
  }, [normalizedProducts, filters]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-4">
        <Ruler className="mr-2 text-green-600" /> Material Requirement Calculator
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <label className="block">
          <div className="text-sm font-medium text-gray-700">Category</div>
          <select
            value={filters.category}
            onChange={(e) => setFilters((s) => ({ ...s, category: e.target.value }))}
            className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"
          >
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <label className="block">
          <div className="text-sm font-medium text-gray-700">Subcategory</div>
          <select
            value={filters.subcategory}
            onChange={(e) => setFilters((s) => ({ ...s, subcategory: e.target.value }))}
            className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"
          >
            <option value="">All subcategories</option>
            {subcategories.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>

        <label className="block">
          <div className="text-sm font-medium text-gray-700">Brand</div>
          <select
            value={filters.brand}
            onChange={(e) => setFilters((s) => ({ ...s, brand: e.target.value }))}
            className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"
          >
            <option value="">All brands</option>
            {brands.map((b) => <option key={b} value={b}>{b}</option>)}
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
                if (filters.category && p.category !== filters.category) return false;
                if (filters.subcategory && p.subcategory !== filters.subcategory) return false;
                if (filters.brand && p.brand !== filters.brand) return false;
                return true;
              })
              .map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
        </label>

        <label className="md:col-span-1 block">
          <div className="text-sm font-medium text-gray-700">Size</div>
          <select value={size} onChange={(e) => setSize(e.target.value)} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm">
            <option>M</option><option>L</option><option>XL</option><option>3XL</option><option>5XL</option>
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
          <h3 className="text-lg font-bold text-green-800 mb-2">Calculated Materials:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-green-900">
            <div>
              <div><strong>Product:</strong> {calculated.product.name}</div>
              <div><strong>Base meters/unit:</strong> {calculated.baseMeters} m</div>
              <div><strong>Total fabric meters:</strong> {calculated.totalMeters} m</div>
              <div><strong>Roll length used:</strong> {calculated.rollLength} m</div>
              <div><strong>Rolls needed:</strong> {calculated.rollsNeeded}</div>
            </div>

            <div className="md:col-span-2">
              <strong>Materials breakdown:</strong>
              <ul className="mt-2 list-disc pl-5">
                {Object.entries(calculated.calculatedMaterials).map(([k, v]) => (
                  <li key={k}>{k}: {v}</li>
                ))}
                {Object.keys(calculated.calculatedMaterials).length === 0 && <li>No material data</li>}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Ruler, Search, ChevronDown, ChevronUp } from "lucide-react";
import apiClient from "../../api/apiClient";
export default function MaterialCalculator({
  initialProducts = [],
  initialClothRolls = [],
}) {
  const [filters, setFilters] = useState({
    category: "",
    subcategory: "",
    brand: "",
  });
  const [selectedProductId, setSelectedProductId] = useState("");
  const [size, setSize] = useState("M");
  const [quantity, setQuantity] = useState(1);
  const [calculated, setCalculated] = useState(null);

  const [products, setProducts] = useState(initialProducts);
  const [clothRolls, setClothRolls] = useState(initialClothRolls);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [openDropdown, setOpenDropdown] = useState(null); 
  const [dropdownSearch, setDropdownSearch] = useState({}); 

  const containerRef = useRef(null);

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
    let cancelled = false;
    const controller = new AbortController();
    const signal = controller.signal;

    async function fetchAll() {
      setLoading(true);
      setError("");
      try {
        if (apiClient && typeof apiClient.get === "function") {
          const res = await apiClient.get("/products/all", { signal });
          const data = res?.data ?? res;
          if (!cancelled) {
            setProducts(data.products ?? data.productsList ?? []);
            setClothRolls(data.clothRolls ?? data.rolls ?? []);
          }
        } else {
          const fetchRes = await fetch("/api/products/all", { signal });
          if (!fetchRes.ok) throw new Error(`Fetch failed: ${fetchRes.status}`);
          const data = await fetchRes.json();
          if (!cancelled) {
            setProducts(data.products ?? []);
            setClothRolls(data.clothRolls ?? []);
          }
        }
      } catch (err) {
        if (!cancelled) {
          if (err.name !== "AbortError") {
            console.error("Failed to load products:", err);
            setError("Failed to load products. Check console for details.");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

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

  // small pretty helper
  const pretty = (v) =>
    v || v === 0 ? String(v).charAt(0).toUpperCase() + String(v).slice(1) : "";

  // filter helpers used by dropdowns
  const filteredList = (key) => {
    const q = (dropdownSearch[key] || "").trim().toLowerCase();
    if (key === "category") {
      if (!q) return categories;
      return categories.filter((c) => c.toLowerCase().includes(q));
    }
    if (key === "subcategory") {
      if (!q) return subcategories;
      return subcategories.filter((s) => s.toLowerCase().includes(q));
    }
    if (key === "brand") {
      if (!q) return brands;
      return brands.filter((b) => b.toLowerCase().includes(q));
    }
    if (key === "product") {
      const list = normalizedProducts
        .filter((p) => {
          if (filters.category && p.category !== filters.category) return false;
          if (filters.subcategory && p.subcategory !== filters.subcategory)
            return false;
          if (filters.brand && p.brand !== filters.brand) return false;
          return true;
        })
        .map((p) => ({ id: p._id, label: p.name }));
      if (!q) return list;
      return list.filter(
        (p) => p.label.toLowerCase().includes(q) || String(p.id).includes(q)
      );
    }
    if (key === "size") {
      const sizes = ["M", "L", "XL", "3XL", "5XL"];
      if (!q) return sizes;
      return sizes.filter((s) => s.toLowerCase().includes(q));
    }
    return [];
  };

  // click outside handler to close dropdowns — now uses containerRef
  useEffect(() => {
    const onDocClick = (e) => {
      if (!containerRef.current) {
        setOpenDropdown(null);
        return;
      }
      if (!containerRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-4">
        <Ruler className="mr-2 text-green-600" /> Material Requirement
        Calculator
      </h2>

      {loading && (
        <div className="text-sm text-gray-500 mb-2">Loading products...</div>
      )}
      {error && <div className="text-sm text-red-500 mb-2">{error}</div>}

      {/* containerRef wraps the entire dropdown area */}
      <div
        ref={containerRef}
        className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
      >
        {/* Category dropdown */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <button
            type="button"
            onClick={() => {
              setOpenDropdown((o) => (o === "category" ? null : "category"));
              setDropdownSearch((s) => ({ ...s, category: "" }));
            }}
            className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg bg-white ${
              openDropdown === "category"
                ? "border-purple-500"
                : "border-gray-300"
            }`}
            aria-expanded={openDropdown === "category"}
          >
            <div className="truncate text-sm">
              {filters.category || "All categories"}
            </div>
            <div>
              {openDropdown === "category" ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>

          <div
            className={`absolute left-0 right-0 mt-2 z-40 max-h-60 overflow-auto rounded-lg border bg-white shadow-lg py-2 transition-transform ${
              openDropdown === "category"
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 pointer-events-none -translate-y-1 scale-95"
            }`}
          >
            <div className="px-3 pb-2">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  autoFocus={openDropdown === "category"}
                  value={dropdownSearch.category || ""}
                  onChange={(e) =>
                    setDropdownSearch((s) => ({
                      ...s,
                      category: e.target.value,
                    }))
                  }
                  placeholder="Search categories..."
                  className="w-full px-2 py-2 text-sm border rounded focus:outline-none"
                />
              </div>
            </div>

            <div className="divide-y">
              {filteredList("category").length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No categories.
                </div>
              )}
              {filteredList("category").map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setFilters((s) => ({
                      ...s,
                      category: c,
                      subcategory: "",
                      brand: "",
                    }));
                    setOpenDropdown(null);
                    setSelectedProductId("");
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                >
                  {pretty(c)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Subcategory dropdown */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subcategory
          </label>
          <button
            type="button"
            onClick={() => {
              setOpenDropdown((o) =>
                o === "subcategory" ? null : "subcategory"
              );
              setDropdownSearch((s) => ({ ...s, subcategory: "" }));
            }}
            className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg bg-white ${
              openDropdown === "subcategory"
                ? "border-purple-500"
                : "border-gray-300"
            }`}
            aria-expanded={openDropdown === "subcategory"}
          >
            <div className="truncate text-sm">
              {filters.subcategory || "All subcategories"}
            </div>
            <div>
              {openDropdown === "subcategory" ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>

          <div
            className={`absolute left-0 right-0 mt-2 z-40 max-h-60 overflow-auto rounded-lg border bg-white shadow-lg py-2 transition-transform ${
              openDropdown === "subcategory"
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 pointer-events-none -translate-y-1 scale-95"
            }`}
          >
            <div className="px-3 pb-2">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  autoFocus={openDropdown === "subcategory"}
                  value={dropdownSearch.subcategory || ""}
                  onChange={(e) =>
                    setDropdownSearch((s) => ({
                      ...s,
                      subcategory: e.target.value,
                    }))
                  }
                  placeholder="Search subcategories..."
                  className="w-full px-2 py-2 text-sm border rounded focus:outline-none"
                />
              </div>
            </div>

            <div className="divide-y">
              {filteredList("subcategory").length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No subcategories.
                </div>
              )}
              {filteredList("subcategory").map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setFilters((f) => ({ ...f, subcategory: s }));
                    setOpenDropdown(null);
                    setSelectedProductId("");
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                >
                  {pretty(s)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Brand dropdown */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Brand
          </label>
          <button
            type="button"
            onClick={() => {
              setOpenDropdown((o) => (o === "brand" ? null : "brand"));
              setDropdownSearch((s) => ({ ...s, brand: "" }));
            }}
            className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg bg-white ${
              openDropdown === "brand" ? "border-purple-500" : "border-gray-300"
            }`}
            aria-expanded={openDropdown === "brand"}
          >
            <div className="truncate text-sm">
              {filters.brand || "All brands"}
            </div>
            <div>
              {openDropdown === "brand" ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>

          <div
            className={`absolute left-0 right-0 mt-2 z-40 max-h-60 overflow-auto rounded-lg border bg-white shadow-lg py-2 transition-transform ${
              openDropdown === "brand"
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 pointer-events-none -translate-y-1 scale-95"
            }`}
          >
            <div className="px-3 pb-2">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  autoFocus={openDropdown === "brand"}
                  value={dropdownSearch.brand || ""}
                  onChange={(e) =>
                    setDropdownSearch((s) => ({ ...s, brand: e.target.value }))
                  }
                  placeholder="Search brands..."
                  className="w-full px-2 py-2 text-sm border rounded focus:outline-none"
                />
              </div>
            </div>

            <div className="divide-y">
              {filteredList("brand").length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No brands.
                </div>
              )}
              {filteredList("brand").map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => {
                    setFilters((f) => ({ ...f, brand: b }));
                    setOpenDropdown(null);
                    setSelectedProductId("");
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                >
                  {pretty(b)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Product dropdown */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Product
          </label>
          <button
            type="button"
            onClick={() => {
              setOpenDropdown((o) => (o === "product" ? null : "product"));
              setDropdownSearch((s) => ({ ...s, product: "" }));
            }}
            className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg bg-white ${
              openDropdown === "product"
                ? "border-purple-500"
                : "border-gray-300"
            }`}
            aria-expanded={openDropdown === "product"}
          >
            <div className="truncate text-sm">
              {selectedProductId
                ? productMap[selectedProductId]?.name ?? "Selected product"
                : "-- Choose a product --"}
            </div>
            <div>
              {openDropdown === "product" ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>

          <div
            className={`absolute left-0 right-0 mt-2 z-40 max-h-60 overflow-auto rounded-lg border bg-white shadow-lg py-2 transition-transform ${
              openDropdown === "product"
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 pointer-events-none -translate-y-1 scale-95"
            }`}
          >
            <div className="px-3 pb-2">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  autoFocus={openDropdown === "product"}
                  value={dropdownSearch.product || ""}
                  onChange={(e) =>
                    setDropdownSearch((s) => ({
                      ...s,
                      product: e.target.value,
                    }))
                  }
                  placeholder="Search product..."
                  className="w-full px-2 py-2 text-sm border rounded focus:outline-none"
                />
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Filtered by selected category/subcategory/brand.
              </div>
            </div>

            <div className="divide-y">
              {filteredList("product").length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No products match.
                </div>
              )}
              {filteredList("product").map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedProductId(p.id);
                    setOpenDropdown(null);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* Size & Quantity row */}
        <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Size
            </label>
            <button
              type="button"
              onClick={() => {
                setOpenDropdown((o) => (o === "size" ? null : "size"));
                setDropdownSearch((s) => ({ ...s, size: "" }));
              }}
              className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg bg-white ${
                openDropdown === "size"
                  ? "border-purple-500"
                  : "border-gray-300"
              }`}
              aria-expanded={openDropdown === "size"}
            >
              <div className="truncate text-sm">{size}</div>
              <div>
                {openDropdown === "size" ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </button>

            <div
              className={`absolute left-0 right-0 mt-2 z-40 max-h-60 overflow-auto rounded-lg border bg-white shadow-lg py-2 transition-transform ${
                openDropdown === "size"
                  ? "opacity-100 translate-y-0 scale-100"
                  : "opacity-0 pointer-events-none -translate-y-1 scale-95"
              }`}
            >
              <div className="px-3 pb-2">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input
                    autoFocus={openDropdown === "size"}
                    value={dropdownSearch.size || ""}
                    onChange={(e) =>
                      setDropdownSearch((s) => ({ ...s, size: e.target.value }))
                    }
                    placeholder="Search size..."
                    className="w-full px-2 py-2 text-sm border rounded focus:outline-none"
                  />
                </div>
              </div>

              <div className="divide-y">
                {filteredList("size").map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setSize(s);
                      setOpenDropdown(null);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="md:col-span-1 block">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => {
                const val = e.target.value;
                  setQuantity(Number(val));
              }}
              className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"
            />
          </div>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
